import { pgTable, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const goalsTable = pgTable("goals", {
  sessionId: text("session_id").primaryKey(),
  // Macro goals (g/day)
  calories: integer("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  fiber: real("fiber"),
  // Onboarding biometrics
  weight: real("weight"),         // kg
  height: real("height"),         // cm
  age: integer("age"),
  sex: text("sex"),               // 'male' | 'female'
  objective: text("objective"),   // 'fat_loss' | 'muscle_gain' | 'maintenance' | 'health'
  activityLevel: integer("activity_level"), // 1-5
  restrictions: text("restrictions"),       // JSON array string
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGoalSchema = createInsertSchema(goalsTable).omit({ createdAt: true, updatedAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goalsTable.$inferSelect;
