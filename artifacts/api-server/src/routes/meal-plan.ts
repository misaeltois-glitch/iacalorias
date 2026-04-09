import { Router, type IRouter, type Request, type Response } from "express";
import { db, subscriptionsTable, goalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { getMasterTier } from "../lib/master-emails.js";

const router: IRouter = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function resolveSubTier(userId?: string, sessionId?: string): Promise<"free" | "limited" | "unlimited"> {
  if (userId) {
    const sub = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, userId),
      orderBy: (t, { desc: d }) => [d(t.updatedAt)],
    });
    if (sub) return sub.tier as "free" | "limited" | "unlimited";
  }
  if (sessionId) {
    const sub = await db.query.subscriptionsTable.findFirst({ where: eq(subscriptionsTable.sessionId, sessionId) });
    if (sub) return sub.tier as "free" | "limited" | "unlimited";
  }
  return "free";
}

// POST /api/meal-plan — generate a 7-day meal plan based on user goals
router.post("/", async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const userEmail = req.user?.email;
  const { sessionId, foodPrefs } = req.body as {
    sessionId?: string;
    foodPrefs?: Record<string, string[]>;
  };

  if (!sessionId && !userId) {
    res.status(400).json({ error: "bad_request" });
    return;
  }

  const masterTier = getMasterTier(req.user?.email);
  const isDevAccount = !!masterTier;
  const tier = masterTier ?? await resolveSubTier(userId, sessionId);
  if (tier === "free") {
    res.status(403).json({ error: "forbidden", message: "Planejamento semanal disponível apenas no plano pago" });
    return;
  }

  // Fetch user goals for context
  let goals: any = null;
  if (userId) {
    goals = await db.query.goalsTable.findFirst({
      where: eq(goalsTable.userId, userId),
      orderBy: (t, { desc: d }) => [d(t.updatedAt)],
    });
  }
  if (!goals && sessionId) {
    goals = await db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId) });
  }

  const calGoal = goals?.calories ?? 2000;
  const proteinGoal = goals?.protein ?? null;
  const carbsGoal = goals?.carbs ?? null;
  const fatGoal = goals?.fat ?? null;
  const fiberGoal = goals?.fiber ?? null;
  let restrictions: string[] = [];
  try {
    const raw = goals?.restrictions;
    if (Array.isArray(raw)) restrictions = raw;
    else if (typeof raw === "string" && raw.trim()) restrictions = JSON.parse(raw);
  } catch { restrictions = []; }

  const mealsPerDay = goals?.mealsPerDay ?? 3;
  const mealNames = mealsPerDay >= 5
    ? ["Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar"]
    : mealsPerDay >= 4
    ? ["Café da manhã", "Almoço", "Lanche da tarde", "Jantar"]
    : ["Café da manhã", "Almoço", "Jantar"];

  const macroLine = [
    `${calGoal} kcal/dia`,
    proteinGoal ? `${proteinGoal}g proteína` : null,
    carbsGoal ? `${carbsGoal}g carboidratos` : null,
    fatGoal ? `${fatGoal}g gordura` : null,
    fiberGoal ? `${fiberGoal}g fibra` : null,
  ].filter(Boolean).join(", ");

  const restrictionLine = restrictions.length > 0
    ? `Restrições/preferências: ${restrictions.join(", ")}.`
    : "Sem restrições alimentares específicas.";

  const mealLabels: Record<string, string> = {
    breakfast: "Café da manhã", morningSnack: "Lanche da manhã",
    lunch: "Almoço", afternoonSnack: "Lanche da tarde", dinner: "Jantar",
  };
  const foodPrefsLine = foodPrefs
    ? Object.entries(foodPrefs)
        .filter(([, foods]) => Array.isArray(foods) && (foods as string[]).length > 0)
        .map(([meal, foods]) => `${mealLabels[meal] ?? meal}: ${(foods as string[]).join(", ")}`)
        .join(" | ")
    : "";
  const foodPrefsPrompt = foodPrefsLine
    ? `\nPreferências alimentares do usuário (priorize esses alimentos no cardápio): ${foodPrefsLine}.`
    : "";

  const prompt = `Você é uma nutricionista brasileira chamada Sofia. Crie um plano de refeições para 7 dias (segunda a domingo) em JSON, com culinária brasileira variada, saudável e gostosa.

Metas nutricionais diárias: ${macroLine}.
${restrictionLine}${foodPrefsPrompt}
Refeições por dia: ${mealNames.join(", ")}.

Retorne APENAS o JSON no seguinte formato (sem markdown, sem explicações):
{
  "weekPlan": [
    {
      "day": "Segunda-feira",
      "meals": [
        {
          "name": "nome do prato",
          "mealType": "${mealNames[0]}",
          "calories": 400,
          "protein": 25,
          "carbs": 45,
          "fat": 12,
          "description": "breve descrição apetitosa de 1 frase"
        }
      ],
      "totalCalories": 2000,
      "totalProtein": 120
    }
  ]
}

Inclua todos os 7 dias. Use alimentos brasileiros comuns, variados por dia. Os totais diários devem ficar próximos das metas.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 6000,
      temperature: 0.85,
      response_format: { type: "json_object" },
    });

    const choice = completion.choices[0];
    const raw = choice?.message?.content ?? "{}";

    if (choice?.finish_reason === "length") {
      req.log?.warn?.("meal-plan truncated by max_tokens");
      res.status(500).json({ error: "parse_error", message: "Erro ao processar o cardápio" });
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      res.status(500).json({ error: "parse_error", message: "Erro ao processar o cardápio" });
      return;
    }

    res.json({
      weekPlan: parsed.weekPlan ?? [],
      goals: { calories: calGoal, protein: proteinGoal, carbs: carbsGoal, fat: fatGoal, fiber: fiberGoal },
    });
  } catch (err: any) {
    req.log?.error?.({ err }, "meal-plan generation failed");
    res.status(500).json({ error: "ai_error", message: "Erro ao gerar o cardápio" });
  }
});

// POST /api/meal-plan/shopping-list — generate consolidated ingredient list from a week plan
router.post("/shopping-list", async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { sessionId, weekPlan } = req.body as { sessionId?: string; weekPlan?: any[] };

  if (!weekPlan || !Array.isArray(weekPlan) || weekPlan.length === 0) {
    res.status(400).json({ error: "bad_request", message: "weekPlan é obrigatório" });
    return;
  }

  const masterTier = getMasterTier(req.user?.email);
  const tier = masterTier ?? await resolveSubTier(userId, sessionId);
  if (tier === "free") {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  // Flatten meal names for the prompt
  const mealList = weekPlan.flatMap((day: any) =>
    (day.meals ?? []).map((m: any) => m.name)
  ).join('\n');

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: `Você é um nutricionista. Com base nas refeições listadas, crie uma lista de compras consolidada para a semana. Agrupe os ingredientes por categoria. Retorne APENAS JSON neste formato:
{
  "categories": [
    { "name": "Proteínas", "emoji": "🥩", "items": ["Frango (1kg)", "Ovos (1 dúzia)"] },
    { "name": "Carboidratos", "emoji": "🍚", "items": ["Arroz integral (1kg)", "Aveia (500g)"] },
    { "name": "Legumes e Verduras", "emoji": "🥦", "items": ["Brócolis", "Cenoura"] },
    { "name": "Frutas", "emoji": "🍌", "items": ["Banana (cacho)", "Maçã (6 un)"] },
    { "name": "Laticínios", "emoji": "🥛", "items": ["Leite desnatado (1L)", "Iogurte natural (400g)"] },
    { "name": "Outros", "emoji": "🧴", "items": ["Azeite de oliva", "Sal, Pimenta"] }
  ]
}
Inclua apenas itens necessários para as refeições. Consolide duplicatas. Estime quantidades para a semana toda.`,
        },
        { role: "user", content: `Refeições da semana:\n${mealList}` },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch {
      res.status(500).json({ error: "parse_error", message: "Erro ao processar a lista" });
      return;
    }

    res.json({ categories: parsed.categories ?? [] });
  } catch (err: any) {
    req.log?.error?.({ err }, "shopping-list generation failed");
    res.status(500).json({ error: "ai_error", message: "Erro ao gerar a lista de compras" });
  }
});

export default router;
