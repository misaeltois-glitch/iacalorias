import { db, usersTable, subscriptionsTable, analysesTable, goalsTable } from "@workspace/db";
import { eq, and, gte, lt, ne, desc, inArray } from "drizzle-orm";
import { sendWeeklyReport, sendFreeWeeklyReport, type WeeklyReportData, type FreeWeeklyReportData } from "./email.js";
import OpenAI from "openai";
import { logger } from "./logger.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Months in Portuguese
const MONTHS = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

function buildWeekLabel(start: Date, end: Date): string {
  const actualEnd = new Date(end.getTime() - 86400000);
  const d1 = start.getUTCDate();
  const m1 = MONTHS[start.getUTCMonth()];
  const d2 = actualEnd.getUTCDate();
  const m2 = MONTHS[actualEnd.getUTCMonth()];
  if (m1 === m2) return `${d1} a ${d2} de ${m2}`;
  return `${d1} de ${m1} a ${d2} de ${m2}`;
}

// Prevent duplicate sends: in-memory set of "userId:weekLabel" already sent this cycle
const sentThisWeek = new Set<string>();

export async function sendWeeklyReportForUser(
  userId: string,
  userEmail: string,
  userName: string | null,
  lastMon: Date,
  thisMon: Date,
): Promise<void> {
  const weekLabel = buildWeekLabel(lastMon, thisMon);
  const dedupeKey = `${userId}:${weekLabel}`;
  if (sentThisWeek.has(dedupeKey)) return;

  try {
    const analyses = await db.query.analysesTable.findMany({
      where: and(
        eq(analysesTable.userId, userId),
        gte(analysesTable.createdAt, lastMon),
        lt(analysesTable.createdAt, thisMon),
      ),
      orderBy: [desc(analysesTable.createdAt)],
      limit: 300,
    });

    // Only send if user had at least 1 meal logged that week
    if (analyses.length === 0) return;

    const goals = await db.query.goalsTable.findFirst({
      where: eq(goalsTable.userId, userId),
      orderBy: (t, { desc: d }) => [d(t.updatedAt)],
    });

    const totals = analyses.reduce((acc, a) => ({
      calories: acc.calories + a.calories,
      protein: acc.protein + a.protein,
      carbs: acc.carbs + a.carbs,
      fat: acc.fat + a.fat,
      fiber: acc.fiber + (a.fiber ?? 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    const daysWithData = new Set(analyses.map(a => a.createdAt.toISOString().slice(0, 10))).size;
    const avgCalories = daysWithData > 0 ? totals.calories / daysWithData : 0;

    const mealFreq = new Map<string, number>();
    for (const a of analyses) mealFreq.set(a.dishName, (mealFreq.get(a.dishName) ?? 0) + 1);
    const topMeals = [...mealFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => count > 1 ? `${name} (×${count})` : name);

    // Streak
    const daySet = new Set(analyses.map(a => a.createdAt.toISOString().slice(0, 10)));
    let streak = 0;
    const checkFrom = new Date(thisMon.getTime() - 86400000);
    for (let i = 0; i < 90; i++) {
      if (daySet.has(checkFrom.toISOString().slice(0, 10))) {
        streak++;
        checkFrom.setUTCDate(checkFrom.getUTCDate() - 1);
      } else break;
    }

    // Previous week data for comparison
    const prevMon = new Date(lastMon.getTime() - 7 * 24 * 60 * 60 * 1000);
    let prevWeekAvgCalories: number | null = null;
    let prevWeekDaysWithData: number | null = null;
    let prevWeekTotalMeals: number | null = null;
    try {
      const prevAnalyses = await db.query.analysesTable.findMany({
        where: and(
          eq(analysesTable.userId, userId),
          gte(analysesTable.createdAt, prevMon),
          lt(analysesTable.createdAt, lastMon),
        ),
        columns: { calories: true, createdAt: true },
        limit: 300,
      });
      if (prevAnalyses.length > 0) {
        const prevDays = new Set(prevAnalyses.map((a: any) => a.createdAt.toISOString().slice(0, 10))).size;
        const prevTotal = prevAnalyses.reduce((s: number, a: any) => s + a.calories, 0);
        prevWeekAvgCalories = prevDays > 0 ? prevTotal / prevDays : null;
        prevWeekDaysWithData = prevDays;
        prevWeekTotalMeals = prevAnalyses.length;
      }
    } catch {}

    // AI summary
    let aiSummary: string | null = null;
    try {
      const displayName = userName || userEmail.split("@")[0];
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `Você é Evellyn, nutricionista do app IA Calorias. Escreva 2-3 frases de análise da semana de ${weekLabel} para ${displayName}, em tom encorajador e prático.

Dados: média ${Math.round(avgCalories)} kcal/dia${goals?.calories ? ` (meta ${goals.calories})` : ''}, proteína ${(totals.protein/7).toFixed(0)}g/dia${goals?.protein ? ` (meta ${goals.protein}g)` : ''}, ${daysWithData}/7 dias com registro, ${analyses.length} refeições. Destaque 1 ponto positivo e 1 sugestão. Sem markdown.`,
        }],
        max_tokens: 160,
        temperature: 0.7,
      });
      aiSummary = completion.choices[0]?.message?.content?.trim() ?? null;
    } catch {}

    const reportData: WeeklyReportData = {
      userName: userName || userEmail.split("@")[0],
      weekLabel,
      totalCalories: totals.calories,
      avgCalories,
      goalCalories: goals?.calories ?? null,
      totalProtein: totals.protein,
      goalProtein: goals?.protein ?? null,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
      totalFiber: totals.fiber,
      totalMeals: analyses.length,
      daysWithData,
      streak,
      topMeals,
      aiSummary,
      prevWeekAvgCalories,
      prevWeekDaysWithData,
      prevWeekTotalMeals,
    };

    await sendWeeklyReport(userEmail, reportData);
    sentThisWeek.add(dedupeKey);
    logger.info({ userId, userEmail, weekLabel }, "weekly report sent");
  } catch (err) {
    logger.error({ err, userId, userEmail }, "weekly report failed for user");
  }
}

// Returns the Mon–Sun window of the last complete ISO week (Brazil UTC-3)
function lastWeekWindow(): { lastMon: Date; thisMon: Date } {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000); // shift to UTC-3
  const dayOfWeek = now.getUTCDay(); // 0=Sun
  const daysFromMon = (dayOfWeek + 6) % 7;
  const thisMon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMon));
  const lastMon = new Date(thisMon.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { lastMon, thisMon };
}

// Called once per hour from index.ts
// Fires only on Sunday 7–8 AM Brazil time (UTC 10:00–11:00)
export async function maybeRunWeeklyReportCron(): Promise<void> {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000); // UTC-3
  const dayOfWeek = now.getUTCDay(); // 0=Sun
  const hour = now.getUTCHours();

  if (dayOfWeek !== 0 || hour !== 10) return; // only Sunday 7 AM Brazil

  logger.info("weekly report cron: starting batch send");

  const { lastMon, thisMon } = lastWeekWindow();

  // ── Premium users ──────────────────────────────────────────────────────────
  const premiumSubs = await db.query.subscriptionsTable.findMany({
    where: ne(subscriptionsTable.tier, "free"),
    columns: { userId: true },
  });
  const premiumUserIds = [...new Set(premiumSubs.map((s: any) => s.userId).filter(Boolean) as string[])];

  if (premiumUserIds.length > 0) {
    const premiumUsers = await db.query.usersTable.findMany({
      where: inArray(usersTable.id, premiumUserIds),
      columns: { id: true, email: true, name: true },
    });

    for (let i = 0; i < premiumUsers.length; i += 5) {
      const batch = premiumUsers.slice(i, i + 5);
      await Promise.allSettled(
        batch.map((u: any) => sendWeeklyReportForUser(u.id, u.email, u.name, lastMon, thisMon))
      );
      if (i + 5 < premiumUsers.length) await new Promise<void>(r => { (globalThis as any).setTimeout(r, 2000); });
    }
    logger.info({ total: premiumUsers.length }, "weekly report cron: premium batch complete");
  }

  // ── Free users (have email + logged at least 1 meal last week) ────────────
  const allUsers = await db.query.usersTable.findMany({
    where: premiumUserIds.length > 0
      ? (t: any, { notInArray: notIn }: any) => notIn(t.id, premiumUserIds)
      : undefined,
    columns: { id: true, email: true, name: true },
  });

  let freeSent = 0;
  for (let i = 0; i < allUsers.length; i += 10) {
    const batch = allUsers.slice(i, i + 10);
    await Promise.allSettled(batch.map(async (u: any) => {
      try {
        const analyses = await db.query.analysesTable.findMany({
          where: and(
            eq(analysesTable.userId, u.id),
            gte(analysesTable.createdAt, lastMon),
            lt(analysesTable.createdAt, thisMon),
          ),
          columns: { dishName: true, calories: true, createdAt: true },
          limit: 50,
        });
        if (analyses.length === 0) return; // no activity last week → skip

        const weekLabel = buildWeekLabel(lastMon, thisMon);
        const dedupeKey = `free:${u.id}:${weekLabel}`;
        if (sentThisWeek.has(dedupeKey)) return;

        const daysWithData = new Set(analyses.map((a: any) => a.createdAt.toISOString().slice(0, 10))).size;
        const avgCalories = analyses.reduce((s: number, a: any) => s + a.calories, 0) / Math.max(daysWithData, 1);

        const mealFreq = new Map<string, number>();
        for (const a of analyses) mealFreq.set(a.dishName, (mealFreq.get(a.dishName) ?? 0) + 1);
        const topMeals = [...mealFreq.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => count > 1 ? `${name} (×${count})` : name);

        // Simple streak from analyses
        const daySet = new Set(analyses.map((a: any) => a.createdAt.toISOString().slice(0, 10)));
        let streak = 0;
        const checkFrom = new Date(thisMon.getTime() - 86400000);
        for (let d = 0; d < 90; d++) {
          if (daySet.has(checkFrom.toISOString().slice(0, 10))) { streak++; checkFrom.setUTCDate(checkFrom.getUTCDate() - 1); }
          else break;
        }

        const reportData: FreeWeeklyReportData = {
          userName: u.name || u.email.split("@")[0],
          weekLabel,
          totalMeals: analyses.length,
          daysWithData,
          avgCalories,
          streak,
          topMeals,
        };

        await sendFreeWeeklyReport(u.email, reportData, logger);
        sentThisWeek.add(dedupeKey);
        freeSent++;
      } catch (err) {
        logger.error({ err, userId: u.id }, "free weekly report failed for user");
      }
    }));
    if (i + 10 < allUsers.length) await new Promise<void>(r => { (globalThis as any).setTimeout(r, 1000); });
  }

  logger.info({ freeSent }, "weekly report cron: free batch complete");
}
