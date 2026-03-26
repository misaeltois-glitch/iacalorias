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
    description: 'O coração do app. Fotografe qualquer refeição ou envie da galeria — a IA identifica os alimentos e calcula calorias e macros em segundos.',
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
    description: 'Acompanhe seu consumo diário de calorias e macronutrientes em tempo real. Complete o questionário de metas para personalizar seus alvos.',
    tooltipSide: 'above',
    padding: 10,
  },
  {
    selector: '[data-tour="upgrade-banner"]',
    title: '👑 Planos Premium',
    description: 'Desbloqueie análises ilimitadas, histórico completo, metas nutricionais personalizadas e alertas inteligentes. A partir de R$29,90/mês.',
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
    description: 'Gráficos de calorias, histórico de refeições e tendências de macros ao longo do tempo. Veja sua evolução semanal e mensal.',
    tooltipSide: 'above',
    padding: 6,
  },
  {
    selector: '[data-tour="nav-profile"]',
    title: '👤 Aba Perfil',
    description: 'Gerencie sua conta, veja e altere seu plano de assinatura, configure preferências pessoais e acesse o suporte quando precisar.',
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
  right: number;
}

function measureElement(selector: string, padding = 8): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    top: r.top - padding,
    left: r.left - padding,
    width: r.width + padding * 2,
    height: r.height + padding * 2,
    bottom: r.bottom + padding,
    right: r.right + padding,
  };
}

interface AppTourProps {
  onDone: () => void;
}

export function AppTour({ onDone }: AppTourProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIdx];

  const updateRect = useCallback(() => {
    if (!step) return;
    const r = measureElement(step.selector, step.padding ?? 8);
    setRect(r);
  }, [step]);

  useEffect(() => {
    setReady(false);
    setRect(null);
    const t = setTimeout(() => {
      updateRect();
      setTimeout(() => setReady(true), 80);
    }, 100);
    return () => clearTimeout(t);
  }, [stepIdx, updateRect]);

  useEffect(() => {
    const handler = () => updateRect();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [updateRect]);

  const finish = () => {
    onDone();
  };

  const next = () => {
    if (stepIdx < STEPS.length - 1) setStepIdx(i => i + 1);
    else finish();
  };

  const prev = () => {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  };

  const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 844;

  const TOOLTIP_W = Math.min(300, vw - 32);
  const GAP = 16;

  let tooltipStyle: React.CSSProperties = {};
  let arrowDir: 'up' | 'down' | null = null;
  let arrowLeft = 0;

  const isCentered = step.tooltipSide === 'center' || !rect;

  if (!isCentered && rect) {
    const centerX = rect.left + rect.width / 2;
    let tooltipLeft = centerX - TOOLTIP_W / 2;
    if (tooltipLeft < 12) tooltipLeft = 12;
    if (tooltipLeft + TOOLTIP_W > vw - 12) tooltipLeft = vw - TOOLTIP_W - 12;

    arrowLeft = Math.min(Math.max(centerX - tooltipLeft, 20), TOOLTIP_W - 20);

    if (step.tooltipSide === 'above') {
      tooltipStyle = {
        bottom: vh - rect.top + GAP,
        left: tooltipLeft,
        width: TOOLTIP_W,
      };
      arrowDir = 'down';
    } else {
      tooltipStyle = {
        top: rect.bottom + GAP,
        left: tooltipLeft,
        width: TOOLTIP_W,
      };
      arrowDir = 'up';
    }
  } else {
    tooltipStyle = {
      top: '50%',
      left: '50%',
      transform: `translate(-50%, -50%) scale(${ready ? 1 : 0.95})`,
      width: TOOLTIP_W,
    };
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'all' }}>

      {/* Dark overlay for centered steps */}
      {isCentered && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.78)',
        }} />
      )}

      {/* Spotlight — transparent cutout with huge box-shadow overlay */}
      {rect && !isCentered && (
        <div
          style={{
            position: 'absolute',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: 14,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.78)',
            border: '2.5px solid #0D9F6E',
            outline: '4px solid rgba(13,159,110,0.2)',
            zIndex: 9998,
            pointerEvents: 'none',
            animation: 'tour-glow 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          ...tooltipStyle,
          background: 'var(--bg, #141414)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          zIndex: 10000,
          opacity: ready ? 1 : 0,
          ...(isCentered ? {} : {
            transform: ready ? 'scale(1)' : 'scale(0.95)',
          }),
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          overflow: 'visible',
        }}
      >
        {/* Arrow pointing to element */}
        {arrowDir === 'down' && rect && (
          <>
            <div style={{
              position: 'absolute', bottom: -9, left: arrowLeft - 9,
              width: 0, height: 0,
              borderLeft: '9px solid transparent',
              borderRight: '9px solid transparent',
              borderTop: '9px solid rgba(255,255,255,0.12)',
            }} />
            <div style={{
              position: 'absolute', bottom: -7, left: arrowLeft - 8,
              width: 0, height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid var(--bg, #141414)',
            }} />
          </>
        )}
        {arrowDir === 'up' && rect && (
          <>
            <div style={{
              position: 'absolute', top: -9, left: arrowLeft - 9,
              width: 0, height: 0,
              borderLeft: '9px solid transparent',
              borderRight: '9px solid transparent',
              borderBottom: '9px solid rgba(255,255,255,0.12)',
            }} />
            <div style={{
              position: 'absolute', top: -7, left: arrowLeft - 8,
              width: 0, height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid var(--bg, #141414)',
            }} />
          </>
        )}

        <div style={{ padding: '16px 16px 14px' }}>
          {/* Step counter + close */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0D9F6E', letterSpacing: '0.4px' }}>
              PASSO {stepIdx + 1} DE {STEPS.length}
            </span>
            <button onClick={finish} style={{
              padding: '3px', borderRadius: 8,
              background: 'rgba(255,255,255,0.07)', border: 'none',
              cursor: 'pointer', color: 'var(--text-3, #555)',
              display: 'flex', alignItems: 'center',
            }}>
              <X size={14} />
            </button>
          </div>

          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1, #fff)', marginBottom: 6, letterSpacing: '-0.2px' }}>
            {step.title}
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-2, #aaa)', lineHeight: 1.6, margin: '0 0 12px' }}>
            {step.description}
          </p>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                height: 3, borderRadius: 99,
                background: i <= stepIdx ? '#0D9F6E' : 'rgba(255,255,255,0.12)',
                flex: 1,
                transition: 'background 0.25s',
              }} />
            ))}
          </div>

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            {stepIdx > 0 && (
              <button onClick={prev} style={{
                padding: '9px 12px', borderRadius: 11,
                background: 'rgba(255,255,255,0.07)',
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
          0%, 100% { outline-color: rgba(13,159,110,0.2); }
          50% { outline-color: rgba(13,159,110,0.45); }
        }
      `}</style>
    </div>
  );
}
