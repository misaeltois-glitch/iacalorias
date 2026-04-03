import { Router, type IRouter, type Request, type Response } from "express";
import OpenAI from "openai";
import { db, subscriptionsTable, analysesTable, goalsTable } from "@workspace/db";
import { eq, and, gte, lt } from "drizzle-orm";
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

// POST /api/chat
// Body: { sessionId: string, messages: [{role: "user"|"assistant", content: string}] }
router.post("/", async (req: Request, res: Response) => {
  const { sessionId, messages, tzOffset: rawTzOffset, foodPrefs, supportMode } = req.body as {
    sessionId?: string;
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
    tzOffset?: number;
    foodPrefs?: Record<string, string[]>;
    supportMode?: boolean;
  };
  // tzOffset: minutes behind UTC (e.g. 180 for UTC-3 Brazil)
  const tzOffset = Math.max(-840, Math.min(840, Number(rawTzOffset) || 0));
  const tzOffsetMs = tzOffset * 60 * 1000;
  const userId = req.user?.userId;
  const userEmail = req.user?.email;

  if (!sessionId && !userId) {
    res.status(400).json({ error: "bad_request", message: "sessionId is required" });
    return;
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "bad_request", message: "messages are required" });
    return;
  }

  // Limit history to last 20 messages to avoid token bloat
  const trimmedMessages = messages.slice(-20);

  const masterTier = getMasterTier(req.user?.email);
  const isDevAccount = !!masterTier;
  const tier = masterTier ?? await resolveSubTier(userId, sessionId);

  // Build context using local timezone
  // tzOffsetMs converts UTC to local: local_midnight_UTC = UTC_midnight + tzOffsetMs
  const localNow = new Date(Date.now() - tzOffsetMs); // current moment in local "UTC" frame
  const todayStart  = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(),     0, 0, 0, 0) + tzOffsetMs);
  const todayEnd    = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() + 1, 0, 0, 0, 0) + tzOffsetMs);
  const yesterStart = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate() - 1, 0, 0, 0, 0) + tzOffsetMs);

  type MealRow = { dishName: string; calories: number; protein: number; carbs: number; fat: number; fiber: number | null };
  let todayAnalyses: MealRow[] = [];
  let yesterdayAnalyses: MealRow[] = [];
  let goals: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null; objective: string | null } | null = null;

  const mealCols = { dishName: true, calories: true, protein: true, carbs: true, fat: true, fiber: true } as const;

  try {
    if (userId) {
      [todayAnalyses, yesterdayAnalyses] = await Promise.all([
        db.query.analysesTable.findMany({ where: and(eq(analysesTable.userId, userId), gte(analysesTable.createdAt, todayStart),  lt(analysesTable.createdAt, todayEnd)),  columns: mealCols }),
        db.query.analysesTable.findMany({ where: and(eq(analysesTable.userId, userId), gte(analysesTable.createdAt, yesterStart), lt(analysesTable.createdAt, todayStart)), columns: mealCols }),
      ]);
    } else if (sessionId) {
      [todayAnalyses, yesterdayAnalyses] = await Promise.all([
        db.query.analysesTable.findMany({ where: and(eq(analysesTable.sessionId, sessionId!), gte(analysesTable.createdAt, todayStart),  lt(analysesTable.createdAt, todayEnd)),  columns: mealCols }),
        db.query.analysesTable.findMany({ where: and(eq(analysesTable.sessionId, sessionId!), gte(analysesTable.createdAt, yesterStart), lt(analysesTable.createdAt, todayStart)), columns: mealCols }),
      ]);
    }

    const goalsRow = userId
      ? await db.query.goalsTable.findFirst({ where: eq(goalsTable.userId, userId), orderBy: (t, { desc }) => [desc(t.updatedAt)] })
      : sessionId ? await db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId!) }) : null;

    if (goalsRow) {
      goals = { calories: goalsRow.calories ?? null, protein: goalsRow.protein ?? null, carbs: goalsRow.carbs ?? null, fat: goalsRow.fat ?? null, fiber: goalsRow.fiber ?? null, objective: goalsRow.objective ?? null };
    }
  } catch {
    // Context fetch failed — continue without it
  }

  const sum = (meals: MealRow[]) => meals.reduce((a, m) => ({
    calories: a.calories + m.calories,
    protein:  a.protein  + m.protein,
    carbs:    a.carbs    + m.carbs,
    fat:      a.fat      + m.fat,
    fiber:    a.fiber    + (m.fiber ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const todayTotals = sum(todayAnalyses);
  const yesterdayTotals = sum(yesterdayAnalyses);

  const contextParts: string[] = [];

  // Today
  if (todayAnalyses.length > 0) {
    contextParts.push(`Refeições de HOJE (${todayAnalyses.length}): ${todayAnalyses.map(m => m.dishName).join(", ")}`);
    contextParts.push(`Consumido hoje: ${Math.round(todayTotals.calories)} kcal | Prot ${todayTotals.protein.toFixed(1)}g | Carbs ${todayTotals.carbs.toFixed(1)}g | Gord ${todayTotals.fat.toFixed(1)}g | Fibras ${todayTotals.fiber.toFixed(1)}g`);
  } else {
    contextParts.push("Hoje: nenhuma refeição registrada ainda.");
  }

  // Yesterday
  if (yesterdayAnalyses.length > 0) {
    contextParts.push(`Refeições de ONTEM (${yesterdayAnalyses.length}): ${yesterdayAnalyses.map(m => m.dishName).join(", ")}`);
    contextParts.push(`Consumido ontem: ${Math.round(yesterdayTotals.calories)} kcal | Prot ${yesterdayTotals.protein.toFixed(1)}g | Carbs ${yesterdayTotals.carbs.toFixed(1)}g | Gord ${yesterdayTotals.fat.toFixed(1)}g | Fibras ${yesterdayTotals.fiber.toFixed(1)}g`);
    if (goals?.calories) {
      const diff = yesterdayTotals.calories - goals.calories;
      if (diff < -50) contextParts.push(`Ontem o usuário ficou ${Math.abs(Math.round(diff))} kcal abaixo da meta calórica.`);
      else if (diff > 50) contextParts.push(`Ontem o usuário consumiu ${Math.round(diff)} kcal acima da meta calórica.`);
      else contextParts.push("Ontem o usuário bateu a meta calórica.");
    }
  }

  if (goals) {
    const goalParts = [`Meta calórica: ${goals.calories ?? "não definida"} kcal`];
    if (goals.protein) goalParts.push(`Proteína: ${goals.protein}g`);
    if (goals.carbs) goalParts.push(`Carboidratos: ${goals.carbs}g`);
    if (goals.fat) goalParts.push(`Gordura: ${goals.fat}g`);
    if (goals.fiber) goalParts.push(`Fibras: ${goals.fiber}g`);
    if (goals.objective) goalParts.push(`Objetivo: ${goals.objective}`);
    contextParts.push(`Metas diárias — ${goalParts.join(" | ")}`);
  }

  const planNote = tier === "free"
    ? "O usuário está no plano gratuito."
    : tier === "limited"
    ? "O usuário está no plano Limitado (20 análises/mês)."
    : "O usuário está no plano Ilimitado.";

  const mealLabels: Record<string, string> = {
    breakfast: "Café da manhã", morningSnack: "Lanche da manhã",
    lunch: "Almoço", afternoonSnack: "Lanche da tarde", dinner: "Jantar",
  };
  const foodPrefsLines = foodPrefs
    ? Object.entries(foodPrefs)
        .filter(([, foods]) => Array.isArray(foods) && foods.length > 0)
        .map(([meal, foods]) => `- ${mealLabels[meal] ?? meal}: ${(foods as string[]).join(", ")}`)
    : [];
  const foodPrefsContext = foodPrefsLines.length > 0
    ? `\nPREFERÊNCIAS ALIMENTARES DO USUÁRIO:\n${foodPrefsLines.join("\n")}`
    : "";

  const systemPrompt = supportMode
    ? `Você é Sofia, assistente de suporte do app IA Calorias. Responda em português brasileiro.

Sobre o IA Calorias:
- App de nutrição com IA que analisa refeições por foto
- Plano Grátis: 7 dias de teste ilimitado
- Plano Limitado: R$19,90/mês — 20 análises/mês
- Plano Ilimitado: R$29,90/mês — análises ilimitadas, cardápio semanal, treinos IA, Sofia ilimitada
- Pagamento via cartão de crédito (Stripe), PIX em breve
- Para cancelar: acessar Perfil → Assinatura ou contatar o suporte

Funcionalidades principais:
- Análise de refeição por foto (IA identifica macros e calorias)
- Chat com nutricionista Sofia (plano pago ou teste)
- Cardápio semanal gerado por IA (plano Ilimitado)
- Tracker de água, peso, streak de dias
- Treino do Dia personalizado por IA
- Relatório semanal por email (plano Ilimitado)

Regras:
- Seja empática e direta, respostas de 2-4 frases
- Para cancelamento, reembolso ou problemas de cobrança: SEMPRE oriente a contatar o suporte humano via WhatsApp (11) 95653-8845 ou email atendimento.iacalorias@hotmail.com
- Não invente funcionalidades que não existem`
    : `Você é Sofia, nutricionista clínica especialista em alimentação saudável e emagrecimento. Você faz parte do app IA Calorias.

Seja empática, direta e prática. Responda em português brasileiro. Respostas curtas (2-4 frases no máximo), a não ser que o usuário peça mais detalhes. Use linguagem acessível, não técnica demais.

IMPORTANTE — use sempre o tempo verbal correto:
- Ao falar do que aconteceu ONTEM use pretérito perfeito: "você consumiu", "você ficou abaixo", "ontem não bateu".
- Ao falar do que está acontecendo HOJE use presente: "você está", "hoje você consumiu até agora".
- Nunca confunda os dois dias.

${planNote}

CONTEXTO NUTRICIONAL DO USUÁRIO:
${contextParts.join("\n")}${foodPrefsContext}

Você pode dar conselhos sobre alimentação, substituições, receitas, timing de refeições, hidratação, suplementação básica e interpretação dos macronutrientes. Não diagnostique doenças. Se a pergunta for médica ou clínica, oriente a consultar um profissional de saúde presencialmente.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedMessages,
      ],
      max_tokens: 400,
      temperature: 0.75,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "Desculpe, não consegui gerar uma resposta. Tente novamente.";
    res.json({ reply });
  } catch (err: any) {
    req.log.error({ err }, "Error generating chat response");
    if (err?.status === 429) {
      res.status(503).json({ error: "rate_limited", message: "Muitas requisições. Aguarde um momento." });
      return;
    }
    res.status(500).json({ error: "internal_error", message: "Erro ao gerar resposta. Tente novamente." });
  }
});

export default router;
