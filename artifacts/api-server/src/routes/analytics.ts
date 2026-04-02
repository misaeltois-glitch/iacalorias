import { Router, type IRouter, type Request, type Response } from "express";
import { db, subscriptionsTable, analysesTable, goalsTable } from "@workspace/db";
import { eq, and, gte, lt, desc, or, inArray, isNull } from "drizzle-orm";
import { getMasterTier } from "../lib/master-emails.js";

const router: IRouter = Router();

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

async function findGoals(userId?: string, sessionId?: string) {
  if (userId) {
    const goals = await db.query.goalsTable.findFirst({
      where: eq(goalsTable.userId, userId),
      orderBy: (t, { desc: d }) => [d(t.updatedAt)],
    });
    if (goals) return goals;
  }
  if (sessionId) {
    return db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId) });
  }
  return null;
}

// tzOffset = getTimezoneOffset() from client (positive = behind UTC, e.g. 180 for UTC-3)
// To convert UTC timestamp → local date: subtract tzOffset minutes
function toLocalDateStr(date: Date, tzOffset = 0): string {
  const d = new Date(date.getTime() - tzOffset * 60000);
  return d.toISOString().slice(0, 10);
}

// GET /api/analytics/summary?sessionId=&period=day|week|month&date=YYYY-MM-DD
router.get("/summary", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string | undefined;
  const userId = req.user?.userId;
  const userEmail = req.user?.email;
  const rawPeriod = (req.query.period as string) ?? "week";
  const period: "day" | "week" | "month" = rawPeriod === "month" ? "month" : rawPeriod === "day" ? "day" : "week";
  const dateParam = req.query.date as string | undefined;
  // tzOffset: minutes behind UTC from client (e.g. 180 for UTC-3 Brazil). Default 180 (Brazil).
  const rawTz = parseInt(req.query.tzOffset as string, 10);
  const tzOffset = Math.max(-840, Math.min(840, Number.isNaN(rawTz) ? 180 : rawTz));
  const tzOffsetMs = tzOffset * 60 * 1000;

  if (!sessionId && !userId) {
    res.status(400).json({ error: "bad_request", message: "sessionId required" });
    return;
  }

  // Dev account bypass
  const masterTier = getMasterTier(userEmail);
  const tier = masterTier ?? await resolveSubTier(userId, sessionId);
  const isPremium = tier !== "free";

  const goals = await findGoals(userId, sessionId);

  // If dateParam given, parse it as local date; otherwise use local now
  const now = dateParam
    ? new Date(dateParam + "T12:00:00Z") // dateParam already local YYYY-MM-DD
    : new Date(Date.now() - tzOffsetMs);  // shift to local frame
  let periodStart: Date;
  let periodEnd: Date;
  let daysInPeriod: number;

  if (period === "day") {
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0) + tzOffsetMs);
    periodEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0) + tzOffsetMs);
    daysInPeriod = 1;
  } else if (period === "month") {
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0) + tzOffsetMs);
    periodEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0) + tzOffsetMs);
    daysInPeriod = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getDate();
  } else {
    // ISO week: Monday–Sunday in local time
    const day = now.getUTCDay();
    const daysFromMon = (day + 6) % 7;
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMon, 0, 0, 0, 0) + tzOffsetMs);
    periodEnd   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (6 - daysFromMon) + 1, 0, 0, 0, 0) + tzOffsetMs);
    daysInPeriod = 7;
  }

  // For free users: only last 7 days
  const effectiveStart = isPremium ? periodStart : (() => {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0) + tzOffsetMs);
  })();

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

  let analyses;
  if (userId) {
    // Query by userId OR any session linked to this user (catches pre-login analyses)
    const whereConditions = linkedSessionIds.length > 0
      ? or(
          eq(analysesTable.userId, userId),
          and(inArray(analysesTable.sessionId, linkedSessionIds), isNull(analysesTable.userId)),
        )
      : eq(analysesTable.userId, userId);

    analyses = await db.query.analysesTable.findMany({
      where: and(
        whereConditions,
        gte(analysesTable.createdAt, effectiveStart),
        lt(analysesTable.createdAt, periodEnd),
      ),
      orderBy: [desc(analysesTable.createdAt)],
      limit: isPremium ? 200 : 50,
    });
  } else {
    analyses = await db.query.analysesTable.findMany({
      where: and(
        eq(analysesTable.sessionId, sessionId!),
        gte(analysesTable.createdAt, effectiveStart),
        lt(analysesTable.createdAt, periodEnd),
      ),
      orderBy: [desc(analysesTable.createdAt)],
      limit: isPremium ? 200 : 50,
    });
  }

  // Aggregate totals
  const totals = analyses.reduce((acc, a) => ({
    calories: acc.calories + a.calories,
    protein: acc.protein + a.protein,
    carbs: acc.carbs + a.carbs,
    fat: acc.fat + a.fat,
    fiber: acc.fiber + (a.fiber ?? 0),
    meals: acc.meals + 1,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: 0 });

  const daysWithData = new Set(analyses.map(a => toLocalDateStr(a.createdAt, tzOffset))).size;
  const dailyAvg = daysWithData > 0 ? {
    calories: Math.round(totals.calories / daysWithData),
    protein: Math.round(totals.protein / daysWithData * 10) / 10,
    carbs: Math.round(totals.carbs / daysWithData * 10) / 10,
    fat: Math.round(totals.fat / daysWithData * 10) / 10,
    fiber: Math.round(totals.fiber / daysWithData * 10) / 10,
  } : null;

  // Build day-by-day breakdown (for bar chart)
  const dayMap: Map<string, { calories: number; protein: number; carbs: number; fat: number; fiber: number; mealsCount: number }> = new Map();
  for (const a of analyses) {
    const key = toLocalDateStr(a.createdAt, tzOffset);
    const existing = dayMap.get(key) ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, mealsCount: 0 };
    dayMap.set(key, {
      calories: existing.calories + a.calories,
      protein: existing.protein + a.protein,
      carbs: existing.carbs + a.carbs,
      fat: existing.fat + a.fat,
      fiber: existing.fiber + (a.fiber ?? 0),
      mealsCount: existing.mealsCount + 1,
    });
  }

  // Fill all days in period (even empty ones) for a complete bar chart
  const days: { date: string; calories: number; protein: number; carbs: number; fat: number; fiber: number; mealsCount: number }[] = [];
  const cursor = new Date(periodStart);
  while (cursor <= periodEnd) {
    const key = toLocalDateStr(cursor, tzOffset);
    const data = dayMap.get(key);
    days.push({
      date: key,
      calories: data?.calories ?? 0,
      protein: Math.round((data?.protein ?? 0) * 10) / 10,
      carbs: Math.round((data?.carbs ?? 0) * 10) / 10,
      fat: Math.round((data?.fat ?? 0) * 10) / 10,
      fiber: Math.round((data?.fiber ?? 0) * 10) / 10,
      mealsCount: data?.mealsCount ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  // Streak and daysOnTarget use an 80% threshold (not strict equality) so minor
  // calorie deficits (e.g. being 10-20% under goal) still count as "dentro da meta".
  // Over-goal days also count (the goal is to eat *at least* this amount, not stay under).
  // Adjust this threshold if the product definition of "dentro da meta" changes.
  let streak = 0;
  if (goals?.calories) {
    const streakTarget = goals.calories * 0.8;
    const todayStr = toLocalDateStr(new Date(), tzOffset);

    // Build full history map (all time) for streak
    let allAnalyses;
    if (userId) {
      allAnalyses = await db.query.analysesTable.findMany({
        where: eq(analysesTable.userId, userId),
        orderBy: [desc(analysesTable.createdAt)],
        limit: 365,
      });
    } else {
      allAnalyses = await db.query.analysesTable.findMany({
        where: eq(analysesTable.sessionId, sessionId!),
        orderBy: [desc(analysesTable.createdAt)],
        limit: 365,
      });
    }

    const allDayMap: Map<string, number> = new Map();
    for (const a of allAnalyses) {
      const key = toLocalDateStr(a.createdAt, tzOffset);
      allDayMap.set(key, (allDayMap.get(key) ?? 0) + a.calories);
    }

    let checkDate = new Date();
    while (true) {
      const key = toLocalDateStr(checkDate, tzOffset);
      const dayCalories = allDayMap.get(key) ?? 0;
      if (dayCalories >= streakTarget) {
        streak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        // Allow today if no data yet (don't break streak for current day)
        if (key === todayStr && dayCalories === 0) {
          checkDate.setUTCDate(checkDate.getUTCDate() - 1);
          continue;
        }
        break;
      }
      if (streak > 365) break;
    }
  }

  // Monthly stats: days on target
  let daysOnTarget = 0;
  if (goals?.calories) {
    const target = goals.calories * 0.8;
    for (const [, d] of dayMap) {
      if (d.calories >= target) daysOnTarget++;
    }
  }

  // Pagination for meals list
  const pageSize = Math.min(Math.max(1, parseInt((req.query.pageSize as string) ?? "20")), 50);
  const page = Math.max(1, parseInt((req.query.page as string) ?? "1"));
  const freeMealsLimit = isPremium ? pageSize : 10;
  const totalMeals = analyses.length;
  const effectiveTotal = isPremium ? totalMeals : Math.min(totalMeals, freeMealsLimit);
  const offset = isPremium ? (page - 1) * pageSize : 0;
  const effectivePageSize = isPremium ? pageSize : freeMealsLimit;

  const mealsList = analyses.slice(offset, offset + effectivePageSize).map(a => ({
    id: a.id,
    dishName: a.dishName,
    calories: a.calories,
    protein: a.protein,
    carbs: a.carbs,
    fat: a.fat,
    fiber: a.fiber ?? null,
    healthScore: a.healthScore ?? null,
    createdAt: a.createdAt,
  }));

  const pagination = {
    page: isPremium ? page : 1,
    pageSize: effectivePageSize,
    total: effectiveTotal,
    totalPages: Math.ceil(effectiveTotal / effectivePageSize),
    hasMore: isPremium ? offset + effectivePageSize < effectiveTotal : false,
  };

  const dailyGoals = goals ? {
    calories: goals.calories ?? null,
    protein: goals.protein ?? null,
    carbs: goals.carbs ?? null,
    fat: goals.fat ?? null,
    fiber: goals.fiber ?? null,
    mealsPerDay: goals.mealsPerDay ?? 3,
  } : null;

  res.json({
    period,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    daysInPeriod,
    daysWithData,
    totals,
    dailyAvg,
    days,
    streak,
    daysOnTarget,
    goals: dailyGoals,
    meals: mealsList,
    pagination,
    isPremium,
    requiresUpgrade: !isPremium,
  });
});

export default router;
