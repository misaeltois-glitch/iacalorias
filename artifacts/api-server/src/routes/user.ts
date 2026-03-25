import { Router, type IRouter, type Request, type Response } from "express";
import { db, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const FREE_TRIAL_LIMIT = 3;
const LIMITED_PLAN_LIMIT = 20;

router.get("/me", async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.headers["x-session-id"] as string || req.query.sessionId as string;

  if (!userId && !sessionId) {
    res.status(401).json({ error: "unauthorized", message: "Session ID or auth token required" });
    return;
  }

  let sub;

  if (userId) {
    sub = await db.query.subscriptionsTable.findFirst({ where: eq(subscriptionsTable.userId, userId) });
  }

  const effectiveSessionId = sessionId ?? (userId ? `user-${userId}` : undefined);

  if (!sub && effectiveSessionId) {
    sub = await db.query.subscriptionsTable.findFirst({ where: eq(subscriptionsTable.sessionId, effectiveSessionId) });
    if (!sub) {
      await db.insert(subscriptionsTable).values({ sessionId: effectiveSessionId, userId: userId ?? null, tier: "free", analysisCount: 0 });
      sub = { sessionId: effectiveSessionId, userId: userId ?? null, tier: "free", analysisCount: 0, stripeCustomerId: null, stripeSubscriptionId: null, currentPeriodEnd: null, createdAt: new Date(), updatedAt: new Date() };
    }
  }

  if (!sub) {
    res.status(404).json({ error: "not_found", message: "Session not found" });
    return;
  }

  const tier = sub.tier as "free" | "limited" | "unlimited";
  const analysisLimit = tier === "limited" ? LIMITED_PLAN_LIMIT : tier === "unlimited" ? null : FREE_TRIAL_LIMIT;
  const trialRemaining = tier === "free" ? Math.max(0, FREE_TRIAL_LIMIT - sub.analysisCount) : 0;

  const data = GetMeResponse.parse({
    sessionId: sub.sessionId,
    tier,
    analysisCount: sub.analysisCount,
    analysisLimit,
    trialRemaining,
  });

  res.json(data);
});

export default router;
