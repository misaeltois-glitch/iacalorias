import { pgTable, text, real, date, timestamp } from "drizzle-orm/pg-core";

export const weightLogsTable = pgTable("weight_logs", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id"),
  weightKg: real("weight_kg").notNull(),
  logDate: date("log_date").notNull(), // YYYY-MM-DD
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type WeightLog = typeof weightLogsTable.$inferSelect;
