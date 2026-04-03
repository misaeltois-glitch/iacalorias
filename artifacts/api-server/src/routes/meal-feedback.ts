import { Router, type IRouter, type Request, type Response } from "express";
import { db, analysesTable, goalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const router: IRouter = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const OBJECTIVE_LABEL: Record<string, string> = {
  fat_loss: "emagrecimento / perda de gordura",
  muscle_gain: "ganho de massa muscular",
  maintenance: "manutenção do peso",
};

const MEAL_CONTEXT: Record<string, string> = {
  breakfast: "café da manhã",
  morning_snack: "lanche da manhã",
  lunch: "almoço",
  afternoon_snack: "lanche da tarde",
  dinner: "jantar",
  other: "refeição",
};

// POST /api/meal-feedback
router.post("/", async (req: Request, res: Response) => {
  const { analysisId, mealType, sessionId } = req.body as {
    analysisId?: string;
    mealType?: string;
    sessionId?: string;
  };

  if (!analysisId || !mealType) {
    res.status(400).json({ error: "bad_request", message: "analysisId e mealType são obrigatórios." });
    return;
  }

  const userId = req.user?.userId;

  // Fetch the analysis
  const analysis = await db.query.analysesTable.findFirst({
    where: eq(analysesTable.id, analysisId),
  });

  if (!analysis) {
    res.status(404).json({ error: "not_found", message: "Análise não encontrada." });
    return;
  }

  // Fetch user goals
  let goals = null;
  if (userId) {
    goals = await db.query.goalsTable.findFirst({ where: eq(goalsTable.userId, userId) });
  }
  if (!goals && sessionId) {
    goals = await db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId) });
  }

  const objectiveKey = goals?.objective ?? "maintenance";
  const objectiveLabel = OBJECTIVE_LABEL[objectiveKey] ?? "manutenção do peso";
  const mealLabel = MEAL_CONTEXT[mealType] ?? "refeição";

  const goalCalories = goals?.calories ?? 2000;
  const mealsPerDay = goals?.mealsPerDay ?? 3;
  const perMealCalories = Math.round(goalCalories / mealsPerDay);
  const goalProtein = goals?.protein ?? null;
  const perMealProtein = goalProtein ? Math.round(goalProtein / mealsPerDay) : null;

  const prompt = `Você é uma nutricionista especialista chamada Sofia. Analise esta refeição e dê um feedback personalizado, direto e motivador em português brasileiro.

REFEIÇÃO: ${analysis.dishName}
TIPO DE REFEIÇÃO: ${mealLabel}
CALORIAS: ${analysis.calories} kcal
PROTEÍNAS: ${analysis.protein}g | CARBOIDRATOS: ${analysis.carbs}g | GORDURAS: ${analysis.fat}g | FIBRAS: ${analysis.fiber ?? 0}g
SCORE DE SAÚDE: ${analysis.healthScore ?? 5}/10

OBJETIVO DO USUÁRIO: ${objectiveLabel}
META CALÓRICA DIÁRIA: ${goalCalories} kcal (equivale a ~${perMealCalories} kcal por refeição com ${mealsPerDay} refeições/dia)${perMealProtein ? `\nMETA DE PROTEÍNA POR REFEIÇÃO: ~${perMealProtein}g` : ""}

Responda SOMENTE com um JSON no formato abaixo, sem texto extra, sem markdown:
{
  "sentiment": "positive" | "neutral" | "negative",
  "message": "mensagem de 1-2 frases: diagnóstico direto sobre esta refeição para o objetivo do usuário, com tom positivo mas honesto",
  "tips": ["dica 1 de adição ou substituição específica", "dica 2 de adição ou substituição específica"]
}

Regras:
- sentiment "positive": refeição alinhada com objetivo (calorias ok, macros ok para objetivo)
- sentiment "neutral": razoável mas com pontos de melhora
- sentiment "negative": refeição problemática para o objetivo (excesso calórico, macros ruins para o objetivo)
- tips: máximo 2 dicas práticas e específicas (ex: "Adicione 1 ovo cozido para mais 6g de proteína" ou "Troque o suco por água com gás para economizar 120 kcal")
- Seja direto, não genérico. Cite os valores quando relevante.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    let feedback: { sentiment: string; message: string; tips: string[] };
    try {
      feedback = JSON.parse(raw);
    } catch {
      // Fallback if GPT doesn't return valid JSON
      feedback = {
        sentiment: "neutral",
        message: "Refeição registrada! Continue monitorando suas escolhas alimentares.",
        tips: [],
      };
    }

    res.json({
      sentiment: feedback.sentiment ?? "neutral",
      message: feedback.message ?? "",
      tips: Array.isArray(feedback.tips) ? feedback.tips.slice(0, 2) : [],
      mealType,
      objective: objectiveKey,
    });
  } catch (err: any) {
    req.log.error({ err }, "meal-feedback error");
    res.status(500).json({ error: "ai_error", message: "Não foi possível gerar o feedback. Tente novamente." });
  }
});

export default router;
