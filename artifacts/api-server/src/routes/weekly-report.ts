import { Router, type IRouter, type Request, type Response } from "express";
import { db, subscriptionsTable, analysesTable, goalsTable } from "@workspace/db";
import { eq, and, gte, lt, desc, or } from "drizzle-orm";
import { sendWeeklyReport, type WeeklyReportData } from "../lib/email.js";
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

// Build week label like "24 a 30 de março"
function buildWeekLabel(start: Date, end: Date): string {
  const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const d1 = start.getUTCDate();
  const d2 = end.getUTCDate() - 1; // end is exclusive (next day)
  const m1 = months[start.getUTCMonth()];
  const m2 = months[end.getUTCMonth() - (end.getUTCDate() === 1 ? 1 : 0)];
  // end is first day of next week (exclusive), so go back 1 day
  const actualEnd = new Date(end.getTime() - 86400000);
  const actualD2 = actualEnd.getUTCDate();
  const actualM2 = months[actualEnd.getUTCMonth()];
  if (m1 === actualM2) return `${d1} a ${actualD2} de ${actualM2}`;
  return `${d1} de ${m1} a ${actualD2} de ${actualM2}`;
}

// POST /api/weekly-report — send weekly report email to authenticated premium user
router.post("/", async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const userEmail = req.user?.email;
  const userName = req.user?.name;
  const { sessionId } = req.body;

  if (!userId || !userEmail) {
    res.status(401).json({ error: "unauthorized", message: "Faça login para receber o relatório por email" });
    return;
  }

  const masterTier = getMasterTier(req.user?.email);
  const isDevAccount = !!masterTier;
  const tier = masterTier ?? await resolveSubTier(userId, sessionId);
  if (!isDevAccount && tier !== "unlimited") {
    res.status(403).json({ error: "forbidden", message: "Relatório semanal disponível apenas no plano Ilimitado" });
    return;
  }

  // Determine last complete ISO week (Mon–Sun)
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun
  const daysFromMon = (dayOfWeek + 6) % 7;

  // Last Monday
  const lastMon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMon - 7));
  // Last Sunday + 1 (exclusive end = this Monday)
  const thisMon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMon));

  // Previous week boundaries (for comparison)
  const prevMon = new Date(Date.UTC(lastMon.getUTCFullYear(), lastMon.getUTCMonth(), lastMon.getUTCDate() - 7));
  const prevEnd = lastMon; // exclusive

  // Analyses from last week
  const analyses = await db.query.analysesTable.findMany({
    where: and(
      or(eq(analysesTable.userId, userId), ...(sessionId ? [eq(analysesTable.sessionId, sessionId as string)] : [])),
      gte(analysesTable.createdAt, lastMon),
      lt(analysesTable.createdAt, thisMon),
    ),
    orderBy: [desc(analysesTable.createdAt)],
    limit: 300,
  });

  const goals = await db.query.goalsTable.findFirst({
    where: eq(goalsTable.userId, userId),
    orderBy: (t, { desc: d }) => [d(t.updatedAt)],
  });

  // Aggregate
  const totals = analyses.reduce((acc, a) => ({
    calories: acc.calories + a.calories,
    protein: acc.protein + a.protein,
    carbs: acc.carbs + a.carbs,
    fat: acc.fat + a.fat,
    fiber: acc.fiber + (a.fiber ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const daysWithData = new Set(analyses.map(a => a.createdAt.toISOString().slice(0, 10))).size;
  const avgCalories = daysWithData > 0 ? totals.calories / daysWithData : 0;

  // Top meals by frequency
  const mealFreq = new Map<string, number>();
  for (const a of analyses) {
    mealFreq.set(a.dishName, (mealFreq.get(a.dishName) ?? 0) + 1);
  }
  const topMeals = [...mealFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => count > 1 ? `${name} (×${count})` : name);

  // Streak: count consecutive days with data going backward from last Sunday
  const daySet = new Set(analyses.map(a => a.createdAt.toISOString().slice(0, 10)));
  let streak = 0;
  const checkFrom = new Date(thisMon.getTime() - 86400000); // last Sunday
  for (let i = 0; i < 90; i++) {
    const key = checkFrom.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      streak++;
      checkFrom.setUTCDate(checkFrom.getUTCDate() - 1);
    } else {
      break;
    }
  }

  // Previous week analyses for comparison
  let prevTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  let prevDaysWithData = 0;
  try {
    const prevAnalyses = await db.query.analysesTable.findMany({
      where: and(
        or(eq(analysesTable.userId, userId), ...(sessionId ? [eq(analysesTable.sessionId, sessionId as string)] : [])),
        gte(analysesTable.createdAt, prevMon),
        lt(analysesTable.createdAt, prevEnd),
      ),
      columns: { calories: true, protein: true, carbs: true, fat: true, fiber: true, createdAt: true },
      limit: 300,
    });
    prevTotals = prevAnalyses.reduce((acc: typeof prevTotals, a: { calories: number; protein: number; carbs: number; fat: number; fiber: number | null }) => ({
      calories: acc.calories + a.calories,
      protein: acc.protein + a.protein,
      carbs: acc.carbs + a.carbs,
      fat: acc.fat + a.fat,
      fiber: acc.fiber + (a.fiber ?? 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    prevDaysWithData = new Set(prevAnalyses.map((a: { createdAt: Date }) => a.createdAt.toISOString().slice(0, 10))).size;
  } catch {}

  const prevAvgCalories = prevDaysWithData > 0 ? prevTotals.calories / prevDaysWithData : null;
  const calDiff = prevAvgCalories !== null ? Math.round(avgCalories - prevAvgCalories) : null;
  const protDiff = prevDaysWithData > 0 ? +(totals.protein / 7 - prevTotals.protein / 7).toFixed(0) : null;
  const comparisonBlock = prevDaysWithData > 0
    ? `\nComparação com semana anterior: calorias ${calDiff !== null && calDiff >= 0 ? '+' : ''}${calDiff ?? '?'} kcal/dia | proteína ${protDiff !== null && protDiff >= 0 ? '+' : ''}${protDiff ?? '?'}g/dia | dias registrados: ${daysWithData} vs ${prevDaysWithData} na semana passada.`
    : '';

  // Pattern detection (low protein, low fiber, calorie gaps)
  const avgProtein = daysWithData > 0 ? totals.protein / daysWithData : 0;
  const avgFiber = daysWithData > 0 ? totals.fiber / daysWithData : 0;
  const patternNotes: string[] = [];
  if (goals?.protein && avgProtein < goals.protein * 0.75) patternNotes.push(`proteína consistentemente abaixo da meta (${avgProtein.toFixed(0)}g/dia vs ${goals.protein}g)`);
  if (avgFiber < 15) patternNotes.push(`fibras abaixo do recomendado (${avgFiber.toFixed(0)}g/dia — ideal: 25g+)`);
  if (daysWithData <= 3) patternNotes.push(`poucos dias registrados (${daysWithData}/7) — consistência é o maior gap`);
  const patternBlock = patternNotes.length > 0 ? `\nPadrões identificados esta semana: ${patternNotes.join('; ')}.` : '';

  // AI summary (optional, non-blocking)
  let aiSummary: string | null = null;
  try {
    if (analyses.length > 0) {
      const summaryPrompt = `Você é a Evellyn, nutricionista do app IA Calorias. Escreva um parágrafo direto e humano (2-3 frases, máx 130 palavras) analisando a semana de ${buildWeekLabel(lastMon, thisMon)} do usuário ${userName || "usuário"}. Tom: amiga que entende de nutrição, sem julgamento, sem termos clínicos.

Dados da semana:
- Média de calorias: ${Math.round(avgCalories)} kcal/dia${goals?.calories ? ` (meta: ${goals.calories})` : ''}
- Proteína: ${(totals.protein / 7).toFixed(0)}g/dia${goals?.protein ? ` (meta: ${goals.protein}g/dia)` : ''}
- Fibras: ${(totals.fiber / 7).toFixed(0)}g/dia
- Dias com registro: ${daysWithData}/7
- Refeições registradas: ${analyses.length}${comparisonBlock}${patternBlock}

Regras: comece pelo que foi BEM (mesmo que pouco), depois 1 observação honesta e 1 ação específica e simples para a próxima semana. Cite números reais. Não use markdown. Não diga "olá" ou "prezado".`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: summaryPrompt }],
        max_tokens: 180,
        temperature: 0.7,
      });
      aiSummary = completion.choices[0]?.message?.content?.trim() ?? null;
    }
  } catch (err) {
    req.log?.warn?.({ err }, "weekly-report AI summary failed, sending without it");
  }

  const reportData: WeeklyReportData = {
    userName: userName || userEmail.split("@")[0],
    weekLabel: buildWeekLabel(lastMon, thisMon),
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
  };

  await sendWeeklyReport(userEmail, reportData, req.log);

  res.json({ ok: true, sentTo: userEmail, weekLabel: reportData.weekLabel });
});

export default router;
