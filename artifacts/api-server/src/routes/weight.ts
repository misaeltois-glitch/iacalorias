import { Router, type IRouter, type Request, type Response } from "express";
import { db, weightLogsTable, goalsTable } from "@workspace/db";
import { eq, and, desc, or } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// GET /api/weight?sessionId=
router.get("/", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string | undefined;
  const userId = req.user?.userId;

  if (!sessionId && !userId) { res.status(400).json({ error: "bad_request" }); return; }

  let logs;
  if (userId) {
    logs = await db.query.weightLogsTable.findMany({
      where: or(eq(weightLogsTable.userId, userId), ...(sessionId ? [eq(weightLogsTable.sessionId, sessionId)] : [])),
      orderBy: [desc(weightLogsTable.logDate)],
      limit: 90,
    });
  } else {
    logs = await db.query.weightLogsTable.findMany({
      where: eq(weightLogsTable.sessionId, sessionId!),
      orderBy: [desc(weightLogsTable.logDate)],
      limit: 90,
    });
  }

  // Get weight info from goals table
  let goalWeight: number | null = null;
  let onboardingWeight: number | null = null;
  try {
    const goals = userId
      ? await db.query.goalsTable.findFirst({ where: eq(goalsTable.userId, userId), orderBy: (t, { desc: d }) => [d(t.updatedAt)] })
      : sessionId ? await db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId!) }) : null;
    // goals.weight is the current body weight entered during onboarding
    onboardingWeight = goals?.weight ?? null;
    goalWeight = null; // reserved for future "target weight" field
  } catch {}

  res.json({
    logs: logs.map(l => ({ id: l.id, weightKg: l.weightKg, logDate: l.logDate, createdAt: l.createdAt })).reverse(),
    goalWeight,
    onboardingWeight,
  });
});

// POST /api/weight — upsert today's weight
router.post("/", async (req: Request, res: Response) => {
  const { sessionId, weightKg, logDate } = req.body;
  const userId = req.user?.userId;

  if ((!sessionId && !userId) || !weightKg) { res.status(400).json({ error: "bad_request" }); return; }

  const kg = Number(weightKg);
  if (isNaN(kg) || kg < 20 || kg > 500) { res.status(400).json({ error: "bad_request", message: "Peso inválido" }); return; }

  const effectiveSessionId = sessionId ?? `user-${userId}`;
  const date = logDate ?? new Date().toISOString().slice(0, 10);

  // Upsert: delete existing entry for this date + session, then insert
  const existing = await db.query.weightLogsTable.findFirst({
    where: and(
      eq(weightLogsTable.sessionId, effectiveSessionId),
      eq(weightLogsTable.logDate, date),
    ),
  });

  if (existing) {
    await db.update(weightLogsTable)
      .set({ weightKg: kg, userId: userId ?? existing.userId ?? null })
      .where(eq(weightLogsTable.id, existing.id));
    res.json({ id: existing.id, weightKg: kg, logDate: date });
  } else {
    const id = randomUUID();
    await db.insert(weightLogsTable).values({
      id, sessionId: effectiveSessionId, userId: userId ?? null, weightKg: kg, logDate: date,
    });
    res.json({ id, weightKg: kg, logDate: date });
  }
});

export default router;
