import { Router, type IRouter, type Request, type Response } from "express";
import { db, subscriptionsTable, analysesTable, usersTable, goalsTable } from "@workspace/db";
import { eq, or, and } from "drizzle-orm";
import { GetMeResponse } from "@workspace/api-zod";
import bcrypt from "bcryptjs";

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

// GET /api/user/profile — retorna dados do perfil do usuário autenticado
router.get("/profile", async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.headers["x-session-id"] as string || req.query.sessionId as string;

  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "Autenticação necessária" });
    return;
  }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user) {
    res.status(404).json({ error: "not_found", message: "Usuário não encontrado" });
    return;
  }

  let goals = null;
  if (userId) {
    goals = await db.query.goalsTable.findFirst({
      where: eq(goalsTable.userId, userId),
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    });
  }
  if (!goals && sessionId) {
    goals = await db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId) });
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    avatarUrl: user.avatarUrl ?? null,
    biometrics: goals ? {
      weight: goals.weight,
      height: goals.height,
      age: goals.age,
      sex: goals.sex,
      objective: goals.objective,
      activityLevel: goals.activityLevel,
    } : null,
  });
});

// PATCH /api/user/profile — atualiza nome, avatar e dados físicos
router.patch("/profile", async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.headers["x-session-id"] as string || req.body.sessionId as string;

  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "Autenticação necessária" });
    return;
  }

  const { name, avatarUrl, weight, height, age, sex, objective, activityLevel } = req.body as {
    name?: string;
    avatarUrl?: string;
    weight?: number;
    height?: number;
    age?: number;
    sex?: string;
    objective?: string;
    activityLevel?: number;
  };

  const userUpdate: Record<string, any> = { updatedAt: new Date() };
  if (name !== undefined) userUpdate.name = name.trim() || null;
  if (avatarUrl !== undefined) userUpdate.avatarUrl = avatarUrl || null;

  if (Object.keys(userUpdate).length > 1) {
    await db.update(usersTable).set(userUpdate).where(eq(usersTable.id, userId));
  }

  const biometrics: Record<string, any> = {};
  if (weight !== undefined) biometrics.weight = weight;
  if (height !== undefined) biometrics.height = height;
  if (age !== undefined) biometrics.age = age;
  if (sex !== undefined) biometrics.sex = sex;
  if (objective !== undefined) biometrics.objective = objective;
  if (activityLevel !== undefined) biometrics.activityLevel = activityLevel;

  if (Object.keys(biometrics).length > 0) {
    const existing = await db.query.goalsTable.findFirst({
      where: eq(goalsTable.userId, userId),
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    });
    if (existing) {
      await db.update(goalsTable).set({ ...biometrics, updatedAt: new Date() }).where(eq(goalsTable.sessionId, existing.sessionId));
    } else if (sessionId) {
      const existingBySession = await db.query.goalsTable.findFirst({ where: eq(goalsTable.sessionId, sessionId) });
      if (existingBySession) {
        await db.update(goalsTable).set({ ...biometrics, updatedAt: new Date() }).where(eq(goalsTable.sessionId, sessionId));
      }
    }
  }

  const updated = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  res.json({
    id: updated!.id,
    email: updated!.email,
    name: updated!.name ?? null,
    avatarUrl: updated!.avatarUrl ?? null,
  });
});

// PATCH /api/user/password — altera senha
router.patch("/password", async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    res.status(401).json({ error: "unauthorized", message: "Autenticação necessária" });
    return;
  }

  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "bad_request", message: "Senha atual e nova senha são obrigatórias" });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: "bad_request", message: "A nova senha deve ter pelo menos 6 caracteres" });
    return;
  }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user) {
    res.status(404).json({ error: "not_found", message: "Usuário não encontrado" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: "wrong_password", message: "Senha atual incorreta" });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(usersTable.id, userId));

  res.json({ success: true, message: "Senha alterada com sucesso" });
});

// DELETE /api/user/data — apaga todas as análises do usuário autenticado (LGPD)
router.delete("/data", async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const sessionId = req.headers["x-session-id"] as string || req.query.sessionId as string;

  if (!userId && !sessionId) {
    res.status(401).json({ error: "unauthorized", message: "Autenticação necessária" });
    return;
  }

  let deleted = 0;

  if (userId) {
    const rows = await db.delete(analysesTable).where(eq(analysesTable.userId, userId)).returning();
    deleted += rows.length;
  }

  if (sessionId) {
    const rows = await db.delete(analysesTable).where(eq(analysesTable.sessionId, sessionId)).returning();
    deleted += rows.length;
  }

  res.json({ success: true, deleted, message: `${deleted} análise(s) removida(s)` });
});

export default router;
