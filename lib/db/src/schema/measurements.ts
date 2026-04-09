import { pgTable, text, real, date, timestamp } from "drizzle-orm/pg-core";

export const measurementsTable = pgTable("body_measurements", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id"),
  logDate: date("log_date").notNull(), // YYYY-MM-DD
  waist: real("waist"),    // cm
  hip: real("hip"),        // cm
  arm: real("arm"),        // cm
  chest: real("chest"),    // cm
  thigh: real("thigh"),    // cm
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Measurement = typeof measurementsTable.$inferSelect;
