import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, subscriptionsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import {
  requireAdminKey,
  escapeHtml,
  formatDate,
  adminNav,
  toggleButtonHtml,
  ADMIN_BASE_CSS,
  TOGGLE_SENSITIVE_SCRIPT,
} from "../lib/admin-ui.js";

const router: IRouter = Router();

// ─── GET /api/admin/leads ─────────────────────────────────────────────────────
router.get("/leads", async (req: Request, res: Response) => {
  if (!requireAdminKey(req, res)) return;
  const key = req.query.key as string;

  const [users, subs] = await Promise.all([
    db.query.usersTable.findMany({ orderBy: [desc(usersTable.createdAt)] }),
    db.query.subscriptionsTable.findMany({ orderBy: [desc(subscriptionsTable.createdAt)] }),
  ]);

  const totalUsers = users.length;
  const totalSessions = subs.length;
  const converted = subs.filter((s) => s.userId).length;
  const stripeCustomers = subs.filter((s) => s.stripeCustomerId).length;
  const activePaid = subs.filter((s) => s.tier !== "free" && s.currentPeriodEnd && s.currentPeriodEnd > new Date()).length;
  const engaged = subs.filter((s) => s.analysisCount > 0 || s.workoutCount > 0).length;

  const userRows = users
    .map(
      (u) => `<tr>
        <td>${formatDate(u.createdAt)}</td>
        <td><span class="sensitive">${escapeHtml(u.email)}</span></td>
        <td><span class="sensitive">${escapeHtml(u.name ?? "—")}</span></td>
      </tr>`
    )
    .join("");

  const sessionRows = subs
    .slice(0, 100)
    .map(
      (s) => `<tr>
        <td>${formatDate(s.createdAt)}</td>
        <td><span class="sensitive">${escapeHtml(s.sessionId.slice(0, 12))}…</span></td>
        <td>${s.userId ? "conta" : "anônimo"}</td>
        <td>${escapeHtml(s.tier)}</td>
        <td><span class="sensitive">${s.analysisCount}</span></td>
        <td><span class="sensitive">${s.workoutCount}</span></td>
        <td>${s.stripeCustomerId ? "sim" : "não"}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Leads — IA Calorias</title>
<style>${ADMIN_BASE_CSS}</style>
</head>
<body>
  <div class="topbar">
    <div>
      <h1>Leads — IA Calorias</h1>
      ${adminNav("leads", key)}
    </div>
    ${toggleButtonHtml()}
  </div>
  <div class="stats">
    <div class="stat"><div class="n sensitive">${totalUsers}</div><div class="l">usuários cadastrados</div></div>
    <div class="stat"><div class="n sensitive">${totalSessions}</div><div class="l">sessões (leads totais)</div></div>
    <div class="stat"><div class="n sensitive">${converted}</div><div class="l">converteram em conta</div></div>
    <div class="stat"><div class="n sensitive">${stripeCustomers}</div><div class="l">viraram cliente Stripe</div></div>
    <div class="stat"><div class="n sensitive">${activePaid}</div><div class="l">assinatura paga ativa</div></div>
    <div class="stat"><div class="n sensitive">${engaged}</div><div class="l">usaram análise/treino</div></div>
  </div>

  <h2>Usuários cadastrados (<span class="sensitive">${totalUsers}</span>)</h2>
  <div class="wrap">
    <table>
      <thead><tr><th>Criado em</th><th>Email</th><th>Nome</th></tr></thead>
      <tbody>${userRows}</tbody>
    </table>
  </div>

  <h2>Sessões recentes (últimas <span class="sensitive">${Math.min(subs.length, 100)}</span> de <span class="sensitive">${totalSessions}</span>)</h2>
  <div class="wrap">
    <table>
      <thead><tr><th>Criado em</th><th>Sessão</th><th>Tipo</th><th>Tier</th><th>Análises</th><th>Treinos</th><th>Stripe</th></tr></thead>
      <tbody>${sessionRows}</tbody>
    </table>
  </div>

  ${TOGGLE_SENSITIVE_SCRIPT}
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
