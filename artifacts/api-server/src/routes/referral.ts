import { Router, type IRouter, type Request, type Response } from "express";
import { db, pool, subscriptionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// Derive a deterministic referral code from userId
function codeFromUserId(userId: string): string {
  const slug = userId.replace(/-/g, "").slice(0, 7).toUpperCase();
  return `IAC${slug}`;
}

// GET /api/referral — current user's code + stats
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const code = codeFromUserId(userId);

  const { rows: refs } = await pool.query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text as count FROM referrals WHERE referrer_user_id = $1 GROUP BY status`,
    [userId],
  );

  const appliedCount = refs.reduce((s, r) => s + parseInt(r.count), 0);
  const convertedCount = refs.find(r => r.status === "converted") ? parseInt(refs.find(r => r.status === "converted")!.count) : 0;

  const sub = await db.query.subscriptionsTable.findFirst({
    where: eq(subscriptionsTable.userId, userId),
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  });
  const bonusDays = (sub as any)?.referralBonusDays ?? 0;

  res.json({ code, appliedCount, convertedCount, bonusDays });
});

// POST /api/referral/apply — apply a referral code (called after signup/login)
router.post("/apply", async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { code, sessionId } = req.body as { code?: string; sessionId?: string };

  if (!code) {
    res.status(400).json({ error: "bad_request", message: "code required" });
    return;
  }

  // Validate code format
  if (!/^IAC[A-Z0-9]{6,8}$/.test(code)) {
    res.status(400).json({ error: "invalid_code" });
    return;
  }

  // Find referrer by code — brute force against all users (small table)
  const { rows: users } = await pool.query<{ id: string }>(
    `SELECT id FROM users LIMIT 10000`,
  );
  const referrerUser = users.find(u => codeFromUserId(u.id) === code);

  if (!referrerUser) {
    res.status(404).json({ error: "not_found", message: "Código de indicação não encontrado" });
    return;
  }

  // Can't refer yourself
  if (userId && referrerUser.id === userId) {
    res.status(400).json({ error: "self_referral" });
    return;
  }

  // Check if this referee already used a referral (by userId or sessionId)
  if (userId) {
    const { rows: existing } = await pool.query(
      `SELECT id FROM referrals WHERE referee_user_id = $1 LIMIT 1`,
      [userId],
    );
    if (existing.length > 0) {
      res.status(409).json({ error: "already_applied" });
      return;
    }
  }

  if (sessionId) {
    const { rows: existing } = await pool.query(
      `SELECT id FROM referrals WHERE referee_session_id = $1 LIMIT 1`,
      [sessionId],
    );
    if (existing.length > 0) {
      res.status(409).json({ error: "already_applied" });
      return;
    }
  }

  // Create referral record
  const id = randomUUID();
  await pool.query(
    `INSERT INTO referrals (id, code, referrer_user_id, referee_session_id, referee_user_id, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'applied', now())
     ON CONFLICT DO NOTHING`,
    [id, code, referrerUser.id, sessionId ?? null, userId ?? null],
  );

  // Reward referrer: add 30 bonus days if they have a subscription
  const referrerSub = await db.query.subscriptionsTable.findFirst({
    where: eq(subscriptionsTable.userId, referrerUser.id),
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  });
  if (referrerSub) {
    const currentBonus = (referrerSub as any).referralBonusDays ?? 0;
    await pool.query(
      `UPDATE subscriptions SET referral_bonus_days = $1, updated_at = now() WHERE session_id = $2`,
      [currentBonus + 30, referrerSub.sessionId],
    );
  }

  res.json({ ok: true, referrerCode: code });
});

// POST /api/referral/convert — mark a referral as converted (called when referee pays)
// This is called internally from the Stripe webhook (future enhancement)
// For now, exposed as internal — not registered in public routes

export { codeFromUserId };
export default router;
