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
  if (tier === "free") {
    res.status(403).json({ error: "forbidden", message: "Relatório semanal disponível apenas no plano pago" });
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

  // AI summary (optional, non-blocking)
  let aiSummary: string | null = null;
  try {
    if (analyses.length > 0) {
      const summaryPrompt = `Você é uma nutricionista chamada Sofia. Escreva um parágrafo curto (2-3 frases, máx 120 palavras) de análise nutricional da semana de ${buildWeekLabel(lastMon, thisMon)} do usuário ${userName || "usuário"}, em tom encorajador e prático.

Dados da semana:
- Média de calorias: ${Math.round(avgCalories)} kcal/dia${goals?.calories ? ` (meta: ${goals.calories})` : ''}
- Proteína total: ${totals.protein.toFixed(0)}g (${(totals.protein / 7).toFixed(0)}g/dia)${goals?.protein ? ` (meta: ${goals.protein}g/dia)` : ''}
- Carboidratos: ${totals.carbs.toFixed(0)}g total
- Gorduras: ${totals.fat.toFixed(0)}g total
- Fibras: ${totals.fiber.toFixed(0)}g total
- Dias com registro: ${daysWithData}/7
- Refeições registradas: ${analyses.length}

Destaque pontos positivos e 1 sugestão prática para a próxima semana. Não use markdown.`;

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
