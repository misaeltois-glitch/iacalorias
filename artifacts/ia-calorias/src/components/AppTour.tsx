import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TourStep {
  selector: string;
  title: string;
  description: string;
  tooltipSide: 'above' | 'below' | 'center';
  padding?: number;
}

const STEPS: TourStep[] = [
  {
    selector: '',
    title: '👋 Bem-vindo ao IA Calorias!',
    description: 'Vamos fazer um tour rápido para você conhecer tudo o que o app oferece. Leva menos de 1 minuto!',
    tooltipSide: 'center',
  },
  {
    selector: '[data-tour="upload-zone"]',
    title: '📸 Analisar refeição',
    description: 'O coração do app. Fotografe qualquer refeição ou envie da galeria — a IA identifica os alimentos e calcula calorias e nutrientes em segundos.',
    tooltipSide: 'above',
    padding: 12,
  },
  {
    selector: '[data-tour="camera"]',
    title: '📷 Câmera rápida',
    description: 'Acesso direto à câmera do celular. Toque aqui para fotografar sua refeição na hora sem precisar abrir a galeria.',
    tooltipSide: 'above',
    padding: 8,
  },
  {
    selector: '[data-tour="usage-pill"]',
    title: '✨ Seu plano atual',
    description: 'Acompanhe quantas análises restam no plano gratuito. Faça upgrade para ter análises ilimitadas e recursos exclusivos.',
    tooltipSide: 'below',
    padding: 8,
  },
  {
    selector: '[data-tour="daily-progress"]',
    title: '🎯 Progresso do dia',
    description: 'Acompanhe seu consumo diário de calorias, proteínas, carboidratos e gorduras em tempo real. Complete o questionário de metas para personalizar seus alvos.',
    tooltipSide: 'above',
    padding: 10,
  },
  {
    selector: '[data-tour="upgrade-banner"]',
    title: '👑 Planos Premium',
    description: 'Desbloqueie análises ilimitadas, histórico completo, metas nutricionais personalizadas e alertas inteligentes. A partir de R$17,00/mês.',
    tooltipSide: 'above',
    padding: 8,
  },
  {
    selector: '[data-tour="nav-home"]',
    title: '🏠 Aba Início',
    description: 'Seu painel principal. Veja o resumo do dia, análises recentes e acesse rapidamente a câmera para registrar refeições.',
    tooltipSide: 'above',
    padding: 6,
  },
  {
    selector: '[data-tour="nav-workout"]',
    title: '💪 Aba Treino',
    description: 'Monte um plano de treino personalizado para a semana. Responda um questionário rápido e receba exercícios adaptados ao seu perfil e objetivo.',
    tooltipSide: 'above',
    padding: 6,
  },
  {
    selector: '[data-tour="nav-analytics"]',
    title: '📊 Aba Progresso',
    description: 'Gráficos de calorias, histórico de refeições e evolução dos seus nutrientes ao longo do tempo. Veja sua evolução semanal e mensal.',
    tooltipSide: 'above',
    padding: 6,
  },
  {
    selector: '[data-tour="nav-profile"]',
    title: '👤 Aba Perfil',
    description: 'Gerencie sua conta e assinatura. Lembre-se: configurar suas metas de calorias (calorias consumidas × desejadas) e o comparativo de treino são recursos exclusivos do plano Pro 👑',
    tooltipSide: 'above',
    padding: 6,
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
}

function getElementRect(selector: string, padding = 8): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  const vh = window.innerHeight;
  // element is not in viewport at all
  if (r.bottom < 0 || r.top > vh) return null;
  return {
    top: r.top - padding,
    left: r.left - padding,
    width: r.width + padding * 2,
    height: r.height + padding * 2,
    bottom: r.bottom + padding,
  };
}

interface AppTourProps {
  onDone: () => void;
}

export function AppTour({ onDone }: AppTourProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = STEPS[stepIdx];
  const isCenter = step.tooltipSide === 'center';

  // Lock body scroll while tour is active
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const measureStep = useCallback(() => {
    const r = getElementRect(step.selector, step.padding ?? 8);
    setRect(r);
    readyTimerRef.current = setTimeout(() => setReady(true), 80);
  }, [step]);

  useEffect(() => {
    setReady(false);
    setRect(null);

    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    if (readyTimerRef.current) clearTimeout(readyTimerRef.current);

    if (!step.selector) {
      // center step: no element, just show after small delay
      scrollTimerRef.current = setTimeout(() => setReady(true), 120);
      return;
    }

    const el = document.querySelector(step.selector) as HTMLElement | null;

    if (el) {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const outOfView = r.bottom < 0 || r.top > vh;

      if (outOfView) {
        // scroll instantly then measure
        el.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
        scrollTimerRef.current = setTimeout(measureStep, 150);
      } else {
        scrollTimerRef.current = setTimeout(measureStep, 100);
      }
    } else {
      // element not found → skip this step automatically
      if (stepIdx < STEPS.length - 1) {
        setStepIdx(i => i + 1);
      } else {
        onDone();
      }
    }

    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
    };
  }, [stepIdx, measureStep, step.selector, onDone]);

  useEffect(() => {
    const handler = () => {
      if (step.selector) {
        const r = getElementRect(step.selector, step.padding ?? 8);
        setRect(r);
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [step]);

  const finish = useCallback(() => onDone(), [onDone]);

  const next = () => {
    if (stepIdx < STEPS.length - 1) setStepIdx(i => i + 1);
    else finish();
  };

  const prev = () => {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const MARGIN = 8;
  const TOOLTIP_W = Math.min(300, vw - MARGIN * 2);
  const GAP = 12;
  // Estimated tooltip height — enough to fit all content on mobile
  const TOOLTIP_H_EST = 220;

  // Compute tooltip position
  let tooltipStyle: React.CSSProperties = {};
  let arrowDir: 'up' | 'down' | null = null;
  let arrowLeft = 0;

  const hasRect = !!rect && !isCenter;

  if (hasRect && rect) {
    const centerX = rect.left + rect.width / 2;
    let tLeft = centerX - TOOLTIP_W / 2;
    tLeft = Math.max(MARGIN, Math.min(tLeft, vw - TOOLTIP_W - MARGIN));
    arrowLeft = Math.min(Math.max(centerX - tLeft, 20), TOOLTIP_W - 20);

    // Decide whether to place above or below, flipping if there's not enough space
    const roomAbove = rect.top - GAP; // pixels available above the spotlight
    const roomBelow = vh - rect.bottom - GAP; // pixels available below
    const preferAbove = step.tooltipSide === 'above';
    const placeAbove = preferAbove
      ? (roomAbove >= TOOLTIP_H_EST || roomAbove >= roomBelow)
      : (roomBelow < TOOLTIP_H_EST && roomAbove >= roomBelow);

    if (placeAbove) {
      // Tooltip above: anchor its bottom edge just above the spotlight
      // Clamp so it never goes above top margin
      const rawTop = rect.top - TOOLTIP_H_EST - GAP;
      const clampedTop = Math.max(MARGIN, rawTop);
      tooltipStyle = { top: clampedTop, left: tLeft, width: TOOLTIP_W };
      arrowDir = 'down';
    } else {
      // Tooltip below: anchor its top edge just below the spotlight
      // Clamp so it never goes below bottom margin
      const rawTop = rect.bottom + GAP;
      const maxTop = vh - TOOLTIP_H_EST - MARGIN;
      const clampedTop = Math.min(rawTop, maxTop);
      tooltipStyle = { top: clampedTop, left: tLeft, width: TOOLTIP_W };
      arrowDir = 'up';
    }
  } else {
    // centered
    tooltipStyle = {
      top: '50%', left: '50%',
      width: TOOLTIP_W,
      transform: `translate(-50%, -50%) scale(${ready ? 1 : 0.95})`,
    };
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'all' }}
      onWheel={e => e.preventDefault()}
      onTouchMove={e => e.preventDefault()}
    >
      {/* Full-screen dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)' }} />

      {/* Spotlight cutout — position: fixed so it aligns with getBoundingClientRect */}
      {hasRect && rect && (
        <div style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: 14,
          background: 'transparent',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
          border: '2.5px solid #0D9F6E',
          outline: '4px solid rgba(13,159,110,0.22)',
          zIndex: 10001,
          pointerEvents: 'none',
          animation: 'tour-glow 2s ease-in-out infinite',
        }} />
      )}

      {/* Tooltip */}
      <div style={{
        position: 'fixed',
        ...tooltipStyle,
        background: 'var(--bg, #0f0f0f)',
        border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: 18,
        boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
        zIndex: 10002,
        opacity: ready ? 1 : 0,
        ...(hasRect ? { transform: ready ? 'scale(1)' : 'scale(0.96)' } : {}),
        transition: 'opacity 0.22s ease, transform 0.22s ease',
        overflow: 'visible',
        maxWidth: '92vw',
      }}>
        {/* Arrow — down (tooltip above element) */}
        {arrowDir === 'down' && rect && (<>
          <div style={{ position: 'absolute', bottom: -9, left: arrowLeft - 9, width: 0, height: 0,
            borderLeft: '9px solid transparent', borderRight: '9px solid transparent',
            borderTop: '9px solid rgba(255,255,255,0.13)' }} />
          <div style={{ position: 'absolute', bottom: -7, left: arrowLeft - 8, width: 0, height: 0,
            borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
            borderTop: '8px solid var(--bg, #0f0f0f)' }} />
        </>)}
        {/* Arrow — up (tooltip below element) */}
        {arrowDir === 'up' && rect && (<>
          <div style={{ position: 'absolute', top: -9, left: arrowLeft - 9, width: 0, height: 0,
            borderLeft: '9px solid transparent', borderRight: '9px solid transparent',
            borderBottom: '9px solid rgba(255,255,255,0.13)' }} />
          <div style={{ position: 'absolute', top: -7, left: arrowLeft - 8, width: 0, height: 0,
            borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
            borderBottom: '8px solid var(--bg, #0f0f0f)' }} />
        </>)}

        <div style={{ padding: '16px 16px 14px' }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0D9F6E', letterSpacing: '0.5px' }}>
              PASSO {stepIdx + 1} DE {STEPS.length}
            </span>
            <button onClick={finish} style={{
              padding: 4, borderRadius: 8,
              background: 'rgba(255,255,255,0.08)', border: 'none',
              cursor: 'pointer', color: 'var(--text-2, #888)',
              display: 'flex', alignItems: 'center',
            }}>
              <X size={13} />
            </button>
          </div>

          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1, #fff)', marginBottom: 5, letterSpacing: '-0.2px' }}>
            {step.title}
          </div>

          <p style={{ fontSize: 12.5, color: 'var(--text-2, #aaa)', lineHeight: 1.65, margin: '0 0 12px' }}>
            {step.description}
          </p>

          {/* Progress bar */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 12 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                height: 3, borderRadius: 99, flex: 1,
                background: i <= stepIdx ? '#0D9F6E' : 'rgba(255,255,255,0.12)',
                transition: 'background 0.25s',
              }} />
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 6 }}>
            {stepIdx > 0 && (
              <button onClick={prev} style={{
                padding: '9px 12px', borderRadius: 11,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-2, #aaa)', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}>
                <ChevronLeft size={15} />
              </button>
            )}
            <button
              onClick={stepIdx < STEPS.length - 1 ? next : finish}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 11,
                background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              {stepIdx < STEPS.length - 1
                ? <><span>Próximo</span><ChevronRight size={14} /></>
                : <span>Começar agora 🚀</span>}
            </button>
          </div>

          {stepIdx < STEPS.length - 1 && (
            <button onClick={finish} style={{
              display: 'block', width: '100%', marginTop: 8,
              background: 'none', border: 'none',
              color: 'var(--text-3, #555)', fontSize: 11,
              cursor: 'pointer', textAlign: 'center', padding: '2px 0',
            }}>
              Pular tour
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes tour-glow {
          0%, 100% { outline-color: rgba(13,159,110,0.22); }
          50% { outline-color: rgba(13,159,110,0.5); }
        }
      `}</style>
    </div>
  );
}
