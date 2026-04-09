import { Router, type IRouter, type Request, type Response } from "express";
import { db, measurementsTable } from "@workspace/db";
import { eq, and, desc, or } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// GET /api/measurements?sessionId=
router.get("/", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string | undefined;
  const userId = req.user?.userId;

  if (!sessionId && !userId) { res.status(400).json({ error: "bad_request" }); return; }

  let logs;
  if (userId) {
    logs = await db.query.measurementsTable.findMany({
      where: or(eq(measurementsTable.userId, userId), ...(sessionId ? [eq(measurementsTable.sessionId, sessionId)] : [])),
      orderBy: [desc(measurementsTable.logDate)],
      limit: 90,
    });
  } else {
    logs = await db.query.measurementsTable.findMany({
      where: eq(measurementsTable.sessionId, sessionId!),
      orderBy: [desc(measurementsTable.logDate)],
      limit: 90,
    });
  }

  res.json({
    logs: logs.map(l => ({
      id: l.id, logDate: l.logDate, createdAt: l.createdAt,
      waist: l.waist, hip: l.hip, arm: l.arm, chest: l.chest, thigh: l.thigh,
    })).reverse(),
  });
});

// POST /api/measurements — upsert measurement for a date
router.post("/", async (req: Request, res: Response) => {
  const { sessionId, logDate, waist, hip, arm, chest, thigh } = req.body;
  const userId = req.user?.userId;

  if (!sessionId && !userId) { res.status(400).json({ error: "bad_request" }); return; }

  const effectiveSessionId = sessionId ?? `user-${userId}`;
  const date = logDate ?? new Date().toISOString().slice(0, 10);

  const toNum = (v: any) => (v != null && !isNaN(Number(v)) && Number(v) > 0) ? Number(v) : null;
  const patch = {
    waist: toNum(waist), hip: toNum(hip), arm: toNum(arm),
    chest: toNum(chest), thigh: toNum(thigh),
  };

  const existing = await db.query.measurementsTable.findFirst({
    where: and(
      eq(measurementsTable.sessionId, effectiveSessionId),
      eq(measurementsTable.logDate, date),
    ),
  });

  if (existing) {
    await db.update(measurementsTable)
      .set({ ...patch, userId: userId ?? existing.userId ?? null })
      .where(eq(measurementsTable.id, existing.id));
    res.json({ id: existing.id, logDate: date, ...patch });
  } else {
    const id = randomUUID();
    await db.insert(measurementsTable).values({
      id, sessionId: effectiveSessionId, userId: userId ?? null, logDate: date, ...patch,
    });
    res.json({ id, logDate: date, ...patch });
  }
});

export default router;
