import { Router, type IRouter, type Request, type Response } from "express";
import OpenAI from "openai";
import { db, subscriptionsTable, analysesTable, goalsTable } from "@workspace/db";
import { eq, and, gte, lt } from "drizzle-orm";

const router: IRouter = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const DEV_EMAILS = new Set(["dev@iacalorias.com.br"]);

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
  const { sessionId, messages } = req.body as {
    sessionId?: string;
    messages?: Array<{ role: "user" | "assistant"; content: string }>;
  };
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

  const isDevAccount = !!(userEmail && DEV_EMAILS.has(userEmail));
  const tier = isDevAccount ? "unlimited" : await resolveSubTier(userId, sessionId);

  // Build today's context
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));

  let todayAnalyses: { dishName: string; calories: number; protein: number; carbs: number; fat: number; fiber: number | null }[] = [];
  let goals: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null; objective: string | null } | null = null;

  try {
    if (userId) {
      todayAnalyses = await db.query.analysesTable.findMany({
        where: and(eq(analysesTable.userId, userId), gte(analysesTable.createdAt, periodStart), lt(analysesTable.createdAt, periodEnd)),
        columns: { dishName: true, calories: true, protein: true, carbs: true, fat: true, fiber: true },
      });
    } else if (sessionId) {
      todayAnalyses = await db.query.analysesTable.findMany({
        where: and(eq(analysesTable.sessionId, sessionId!), gte(analysesTable.createdAt, periodStart), lt(analysesTable.createdAt, periodEnd)),
        columns: { dishName: true, calories: true, protein: true, carbs: true, fat: true, fiber: true },
      });
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

  const totals = todayAnalyses.reduce((a, m) => ({
    calories: a.calories + m.calories,
    protein: a.protein + m.protein,
    carbs: a.carbs + m.carbs,
    fat: a.fat + m.fat,
    fiber: a.fiber + (m.fiber ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const contextParts: string[] = [];
  if (todayAnalyses.length > 0) {
    contextParts.push(`Refeições de hoje (${todayAnalyses.length}): ${todayAnalyses.map(m => m.dishName).join(", ")}`);
    contextParts.push(`Consumido hoje: ${Math.round(totals.calories)} kcal | Prot ${totals.protein.toFixed(1)}g | Carbs ${totals.carbs.toFixed(1)}g | Gord ${totals.fat.toFixed(1)}g | Fibras ${totals.fiber.toFixed(1)}g`);
  } else {
    contextParts.push("Nenhuma refeição registrada hoje ainda.");
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

  const systemPrompt = `Você é Sofia, nutricionista clínica especialista em alimentação saudável e emagrecimento. Você faz parte do app IA Calorias.

Seja empática, direta e prática. Responda em português brasileiro. Respostas curtas (2-4 frases no máximo), a não ser que o usuário peça mais detalhes. Use linguagem acessível, não técnica demais.

${planNote}

CONTEXTO DO USUÁRIO HOJE:
${contextParts.join("\n")}

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
