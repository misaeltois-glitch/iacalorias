import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { db, subscriptionsTable, analysesTable } from "@workspace/db";
import { eq, or, and, isNotNull } from "drizzle-orm";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { AnalyzeFoodResponse, GetAnalysisHistoryResponse } from "@workspace/api-zod";
import { getMasterTier } from "../lib/master-emails.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const FREE_TRIAL_LIMIT = 30;
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

  const masterTier = getMasterTier(userEmail ?? req.user?.email);
  const isDevAccount = !!masterTier;
  const tier = masterTier ?? (sub.tier as "free" | "limited" | "unlimited");

  if (!isDevAccount && tier === "free" && sub.analysisCount >= FREE_TRIAL_LIMIT) {
    res.status(402).json({ error: "payment_required", message: "Suas análises gratuitas acabaram.", requiresUpgrade: true, trialUsed: sub.analysisCount, trialLimit: FREE_TRIAL_LIMIT });
    return;
  }
  if (!isDevAccount && tier === "limited" && sub.analysisCount >= LIMITED_PLAN_LIMIT) {
    res.status(402).json({ error: "payment_required", message: "Você atingiu o limite mensal.", requiresUpgrade: true, trialUsed: sub.analysisCount, trialLimit: LIMITED_PLAN_LIMIT });
    return;
  }

  try {
    const base64Image = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um nutricionista especialista em análise de imagens de comida. Analise a imagem e retorne APENAS JSON válido, SEM markdown, SEM blocos de código, SEM texto extra.

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
  "nutritionTip": "string (uma dica nutricional curta e personalizada em português sobre este prato, máximo 100 caracteres)",
  "substitutionTip": "string (sugira 1 substituição saudável e prática para melhorar este prato, ex: 'Troque o arroz branco por integral e ganhe +3g de fibra' — máximo 110 caracteres, em português)",
  "confidence": "string (nível de confiança: 'Alta confiança', 'Média confiança', ou 'Baixa confiança')"
}`,
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

    if (!isDevAccount) {
      await db.update(subscriptionsTable)
        .set({ analysisCount: sub.analysisCount + 1, updatedAt: new Date() })
        .where(eq(subscriptionsTable.sessionId, sub.sessionId));
    }

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
