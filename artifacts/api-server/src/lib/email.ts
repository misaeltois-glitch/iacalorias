import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = "IA Calorias <noreply@iacalorias.com.br>";
const APP_URL = process.env.APP_URL || "https://iaicalorias.replit.app";

export interface WeeklyReportData {
  userName: string;
  weekLabel: string; // ex: "24 a 30 de março"
  totalCalories: number;
  avgCalories: number;
  goalCalories: number | null;
  totalProtein: number;
  goalProtein: number | null;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  totalMeals: number;
  daysWithData: number;
  streak: number;
  topMeals: string[];
  aiSummary: string | null;
}

export async function sendWeeklyReport(email: string, data: WeeklyReportData, logger?: any): Promise<void> {
  const calColor = data.goalCalories
    ? (data.avgCalories > data.goalCalories * 1.15 ? '#EF4444' : data.avgCalories >= data.goalCalories * 0.85 ? '#10B981' : '#F59E0B')
    : '#3B82F6';

  const proteinStatus = data.goalProtein
    ? (data.totalProtein / 7 >= data.goalProtein * 0.9 ? '✅' : '⚠️')
    : '';

  const streakEmoji = data.streak >= 30 ? '👑' : data.streak >= 14 ? '🏆' : data.streak >= 7 ? '🔥🔥' : data.streak >= 3 ? '🔥' : '⚡';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f0d;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#0f1a16;border-radius:20px;border:1px solid #1e3028;overflow:hidden">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0D9F6E,#057A55);padding:32px 32px 28px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px">🥗</div>
        <span style="font-size:16px;font-weight:700;color:#fff">IA Calorias</span>
      </div>
      <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 6px;letter-spacing:-0.5px">
        Seu relatório semanal
      </h1>
      <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0">Semana de ${data.weekLabel}</p>
    </div>

    <!-- Greeting -->
    <div style="padding:24px 32px 0">
      <p style="color:#ccc;font-size:15px;line-height:1.6;margin:0">
        Olá, <strong style="color:#fff">${data.userName}</strong>! Aqui está o resumo da sua semana nutricional. ${data.daysWithData >= 5 ? 'Você foi <strong style="color:#0D9F6E">muito consistente</strong> essa semana! 🌟' : data.daysWithData >= 3 ? 'Continue registrando suas refeições para acompanhar melhor seu progresso.' : 'Tente registrar mais refeições na próxima semana para um acompanhamento completo.'}
      </p>
    </div>

    <!-- Stats grid -->
    <div style="padding:20px 32px;display:grid;gap:12px">

      <!-- Calories -->
      <div style="background:#111e18;border:1px solid #1e3028;border-radius:14px;padding:18px">
        <div style="font-size:11px;color:#666;font-weight:700;letter-spacing:0.5px;margin-bottom:10px">CALORIAS</div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:6px">
          <span style="font-size:32px;font-weight:800;color:${calColor}">${Math.round(data.avgCalories)}</span>
          <span style="font-size:13px;color:#666">kcal/dia em média</span>
        </div>
        ${data.goalCalories ? `<div style="background:#1a2a22;border-radius:8px;height:8px;overflow:hidden"><div style="height:100%;background:${calColor};width:${Math.min(100, Math.round((data.avgCalories / data.goalCalories) * 100))}%;border-radius:8px"></div></div>
        <div style="font-size:11px;color:#555;margin-top:6px">Meta: ${data.goalCalories} kcal/dia · ${Math.round((data.avgCalories / data.goalCalories) * 100)}% atingido</div>` : ''}
      </div>

      <!-- Macros row -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
        <div style="background:#111e18;border:1px solid #1e3028;border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:18px;margin-bottom:6px">🥩</div>
          <div style="font-size:18px;font-weight:700;color:#EF4444">${(data.totalProtein / 7).toFixed(0)}g</div>
          <div style="font-size:10px;color:#555;margin-top:2px">Proteína/dia ${proteinStatus}</div>
        </div>
        <div style="background:#111e18;border:1px solid #1e3028;border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:18px;margin-bottom:6px">🍞</div>
          <div style="font-size:18px;font-weight:700;color:#F59E0B">${(data.totalCarbs / 7).toFixed(0)}g</div>
          <div style="font-size:10px;color:#555;margin-top:2px">Carbs/dia</div>
        </div>
        <div style="background:#111e18;border:1px solid #1e3028;border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:18px;margin-bottom:6px">🫒</div>
          <div style="font-size:18px;font-weight:700;color:#8B5CF6">${(data.totalFat / 7).toFixed(0)}g</div>
          <div style="font-size:10px;color:#555;margin-top:2px">Gordura/dia</div>
        </div>
      </div>

      <!-- Streak + meals -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:#111e18;border:1px solid #1e3028;border-radius:12px;padding:14px">
          <div style="font-size:20px;margin-bottom:6px">${streakEmoji}</div>
          <div style="font-size:22px;font-weight:800;color:#F97316">${data.streak}</div>
          <div style="font-size:11px;color:#555;margin-top:2px">dias de sequência</div>
        </div>
        <div style="background:#111e18;border:1px solid #1e3028;border-radius:12px;padding:14px">
          <div style="font-size:20px;margin-bottom:6px">🍽️</div>
          <div style="font-size:22px;font-weight:800;color:#3B82F6">${data.totalMeals}</div>
          <div style="font-size:11px;color:#555;margin-top:2px">refeições registradas</div>
        </div>
      </div>

      ${data.topMeals.length > 0 ? `
      <!-- Top meals -->
      <div style="background:#111e18;border:1px solid #1e3028;border-radius:14px;padding:16px">
        <div style="font-size:11px;color:#666;font-weight:700;letter-spacing:0.5px;margin-bottom:10px">REFEIÇÕES DA SEMANA</div>
        ${data.topMeals.slice(0, 5).map(m => `<div style="font-size:13px;color:#aaa;padding:4px 0;border-bottom:1px solid #1a2a22">• ${m}</div>`).join('')}
      </div>` : ''}

      ${data.aiSummary ? `
      <!-- AI Summary -->
      <div style="background:linear-gradient(135deg,rgba(13,159,110,0.1),rgba(59,130,246,0.08));border:1px solid rgba(13,159,110,0.2);border-radius:14px;padding:16px">
        <div style="font-size:11px;color:#0D9F6E;font-weight:700;letter-spacing:0.5px;margin-bottom:8px">💡 ANÁLISE DA NUTRICIONISTA IA</div>
        <p style="color:#bbb;font-size:14px;line-height:1.6;margin:0">${data.aiSummary}</p>
      </div>` : ''}

    </div>

    <!-- CTA -->
    <div style="padding:20px 32px 32px;text-align:center">
      <a href="${APP_URL}" style="display:inline-block;background:linear-gradient(135deg,#0D9F6E,#057A55);color:#fff;font-size:14px;font-weight:700;padding:13px 32px;border-radius:12px;text-decoration:none">
        Abrir IA Calorias →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid #1e3028;text-align:center">
      <p style="color:#444;font-size:12px;margin:0">IA Calorias · Relatório automático enviado todo domingo ·
        <a href="${APP_URL}" style="color:#555">Gerenciar preferências</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  if (!resend) {
    const log = logger || console;
    log.warn?.({ email, weekLabel: data.weekLabel }, "RESEND_API_KEY not set — weekly report skipped (dev)");
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `Seu relatório da semana de ${data.weekLabel} — IA Calorias 🥗`,
    html,
  });
}

export async function sendPasswordResetEmail(email: string, token: string, logger?: any): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  if (!resend) {
    const log = logger || console;
    log.warn?.({ resetUrl, email }, "RESEND_API_KEY not set — password reset link (dev only)");
    console.warn(`[DEV] Password reset link for ${email}: ${resetUrl}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Redefinição de senha — IA Calorias",
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif">
        <div style="max-width:520px;margin:40px auto;padding:40px 32px;background:#111;border-radius:16px;border:1px solid #222">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:28px">
            <div style="width:32px;height:32px;background:#22c55e;border-radius:8px;display:flex;align-items:center;justify-content:center">
              <span style="color:#fff;font-size:16px">🥗</span>
            </div>
            <span style="font-size:16px;font-weight:600;color:#fff">IA Calorias</span>
          </div>
          <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 12px">Redefinição de senha</h1>
          <p style="color:#888;font-size:15px;line-height:1.6;margin:0 0 28px">
            Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha. O link é válido por <strong style="color:#ccc">1 hora</strong>.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#22c55e;color:#fff;font-size:15px;font-weight:600;padding:13px 28px;border-radius:10px;text-decoration:none;margin-bottom:28px">
            Redefinir minha senha →
          </a>
          <p style="color:#555;font-size:13px;margin:0">Se você não solicitou a redefinição, ignore este email. Nenhuma alteração será feita na sua conta.</p>
        </div>
      </body>
      </html>
    `,
  });
}
