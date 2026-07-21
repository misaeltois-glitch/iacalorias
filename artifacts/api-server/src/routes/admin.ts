import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, subscriptionsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { timingSafeEqual } from "crypto";

const router: IRouter = Router();

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date: Date): string {
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// ─── GET /api/admin/leads ─────────────────────────────────────────────────────
router.get("/leads", async (req: Request, res: Response) => {
  const secret = process.env.ADMIN_SECRET;
  const key = req.query.key;
  if (!secret || typeof key !== "string" || !safeEqual(key, secret)) {
    res.status(404).send("Not found");
    return;
  }

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
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background: #0b0e14; color: #e6e6e6; margin: 0; padding: 24px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 15px; color: #9aa4b2; margin-top: 32px; }
  .stats { display: flex; flex-wrap: wrap; gap: 12px; margin: 16px 0; }
  .stat { background: #161b26; border: 1px solid #262d3d; border-radius: 8px; padding: 12px 16px; min-width: 140px; }
  .stat .n { font-size: 24px; font-weight: 600; }
  .stat .l { font-size: 12px; color: #9aa4b2; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #1f2531; white-space: nowrap; }
  th { color: #9aa4b2; font-weight: 500; }
  .wrap { overflow-x: auto; }
  .topbar { display: flex; align-items: center; justify-content: space-between; }
  .eye-btn {
    background: #161b26; border: 1px solid #262d3d; border-radius: 8px; color: #e6e6e6;
    padding: 8px 14px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 6px;
  }
  .eye-btn:hover { background: #1c2230; }
  .sensitive { filter: blur(5px); user-select: none; transition: filter 0.15s; }
  body.revealed .sensitive { filter: none; user-select: text; }
</style>
</head>
<body>
  <div class="topbar">
    <h1>Leads — IA Calorias</h1>
    <button class="eye-btn" id="toggleSensitive" type="button">
      <span id="eyeIcon">🙈</span> <span id="eyeLabel">Mostrar dados</span>
    </button>
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

  <script>
    const btn = document.getElementById('toggleSensitive');
    const icon = document.getElementById('eyeIcon');
    const label = document.getElementById('eyeLabel');
    btn.addEventListener('click', () => {
      const revealed = document.body.classList.toggle('revealed');
      icon.textContent = revealed ? '👁️' : '🙈';
      label.textContent = revealed ? 'Ocultar dados' : 'Mostrar dados';
    });
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
