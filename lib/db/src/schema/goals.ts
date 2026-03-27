import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const goalsTable = pgTable("goals", {
  sessionId: text("session_id").primaryKey(),
  userId: text("user_id"),
  // Macro goals (g/day)
  calories: integer("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  fiber: real("fiber"),
  // Meals per day (used to compute per-meal equivalents)
  mealsPerDay: integer("meals_per_day").default(3),
  // Onboarding biometrics
  weight: real("weight"),
  height: real("height"),
  age: integer("age"),
  sex: text("sex"),
  objective: text("objective"),
  activityLevel: real("activity_level"),
  restrictions: text("restrictions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ createdAt: true, updatedAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;
