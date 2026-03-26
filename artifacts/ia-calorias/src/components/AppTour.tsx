import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

const TOUR_DONE_KEY = 'ia-calorias-tour-done';

interface TourStep {
  selector: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'center';
  padding?: number;
}

const STEPS: TourStep[] = [
  {
    selector: '[data-tour="camera"]',
    title: '📸 Analisar refeição',
    description: 'Toque aqui para fotografar qualquer refeição. A IA identifica os alimentos e calcula calorias e macros em segundos.',
    placement: 'top',
    padding: 10,
  },
  {
    selector: '[data-tour="nav-home"]',
    title: '🏠 Início',
    description: 'Seu painel principal. Veja o resumo do dia, análises recentes e o progresso de metas nutricionais.',
    placement: 'top',
    padding: 6,
  },
  {
    selector: '[data-tour="nav-workout"]',
    title: '💪 Treino',
    description: 'Monte seu plano de treino personalizado. Responda um questionário e receba uma semana completa de exercícios baseada no seu perfil.',
    placement: 'top',
    padding: 6,
  },
  {
    selector: '[data-tour="nav-analytics"]',
    title: '📊 Progresso',
    description: 'Acompanhe gráficos de calorias, histórico de refeições e tendências nutricionais ao longo do tempo.',
    placement: 'top',
    padding: 6,
  },
  {
    selector: '[data-tour="nav-profile"]',
    title: '👤 Perfil',
    description: 'Acesse sua conta, gerencie sua assinatura e ajuste suas configurações pessoais.',
    placement: 'top',
    padding: 6,
  },
  {
    selector: '[data-tour="usage-pill"]',
    title: '✨ Seu plano',
    description: 'Aqui você vê quantas análises gratuitas restam. Faça upgrade para análises ilimitadas, histórico completo e metas personalizadas.',
    placement: 'bottom',
    padding: 8,
  },
  {
    selector: '[data-tour="upload-zone"]',
    title: '🖼️ Enviar foto',
    description: 'Arraste uma imagem, escolha da galeria ou use a câmera. Suporta JPG, PNG e WEBP até 4 MB.',
    placement: 'bottom',
    padding: 8,
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: number;
}

function getRect(selector: string, padding = 8): SpotlightRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - padding,
    left: r.left - padding,
    width: r.width + padding * 2,
    height: r.height + padding * 2,
    borderRadius: 14,
  };
}

interface AppTourProps {
  onDone: () => void;
}

export function AppTour({ onDone }: AppTourProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>();

  const step = STEPS[stepIdx];

  const updateRect = useCallback(() => {
    if (!step) return;
    const r = getRect(step.selector, step.padding ?? 8);
    setRect(r);
  }, [step]);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => {
      updateRect();
      setVisible(true);
    }, 120);
    return () => clearTimeout(t);
  }, [stepIdx, updateRect]);

  useEffect(() => {
    const onResize = () => updateRect();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [updateRect]);

  const finish = () => {
    localStorage.setItem(TOUR_DONE_KEY, 'true');
    onDone();
  };

  const next = () => {
    if (stepIdx < STEPS.length - 1) setStepIdx(i => i + 1);
    else finish();
  };

  const prev = () => {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  };

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const tooltipWidth = Math.min(320, vw - 32);

  let tooltipTop = 0;
  let tooltipLeft = 0;
  let arrowPos: 'top' | 'bottom' = 'top';

  if (rect) {
    const ARROW = 12;
    const GAP = 14;
    const tooltipHeight = 180;

    if (step.placement === 'top') {
      tooltipTop = rect.top - tooltipHeight - ARROW - GAP;
      arrowPos = 'bottom';
      if (tooltipTop < 8) {
        tooltipTop = rect.top + rect.height + GAP;
        arrowPos = 'top';
      }
    } else {
      tooltipTop = rect.top + rect.height + GAP;
      arrowPos = 'top';
      if (tooltipTop + tooltipHeight > vh - 8) {
        tooltipTop = rect.top - tooltipHeight - GAP;
        arrowPos = 'bottom';
      }
    }

    const rectCenter = rect.left + rect.width / 2;
    tooltipLeft = rectCenter - tooltipWidth / 2;
    if (tooltipLeft < 12) tooltipLeft = 12;
    if (tooltipLeft + tooltipWidth > vw - 12) tooltipLeft = vw - tooltipWidth - 12;
  } else {
    tooltipTop = vh / 2 - 90;
    tooltipLeft = (vw - tooltipWidth) / 2;
  }

  const arrowLeft = rect
    ? Math.min(Math.max(rect.left + rect.width / 2 - tooltipLeft - 10, 18), tooltipWidth - 38)
    : tooltipWidth / 2 - 10;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        pointerEvents: 'all',
      }}
    >
      {/* SVG overlay with spotlight hole */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="none"
      >
        <defs>
          <mask id="tour-mask">
            <rect width={vw} height={vh} fill="white" />
            {rect && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx={rect.borderRadius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width={vw}
          height={vh}
          fill="rgba(0,0,0,0.78)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Spotlight border glow */}
      {rect && (
        <div
          style={{
            position: 'absolute',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: rect.borderRadius,
            border: '2px solid rgba(13,159,110,0.8)',
            boxShadow: '0 0 0 3px rgba(13,159,110,0.25)',
            animation: 'tour-pulse 2s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        style={{
          position: 'absolute',
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipWidth,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.97)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          background: 'var(--bg, #141414)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '18px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          overflow: 'visible',
        }}
      >
        {/* Arrow */}
        {arrowPos === 'top' && (
          <div style={{
            position: 'absolute',
            top: -8,
            left: arrowLeft,
            width: 0, height: 0,
            borderLeft: '9px solid transparent',
            borderRight: '9px solid transparent',
            borderBottom: '9px solid rgba(255,255,255,0.1)',
          }} />
        )}
        {arrowPos === 'top' && (
          <div style={{
            position: 'absolute',
            top: -6,
            left: arrowLeft + 1,
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid var(--bg, #141414)',
          }} />
        )}
        {arrowPos === 'bottom' && (
          <div style={{
            position: 'absolute',
            bottom: -8,
            left: arrowLeft,
            width: 0, height: 0,
            borderLeft: '9px solid transparent',
            borderRight: '9px solid transparent',
            borderTop: '9px solid rgba(255,255,255,0.1)',
          }} />
        )}
        {arrowPos === 'bottom' && (
          <div style={{
            position: 'absolute',
            bottom: -6,
            left: arrowLeft + 1,
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid var(--bg, #141414)',
          }} />
        )}

        {/* Content */}
        <div style={{ padding: '18px 18px 14px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0D9F6E', marginBottom: '2px', letterSpacing: '0.3px' }}>
                Passo {stepIdx + 1} de {STEPS.length}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-1, #fff)', letterSpacing: '-0.3px' }}>
                {step.title}
              </div>
            </div>
            <button
              onClick={finish}
              style={{
                padding: '4px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.08)', border: 'none',
                cursor: 'pointer', color: 'var(--text-3, #666)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginLeft: '8px',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-2, #aaa)', lineHeight: '1.55', margin: '0 0 16px' }}>
            {step.description}
          </p>

          {/* Progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '14px' }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  height: '4px',
                  borderRadius: '99px',
                  background: i === stepIdx ? '#0D9F6E' : 'rgba(255,255,255,0.15)',
                  flex: i === stepIdx ? 2 : 1,
                  transition: 'flex 0.25s ease, background 0.25s ease',
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {stepIdx > 0 && (
              <button
                onClick={prev}
                style={{
                  padding: '10px 14px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-2, #aaa)', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                <ChevronLeft size={15} />
              </button>
            )}
            <button
              onClick={stepIdx < STEPS.length - 1 ? next : finish}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              {stepIdx < STEPS.length - 1 ? (
                <>Próximo <ChevronRight size={15} /></>
              ) : (
                'Começar 🚀'
              )}
            </button>
          </div>

          {/* Skip link */}
          {stepIdx < STEPS.length - 1 && (
            <button
              onClick={finish}
              style={{
                display: 'block', width: '100%', textAlign: 'center',
                marginTop: '10px', padding: '4px',
                background: 'none', border: 'none',
                color: 'var(--text-3, #555)', fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Pular tour
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes tour-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(13,159,110,0.25); }
          50% { box-shadow: 0 0 0 6px rgba(13,159,110,0.12); }
        }
      `}</style>
    </div>
  );
}

export function useTour() {
  const [showTour, setShowTour] = useState(false);

  const maybeStartTour = useCallback((delayMs = 600) => {
    if (localStorage.getItem(TOUR_DONE_KEY)) return;
    const t = setTimeout(() => setShowTour(true), delayMs);
    return () => clearTimeout(t);
  }, []);

  const startTour = useCallback(() => setShowTour(true), []);

  const endTour = useCallback(() => {
    localStorage.setItem(TOUR_DONE_KEY, 'true');
    setShowTour(false);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_DONE_KEY);
    setShowTour(true);
  }, []);

  return { showTour, maybeStartTour, startTour, endTour, resetTour };
}
