import type { AnalysisResult } from '@workspace/api-client-react/src/generated/api.schemas';

// Draws a 1080×1920 (9:16 Stories) share card and returns a Blob
export async function generateShareCard(result: AnalysisResult): Promise<Blob> {
  const W = 1080;
  const H = 1920;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Background ────────────────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#071614');
  bgGrad.addColorStop(0.5, '#0a1f1b');
  bgGrad.addColorStop(1, '#071614');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // decorative glow blobs
  const glow = (x: number, y: number, r: number, color: string, alpha: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace(')', `, ${alpha})`).replace('rgb', 'rgba'));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  glow(200, 400, 500, 'rgb(13,159,110)', 0.18);
  glow(900, 1600, 600, 'rgb(59,130,246)', 0.12);
  glow(1000, 200, 400, 'rgb(13,159,110)', 0.08);

  // ── Top branding ─────────────────────────────────────────────────────────
  const logoX = 80;
  const logoY = 120;

  // Logo circle
  const logoGrad = ctx.createLinearGradient(logoX, logoY, logoX + 72, logoY + 72);
  logoGrad.addColorStop(0, '#0D9F6E');
  logoGrad.addColorStop(1, '#057A55');
  ctx.fillStyle = logoGrad;
  roundRect(ctx, logoX, logoY, 72, 72, 20);
  ctx.fill();

  // "IA" text in logo
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IA', logoX + 36, logoY + 46);

  // "IA Calorias" title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText('IA Calorias', logoX + 88, logoY + 36);

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText('Análise Nutricional', logoX + 88, logoY + 68);

  // ── Divider ───────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 240);
  ctx.lineTo(W - 80, 240);
  ctx.stroke();

  // ── Dish name + confidence ────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PRATO IDENTIFICADO', 80, 320);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px system-ui, sans-serif';
  const dishLines = wrapText(result.dishName, 920, ctx, 'bold 72px system-ui, sans-serif');
  dishLines.forEach((line, i) => ctx.fillText(line, 80, 410 + i * 84));

  const dishBottom = 410 + dishLines.length * 84;

  if (result.servingSize) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText(result.servingSize, 80, dishBottom + 20);
  }

  // ── Calorie hero ──────────────────────────────────────────────────────────
  const calTop = dishBottom + 80;

  const calBoxGrad = ctx.createLinearGradient(80, calTop, W - 80, calTop + 240);
  calBoxGrad.addColorStop(0, 'rgba(13,159,110,0.22)');
  calBoxGrad.addColorStop(1, 'rgba(59,130,246,0.14)');
  ctx.fillStyle = calBoxGrad;
  roundRect(ctx, 80, calTop, W - 160, 240, 36);
  ctx.fill();
  ctx.strokeStyle = 'rgba(13,159,110,0.4)';
  ctx.lineWidth = 2;
  roundRect(ctx, 80, calTop, W - 160, 240, 36);
  ctx.stroke();

  // calories number
  ctx.textAlign = 'center';
  const calGrad = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
  calGrad.addColorStop(0, '#0D9F6E');
  calGrad.addColorStop(1, '#3B82F6');
  ctx.fillStyle = calGrad;
  ctx.font = 'bold 140px system-ui, sans-serif';
  ctx.fillText(String(result.calories), W / 2, calTop + 160);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText('CALORIAS (kcal)', W / 2, calTop + 210);

  // ── Macros 2×2 grid ───────────────────────────────────────────────────────
  const macroTop = calTop + 280;
  const macros = [
    { label: 'Proteínas',     val: result.macros.protein, color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   emoji: '🥩' },
    { label: 'Carboidratos',  val: result.macros.carbs,   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  emoji: '🍞' },
    { label: 'Gorduras',      val: result.macros.fat,     color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.3)',  emoji: '🫒' },
    { label: 'Fibras',        val: result.fiber ?? 0,     color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  emoji: '🥬' },
  ];

  const colW = (W - 160 - 20) / 2;
  const rowH = 200;
  const gap = 20;

  macros.forEach(({ label, val, color, bg, border }, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 80 + col * (colW + gap);
    const y = macroTop + row * (rowH + gap);

    ctx.fillStyle = bg;
    roundRect(ctx, x, y, colW, rowH, 28);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, colW, rowH, 28);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillText(`${val.toFixed(1)}g`, x + 28, y + 90);

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.font = '26px system-ui, sans-serif';
    ctx.fillText(label, x + 28, y + 140);
    ctx.globalAlpha = 1;
  });

  // ── Health Score + tip ────────────────────────────────────────────────────
  const scoreTop = macroTop + 2 * (rowH + gap) + 40;

  if (result.healthScore) {
    // Score circle
    const cx = 180;
    const cy = scoreTop + 90;
    const r = 70;
    const circumference = 2 * Math.PI * r;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, (3 / 2) * Math.PI);
    ctx.stroke();

    const scoreGrad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    scoreGrad.addColorStop(0, '#0D9F6E');
    scoreGrad.addColorStop(1, '#3B82F6');
    ctx.strokeStyle = scoreGrad;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (result.healthScore / 10) * 2 * Math.PI);
    ctx.stroke();
    ctx.lineCap = 'butt';

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px system-ui, sans-serif';
    ctx.fillText(String(result.healthScore), cx, cy + 18);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('/10', cx, cy + 48);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('SCORE', cx, scoreTop + 188);
  }

  // Tip text
  if (result.nutritionTip) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0D9F6E';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('💡 DICA NUTRICIONAL', 300, scoreTop + 30);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '30px system-ui, sans-serif';
    const tipLines = wrapText(result.nutritionTip, 700, ctx, '30px system-ui, sans-serif');
    tipLines.forEach((line, i) => ctx.fillText(line, 300, scoreTop + 80 + i * 40));
  }

  // Substitution tip
  if ((result as any).substitutionTip) {
    const tipY = scoreTop + 220;
    ctx.fillStyle = 'rgba(245,158,11,0.12)';
    roundRect(ctx, 80, tipY, W - 160, 130, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,158,11,0.3)';
    ctx.lineWidth = 2;
    roundRect(ctx, 80, tipY, W - 160, 130, 20);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#D97706';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText('🔄  SUGESTÃO', 110, tipY + 42);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '28px system-ui, sans-serif';
    const subLines = wrapText((result as any).substitutionTip, 860, ctx, '28px system-ui, sans-serif');
    subLines.forEach((line, i) => ctx.fillText(line, 110, tipY + 85 + i * 36));
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, H - 160);
  ctx.lineTo(W - 80, H - 160);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText('Analisado por IA · iacalorias.com.br', W / 2, H - 100);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('Precisão estimada: ~85%  ·  Compartilhe e inspire amigos 🌿', W / 2, H - 60);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });
}

export async function shareResult(result: AnalysisResult): Promise<'shared' | 'downloaded' | 'error'> {
  try {
    const blob = await generateShareCard(result);
    const file = new File([blob], `iacalorias-${result.dishName.replace(/\s+/g, '-')}.png`, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `${result.dishName} — ${result.calories} kcal`,
        text: `Analisei minha refeição com IA Calorias! ${result.dishName}: ${result.calories} kcal 🥗`,
      });
      return 'shared';
    }

    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  } catch (err: any) {
    if (err?.name === 'AbortError') return 'shared'; // user cancelled — not an error
    console.error('shareResult error', err);
    return 'error';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(text: string, maxWidth: number, ctx: CanvasRenderingContext2D, font: string): string[] {
  ctx.font = font;
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}
