import app from "./app";
import { logger } from "./lib/logger";
import { db, pool, usersTable, analysesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function runMigrations() {
  try {
    await pool.query(`
      ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'subscription'
    `);
    await pool.query(`
      ALTER TABLE analyses
      ADD COLUMN IF NOT EXISTS substitution_tip text
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS weight_logs (
        id text PRIMARY KEY,
        session_id text NOT NULL,
        user_id text,
        weight_kg real NOT NULL,
        log_date date NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id text PRIMARY KEY,
        code text NOT NULL,
        referrer_user_id text NOT NULL,
        referee_session_id text,
        referee_user_id text,
        status text NOT NULL DEFAULT 'applied',
        created_at timestamp NOT NULL DEFAULT now(),
        converted_at timestamp
      )
    `);
    await pool.query(`
      ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS referral_bonus_days integer DEFAULT 0
    `);
    logger.info("DB migrations applied");
  } catch (err) {
    logger.warn({ err }, "DB migration failed (non-critical)");
  }
}

async function cleanupDevAccount() {
  try {
    const devUsers = await db.query.usersTable.findMany({
      where: eq(usersTable.email, "dev@iacalorias.com.br"),
      columns: { id: true },
    });
    if (devUsers.length === 0) return;
    const devUserIds = devUsers.map((u) => u.id);
    const deleted = await db
      .delete(analysesTable)
      .where(inArray(analysesTable.userId, devUserIds))
      .returning();
    if (deleted.length > 0) {
      logger.info({ deleted: deleted.length }, "Dev account analyses cleaned up");
    }
  } catch (err) {
    logger.warn({ err }, "Dev account cleanup failed (non-critical)");
  }
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await runMigrations();
  await cleanupDevAccount();
});
