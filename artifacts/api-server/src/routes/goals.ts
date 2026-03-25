import { Router, type IRouter, type Request, type Response } from "express";
import { db, subscriptionsTable, analysesTable, goalsTable } from "@workspace/db";
import { eq, gte, and } from "drizzle-orm";
import OpenAI from "openai";

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

async function findGoals(userId?: string, sessionId?: string) {
  if (userId) {
    const goals = await db.query.goalsTable.findFirst({ where: eq(goalsTable.userId, userId) });
    if (goals) return goals;
  }
  if (sessionId) {
    return db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId) });
  }
  return null;
}

// ── GET /api/goals ─────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const userId = req.user?.userId;

  if (!sessionId && !userId) { res.status(400).json({ error: "bad_request", message: "sessionId required" }); return; }

  const tier = await resolveSubTier(userId, sessionId);
  if (tier === "free") {
    res.status(403).json({ error: "plan_required", message: "Metas disponíveis apenas em planos pagos.", requiresUpgrade: true });
    return;
  }

  const goals = await findGoals(userId, sessionId);
  res.json(goals ?? null);
});

// ── POST /api/goals ────────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const { sessionId, calories, protein, carbs, fat, fiber, weight, height, age, sex, objective, activityLevel, restrictions } = req.body;
  const userId = req.user?.userId;

  if (!sessionId && !userId) { res.status(400).json({ error: "bad_request", message: "sessionId required" }); return; }

  const tier = await resolveSubTier(userId, sessionId);
  if (tier === "free") {
    res.status(403).json({ error: "plan_required", message: "Metas disponíveis apenas em planos pagos.", requiresUpgrade: true });
    return;
  }

  const restrictionsStr = Array.isArray(restrictions) ? JSON.stringify(restrictions) : restrictions;

  const existing = await findGoals(userId, sessionId);

  if (existing) {
    await db.update(goalsTable)
      .set({ calories, protein, carbs, fat, fiber, weight, height, age, sex, objective, activityLevel, restrictions: restrictionsStr, userId: userId ?? existing.userId, updatedAt: new Date() })
      .where(eq(goalsTable.sessionId, existing.sessionId));
  } else {
    const effectiveSessionId = sessionId ?? `user-${userId}`;
    await db.insert(goalsTable).values({
      sessionId: effectiveSessionId,
      userId: userId ?? null,
      calories, protein, carbs, fat, fiber, weight, height, age, sex, objective, activityLevel,
      restrictions: restrictionsStr,
      updatedAt: new Date(),
    });
  }

  res.json({ ok: true });
});

// ── GET /api/goals/daily-summary ───────────────────────────────────────────────
router.get("/daily-summary", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const userId = req.user?.userId;

  if (!sessionId && !userId) { res.status(400).json({ error: "bad_request", message: "sessionId required" }); return; }

  const tier = await resolveSubTier(userId, sessionId);
  if (tier === "free") {
    res.status(403).json({ error: "plan_required", message: "Resumo disponível apenas em planos pagos.", requiresUpgrade: true });
    return;
  }

  const goals = await findGoals(userId, sessionId);

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  let todayAnalyses;
  if (userId) {
    todayAnalyses = await db.query.analysesTable.findMany({
      where: and(eq(analysesTable.userId, userId), gte(analysesTable.createdAt, startOfDay)),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });
  } else {
    todayAnalyses = await db.query.analysesTable.findMany({
      where: and(eq(analysesTable.sessionId, sessionId!), gte(analysesTable.createdAt, startOfDay)),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });
  }

  const totals = todayAnalyses.reduce((acc, a) => ({
    calories: acc.calories + a.calories,
    protein: acc.protein + a.protein,
    carbs: acc.carbs + a.carbs,
    fat: acc.fat + a.fat,
    fiber: acc.fiber + (a.fiber ?? 0),
    meals: acc.meals + 1,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: 0 });

  const alerts: { type: "tip" | "warning" | "ok"; macro: string; message: string }[] = [];
  if (goals) {
    const hour = now.getHours();
    if (goals.protein && totals.meals > 0) {
      const remaining = goals.protein - totals.protein;
      if (remaining > 20 && hour >= 20) {
        alerts.push({ type: "tip", macro: "protein", message: `Você ainda tem espaço para ~${Math.round(remaining)}g de proteína hoje. Que tal iogurte grego ou ovos no jantar?` });
      }
    }
    if (goals.fiber && totals.fiber < goals.fiber * 0.5 && hour >= 18) {
      alerts.push({ type: "tip", macro: "fiber", message: `Fibras abaixo da meta hoje (${Math.round(totals.fiber)}g de ${goals.fiber}g). Adicione leguminosas ou frutas.` });
    }
    if (goals.carbs && totals.carbs > goals.carbs * 1.3) {
      alerts.push({ type: "warning", macro: "carbs", message: `Carboidratos ultrapassaram 30% acima da meta. Prefira integrais nas próximas refeições.` });
    }
    if (goals.calories && totals.calories > goals.calories * 1.3) {
      alerts.push({ type: "warning", macro: "calories", message: `Calorias 30% acima da meta diária. Opte por alimentos de alto volume e baixa caloria.` });
    }
    if (totals.protein > 0 && goals.protein && totals.protein >= goals.protein * 0.9) {
      alerts.push({ type: "ok", macro: "protein", message: `Ótimo com a proteína hoje! Chegando perto da meta de ${goals.protein}g.` });
    }
  }

  let aiSummary: string | null = null;
  if (goals && todayAnalyses.length >= 1) {
    try {
      const prompt = `Você é uma nutricionista clínica empática. Analise o dia e gere um resumo em até 3 frases com tom acolhedor, sem julgamentos, com sugestões práticas.

METAS: Cal ${goals.calories ?? "?"} kcal | Prot ${goals.protein ?? "?"}g | Carbs ${goals.carbs ?? "?"}g | Gorд ${goals.fat ?? "?"}g | Fibras ${goals.fiber ?? "?"}g
CONSUMIDO (${totals.meals} refeição${totals.meals !== 1 ? "ões" : ""}): Cal ${Math.round(totals.calories)} kcal | Prot ${totals.protein.toFixed(1)}g | Carbs ${totals.carbs.toFixed(1)}g | Gord ${totals.fat.toFixed(1)}g | Fibras ${totals.fiber.toFixed(1)}g
Refeições: ${todayAnalyses.map((a) => a.dishName).join(", ")}

Retorne APENAS o texto do resumo, sem títulos, sem bullets, sem markdown.`;

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
    goals: goals ? { calories: goals.calories, protein: goals.protein, carbs: goals.carbs, fat: goals.fat, fiber: goals.fiber, objective: goals.objective } : null,
    alerts,
    aiSummary,
    analysesCount: todayAnalyses.length,
    lastMealAt: todayAnalyses.length > 0 ? todayAnalyses[todayAnalyses.length - 1].createdAt : null,
  });
});

export default router;
