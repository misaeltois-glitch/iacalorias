import { Router, type IRouter, type Request, type Response } from "express";
import { db, analysesTable, goalsTable } from "@workspace/db";
import { eq, desc, and, gte, lt } from "drizzle-orm";
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

  // ─── Today's accumulated intake before this meal ─────────────────────────────
  let todayBefore = { calories: 0, protein: 0 };
  let todayMealsCount = 0;
  try {
    const todayStart = new Date(analysis.createdAt);
    todayStart.setHours(0, 0, 0, 0);
    const prevMeals = userId
      ? await db.query.analysesTable.findMany({
          where: and(
            eq(analysesTable.userId, userId),
            gte(analysesTable.createdAt, todayStart),
            lt(analysesTable.createdAt, analysis.createdAt)
          ),
          columns: { calories: true, protein: true },
        })
      : sessionId
      ? await db.query.analysesTable.findMany({
          where: and(
            eq(analysesTable.sessionId, sessionId),
            gte(analysesTable.createdAt, todayStart),
            lt(analysesTable.createdAt, analysis.createdAt)
          ),
          columns: { calories: true, protein: true },
        })
      : [];
    todayMealsCount = prevMeals.length;
    todayBefore = prevMeals.reduce(
      (acc: { calories: number; protein: number }, m: { calories: number; protein: number }) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
      }),
      { calories: 0, protein: 0 }
    );
  } catch {}

  // ─── Behavioral context ───────────────────────────────────────────────────────
  // Query previous analyses (before this one) to understand the user's pattern
  let daysSinceLastLog: number | null = null;
  let streakDays = 0;
  let totalLogsCount = 0;

  try {
    const recentLogs = await (userId
      ? db.query.analysesTable.findMany({
          where: eq(analysesTable.userId, userId),
          orderBy: [desc(analysesTable.createdAt)],
          limit: 60,
          columns: { createdAt: true },
        })
      : sessionId
      ? db.query.analysesTable.findMany({
          where: eq(analysesTable.sessionId, sessionId),
          orderBy: [desc(analysesTable.createdAt)],
          limit: 60,
          columns: { createdAt: true },
        })
      : Promise.resolve([]));

    totalLogsCount = recentLogs.length;

    // Find the analysis BEFORE the current one (the one just registered)
    const previousLogs = recentLogs.filter((r: { createdAt: Date }) => r.createdAt < analysis.createdAt);
    if (previousLogs.length > 0) {
      const msPerDay = 86400000;
      daysSinceLastLog = Math.floor(
        (analysis.createdAt.getTime() - previousLogs[0].createdAt.getTime()) / msPerDay
      );
    }

    // Compute streak: consecutive days with logs (from today back)
    const daySet = new Set(recentLogs.map((r: { createdAt: Date }) => r.createdAt.toISOString().slice(0, 10)));
    const today = analysis.createdAt.toISOString().slice(0, 10);
    let checkDate = new Date(analysis.createdAt);
    while (true) {
      const key = checkDate.toISOString().slice(0, 10);
      if (daySet.has(key)) {
        streakDays++;
        checkDate = new Date(checkDate.getTime() - 86400000);
      } else {
        if (key === today) { checkDate = new Date(checkDate.getTime() - 86400000); continue; }
        break;
      }
      if (streakDays > 365) break;
    }
  } catch {
    // Continue without behavioral data
  }

  // Build situation note for Evellyn
  const isNewUser = totalLogsCount <= 3;
  const isReturningAfterAbsence = !isNewUser && daysSinceLastLog !== null && daysSinceLastLog >= 3;
  const calPct = analysis.calories / perMealCalories;
  const isMealOverBudget = calPct > 1.4;
  const isMealUnderBudget = calPct < 0.5;

  let situationNote = "";
  if (isNewUser) {
    situationNote = `\nCONTEXTO: Usuário novo (${totalLogsCount} registro(s) no total). Celebre o gesto de registrar — isso já é o maior passo. Tom acolhedor.`;
  } else if (isReturningAfterAbsence) {
    situationNote = `\nCONTEXTO: Voltou a registrar depois de ${daysSinceLastLog} dia(s) sem anotar. NÃO mencione a ausência como falha. Reconheça a volta de forma positiva — "você voltou" já é suficiente. Tom: aliviado, encorajador.`;
  } else if (streakDays >= 7) {
    situationNote = `\nCONTEXTO: Streak de ${streakDays} dias consecutivos. Pessoa comprometida. Reconheça a consistência na mensagem.`;
  } else if (isMealOverBudget) {
    situationNote = `\nCONTEXTO: Esta refeição está bem acima do orçamento calórico por refeição. Seja honesta mas sem dramatizar — foque no que ainda dá para fazer no restante do dia.`;
  } else if (isMealUnderBudget) {
    situationNote = `\nCONTEXTO: Esta refeição está bem abaixo do esperado — pode ser correria ou restrição excessiva. Se for jantar ou lanche, sugira complementar. Não elogie comer pouco.`;
  }

  const prompt = `Você é a Evellyn, nutricionista do app IA Calorias. Sua especialidade é ajudar pessoas com rotina corrida que não conseguem seguir uma dieta perfeita — e você NUNCA julga, apenas orienta com empatia real e praticidade.

QUEM É ESSE USUÁRIO (contexto que você sempre leva em conta):
- Pessoa ocupada, que às vezes come o que tem, não o que quer
- Pode ter negligenciado a alimentação hoje por falta de tempo
- Precisa de validação honesta, não de sermão
- Quer saber o que fazer de forma simples, não uma lista de regras

REFEIÇÃO REGISTRADA:
Prato: ${analysis.dishName}
Horário: ${mealLabel}
Calorias: ${analysis.calories} kcal (meta por refeição: ~${perMealCalories} kcal)
Proteína: ${analysis.protein}g${perMealProtein ? ` (meta: ~${perMealProtein}g)` : ""} | Carbs: ${analysis.carbs}g | Gordura: ${analysis.fat}g | Fibras: ${analysis.fiber ?? 0}g
Score de saúde: ${analysis.healthScore ?? 5}/10

OBJETIVO: ${objectiveLabel}
META CALÓRICA DIÁRIA: ${goalCalories} kcal (${mealsPerDay} refeições/dia)
${todayMealsCount > 0 ? `Acumulado hoje antes desta refeição (${todayMealsCount} refeição(ões)): ${Math.round(todayBefore.calories)} kcal | Proteína: ${todayBefore.protein.toFixed(1)}g
Saldo do dia com esta refeição: ${Math.round(todayBefore.calories + analysis.calories)} kcal de ${goalCalories} kcal (${Math.round(((todayBefore.calories + analysis.calories) / goalCalories) * 100)}% da meta)` : "Primeira refeição registrada hoje."}
${situationNote}
Responda SOMENTE com JSON, sem texto extra, sem markdown:
{
  "sentiment": "positive" | "neutral" | "negative",
  "message": "1-2 frases que soam como uma amiga nutricionista falando pelo WhatsApp. Comece reconhecendo a realidade (sem julgamento), depois o diagnóstico honesto sobre o quanto essa refeição ajuda no objetivo. Cite o prato pelo nome. Use linguagem informal ('tá', 'né', 'cara' quando soar natural). Ex positivo: 'Que ${analysis.dishName} caprichado! Proteína dentro da meta e ainda sobrou espaço pra um lanchinho à tarde — tá indo bem.' Ex negativo: 'Esse ${analysis.dishName} tá pesado em caloria pra esse horário — vai apertar a meta hoje, mas um jantar leve equilibra.'",
  "tips": ["dica 1 ultra-prática (menos de 2 min de esforço), específica para este prato e este objetivo, com o ganho concreto em números quando possível", "dica 2 opcional — só inclua se realmente agregar algo diferente da dica 1, senão retorne string vazia"]
}

REGRAS de sentimento:
- "positive": refeição alinhada com objetivo (calorias ±20% da meta por refeição, macros razoáveis)
- "neutral": razoável mas com 1-2 ajustes simples
- "negative": refeição que vai dificultar o objetivo (excesso calórico claro, ou proteína muito abaixo da meta em ganho de massa)

REGRAS de tom:
- NUNCA use termos clínicos ("ingesta", "macronutrientes", "lipídios", "carboidratos complexos")
- NUNCA fale "você deveria" — prefira "uma dica" ou "experimenta"
- SEMPRE cite o prato pelo nome, nunca diga "essa refeição"
- Seja específico com números quando relevante: "economiza 140 kcal", "+8g de proteína"
- Se a pessoa comeu uma pizza ou um lanche e está dentro da meta, celebre — não minimize`;

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
