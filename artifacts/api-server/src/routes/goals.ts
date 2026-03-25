import { Router, type IRouter, type Request, type Response } from "express";
import { db, subscriptionsTable, analysesTable, goalsTable } from "@workspace/db";
import { eq, gte, and } from "drizzle-orm";
import OpenAI from "openai";

const router: IRouter = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── GET /api/goals — Fetch current goals ─────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) { res.status(400).json({ error: "bad_request", message: "sessionId required" }); return; }

  const sub = await db.query.subscriptionsTable.findFirst({ where: eq(subscriptionsTable.sessionId, sessionId) });
  const tier = sub?.tier ?? "free";
  if (tier === "free") {
    res.status(403).json({ error: "plan_required", message: "Metas disponíveis apenas em planos pagos.", requiresUpgrade: true });
    return;
  }

  const goals = await db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId) });
  res.json(goals ?? null);
});

// ── POST /api/goals — Save / Update goals ────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const { sessionId, calories, protein, carbs, fat, fiber, weight, height, age, sex, objective, activityLevel, restrictions } = req.body;
  if (!sessionId) { res.status(400).json({ error: "bad_request", message: "sessionId required" }); return; }

  const sub = await db.query.subscriptionsTable.findFirst({ where: eq(subscriptionsTable.sessionId, sessionId) });
  const tier = sub?.tier ?? "free";
  if (tier === "free") {
    res.status(403).json({ error: "plan_required", message: "Metas disponíveis apenas em planos pagos.", requiresUpgrade: true });
    return;
  }

  const existing = await db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId) });
  const payload = {
    sessionId, calories, protein, carbs, fat, fiber,
    weight, height, age, sex, objective, activityLevel,
    restrictions: Array.isArray(restrictions) ? JSON.stringify(restrictions) : restrictions,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(goalsTable).set(payload).where(eq(goalsTable.sessionId, sessionId));
  } else {
    await db.insert(goalsTable).values(payload);
  }

  res.json({ ok: true });
});

// ── GET /api/goals/daily-summary — Today's intake vs. goals + AI summary ────
router.get("/daily-summary", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) { res.status(400).json({ error: "bad_request", message: "sessionId required" }); return; }

  const sub = await db.query.subscriptionsTable.findFirst({ where: eq(subscriptionsTable.sessionId, sessionId) });
  const tier = sub?.tier ?? "free";
  if (tier === "free") {
    res.status(403).json({ error: "plan_required", message: "Resumo disponível apenas em planos pagos.", requiresUpgrade: true });
    return;
  }

  const goals = await db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId) });

  // Get today's analyses (midnight BRT — UTC-3)
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const todayAnalyses = await db.query.analysesTable.findMany({
    where: and(
      eq(analysesTable.sessionId, sessionId),
      gte(analysesTable.createdAt, startOfDay)
    ),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  const totals = todayAnalyses.reduce((acc, a) => ({
    calories: acc.calories + a.calories,
    protein: acc.protein + a.protein,
    carbs: acc.carbs + a.carbs,
    fat: acc.fat + a.fat,
    fiber: acc.fiber + (a.fiber ?? 0),
    meals: acc.meals + 1,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: 0 });

  // Alerts engine
  const alerts: { type: 'tip' | 'warning' | 'ok'; macro: string; message: string }[] = [];
  if (goals) {
    const hour = now.getHours();

    if (goals.protein && totals.meals > 0) {
      const remaining = goals.protein - totals.protein;
      if (remaining > 20 && hour >= 20) {
        alerts.push({ type: 'tip', macro: 'protein', message: `Você ainda tem espaço para ~${Math.round(remaining)}g de proteína hoje. Que tal um iogurte grego ou ovos no jantar?` });
      }
    }
    if (goals.fiber && totals.fiber < goals.fiber * 0.5 && hour >= 18) {
      alerts.push({ type: 'tip', macro: 'fiber', message: `Sua ingestão de fibras está abaixo da meta hoje (${Math.round(totals.fiber)}g de ${goals.fiber}g). Adicionar leguminosas ou frutas ajudaria.` });
    }
    if (goals.carbs && totals.carbs > goals.carbs * 1.3) {
      alerts.push({ type: 'warning', macro: 'carbs', message: `Carboidratos ultrapassaram 30% acima da meta de hoje. Prefira fontes integrais nas próximas refeições.` });
    }
    if (goals.calories && totals.calories > goals.calories * 1.3) {
      alerts.push({ type: 'warning', macro: 'calories', message: `Calorias totais ultrapassaram 30% acima da sua meta diária. Opte por alimentos de alto volume e baixa caloria nas próximas refeições.` });
    }
    if (totals.protein > 0 && goals.protein && totals.protein >= goals.protein * 0.9) {
      alerts.push({ type: 'ok', macro: 'protein', message: `Ótimo trabalho com a proteína hoje! Você está chegando perto da sua meta de ${goals.protein}g.` });
    }
  }

  // Generate AI summary if there are analyses and goals
  let aiSummary: string | null = null;
  if (goals && todayAnalyses.length >= 1) {
    try {
      const prompt = `Você é uma nutricionista clínica empática e experiente. Analise o dia alimentar abaixo e gere um resumo de no máximo 3 frases com tom acolhedor, sem julgamentos, com sugestões práticas para a próxima refeição.

METAS DO DIA:
- Calorias: ${goals.calories ?? 'não definida'} kcal
- Proteína: ${goals.protein ?? 'não definida'}g
- Carboidratos: ${goals.carbs ?? 'não definida'}g
- Gordura: ${goals.fat ?? 'não definida'}g
- Fibras: ${goals.fiber ?? 'não definida'}g

CONSUMIDO HOJE (${totals.meals} refeição${totals.meals !== 1 ? 'ões' : ''}):
- Calorias: ${Math.round(totals.calories)} kcal
- Proteína: ${totals.protein.toFixed(1)}g
- Carboidratos: ${totals.carbs.toFixed(1)}g
- Gordura: ${totals.fat.toFixed(1)}g
- Fibras: ${totals.fiber.toFixed(1)}g

Refeições: ${todayAnalyses.map(a => a.dishName).join(', ')}

Retorne APENAS o texto do resumo, sem títulos, sem bullet points, sem markdown.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      });
      aiSummary = response.choices[0]?.message?.content?.trim() ?? null;
    } catch (err) {
      req.log.error({ err }, "Failed to generate AI summary");
    }
  }

  res.json({
    totals,
    goals: goals ? {
      calories: goals.calories, protein: goals.protein, carbs: goals.carbs,
      fat: goals.fat, fiber: goals.fiber, objective: goals.objective,
    } : null,
    alerts,
    aiSummary,
    analysesCount: todayAnalyses.length,
    lastMealAt: todayAnalyses.length > 0 ? todayAnalyses[todayAnalyses.length - 1].createdAt : null,
  });
});

export default router;
