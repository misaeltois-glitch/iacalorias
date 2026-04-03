import { Router, type IRouter, type Request, type Response } from "express";
import OpenAI from "openai";
import { db, subscriptionsTable, goalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getMasterTier } from "../lib/master-emails.js";

const router: IRouter = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function resolveSubTier(userId?: string, sessionId?: string): Promise<"free" | "limited" | "unlimited"> {
  if (userId) {
    const sub = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, userId),
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    });
    if (sub) return sub.tier as "free" | "limited" | "unlimited";
  }
  if (sessionId) {
    const sub = await db.query.subscriptionsTable.findFirst({ where: eq(subscriptionsTable.sessionId, sessionId) });
    if (sub) return sub.tier as "free" | "limited" | "unlimited";
  }
  return "free";
}

// POST /api/recipe
// Body: { sessionId: string, ingredients: string[] }
router.post("/", async (req: Request, res: Response) => {
  const { sessionId, ingredients } = req.body as {
    sessionId?: string;
    ingredients?: string[];
  };
  const userId = req.user?.userId;

  if (!sessionId && !userId) {
    res.status(400).json({ error: "bad_request", message: "sessionId is required" });
    return;
  }
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    res.status(400).json({ error: "bad_request", message: "Informe ao menos 1 ingrediente." });
    return;
  }
  const cleanIngredients = ingredients
    .map(i => String(i).trim().slice(0, 100))
    .filter(Boolean)
    .slice(0, 20);

  if (cleanIngredients.length === 0) {
    res.status(400).json({ error: "bad_request", message: "Nenhum ingrediente válido informado." });
    return;
  }

  const masterTier = getMasterTier(req.user?.email);
  const tier = masterTier ?? await resolveSubTier(userId, sessionId);

  // Fetch goals for nutritional context
  let goals: { calories?: number | null; protein?: number | null } | null = null;
  try {
    if (userId) {
      const g = await db.query.goalsTable.findFirst({
        where: eq(goalsTable.userId, userId),
        orderBy: (t, { desc }) => [desc(t.updatedAt)],
      });
      if (g) goals = { calories: g.calories, protein: g.protein };
    } else if (sessionId) {
      const g = await db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId) });
      if (g) goals = { calories: g.calories, protein: g.protein };
    }
  } catch {}

  const goalContext = goals?.calories
    ? `O usuário tem meta de aproximadamente ${goals.calories} kcal/dia${goals.protein ? ` e ${goals.protein}g de proteína/dia` : ""}.`
    : "";

  const prompt = `Você é um chef e nutricionista. Crie uma receita prática e saborosa usando PRINCIPALMENTE os seguintes ingredientes: ${cleanIngredients.join(", ")}.
${goalContext}

Retorne APENAS JSON válido, sem markdown, sem texto extra:
{
  "name": "string (nome da receita em português)",
  "emoji": "string (1 emoji que representa a receita)",
  "prepTime": "string (ex: '20 minutos')",
  "servings": number (número de porções),
  "ingredients": ["string"] (lista de ingredientes com quantidades, em português),
  "steps": ["string"] (lista de passos do preparo, curtos e claros, em português, máximo 6 passos),
  "macros": {
    "calories": number (kcal por porção),
    "protein": number (g por porção, uma casa decimal),
    "carbs": number (g por porção, uma casa decimal),
    "fat": number (g por porção, uma casa decimal),
    "fiber": number (g por porção, uma casa decimal)
  },
  "tip": "string (1 dica nutricional ou de preparo, máximo 90 caracteres)"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 700,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    let parsed: {
      name: string; emoji: string; prepTime: string; servings: number;
      ingredients: string[]; steps: string[];
      macros: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
      tip: string;
    };

    try {
      parsed = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
    } catch {
      res.status(422).json({ error: "parse_error", message: "A IA não conseguiu gerar a receita. Tente novamente." });
      return;
    }

    if (!parsed.name || !Array.isArray(parsed.steps) || !parsed.macros) {
      res.status(422).json({ error: "incomplete_recipe", message: "Receita incompleta. Tente com outros ingredientes." });
      return;
    }

    res.json({
      name: String(parsed.name).slice(0, 200),
      emoji: String(parsed.emoji ?? "🍽️").slice(0, 8),
      prepTime: String(parsed.prepTime ?? "").slice(0, 50),
      servings: Math.max(1, Math.round(Number(parsed.servings) || 1)),
      ingredients: (parsed.ingredients ?? []).map((i: unknown) => String(i).slice(0, 200)).slice(0, 20),
      steps: (parsed.steps ?? []).map((s: unknown) => String(s).slice(0, 500)).slice(0, 8),
      macros: {
        calories: Math.max(0, Math.round(Number(parsed.macros.calories) || 0)),
        protein: Math.max(0, Math.round(Number(parsed.macros.protein) * 10) / 10),
        carbs: Math.max(0, Math.round(Number(parsed.macros.carbs) * 10) / 10),
        fat: Math.max(0, Math.round(Number(parsed.macros.fat) * 10) / 10),
        fiber: Math.max(0, Math.round(Number(parsed.macros.fiber) * 10) / 10),
      },
      tip: String(parsed.tip ?? "").slice(0, 150),
    });
  } catch (err: any) {
    if (err?.status === 429) {
      res.status(503).json({ error: "rate_limited", message: "Muitas requisições. Aguarde e tente novamente." });
      return;
    }
    res.status(500).json({ error: "internal_error", message: "Erro ao gerar receita. Tente novamente." });
  }
});

export default router;
