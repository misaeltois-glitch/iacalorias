import { Router, type IRouter, type Request, type Response } from "express";
import { db, subscriptionsTable, goalsTable } from "@workspace/db";
import Stripe from "stripe";
import {
  requireAdminKey,
  escapeHtml,
  adminNav,
  toggleButtonHtml,
  ADMIN_BASE_CSS,
  TOGGLE_SENSITIVE_SCRIPT,
  lineChartSvg,
  donutChartSvg,
} from "../lib/admin-ui.js";

const router: IRouter = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
const currencyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function parseDateParam(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function bucketByDay(
  items: { date: Date; value: number }[],
  from: Date,
  toExclusive: Date
): { label: string; value: number }[] {
  const sums = new Map<string, number>();
  for (const it of items) {
    const key = toDateStr(it.date);
    sums.set(key, (sums.get(key) ?? 0) + it.value);
  }
  const series: { label: string; value: number }[] = [];
  for (let d = new Date(from); d < toExclusive; d = new Date(d.getTime() + MS_PER_DAY)) {
    const key = toDateStr(d);
    series.push({ label: key.slice(5), value: sums.get(key) ?? 0 });
  }
  return series;
}

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
router.get("/dashboard", async (req: Request, res: Response) => {
  if (!requireAdminKey(req, res)) return;
  const key = req.query.key as string;

  const today = new Date();
  const defaultToStr = toDateStr(today);
  const defaultFromStr = toDateStr(new Date(today.getTime() - 30 * MS_PER_DAY));

  const fromStr = parseDateParam(req.query.from) ? (req.query.from as string) : defaultFromStr;
  const toStr = parseDateParam(req.query.to) ? (req.query.to as string) : defaultToStr;

  let fromDate = parseDateParam(fromStr) ?? parseDateParam(defaultFromStr)!;
  const toDateInclusive = parseDateParam(toStr) ?? parseDateParam(defaultToStr)!;
  const toDateExclusive = new Date(toDateInclusive.getTime() + MS_PER_DAY);

  if (toDateExclusive <= fromDate) {
    fromDate = new Date(toDateExclusive.getTime() - 30 * MS_PER_DAY);
  }
  if ((toDateExclusive.getTime() - fromDate.getTime()) / MS_PER_DAY > MAX_RANGE_DAYS) {
    fromDate = new Date(toDateExclusive.getTime() - MAX_RANGE_DAYS * MS_PER_DAY);
  }

  const [allSubs, allGoals] = await Promise.all([
    db.query.subscriptionsTable.findMany(),
    db.query.goalsTable.findMany({ columns: { state: true } }),
  ]);

  const periodSubs = allSubs.filter((s) => s.createdAt >= fromDate && s.createdAt < toDateExclusive);
  const newLeads = periodSubs.length;
  const convertedInPeriod = periodSubs.filter((s) => s.userId).length;
  const stripeCustomersInPeriod = periodSubs.filter((s) => s.stripeCustomerId).length;
  const contaRate = newLeads > 0 ? (convertedInPeriod / newLeads) * 100 : 0;
  const paganteRate = newLeads > 0 ? (stripeCustomersInPeriod / newLeads) * 100 : 0;

  const now = new Date();
  const activeSubs = allSubs.filter((s) => s.tier !== "free" && s.currentPeriodEnd && s.currentPeriodEnd > now);
  const activeLimited = activeSubs.filter((s) => s.tier === "limited").length;
  const activeUnlimited = activeSubs.filter((s) => s.tier === "unlimited").length;

  const leadsSeries = bucketByDay(
    periodSubs.map((s) => ({ date: s.createdAt, value: 1 })),
    fromDate,
    toDateExclusive
  );

  let stripeError = false;
  let paidInvoices: Stripe.Invoice[] = [];
  try {
    const fromUnix = Math.floor(fromDate.getTime() / 1000);
    const toUnix = Math.floor(toDateExclusive.getTime() / 1000) - 1;
    paidInvoices = await stripe.invoices
      .list({ status: "paid", created: { gte: fromUnix, lte: toUnix }, limit: 100 })
      .autoPagingToArray({ limit: 2000 });
  } catch (err) {
    stripeError = true;
    req.log.error({ err }, "Failed to fetch Stripe invoices for admin dashboard");
  }

  const totalRevenueCents = paidInvoices.reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0);
  const totalRevenue = totalRevenueCents / 100;
  const distinctPayingCustomers = new Set(
    paidInvoices.map((inv) => (typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? "unknown"))
  ).size;
  const avgTicket = distinctPayingCustomers > 0 ? totalRevenue / distinctPayingCustomers : 0;

  const revenueSeries = bucketByDay(
    paidInvoices.map((inv) => ({
      date: new Date((inv.status_transitions?.paid_at ?? inv.created) * 1000),
      value: (inv.amount_paid ?? 0) / 100,
    })),
    fromDate,
    toDateExclusive
  );

  const stateCounts = new Map<string, number>();
  for (const g of allGoals) {
    const key = g.state && g.state.trim() ? g.state : "—";
    stateCounts.set(key, (stateCounts.get(key) ?? 0) + 1);
  }
  const stateRows = [...stateCounts.entries()].sort((a, b) => b[1] - a[1]);

  const stateRowsHtml = stateRows
    .map(
      ([state, count]) => `<tr>
        <td>${state === "—" ? "sem estado informado" : escapeHtml(state)}</td>
        <td><span class="sensitive">${count}</span></td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Dashboard — IA Calorias</title>
<style>${ADMIN_BASE_CSS}
  .period-form { display: flex; align-items: end; gap: 10px; margin: 12px 0 20px; font-size: 13px; color: #9aa4b2; flex-wrap: wrap; }
  .period-form label { display: flex; flex-direction: column; gap: 4px; }
  .period-form input[type="date"] { background: #161b26; border: 1px solid #262d3d; border-radius: 6px; color: #e6e6e6; padding: 6px 8px; }
  .charts { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 12px; }
  .chart-card { background: #10141d; border: 1px solid #1f2531; border-radius: 8px; padding: 16px; }
  .donut-row { display: flex; align-items: center; gap: 20px; }
  .legend { list-style: none; padding: 0; margin: 0; font-size: 13px; }
  .legend li { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
  .legend .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .banner-warning { background: #3a2a12; border: 1px solid #6b4a1a; color: #f3c98a; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin: 12px 0; }
  .note { font-size: 12px; color: #5b6472; margin-top: 4px; }
</style>
</head>
<body>
  <div class="topbar">
    <div>
      <h1>Dashboard — IA Calorias</h1>
      ${adminNav("dashboard", key)}
    </div>
    ${toggleButtonHtml()}
  </div>

  <form method="get" class="period-form">
    <input type="hidden" name="key" value="${escapeHtml(key)}" />
    <label>De <input type="date" name="from" value="${fromStr}" /></label>
    <label>Até <input type="date" name="to" value="${toStr}" /></label>
    <button type="submit" class="eye-btn">Aplicar período</button>
  </form>

  ${stripeError ? `<div class="banner-warning">⚠️ Não foi possível carregar dados do Stripe para este período. Os demais números seguem normais.</div>` : ""}

  <div class="stats">
    <div class="stat"><div class="n sensitive">${stripeError ? "—" : currencyFmt.format(totalRevenue)}</div><div class="l">receita Stripe no período</div></div>
    <div class="stat"><div class="n sensitive">${activeSubs.length}</div><div class="l">assinantes ativos</div></div>
    <div class="stat"><div class="n sensitive">${newLeads}</div><div class="l">novos leads no período</div></div>
    <div class="stat"><div class="n sensitive">${stripeError ? "—" : currencyFmt.format(avgTicket)}</div><div class="l">ticket médio</div></div>
    <div class="stat"><div class="n sensitive">${contaRate.toFixed(0)}% · ${paganteRate.toFixed(0)}%</div><div class="l">converteram em conta · em pagante</div></div>
  </div>

  <h2>Novos leads por dia</h2>
  <div class="chart-card">${lineChartSvg(leadsSeries, { color: "#3b82f6" })}</div>

  <h2>Receita Stripe por dia</h2>
  <div class="chart-card">${lineChartSvg(revenueSeries, { color: "#22c55e", unit: " BRL" })}</div>

  <h2>Assinantes ativos por plano</h2>
  <div class="chart-card donut-row">
    ${donutChartSvg(
      [
        { label: "Limitado", value: activeLimited, color: "#f59e0b" },
        { label: "Ilimitado", value: activeUnlimited, color: "#3b82f6" },
      ],
      { size: 140 }
    )}
    <ul class="legend">
      <li><span class="dot" style="background:#f59e0b"></span> Limitado: <span class="sensitive">${activeLimited}</span></li>
      <li><span class="dot" style="background:#3b82f6"></span> Ilimitado: <span class="sensitive">${activeUnlimited}</span></li>
    </ul>
  </div>

  <h2>Desempenho por estado</h2>
  <div class="note">Considera todo o histórico de leads, não o período selecionado acima — campo novo, ainda não retroativo.</div>
  <div class="wrap">
    <table>
      <thead><tr><th>Estado</th><th>Leads</th></tr></thead>
      <tbody>${stateRowsHtml}</tbody>
    </table>
  </div>

  ${TOGGLE_SENSITIVE_SCRIPT}
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
