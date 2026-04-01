import { Router, type IRouter, type Request, type Response } from "express";
import { db, subscriptionsTable, analysesTable, goalsTable } from "@workspace/db";
import { eq, gte, and, lt, or, inArray, isNull } from "drizzle-orm";
import OpenAI from "openai";

const DEV_EMAILS = new Set(["dev@iacalorias.com.br"]);

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
    const goals = await db.query.goalsTable.findFirst({
      where: eq(goalsTable.userId, userId),
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    });
    if (goals) return goals;
  }
  if (sessionId) {
    return db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId) });
  }
  return null;
}

function withPerMeal(goals: typeof goalsTable.$inferSelect | null) {
  if (!goals) return null;
  const mpd = goals.mealsPerDay ?? 3;
  return {
    ...goals,
    mealsPerDay: mpd,
    caloriesPerMeal: goals.calories ? Math.round(goals.calories / mpd) : null,
    proteinPerMeal: goals.protein ? Math.round((goals.protein / mpd) * 10) / 10 : null,
    carbsPerMeal: goals.carbs ? Math.round((goals.carbs / mpd) * 10) / 10 : null,
    fatPerMeal: goals.fat ? Math.round((goals.fat / mpd) * 10) / 10 : null,
    fiberPerMeal: goals.fiber ? Math.round((goals.fiber / mpd) * 10) / 10 : null,
  };
}

// ── GET /api/goals ─────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const userId = req.user?.userId;
  const userEmail = req.user?.email;

  if (!sessionId && !userId) { res.status(400).json({ error: "bad_request", message: "sessionId required" }); return; }

  const isDevAccount = !!(userEmail && DEV_EMAILS.has(userEmail));
  const tier = isDevAccount ? "unlimited" : await resolveSubTier(userId, sessionId);

  const goals = await findGoals(userId, sessionId);
  if (tier === "free" && goals) {
    // Free: only return calories and protein
    res.json({ ...goals, carbs: null, fat: null, fiber: null });
    return;
  }
  res.json(withPerMeal(goals));
});

// ── POST /api/goals ────────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const { sessionId, calories, protein, carbs, fat, fiber, mealsPerDay, weight, height, age, sex, objective, activityLevel, restrictions } = req.body;
  const userId = req.user?.userId;
  const userEmail = req.user?.email;

  if (!sessionId && !userId) { res.status(400).json({ error: "bad_request", message: "sessionId required" }); return; }

  const isDevAccount = !!(userEmail && DEV_EMAILS.has(userEmail));
  const tier = isDevAccount ? "unlimited" : await resolveSubTier(userId, sessionId);

  const restrictionsStr = Array.isArray(restrictions) ? JSON.stringify(restrictions) : restrictions;

  // Free: only allow calories and protein
  const effectiveCarbs = tier === "free" ? undefined : carbs;
  const effectiveFat = tier === "free" ? undefined : fat;
  const effectiveFiber = tier === "free" ? undefined : fiber;

  const existing = await findGoals(userId, sessionId);

  if (existing) {
    await db.update(goalsTable)
      .set({ calories, protein, carbs: effectiveCarbs, fat: effectiveFat, fiber: effectiveFiber, mealsPerDay: mealsPerDay ?? existing.mealsPerDay ?? 3, weight, height, age, sex, objective, activityLevel, restrictions: restrictionsStr, userId: userId ?? existing.userId, updatedAt: new Date() })
      .where(eq(goalsTable.sessionId, existing.sessionId));
  } else {
    const effectiveSessionId = sessionId ?? `user-${userId}`;
    await db.insert(goalsTable).values({
      sessionId: effectiveSessionId,
      userId: userId ?? null,
      calories, protein, carbs: effectiveCarbs, fat: effectiveFat, fiber: effectiveFiber, mealsPerDay: mealsPerDay ?? 3,
      weight, height, age, sex, objective, activityLevel,
      restrictions: restrictionsStr,
      updatedAt: new Date(),
    });
  }

  res.json({ ok: true });
});

// ── PATCH /api/goals ───────────────────────────────────────────────────────────
router.patch("/", async (req: Request, res: Response) => {
  const { sessionId, ...fields } = req.body;
  const userId = req.user?.userId;
  const userEmail = req.user?.email;

  if (!sessionId && !userId) { res.status(400).json({ error: "bad_request", message: "sessionId required" }); return; }

  const isDevAccount = !!(userEmail && DEV_EMAILS.has(userEmail));
  const tier = isDevAccount ? "unlimited" : await resolveSubTier(userId, sessionId);

  const allowed = tier === "free"
    ? ["calories", "protein", "mealsPerDay"] as const
    : ["calories", "protein", "carbs", "fat", "fiber", "mealsPerDay"] as const;
  const patch: Record<string, number> = {};
  for (const key of allowed) {
    if (fields[key] !== undefined && fields[key] !== null) {
      patch[key] = Number(fields[key]);
    }
  }
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "bad_request", message: "No valid fields to update" });
    return;
  }

  const existing = await findGoals(userId, sessionId);

  if (existing) {
    await db.update(goalsTable)
      .set({ ...patch, userId: userId ?? existing.userId, updatedAt: new Date() })
      .where(eq(goalsTable.sessionId, existing.sessionId));
  } else {
    const effectiveSessionId = sessionId ?? `user-${userId}`;
    await db.insert(goalsTable).values({
      sessionId: effectiveSessionId,
      userId: userId ?? null,
      mealsPerDay: 3,
      ...patch,
      updatedAt: new Date(),
    });
  }

  const updated = await findGoals(userId, sessionId ?? `user-${userId}`);
  res.json(withPerMeal(updated));
});

// ── GET /api/goals/daily-summary ───────────────────────────────────────────────
router.get("/daily-summary", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const userId = req.user?.userId;
  const userEmail = req.user?.email;
  const period = (req.query.period as string) ?? "day";

  if (!sessionId && !userId) { res.status(400).json({ error: "bad_request", message: "sessionId required" }); return; }

  // Dev account bypass
  const isDevAccount = !!(userEmail && DEV_EMAILS.has(userEmail));

  const tier = isDevAccount ? "unlimited" : await resolveSubTier(userId, sessionId);

  const goals = await findGoals(userId, sessionId);

  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  if (period === "week") {
    // ISO week: Monday–Sunday in UTC
    const day = now.getUTCDay(); // 0=Sun
    const daysFromMon = (day + 6) % 7;
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMon, 0, 0, 0, 0));
    periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (6 - daysFromMon) + 1, 0, 0, 0, 0));
  } else if (period === "month") {
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  } else {
    // day: UTC midnight to next midnight (covers full UTC day)
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  }

  // Collect all session IDs linked to this userId (to find analyses from before login)
  let linkedSessionIds: string[] = [];
  if (userId) {
    const linkedSubs = await db.query.subscriptionsTable.findMany({
      where: eq(subscriptionsTable.userId, userId),
    });
    linkedSessionIds = linkedSubs.map(s => s.sessionId).filter(Boolean);
  }
  if (sessionId && !linkedSessionIds.includes(sessionId)) {
    linkedSessionIds.push(sessionId);
  }

  let periodAnalyses;
  if (userId) {
    // Query by userId OR any session linked to this user (catches pre-login analyses)
    const whereConditions = linkedSessionIds.length > 0
      ? or(
          eq(analysesTable.userId, userId),
          and(inArray(analysesTable.sessionId, linkedSessionIds), isNull(analysesTable.userId)),
        )
      : eq(analysesTable.userId, userId);

    periodAnalyses = await db.query.analysesTable.findMany({
      where: and(
        whereConditions,
        gte(analysesTable.createdAt, periodStart),
        lt(analysesTable.createdAt, periodEnd),
      ),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });
  } else {
    periodAnalyses = await db.query.analysesTable.findMany({
      where: and(
        eq(analysesTable.sessionId, sessionId!),
        gte(analysesTable.createdAt, periodStart),
        lt(analysesTable.createdAt, periodEnd),
      ),
      orderBy: (t, { asc }) => [asc(t.createdAt)],
    });
  }

  const totals = periodAnalyses.reduce((acc, a) => ({
    calories: acc.calories + a.calories,
    protein: acc.protein + a.protein,
    carbs: acc.carbs + a.carbs,
    fat: acc.fat + a.fat,
    fiber: acc.fiber + (a.fiber ?? 0),
    meals: acc.meals + 1,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: 0 });

  // Scale goals for multi-day periods
  const daysInPeriod = period === "week" ? 7 : period === "month" ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() : 1;
  const scaledGoals = goals ? {
    calories: goals.calories ? goals.calories * daysInPeriod : null,
    protein: goals.protein ? goals.protein * daysInPeriod : null,
    carbs: goals.carbs ? goals.carbs * daysInPeriod : null,
    fat: goals.fat ? goals.fat * daysInPeriod : null,
    fiber: goals.fiber ? goals.fiber * daysInPeriod : null,
    objective: goals.objective,
    mealsPerDay: goals.mealsPerDay ?? 3,
  } : null;

  const alerts: { type: "tip" | "warning" | "ok"; macro: string; message: string }[] = [];
  if (goals && period === "day") {
    const hour = now.getHours();

    if (goals.protein && totals.meals > 0) {
      const remaining = goals.protein - totals.protein;
      if (remaining > 20 && hour >= 19) {
        alerts.push({ type: "tip", macro: "protein", message: `Faltam ~${Math.round(remaining)}g de proteína para fechar o dia. Iogurte grego, ovos ou cottage são ótimas pedidas!` });
      }
    }

    if (goals.fiber && totals.fiber < goals.fiber * 0.5 && hour >= 18) {
      alerts.push({ type: "tip", macro: "fiber", message: `Fibras abaixo da meta (${Math.round(totals.fiber)}g de ${goals.fiber}g). Adicione leguminosas, verduras ou frutas na próxima refeição.` });
    }

    if (goals.carbs && totals.carbs > goals.carbs * 1.3) {
      alerts.push({ type: "warning", macro: "carbs", message: `Carboidratos 30% acima da meta. Para as próximas refeições, prefira vegetais, proteínas e grãos integrais.` });
    }

    if (goals.fat && totals.fat > goals.fat * 1.4) {
      alerts.push({ type: "warning", macro: "fat", message: `Gorduras bem acima da meta (${Math.round(totals.fat)}g de ${goals.fat}g). Atenção com frituras, embutidos e molhos cremosos.` });
    }

    if (goals.calories && totals.calories > goals.calories * 1.3) {
      alerts.push({ type: "warning", macro: "calories", message: `Calorias 30% acima da meta diária. Opte por alimentos de alto volume e baixa caloria nas próximas refeições.` });
    } else if (goals.calories && totals.calories > goals.calories * 1.1 && hour < 18) {
      alerts.push({ type: "warning", macro: "calories", message: `Já ultrapassou a meta calórica e ainda é cedo. Prefira refeições leves e água para o restante do dia.` });
    }

    if (goals.calories && totals.calories >= goals.calories * 0.85 && totals.calories <= goals.calories * 1.05) {
      alerts.push({ type: "ok", macro: "calories", message: `Calorias bem calibradas hoje! Você está dentro da zona ideal da meta.` });
    }

    if (totals.protein > 0 && goals.protein && totals.protein >= goals.protein * 0.9) {
      alerts.push({ type: "ok", macro: "protein", message: `Excelente ingestão de proteína hoje! Perto da meta de ${goals.protein}g — ótimo para recuperação muscular.` });
    }

    if (goals.calories && totals.calories < goals.calories * 0.4 && hour >= 20 && totals.meals > 0) {
      alerts.push({ type: "tip", macro: "calories", message: `Consumiu bem menos calorias que o necessário hoje. Um lanche leve antes de dormir pode ajudar a preservar a massa muscular.` });
    }

    if (totals.meals === 0 && hour >= 13) {
      alerts.push({ type: "tip", macro: "meals", message: `Nenhuma refeição registrada ainda. Lembre-se de registrar o que você come para acompanhar sua nutrição!` });
    }
  }

  let aiSummary: string | null = null;
  if (goals && period === "day" && periodAnalyses.length >= 1) {
    try {
      const prompt = `Você é uma nutricionista clínica empática. Analise o dia e gere um resumo em até 3 frases com tom acolhedor, sem julgamentos, com sugestões práticas.

METAS: Cal ${goals.calories ?? "?"} kcal | Prot ${goals.protein ?? "?"}g | Carbs ${goals.carbs ?? "?"}g | Gord ${goals.fat ?? "?"}g | Fibras ${goals.fiber ?? "?"}g
CONSUMIDO (${totals.meals} refeição${totals.meals !== 1 ? "ões" : ""}): Cal ${Math.round(totals.calories)} kcal | Prot ${totals.protein.toFixed(1)}g | Carbs ${totals.carbs.toFixed(1)}g | Gord ${totals.fat.toFixed(1)}g | Fibras ${totals.fiber.toFixed(1)}g
Refeições: ${periodAnalyses.map((a) => a.dishName).join(", ")}

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

  const isFree = tier === "free";
  const filteredGoals = scaledGoals && isFree ? { ...scaledGoals, carbs: null, fat: null, fiber: null } : scaledGoals;
  const filteredRawGoals = goals && isFree
    ? { calories: goals.calories, protein: goals.protein, carbs: null, fat: null, fiber: null, objective: goals.objective, mealsPerDay: goals.mealsPerDay ?? 3 }
    : goals ? { calories: goals.calories, protein: goals.protein, carbs: goals.carbs, fat: goals.fat, fiber: goals.fiber, objective: goals.objective, mealsPerDay: goals.mealsPerDay ?? 3 } : null;

  res.json({
    totals,
    goals: filteredGoals,
    rawGoals: filteredRawGoals,
    alerts: isFree ? alerts.filter(a => a.macro === "calories" || a.macro === "protein" || a.macro === "meals") : alerts,
    aiSummary: isFree ? null : aiSummary,
    analysesCount: periodAnalyses.length,
    period,
    daysInPeriod,
    lastMealAt: periodAnalyses.length > 0 ? periodAnalyses[periodAnalyses.length - 1].createdAt : null,
  });
});

export default router;
