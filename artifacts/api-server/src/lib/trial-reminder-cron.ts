import { db, usersTable, subscriptionsTable, analysesTable } from "@workspace/db";
import { eq, and, gte, lt, isNull, ne, inArray } from "drizzle-orm";
import { sendTrialExpiringEmail } from "./email.js";
import { logger } from "./logger.js";

const FREE_TRIAL_DAYS = 7;

// In-memory dedup: "userId:daysLeft" already sent this server run
const sentTrialReminders = new Set<string>();

function dayWindowUtc(daysAgo: number): { start: Date; end: Date } {
  const now = new Date();
  // Align to UTC midnight of daysAgo days back
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (daysAgo - 1)));
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

/**
 * Finds users who registered exactly N days ago and are still on free tier.
 * Returns at most 200 users (more than enough for batch processing).
 */
async function getFreeUsersRegisteredDaysAgo(daysAgo: number): Promise<{ id: string; email: string; name: string | null }[]> {
  const { start, end } = dayWindowUtc(daysAgo);

  // Get all users registered in that 24-hour window
  const users = await db.query.usersTable.findMany({
    where: and(gte(usersTable.createdAt, start), lt(usersTable.createdAt, end)),
    columns: { id: true, email: true, name: true },
    limit: 200,
  });

  if (users.length === 0) return [];

  const userIds = users.map(u => u.id);

  // Find which have a paid subscription (limited or unlimited)
  const paidSubs = await db.query.subscriptionsTable.findMany({
    where: and(
      inArray(subscriptionsTable.userId, userIds),
      ne(subscriptionsTable.tier, "free"),
    ),
    columns: { userId: true },
  });

  const paidUserIds = new Set(paidSubs.map(s => s.userId).filter(Boolean) as string[]);

  // Return only users still on free tier
  return users.filter(u => !paidUserIds.has(u.id));
}

async function getActivityStats(userId: string): Promise<{ totalMeals: number; streak: number }> {
  try {
    const analyses = await db.query.analysesTable.findMany({
      where: eq(analysesTable.userId, userId),
      columns: { createdAt: true },
      limit: 300,
    });

    const totalMeals = analyses.length;

    // Compute streak (consecutive days ending today, UTC-3)
    const nowBrt = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const daySet = new Set(analyses.map(a => a.createdAt.toISOString().slice(0, 10)));
    let streak = 0;
    const checkFrom = new Date(Date.UTC(nowBrt.getUTCFullYear(), nowBrt.getUTCMonth(), nowBrt.getUTCDate()));
    for (let i = 0; i < 90; i++) {
      if (daySet.has(checkFrom.toISOString().slice(0, 10))) {
        streak++;
        checkFrom.setUTCDate(checkFrom.getUTCDate() - 1);
      } else break;
    }

    return { totalMeals, streak };
  } catch {
    return { totalMeals: 0, streak: 0 };
  }
}

/**
 * Called once per hour from index.ts.
 * Sends trial expiring emails on day 5 (2 days left) and day 6 (1 day left) of free trial.
 */
export async function maybeRunTrialReminderCron(): Promise<void> {
  // Day 5 → 2 days left; Day 6 → 1 day left
  for (const { daysAgo, daysLeft } of [{ daysAgo: 5, daysLeft: 2 }, { daysAgo: 6, daysLeft: 1 }]) {
    try {
      const users = await getFreeUsersRegisteredDaysAgo(daysAgo);
      if (users.length === 0) continue;

      logger.info({ count: users.length, daysLeft }, "trial reminder cron: sending batch");

      for (let i = 0; i < users.length; i += 5) {
        const batch = users.slice(i, i + 5);
        await Promise.allSettled(batch.map(async u => {
          const dedupeKey = `${u.id}:${daysLeft}`;
          if (sentTrialReminders.has(dedupeKey)) return;

          try {
            const { totalMeals, streak } = await getActivityStats(u.id);
            await sendTrialExpiringEmail(u.email, {
              userName: u.name || u.email.split("@")[0],
              daysLeft,
              totalMeals,
              streak,
            }, logger);
            sentTrialReminders.add(dedupeKey);
            logger.info({ userId: u.id, email: u.email, daysLeft }, "trial reminder sent");
          } catch (err) {
            logger.error({ err, userId: u.id }, "trial reminder failed for user");
          }
        }));

        if (i + 5 < users.length) {
          await new Promise<void>(r => { (globalThis as any).setTimeout(r, 1000); });
        }
      }
    } catch (err) {
      logger.error({ err, daysAgo }, "trial reminder cron batch failed");
    }
  }
}