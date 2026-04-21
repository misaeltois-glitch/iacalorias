import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { db, subscriptionsTable, analysesTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { AnalyzeFoodResponse, GetAnalysisHistoryResponse } from "@workspace/api-zod";
import { getMasterTier } from "../lib/master-emails.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const FREE_TRIAL_DAYS = 7;
const LIMITED_PLAN_LIMIT = 20;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function resolveSub(userId?: string, sessionId?: string) {
  if (userId) {
    const sub = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, userId),
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    });
    if (sub) return sub;
  }
  const effectiveSessionId = sessionId ?? (userId ? `user-${userId}` : undefined);
  if (!effectiveSessionId) return null;

  let sub = await db.query.subscriptionsTable.findFirst({
    where: eq(subscriptionsTable.sessionId, effectiveSessionId),
  });
  if (!sub) {
    await db.insert(subscriptionsTable).values({ sessionId: effectiveSessionId, userId: userId ?? null, tier: "free", analysisCount: 0 });
    sub = await db.query.subscriptionsTable.findFirst({ where: eq(subscriptionsTable.sessionId, effectiveSessionId) });
  } else if (userId && !sub.userId) {
    await db.update(subscriptionsTable).set({ userId }).where(eq(subscriptionsTable.sessionId, effectiveSessionId));
    sub = { ...sub, userId };
  }
  return sub!;
}

router.post("/", upload.single("image"), async (req: Request, res: Response) => {
  const sessionId = req.body.sessionId as string;
  const userId = req.user?.userId;

  if (!sessionId && !userId) {
    res.status(400).json({ error: "bad_request", message: "sessionId is required" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "bad_request", message: "image is required" });
    return;
  }

  if (req.file.size > 10 * 1024 * 1024) {
    res.status(400).json({ error: "file_too_large", message: "A imagem deve ter no máximo 10 MB." });
    return;
  }

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(req.file.mimetype)) {
    res.status(400).json({ error: "invalid_file_type", message: "Formato não suportado. Envie JPG, PNG ou WEBP." });
    return;
  }

  const sub = await resolveSub(userId, sessionId);
  if (!sub) {
    res.status(400).json({ error: "bad_request", message: "sessionId is required" });
    return;
  }

  const masterTier = getMasterTier(req.user?.email);
  const isDevAccount = !!masterTier;
  const tier = masterTier ?? (sub.tier as "free" | "limited" | "unlimited");

  if (!isDevAccount && tier === "free") {
    const trialStartMs = sub.createdAt?.getTime() ?? Date.now();
    const daysSinceStart = (Date.now() - trialStartMs) / (24 * 60 * 60 * 1000);
    if (daysSinceStart >= FREE_TRIAL_DAYS) {
      res.status(402).json({ error: "payment_required", message: "Seu período de teste gratuito expirou.", requiresUpgrade: true });
      return;
    }
  }
  if (tier === "limited" && sub.analysisCount >= LIMITED_PLAN_LIMIT) {
    res.status(402).json({ error: "payment_required", message: "Você atingiu o limite mensal.", requiresUpgrade: true, trialUsed: sub.analysisCount, trialLimit: LIMITED_PLAN_LIMIT });
    return;
  }

  // ─── User history context (dish repetition + hour) ───────────────────────────
  let recentDishNames: string[] = [];
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const history = userId
      ? await db.query.analysesTable.findMany({
          where: and(eq(analysesTable.userId, userId), gte(analysesTable.createdAt, sevenDaysAgo)),
          orderBy: [desc(analysesTable.createdAt)],
          limit: 30,
          columns: { dishName: true },
        })
      : sessionId
      ? await db.query.analysesTable.findMany({
          where: and(eq(analysesTable.sessionId, sessionId), gte(analysesTable.createdAt, sevenDaysAgo)),
          orderBy: [desc(analysesTable.createdAt)],
          limit: 30,
          columns: { dishName: true },
        })
      : [];
    recentDishNames = (history as { dishName: string }[]).map(h => h.dishName);
  } catch {}

  const localHour = new Date().getHours();
  const timeOfDay = localHour < 10 ? 'manhã' : localHour < 14 ? 'almoço' : localHour < 18 ? 'tarde' : 'noite';
  const historyContext = recentDishNames.length > 0
    ? `\nREFEIÇÕES RECENTES (últimos 7 dias): ${recentDishNames.slice(0, 10).join(', ')}. Se o prato identificado for muito parecido com algum da lista, inclua na substitutionTip uma variação que traga o mesmo prazer com mais equilíbrio nutricional.`
    : '';

  try {
    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é a Evellyn, nutricionista do app IA Calorias. Analise a imagem e retorne APENAS JSON válido, SEM markdown, SEM blocos de código, SEM texto extra.

CONTEXTO DO USUÁRIO: É uma pessoa com rotina corrida, que às vezes come mal por falta de tempo — não por falta de vontade. Suas dicas devem ser práticas, humanas e sem julgamento, como uma amiga que entende de nutrição falando no WhatsApp.

IMPORTANTE: Se a imagem NÃO contiver alimentos/comida visível, retorne:
{"isFood": false, "reason": "Descreva brevemente o que foi detectado na imagem (ex: 'Texto/documento', 'Paisagem', 'Pessoa', 'Objeto', etc.)"}

Se a imagem contiver comida, retorne exatamente esta estrutura:
{
  "isFood": true,
  "dishName": "string (nome do prato em português)",
  "servingSize": "string (ex: '1 porção (~350g)')",
  "calories": number (kcal totais como inteiro),
  "protein": number (gramas, uma casa decimal),
  "carbs": number (gramas, uma casa decimal),
  "fat": number (gramas, uma casa decimal),
  "fiber": number (gramas, uma casa decimal),
  "healthScore": number (pontuação de saúde de 1 a 10, sendo 10 o mais saudável),
  "nutritionTip": "string (máximo 100 chars — tom conversacional e direto, sem ser clínico. Comece com o ponto positivo real do prato, depois o ponto de atenção se houver. Ex: 'Proteína boa aqui! Só faltou fibra — uma fruta depois fecha bem.' ou 'Prato equilibrado, continue assim que o resultado vem.')",
  "substitutionTip": "string (máximo 110 chars — troca realista para quem não tem tempo de cozinhar. Foque no ganho concreto. Ex: 'Troca o refrigerante por água com gás: economiza 160 kcal sem abrir mão do gás.' ou 'Grão-de-bico em lata no lugar da batata frita: mesma praticidade, 3x mais proteína.')",
  "confidence": "string (nível de confiança: 'Alta confiança', 'Média confiança', ou 'Baixa confiança')"
}

TOM das dicas: Não use termos clínicos como 'ingesta', 'macronutrientes', 'lipídios'. Fale como gente. Seja específico (cite o prato, cite os valores). Nunca seja condescendente.
HORÁRIO: ${timeOfDay}${localHour >= 21 ? ' — noite avançada, se aplicável sugira algo leve para recuperação.' : ''}.${historyContext}`,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
            { type: "text", text: "Analise esta imagem e retorne as informações nutricionais como JSON." },
          ],
        },
      ],
      max_tokens: 600,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    let parsed: {
      isFood: boolean; reason?: string;
      dishName?: string; servingSize?: string; calories?: number;
      protein?: number; carbs?: number; fat?: number; fiber?: number;
      healthScore?: number; nutritionTip?: string; substitutionTip?: string; confidence?: string;
    };

    try {
      parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      req.log.error({ raw }, "Failed to parse OpenAI response as JSON");
      res.status(422).json({ error: "parse_error", message: "A IA não conseguiu processar a resposta. Tente com uma foto mais clara." });
      return;
    }

    if (!parsed.isFood) {
      const detected = parsed.reason || "Conteúdo não identificado";
      res.status(422).json({ error: "not_food", message: `Nenhum alimento detectado. Detectado: ${detected}.`, detected });
      return;
    }

    if (!parsed.dishName || parsed.calories == null || parsed.protein == null || parsed.carbs == null || parsed.fat == null) {
      req.log.error({ parsed }, "Missing required fields in AI response");
      res.status(422).json({ error: "incomplete_analysis", message: "Não foi possível obter todos os dados nutricionais." });
      return;
    }

    const analysisId = randomUUID();
    const effectiveSessionId = sub.sessionId ?? sessionId;

    await db.insert(analysesTable).values({
      id: analysisId,
      sessionId: effectiveSessionId,
      userId: userId ?? null,
      dishName: parsed.dishName,
      calories: Math.round(parsed.calories),
      protein: parsed.protein,
      carbs: parsed.carbs,
      fat: parsed.fat,
      fiber: parsed.fiber ?? null,
      healthScore: parsed.healthScore ? Math.round(parsed.healthScore) : null,
      nutritionTip: parsed.nutritionTip ?? null,
      substitutionTip: parsed.substitutionTip ?? null,
      servingSize: parsed.servingSize ?? null,
      confidence: parsed.confidence ?? null,
    });

    // Incrementa sempre — contas master também contam, mas nunca são bloqueadas
    await db.update(subscriptionsTable)
      .set({ analysisCount: sub.analysisCount + 1, updatedAt: new Date() })
      .where(eq(subscriptionsTable.sessionId, sub.sessionId));

    const result = AnalyzeFoodResponse.parse({
      id: analysisId,
      sessionId: effectiveSessionId,
      dishName: parsed.dishName,
      calories: Math.round(parsed.calories),
      macros: { protein: parsed.protein, carbs: parsed.carbs, fat: parsed.fat },
      fiber: parsed.fiber ?? null,
      healthScore: parsed.healthScore ? Math.round(parsed.healthScore) : null,
      nutritionTip: parsed.nutritionTip ?? null,
      substitutionTip: parsed.substitutionTip ?? null,
      servingSize: parsed.servingSize ?? null,
      confidence: parsed.confidence ?? null,
      imageUrl: null,
      createdAt: new Date(),
    });

    res.json(result);
  } catch (err: any) {
    req.log.error({ err }, "Error analyzing image");
    if (err?.status === 429) {
      res.status(503).json({ error: "rate_limited", message: "Muitas requisições simultâneas. Aguarde e tente novamente." });
      return;
    }
    if (err?.status === 400 && err?.message?.includes("image")) {
      res.status(422).json({ error: "invalid_image", message: "A imagem não pôde ser processada. Tente outra foto." });
      return;
    }
    res.status(500).json({ error: "internal_error", message: "Ocorreu um erro inesperado. Tente novamente." });
  }
});

// POST /api/analysis/text — manual food registration by text description
router.post("/text", async (req: Request, res: Response) => {
  const { foodDescription, sessionId } = req.body as { foodDescription?: string; sessionId?: string };
  const userId = req.user?.userId;

  if (!foodDescription?.trim()) {
    res.status(400).json({ error: "bad_request", message: "foodDescription é obrigatório" });
    return;
  }
  if (!sessionId && !userId) {
    res.status(400).json({ error: "bad_request", message: "sessionId é obrigatório" });
    return;
  }

  const sub = await resolveSub(userId, sessionId);
  if (!sub) {
    res.status(400).json({ error: "bad_request", message: "sessionId é obrigatório" });
    return;
  }

  const masterTier = getMasterTier(req.user?.email);
  const isDevAccount = !!masterTier;
  const tier = masterTier ?? (sub.tier as "free" | "limited" | "unlimited");

  if (!isDevAccount && tier === "free") {
    const trialStartMs = sub.createdAt?.getTime() ?? Date.now();
    const daysSinceStart = (Date.now() - trialStartMs) / (24 * 60 * 60 * 1000);
    if (daysSinceStart >= FREE_TRIAL_DAYS) {
      res.status(402).json({ error: "payment_required", message: "Seu período de teste gratuito expirou.", requiresUpgrade: true });
      return;
    }
  }
  if (tier === "limited" && sub.analysisCount >= LIMITED_PLAN_LIMIT) {
    res.status(402).json({ error: "payment_required", message: "Você atingiu o limite mensal.", requiresUpgrade: true });
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Você é a Evellyn, nutricionista do app IA Calorias. O usuário vai descrever um alimento ou refeição em texto. Estime os valores nutricionais e retorne APENAS JSON válido com esta estrutura exata:
{
  "dishName": "string (nome do prato em português, limpo e curto)",
  "servingSize": "string (porção estimada, ex: '1 porção (~300g)')",
  "calories": number (kcal totais como inteiro),
  "protein": number (gramas, uma casa decimal),
  "carbs": number (gramas, uma casa decimal),
  "fat": number (gramas, uma casa decimal),
  "fiber": number (gramas, uma casa decimal),
  "healthScore": number (pontuação de 1 a 10, sendo 10 o mais saudável),
  "nutritionTip": "string (máximo 100 chars — tom conversacional, sem termos clínicos. Destaque o ponto positivo real, depois o de atenção se houver. Ex: 'Boa fonte de energia para a tarde — só fique de olho no sódio se comer isso todo dia.')",
  "substitutionTip": "string (máximo 110 chars — troca realista para quem tem pouco tempo, com o ganho concreto. Ex: 'Adiciona um iogurte natural depois: +10g de proteína sem esforço nenhum.')",
  "confidence": "string ('Alta confiança', 'Média confiança', ou 'Baixa confiança')"
}
Se a descrição for vaga, use 'Baixa confiança' e estime com base em porção padrão. Nunca deixe campos nulos. Nunca use termos clínicos como 'ingesta', 'lipídios', 'carboidratos complexos' — fale como gente.`,
        },
        {
          role: "user",
          content: `Alimento/refeição: ${foodDescription.trim()}`,
        },
      ],
      max_tokens: 400,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    let parsed: {
      dishName?: string; servingSize?: string; calories?: number;
      protein?: number; carbs?: number; fat?: number; fiber?: number;
      healthScore?: number; nutritionTip?: string; substitutionTip?: string; confidence?: string;
    };

    try {
      parsed = JSON.parse(raw);
    } catch {
      res.status(422).json({ error: "parse_error", message: "Não foi possível estimar os nutrientes. Tente descrever de forma mais detalhada." });
      return;
    }

    if (!parsed.dishName || parsed.calories == null || parsed.protein == null || parsed.carbs == null || parsed.fat == null) {
      res.status(422).json({ error: "incomplete_analysis", message: "Não foi possível obter todos os dados nutricionais." });
      return;
    }

    const analysisId = randomUUID();
    const effectiveSessionId = sub.sessionId ?? sessionId!;

    await db.insert(analysesTable).values({
      id: analysisId,
      sessionId: effectiveSessionId,
      userId: userId ?? null,
      dishName: parsed.dishName,
      calories: Math.round(parsed.calories),
      protein: parsed.protein,
      carbs: parsed.carbs,
      fat: parsed.fat,
      fiber: parsed.fiber ?? null,
      healthScore: parsed.healthScore ? Math.round(parsed.healthScore) : null,
      nutritionTip: parsed.nutritionTip ?? null,
      substitutionTip: parsed.substitutionTip ?? null,
      servingSize: parsed.servingSize ?? null,
      confidence: parsed.confidence ?? null,
    });

    // Incrementa sempre — contas master também contam, mas nunca são bloqueadas
    await db.update(subscriptionsTable)
      .set({ analysisCount: sub.analysisCount + 1, updatedAt: new Date() })
      .where(eq(subscriptionsTable.sessionId, sub.sessionId));

    const result = AnalyzeFoodResponse.parse({
      id: analysisId,
      sessionId: effectiveSessionId,
      dishName: parsed.dishName,
      calories: Math.round(parsed.calories),
      macros: { protein: parsed.protein, carbs: parsed.carbs, fat: parsed.fat },
      fiber: parsed.fiber ?? null,
      healthScore: parsed.healthScore ? Math.round(parsed.healthScore) : null,
      nutritionTip: parsed.nutritionTip ?? null,
      substitutionTip: parsed.substitutionTip ?? null,
      servingSize: parsed.servingSize ?? null,
      confidence: parsed.confidence ?? null,
      imageUrl: null,
      createdAt: new Date(),
    });

    res.json(result);
  } catch (err: any) {
    req.log.error({ err }, "Error analyzing text food");
    if (err?.status === 429) {
      res.status(503).json({ error: "rate_limited", message: "Muitas requisições simultâneas. Aguarde e tente novamente." });
      return;
    }
    res.status(500).json({ error: "internal_error", message: "Ocorreu um erro inesperado. Tente novamente." });
  }
});

// POST /api/analysis/relog — re-log a saved favourite without an image
router.post("/relog", async (req: Request, res: Response) => {
  const sessionId = req.body.sessionId as string;
  const userId = req.user?.userId;
  if (!sessionId && !userId) { res.status(400).json({ error: "bad_request", message: "sessionId required" }); return; }

  const { dishName, calories, protein, carbs, fat, fiber, healthScore, nutritionTip, servingSize } = req.body;
  if (!dishName || calories == null) { res.status(400).json({ error: "bad_request", message: "dishName and calories required" }); return; }

  const effectiveSessionId = sessionId ?? `user-${userId}`;
  const sub = await resolveSub(userId, effectiveSessionId);
  if (!sub) { res.status(400).json({ error: "bad_request", message: "session not found" }); return; }

  const newId = randomUUID();
  await db.insert(analysesTable).values({
    id: newId,
    sessionId: effectiveSessionId,
    userId: userId ?? null,
    dishName: String(dishName).trim().slice(0, 200),
    calories: Math.round(Number(calories)),
    protein: Number(protein ?? 0),
    carbs: Number(carbs ?? 0),
    fat: Number(fat ?? 0),
    fiber: fiber != null ? Number(fiber) : null,
    healthScore: healthScore != null ? Number(healthScore) : null,
    nutritionTip: nutritionTip ?? null,
    servingSize: servingSize ?? null,
  });

  await db.update(subscriptionsTable)
    .set({ analysisCount: (sub.analysisCount ?? 0) + 1 })
    .where(eq(subscriptionsTable.sessionId, effectiveSessionId));

  res.json({
    id: newId,
    dishName: String(dishName).trim(),
    calories: Math.round(Number(calories)),
    macros: { protein: Number(protein ?? 0), carbs: Number(carbs ?? 0), fat: Number(fat ?? 0) },
    fiber: fiber != null ? Number(fiber) : 0,
    healthScore: healthScore ?? null,
    nutritionTip: nutritionTip ?? null,
    servingSize: servingSize ?? null,
    confidence: null,
    imageUrl: null,
  });
});

// PATCH /api/analysis/:id — edit analysis fields
router.patch("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const { dishName, calories, protein, carbs, fat, fiber } = req.body;

  if (!id) { res.status(400).json({ error: "bad_request", message: "id required" }); return; }

  // Find the analysis and verify ownership
  const existing = await db.query.analysesTable.findFirst({ where: eq(analysesTable.id, id) });
  if (!existing) { res.status(404).json({ error: "not_found", message: "Analysis not found" }); return; }

  const isOwner = (userId && existing.userId === userId) || (!userId && existing.sessionId === req.body.sessionId);
  if (!isOwner) { res.status(403).json({ error: "forbidden" }); return; }

  const patch: Record<string, unknown> = {};
  if (dishName !== undefined) patch.dishName = String(dishName).trim().slice(0, 200);
  if (calories !== undefined) patch.calories = Math.max(0, Math.round(Number(calories)));
  if (protein !== undefined) patch.protein = Math.max(0, Number(protein));
  if (carbs !== undefined) patch.carbs = Math.max(0, Number(carbs));
  if (fat !== undefined) patch.fat = Math.max(0, Number(fat));
  if (fiber !== undefined) patch.fiber = Math.max(0, Number(fiber));

  if (Object.keys(patch).length === 0) { res.status(400).json({ error: "bad_request", message: "No fields to update" }); return; }

  await db.update(analysesTable).set(patch).where(eq(analysesTable.id, id));

  res.json({ ok: true, id, ...patch });
});

router.get("/history", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const userId = req.user?.userId;

  let analyses;
  if (userId) {
    analyses = await db.query.analysesTable.findMany({
      where: eq(analysesTable.userId, userId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 20,
    });
  } else if (sessionId) {
    analyses = await db.query.analysesTable.findMany({
      where: eq(analysesTable.sessionId, sessionId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 20,
    });
  } else {
    res.status(400).json({ error: "bad_request", message: "sessionId is required" });
    return;
  }

  const result = GetAnalysisHistoryResponse.parse(
    analyses.map((a) => ({
      id: a.id,
      sessionId: a.sessionId,
      dishName: a.dishName,
      calories: a.calories,
      macros: { protein: a.protein, carbs: a.carbs, fat: a.fat },
      fiber: a.fiber ?? null,
      healthScore: a.healthScore ?? null,
      nutritionTip: a.nutritionTip ?? null,
      substitutionTip: a.substitutionTip ?? null,
      servingSize: a.servingSize ?? null,
      confidence: a.confidence ?? null,
      imageUrl: a.imageUrl ?? null,
      createdAt: a.createdAt,
    }))
  );

  res.json(result);
});

export default router;
