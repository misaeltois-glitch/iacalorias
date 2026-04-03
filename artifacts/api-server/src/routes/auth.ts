import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { randomUUID, randomBytes } from "crypto";
import { db, usersTable, subscriptionsTable, analysesTable, goalsTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { signToken, verifyToken } from "../lib/jwt.js";
import { sendPasswordResetEmail } from "../lib/email.js";

const router: IRouter = Router();

const SALT_ROUNDS = 12;

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, sessionId } = req.body as { email?: string; password?: string; sessionId?: string };

  if (!email || !password) {
    res.status(400).json({ error: "bad_request", message: "Email e senha são obrigatórios." });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "bad_request", message: "Email inválido." });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "bad_request", message: "A senha deve ter pelo menos 6 caracteres." });
    return;
  }

  const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email.toLowerCase()) });
  if (existing) {
    res.status(409).json({ error: "email_taken", message: "Este email já está em uso." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = randomUUID();

  await db.insert(usersTable).values({ id: userId, email: email.toLowerCase(), passwordHash });

  // Migrate anonymous data to new account
  if (sessionId) {
    await migrateAnonymousData(sessionId, userId);
  }

  const token = signToken({ userId, email: email.toLowerCase() });
  res.status(201).json({ token, user: { id: userId, email: email.toLowerCase() } });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  const { email, password, sessionId } = req.body as { email?: string; password?: string; sessionId?: string };

  if (!email || !password) {
    res.status(400).json({ error: "bad_request", message: "Email e senha são obrigatórios." });
    return;
  }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email.toLowerCase()) });
  if (!user) {
    res.status(401).json({ error: "invalid_credentials", message: "Email ou senha incorretos." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "invalid_credentials", message: "Email ou senha incorretos." });
    return;
  }

  // Migrate anonymous data if sessionId provided
  if (sessionId) {
    await migrateAnonymousData(sessionId, user.id);
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({ token, user: { id: user.id, email: user.email } });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "Token necessário." });
    return;
  }
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    res.status(401).json({ error: "invalid_token", message: "Token inválido ou expirado." });
    return;
  }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, payload.userId) });
  if (!user) {
    res.status(404).json({ error: "not_found", message: "Usuário não encontrado." });
    return;
  }

  res.json({ id: user.id, email: user.email, createdAt: user.createdAt.toISOString() });
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post("/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "bad_request", message: "Email é obrigatório." });
    return;
  }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email.toLowerCase()) });

  // Always return success to prevent email enumeration
  const GENERIC_RESPONSE = { message: "Se este email estiver cadastrado, você receberá um link de redefinição em breve." };

  if (!user) {
    res.json(GENERIC_RESPONSE);
    return;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.update(usersTable)
    .set({ resetToken: token, resetTokenExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  try {
    await sendPasswordResetEmail(user.email, token, req.log);
  } catch (err) {
    req.log.error({ err }, "Failed to send password reset email");
  }

  res.json(GENERIC_RESPONSE);
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post("/reset-password", async (req: Request, res: Response) => {
  const { token, password } = req.body as { token?: string; password?: string };

  if (!token || !password) {
    res.status(400).json({ error: "bad_request", message: "Token e nova senha são obrigatórios." });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "bad_request", message: "A senha deve ter pelo menos 6 caracteres." });
    return;
  }

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.resetToken, token) });

  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    res.status(400).json({ error: "invalid_token", message: "Link de redefinição inválido ou expirado. Solicite um novo." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await db.update(usersTable)
    .set({ passwordHash, resetToken: null, resetTokenExpiresAt: null, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  res.json({ message: "Senha alterada com sucesso. Faça login com sua nova senha." });
});

// ─── POST /api/auth/google-oauth ─────────────────────────────────────────────
router.post("/google-oauth", async (req: Request, res: Response) => {
  const { credential, sessionId } = req.body as { credential?: string; sessionId?: string };

  if (!credential) {
    res.status(400).json({ error: "bad_request", message: "Google credential é obrigatório." });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(503).json({ error: "not_configured", message: "Google OAuth não configurado." });
    return;
  }

  try {
    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      res.status(400).json({ error: "invalid_credential", message: "Token Google inválido." });
      return;
    }

    const email = payload.email.toLowerCase();
    const name = payload.name ?? payload.given_name ?? undefined;
    const avatarUrl = payload.picture ?? undefined;

    let user = await db.query.usersTable.findFirst({ where: eq(usersTable.email, email) });

    if (!user) {
      const userId = randomUUID();
      // OAuth users don't have a password — store a non-reversible hash
      const fakeHash = await bcrypt.hash(randomBytes(32).toString("hex"), SALT_ROUNDS);
      await db.insert(usersTable).values({ id: userId, email, passwordHash: fakeHash, name, avatarUrl });
      user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
      if (sessionId && user) await migrateAnonymousData(sessionId, userId);
    } else {
      // Update name/avatar only if not set yet
      const updates: Record<string, any> = { updatedAt: new Date() };
      if (!user.name && name) updates.name = name;
      if (!user.avatarUrl && avatarUrl) updates.avatarUrl = avatarUrl;
      await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
      if (sessionId) await migrateAnonymousData(sessionId, user.id);
    }

    const token = signToken({ userId: user!.id, email: user!.email });
    res.json({ token, user: { id: user!.id, email: user!.email } });
  } catch (err: any) {
    req.log.error({ err }, "Google OAuth error");
    res.status(401).json({ error: "invalid_credential", message: "Falha ao verificar token Google. Tente novamente." });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post("/logout", (_req: Request, res: Response) => {
  // JWT is stateless — client deletes the token
  res.json({ message: "Logout realizado." });
});

// ─── Data migration helper ────────────────────────────────────────────────────
const TIER_RANK: Record<string, number> = { free: 0, limited: 1, unlimited: 2 };

async function migrateAnonymousData(sessionId: string, userId: string): Promise<void> {
  // Always tag analyses — they are additive with no conflict risk
  await db.update(analysesTable)
    .set({ userId })
    .where(and(eq(analysesTable.sessionId, sessionId), isNull(analysesTable.userId)));

  // Subscription: if user already has a userId row, merge without creating a duplicate
  const sessionSub = await db.query.subscriptionsTable.findFirst({
    where: and(eq(subscriptionsTable.sessionId, sessionId), isNull(subscriptionsTable.userId)),
  });

  if (sessionSub) {
    const existingUserSub = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, userId),
      orderBy: (t, { desc }) => [desc(t.updatedAt)],
    });

    if (existingUserSub) {
      // User already has a canonical row — promote tier if session row has better paid status
      const sessionRank = TIER_RANK[sessionSub.tier] ?? 0;
      const existingRank = TIER_RANK[existingUserSub.tier] ?? 0;
      if (sessionRank > existingRank) {
        await db.update(subscriptionsTable)
          .set({
            tier: sessionSub.tier,
            analysisCount: existingUserSub.analysisCount + sessionSub.analysisCount,
            stripeCustomerId: sessionSub.stripeCustomerId ?? existingUserSub.stripeCustomerId,
            stripeSubscriptionId: sessionSub.stripeSubscriptionId ?? existingUserSub.stripeSubscriptionId,
            currentPeriodEnd: sessionSub.currentPeriodEnd ?? existingUserSub.currentPeriodEnd,
            updatedAt: new Date(),
          })
          .where(eq(subscriptionsTable.sessionId, existingUserSub.sessionId));
      }
      // Do NOT tag sessionSub.userId to avoid a second userId row
    } else {
      // No canonical row yet — simply tag the session row with userId
      await db.update(subscriptionsTable)
        .set({ userId })
        .where(eq(subscriptionsTable.sessionId, sessionId));
    }
  }

  // Goals: if user already has goals, skip migration to avoid overwriting
  const sessionGoals = await db.query.goalsTable.findFirst({
    where: and(eq(goalsTable.sessionId, sessionId), isNull(goalsTable.userId)),
  });

  if (sessionGoals) {
    const existingUserGoals = await db.query.goalsTable.findFirst({
      where: eq(goalsTable.userId, userId),
    });

    if (!existingUserGoals) {
      await db.update(goalsTable)
        .set({ userId })
        .where(eq(goalsTable.sessionId, sessionId));
    }
  }
}

export default router;
