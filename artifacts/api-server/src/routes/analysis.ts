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

  const sub = await getOrCreateSub(sessionId);
  const tier = sub.tier as "free" | "limited" | "unlimited";

  if (tier === "free" && sub.analysisCount >= FREE_TRIAL_LIMIT) {
    res.status(402).json({
      error: "payment_required",
      message: "Free trial limit reached",
      requiresUpgrade: true,
      trialUsed: sub.analysisCount,
      trialLimit: FREE_TRIAL_LIMIT,
    });
    return;
  }

  if (tier === "limited" && sub.analysisCount >= LIMITED_PLAN_LIMIT) {
    res.status(402).json({
      error: "payment_required",
      message: "Monthly analysis limit reached",
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
          content: `You are a nutrition expert. Analyze food images and return ONLY valid JSON with NO markdown, NO code blocks, NO extra text.
Return exactly this structure:
{
  "dishName": "string (name of the dish in Portuguese)",
  "calories": number (total kcal as integer),
  "protein": number (grams, one decimal),
  "carbs": number (grams, one decimal),
  "fat": number (grams, one decimal)
}`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            { type: "text", text: "Analyze this food image and return the nutritional information as JSON." },
          ],
        },
      ],
      max_tokens: 300,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    let parsed: { dishName: string; calories: number; protein: number; carbs: number; fat: number };

    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      req.log.error({ raw }, "Failed to parse OpenAI response as JSON");
      res.status(500).json({ error: "parse_error", message: "Failed to parse AI response" });
      return;
    }

    const analysisId = randomUUID();
    await db.insert(analysesTable).values({
      id: analysisId,
      sessionId,
      dishName: parsed.dishName,
      calories: Math.round(parsed.calories),
      protein: parsed.protein,
      carbs: parsed.carbs,
      fat: parsed.fat,
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
      imageUrl: null,
      createdAt: new Date().toISOString(),
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error analyzing image");
    res.status(500).json({ error: "internal_error", message: "Analysis failed" });
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
      imageUrl: a.imageUrl,
      createdAt: a.createdAt.toISOString(),
    }))
  );

  res.json(result);
});

export default router;
