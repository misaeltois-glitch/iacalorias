import { pgTable, text, integer, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const workoutProfilesTable = pgTable("workout_profiles", {
  id: text("id").primaryKey(),
  sessionId: text("session_id"),
  userId: text("user_id"),
  goal: text("goal").notNull(),
  sex: text("sex").notNull(),
  age: integer("age").notNull(),
  weight: real("weight").notNull(),
  height: real("height").notNull(),
  bodyFat: real("body_fat"),
  waist: real("waist"),
  level: text("level").notNull(),
  trainingDays: jsonb("training_days").$type<string[]>().notNull(),
  sessionDuration: integer("session_duration").notNull(),
  preferredTime: text("preferred_time"),
  gym: text("gym").notNull(),
  equipment: jsonb("equipment").$type<string[]>().notNull(),
  hasInjuries: boolean("has_injuries").default(false),
  injuries: jsonb("injuries").$type<string[]>().default([]),
  medicalNotes: text("medical_notes"),
  cardio: text("cardio").default("none"),
  warmup: text("warmup").default("basic"),
  techniques: jsonb("techniques").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const workoutLogsTable = pgTable("workout_logs", {
  id: text("id").primaryKey(),
  sessionId: text("session_id"),
  userId: text("user_id"),
  sessionName: text("session_name").notNull(),
  date: text("date").notNull(),
  durationMinutes: integer("duration_minutes"),
  exercises: jsonb("exercises").$type<object[]>().default([]),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type WorkoutProfile = typeof workoutProfilesTable.$inferSelect;
export type WorkoutLog = typeof workoutLogsTable.$inferSelect;
