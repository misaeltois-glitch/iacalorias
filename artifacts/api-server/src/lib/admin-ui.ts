import type { Request, Response } from "express";
import { timingSafeEqual } from "crypto";

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDate(date: Date): string {
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function requireAdminKey(req: Request, res: Response): boolean {
  const secret = process.env.ADMIN_SECRET;
  const key = req.query.key;
  if (!secret || typeof key !== "string" || !safeEqual(key, secret)) {
    res.status(404).send("Not found");
    return false;
  }
  return true;
}

export function adminNav(current: "leads" | "dashboard", key: string): string {
  const k = encodeURIComponent(key);
  const link = (page: "leads" | "dashboard", label: string) =>
    current === page
      ? `<span class="nav-current">${label}</span>`
      : `<a href="/api/admin/${page}?key=${k}">${label}</a>`;
  return `<div class="admin-nav">${link("leads", "Leads")} · ${link("dashboard", "Dashboard")}</div>`;
}

export const ADMIN_BASE_CSS = `
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
  .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .admin-nav { font-size: 13px; color: #9aa4b2; }
  .admin-nav a { color: #6ea8fe; text-decoration: none; }
  .admin-nav a:hover { text-decoration: underline; }
  .admin-nav .nav-current { color: #e6e6e6; font-weight: 600; }
  .eye-btn {
    background: #161b26; border: 1px solid #262d3d; border-radius: 8px; color: #e6e6e6;
    padding: 8px 14px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 6px;
  }
  .eye-btn:hover { background: #1c2230; }
  .sensitive { filter: blur(5px); user-select: none; transition: filter 0.15s; }
  body.revealed .sensitive { filter: none; user-select: text; }
`;

export const TOGGLE_SENSITIVE_SCRIPT = `
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
`;

export function toggleButtonHtml(): string {
  return `<button class="eye-btn" id="toggleSensitive" type="button">
    <span id="eyeIcon">🙈</span> <span id="eyeLabel">Mostrar dados</span>
  </button>`;
}

// ─── Gráficos SVG (sem dependências externas) ────────────────────────────────

function scaleLinear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
}

export function lineChartSvg(
  data: { label: string; value: number }[],
  opts: { width?: number; height?: number; color?: string; unit?: string } = {}
): string {
  const width = opts.width ?? 640;
  const height = opts.height ?? 180;
  const pad = { top: 16, right: 16, bottom: 24, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  if (data.length === 0) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><text x="50%" y="50%" fill="#5b6472" font-size="13" text-anchor="middle">Sem dados no período</text></svg>`;
  }

  const values = data.map((d) => d.value);
  const maxV = Math.max(...values, 1);
  const xScale = scaleLinear([0, Math.max(data.length - 1, 1)], [pad.left, pad.left + innerW]);
  const yScale = scaleLinear([0, maxV], [pad.top + innerH, pad.top]);

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(" ");
  const areaPath = `M${pad.left},${pad.top + innerH} L${points} L${pad.left + innerW},${pad.top + innerH} Z`;

  const color = opts.color ?? "#3b82f6";
  const firstLabel = escapeHtml(data[0].label);
  const lastLabel = escapeHtml(data[data.length - 1].label);
  const unit = opts.unit ?? "";

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <path d="${areaPath}" fill="${color}22" stroke="none"/>
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <text x="${pad.left}" y="${height - 6}" font-size="10" fill="#9aa4b2">${firstLabel}</text>
    <text x="${pad.left + innerW}" y="${height - 6}" font-size="10" fill="#9aa4b2" text-anchor="end">${lastLabel}</text>
    <text x="${pad.left + innerW}" y="${pad.top + 10}" font-size="10" fill="#9aa4b2" text-anchor="end">max ${Math.round(maxV)}${unit}</text>
  </svg>`;
}

export function donutChartSvg(
  segments: { label: string; value: number; color: string }[],
  opts: { size?: number; strokeWidth?: number } = {}
): string {
  const size = opts.size ?? 160;
  const sw = opts.strokeWidth ?? 22;
  const r = (size - sw) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  let offsetAcc = 0;
  const circles = segments
    .map((seg) => {
      const frac = seg.value / total;
      const dash = frac * circumference;
      const gap = circumference - dash;
      const circle = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${sw}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offsetAcc}" transform="rotate(-90 ${c} ${c})"/>`;
      offsetAcc += dash;
      return circle;
    })
    .join("");

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#1f2531" stroke-width="${sw}"/>
    ${circles}
    <text x="${c}" y="${c}" font-size="20" font-weight="700" fill="#e6e6e6" text-anchor="middle" dominant-baseline="middle">${segments.reduce((s, seg) => s + seg.value, 0)}</text>
  </svg>`;
}
