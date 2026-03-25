import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = "IA Calorias <noreply@iaicalorias.com.br>";
const APP_URL = process.env.APP_URL || "https://iaicalorias.replit.app";

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
