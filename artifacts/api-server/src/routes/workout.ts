import { Router, type IRouter, type Request, type Response } from "express";
import { db, workoutProfilesTable, workoutLogsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

async function findProfile(userId?: string, sessionId?: string) {
  if (userId) {
    const p = await db.query.workoutProfilesTable.findFirst({
      where: eq(workoutProfilesTable.userId, userId),
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    });
    if (p) return p;
  }
  if (sessionId) {
    return db.query.workoutProfilesTable.findFirst({
      where: eq(workoutProfilesTable.sessionId, sessionId),
    });
  }
  return null;
}

// GET /api/workout/profile
router.get("/profile", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const userId = req.user?.userId;
  if (!sessionId && !userId) { res.status(400).json({ error: "sessionId required" }); return; }

  const profile = await findProfile(userId, sessionId);
  if (!profile) { res.status(404).json({ error: "not_found" }); return; }
  res.json(profile);
});

// POST /api/workout/profile
router.post("/profile", async (req: Request, res: Response) => {
  const sessionId = req.body.sessionId as string;
  const userId = req.user?.userId;
  if (!sessionId && !userId) { res.status(400).json({ error: "sessionId required" }); return; }

  const { goal, sex, age, weight, height, bodyFat, waist, level, trainingDays,
    sessionDuration, preferredTime, gym, equipment, hasInjuries, injuries,
    medicalNotes, cardio, warmup, techniques } = req.body;

  if (!goal || !sex || !age || !weight || !height || !level || !gym) {
    res.status(400).json({ error: "missing required fields" }); return;
  }

  const existing = await findProfile(userId, sessionId);
  if (existing) {
    await db.update(workoutProfilesTable)
      .set({ goal, sex, age, weight, height, bodyFat, waist, level, trainingDays,
        sessionDuration, preferredTime, gym, equipment: equipment ?? [], hasInjuries: !!hasInjuries,
        injuries: injuries ?? [], medicalNotes, cardio, warmup, techniques: techniques ?? [],
        updatedAt: new Date() })
      .where(eq(workoutProfilesTable.id, existing.id));
    res.json({ id: existing.id, updated: true });
    return;
  }

  const id = randomUUID();
  await db.insert(workoutProfilesTable).values({
    id, sessionId: sessionId || null, userId: userId || null,
    goal, sex, age, weight, height, bodyFat, waist, level, trainingDays: trainingDays ?? [],
    sessionDuration, preferredTime, gym, equipment: equipment ?? [], hasInjuries: !!hasInjuries,
    injuries: injuries ?? [], medicalNotes, cardio, warmup, techniques: techniques ?? [],
  });
  res.status(201).json({ id, created: true });
});

// POST /api/workout/log
router.post("/log", async (req: Request, res: Response) => {
  const { sessionId, sessionName, date, durationMinutes, exercises, notes } = req.body;
  const userId = req.user?.userId;
  if (!sessionName || !date) { res.status(400).json({ error: "sessionName and date required" }); return; }

  const id = randomUUID();
  await db.insert(workoutLogsTable).values({
    id, sessionId: sessionId || null, userId: userId || null,
    sessionName, date, durationMinutes: durationMinutes || null,
    exercises: exercises || [], notes: notes || null,
  });
  res.status(201).json({ id });
});

// GET /api/workout/logs
router.get("/logs", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const userId = req.user?.userId;
  if (!sessionId && !userId) { res.status(400).json({ error: "sessionId required" }); return; }

  const where = userId
    ? eq(workoutLogsTable.userId, userId)
    : eq(workoutLogsTable.sessionId, sessionId);

  const logs = await db.query.workoutLogsTable.findMany({
    where, orderBy: (t, { desc }) => [desc(t.createdAt)], limit: 50,
  });
  res.json(logs);
});

export default router;
