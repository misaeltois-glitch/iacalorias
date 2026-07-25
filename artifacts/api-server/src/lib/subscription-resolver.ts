import { db, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const FREE_TRIAL_DAYS = 7;

type Subscription = typeof subscriptionsTable.$inferSelect;

export async function resolveOrCreateSubscription(
  userId?: string,
  sessionId?: string,
  deviceFingerprint?: string
): Promise<Subscription | null> {
  if (userId) {
    const sub = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, userId),
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    });
    if (sub) return sub;
  }

  const effectiveSessionId = sessionId ?? (userId ? `user-${userId}` : undefined);
  if (!effectiveSessionId) return null;

  let sub = await db.query.subscriptionsTable.findFirst({
    where: eq(subscriptionsTable.sessionId, effectiveSessionId),
  });

  if (sub) {
    if (userId && !sub.userId) {
      await db.update(subscriptionsTable).set({ userId }).where(eq(subscriptionsTable.sessionId, effectiveSessionId));
      sub = { ...sub, userId };
    }
    return sub;
  }

  // Sessão genuinamente nova: decide createdAt com base em reuso de fingerprint,
  // mas nunca copia/compartilha dado de outra linha (analysisCount, histórico etc).
  const cleanFp = deviceFingerprint && deviceFingerprint.trim().length > 0 ? deviceFingerprint.trim() : undefined;
  let createdAt = new Date();

  if (cleanFp) {
    const priorByFingerprint = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.deviceFingerprint, cleanFp),
    });
    if (priorByFingerprint) {
      createdAt = new Date(Date.now() - FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
    }
  }

  await db
    .insert(subscriptionsTable)
    .values({
      sessionId: effectiveSessionId,
      userId: userId ?? null,
      tier: "free",
      analysisCount: 0,
      deviceFingerprint: cleanFp ?? null,
      createdAt,
    })
    .onConflictDoNothing({ target: subscriptionsTable.sessionId });

  sub = await db.query.subscriptionsTable.findFirst({ where: eq(subscriptionsTable.sessionId, effectiveSessionId) });
  return sub!;
}
