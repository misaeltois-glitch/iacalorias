import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { db, subscriptionsTable, analysesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { randomUUID } from "crypto";
import { AnalyzeFoodResponse, GetAnalysisHistoryResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const FREE_TRIAL_LIMIT = 3;
const LIMITED_PLAN_LIMIT = 20;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getOrCreateSub(sessionId: string) {
  let sub = await db.query.subscriptionsTable.findFirst({
    where: eq(subscriptionsTable.sessionId, sessionId),
  });
  if (!sub) {
    await db.insert(subscriptionsTable).values({ sessionId, tier: "free", analysisCount: 0 });
    sub = await db.query.subscriptionsTable.findFirst({ where: eq(subscriptionsTable.sessionId, sessionId) });
  }
  return sub!;
}

router.post("/", upload.single("image"), async (req: Request, res: Response) => {
  const sessionId = req.body.sessionId as string;
  if (!sessionId) {
    res.status(400).json({ error: "bad_request", message: "sessionId is required" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "bad_request", message: "image is required" });
    return;
  }

  // Validate file size (4 MB for users, we allow 10 MB in multer for safety)
  if (req.file.size > 4 * 1024 * 1024) {
    res.status(400).json({
      error: "file_too_large",
      message: "A imagem deve ter no máximo 4 MB. Reduza o tamanho e tente novamente.",
    });
    return;
  }

  // Validate mime type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(req.file.mimetype)) {
    res.status(400).json({
      error: "invalid_file_type",
      message: "Formato não suportado. Envie uma imagem JPG, PNG ou WEBP.",
    });
    return;
  }

  const sub = await getOrCreateSub(sessionId);
  const tier = sub.tier as "free" | "limited" | "unlimited";

  if (tier === "free" && sub.analysisCount >= FREE_TRIAL_LIMIT) {
    res.status(402).json({
      error: "payment_required",
      message: "Suas análises gratuitas acabaram.",
      requiresUpgrade: true,
      trialUsed: sub.analysisCount,
      trialLimit: FREE_TRIAL_LIMIT,
    });
    return;
  }

  if (tier === "limited" && sub.analysisCount >= LIMITED_PLAN_LIMIT) {
    res.status(402).json({
      error: "payment_required",
      message: "Você atingiu o limite mensal de análises do plano Limitado.",
      requiresUpgrade: true,
      trialUsed: sub.analysisCount,
      trialLimit: LIMITED_PLAN_LIMIT,
    });
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
  "confidence": "string (nível de confiança: 'Alta confiança', 'Média confiança', ou 'Baixa confiança')"
}`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            { type: "text", text: "Analise esta imagem e retorne as informações nutricionais como JSON." },
          ],
        },
      ],
      max_tokens: 500,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    let parsed: {
      isFood: boolean; reason?: string;
      dishName?: string; servingSize?: string; calories?: number;
      protein?: number; carbs?: number; fat?: number; fiber?: number;
      healthScore?: number; nutritionTip?: string; confidence?: string;
    };

    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      req.log.error({ raw }, "Failed to parse OpenAI response as JSON");
      // Do NOT increment count — parse error is not the user's fault
      res.status(422).json({
        error: "parse_error",
        message: "A IA não conseguiu processar a resposta. Tente com uma foto mais clara e bem iluminada.",
      });
      return;
    }

    // If not food — do NOT increment count and return helpful message
    if (!parsed.isFood) {
      const detected = parsed.reason || "Conteúdo não identificado";
      res.status(422).json({
        error: "not_food",
        message: `Nenhum alimento foi detectado na imagem. Detectado: ${detected}. Tire uma foto de um prato ou refeição.`,
        detected,
      });
      return;
    }

    // Validate required food fields
    if (!parsed.dishName || parsed.calories == null || parsed.protein == null || parsed.carbs == null || parsed.fat == null) {
      req.log.error({ parsed }, "Missing required fields in AI response");
      res.status(422).json({
        error: "incomplete_analysis",
        message: "Não foi possível obter todos os dados nutricionais. A foto pode estar muito escura, borrada ou com alimentos pouco visíveis.",
      });
      return;
    }

    // All good — now save and increment count
    const analysisId = randomUUID();
    await db.insert(analysesTable).values({
      id: analysisId,
      sessionId,
      dishName: parsed.dishName,
      calories: Math.round(parsed.calories),
      protein: parsed.protein,
      carbs: parsed.carbs,
      fat: parsed.fat,
      fiber: parsed.fiber ?? null,
      healthScore: parsed.healthScore ? Math.round(parsed.healthScore) : null,
      nutritionTip: parsed.nutritionTip ?? null,
      servingSize: parsed.servingSize ?? null,
      confidence: parsed.confidence ?? null,
    });

    await db
      .update(subscriptionsTable)
      .set({ analysisCount: sub.analysisCount + 1, updatedAt: new Date() })
      .where(eq(subscriptionsTable.sessionId, sessionId));

    const result = AnalyzeFoodResponse.parse({
      id: analysisId,
      sessionId,
      dishName: parsed.dishName,
      calories: Math.round(parsed.calories),
      macros: { protein: parsed.protein, carbs: parsed.carbs, fat: parsed.fat },
      fiber: parsed.fiber ?? null,
      healthScore: parsed.healthScore ? Math.round(parsed.healthScore) : null,
      nutritionTip: parsed.nutritionTip ?? null,
      servingSize: parsed.servingSize ?? null,
      confidence: parsed.confidence ?? null,
      imageUrl: null,
      createdAt: new Date().toISOString(),
    });

    res.json(result);
  } catch (err: any) {
    req.log.error({ err }, "Error analyzing image");

    // Handle OpenAI specific errors
    if (err?.status === 429) {
      res.status(503).json({
        error: "rate_limited",
        message: "Muitas requisições simultâneas. Aguarde alguns segundos e tente novamente.",
      });
      return;
    }
    if (err?.status === 400 && err?.message?.includes("image")) {
      res.status(422).json({
        error: "invalid_image",
        message: "A imagem não pôde ser processada. Verifique se o arquivo não está corrompido e tente novamente.",
      });
      return;
    }

    res.status(500).json({
      error: "internal_error",
      message: "Ocorreu um erro inesperado. Tente novamente em instantes.",
    });
  }
});

router.get("/history", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    res.status(400).json({ error: "bad_request", message: "sessionId is required" });
    return;
  }

  const analyses = await db.query.analysesTable.findMany({
    where: eq(analysesTable.sessionId, sessionId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 20,
  });

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
      servingSize: a.servingSize ?? null,
      confidence: a.confidence ?? null,
      imageUrl: a.imageUrl ?? null,
      createdAt: a.createdAt.toISOString(),
    }))
  );

  res.json(result);
});

export default router;
