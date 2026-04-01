import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Sparkles, Share2 } from 'lucide-react';
import type { AnalysisResult } from '@workspace/api-client-react/src/generated/api.schemas';
import { shareResult } from '@/lib/share-card';

interface ResultCardProps {
  result: AnalysisResult;
  onReset: () => void;
  photoUrl?: string;
}

const MACROS = [
  { key: 'protein', label: 'Proteínas', emoji: '🥩', color: '#EF4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.20)' },
  { key: 'carbs',   label: 'Carboidratos', emoji: '🍞', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.20)' },
  { key: 'fiber',   label: 'Fibras', emoji: '🥬', color: '#10B981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.20)' },
  { key: 'fat',     label: 'Gorduras', emoji: '🫒', color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)', border: 'rgba(139,92,246,0.20)' },
] as const;

function AnimatedBar({ color, targetPct, delay }: { color: string; targetPct: number; delay: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(targetPct), delay);
    return () => clearTimeout(t);
  }, [targetPct, delay]);
  return (
    <div style={{ width: '100%', height: '6px', borderRadius: '99px', background: 'var(--bg-3)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: '99px', background: color,
        width: `${width}%`, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  );
}

function CountUpNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const duration = 900;
    const raf = requestAnimationFrame(function tick() {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{displayed}{suffix}</>;
}

export function ResultCard({ result, onReset, photoUrl }: ResultCardProps) {
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const handleShare = useCallback(async () => {
    setSharing(true);
    setShareMsg(null);
    const outcome = await shareResult(result);
    setSharing(false);
    if (outcome === 'downloaded') setShareMsg('Imagem salva! Compartilhe no Instagram Stories 🌿');
    if (outcome === 'error') setShareMsg('Não foi possível compartilhar. Tente novamente.');
    if (outcome === 'shared' || outcome === 'downloaded') {
      setTimeout(() => setShareMsg(null), 4000);
    }
  }, [result]);

  const macroValues = {
    protein: result.macros.protein,
    carbs: result.macros.carbs,
    fiber: result.fiber ?? 0,
    fat: result.macros.fat,
  };

  const maxMacro = Math.max(...Object.values(macroValues), 1);
  const getPct = (v: number) => Math.min(100, (v / maxMacro) * 100);

  const healthScore = result.healthScore ?? 0;
  const circumference = 2 * Math.PI * 36;
  const strokeOffset = circumference - (healthScore / 10) * circumference;

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12 } },
  };
  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}
    >
      {/* Hero Card */}
      <motion.div variants={item} style={{
        borderRadius: '24px',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div style={{ padding: '20px 22px 22px' }}>
          <div style={{ marginBottom: '6px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '3px 10px', borderRadius: '99px',
              background: 'rgba(13,159,110,0.1)', color: '#0D9F6E',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px',
            }}>
              <Sparkles size={10} />
              PRATO IDENTIFICADO
            </span>
          </div>
          <h2 style={{
            fontSize: '22px', fontWeight: 800, color: 'var(--text-1)',
            letterSpacing: '-0.4px', marginBottom: '12px', lineHeight: 1.2,
          }}>
            {result.dishName}
          </h2>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {result.servingSize && (
                <span style={{
                  padding: '4px 10px', borderRadius: '99px',
                  background: 'var(--bg-3)', border: '1px solid var(--border)',
                  fontSize: '12px', color: 'var(--text-2)',
                }}>
                  {result.servingSize}
                </span>
              )}
              {result.confidence && (
                <span style={{
                  padding: '4px 10px', borderRadius: '99px',
                  background: 'var(--bg-3)', border: '1px solid var(--border)',
                  fontSize: '12px', color: 'var(--text-2)',
                }}>
                  Confiança: {result.confidence}
                </span>
              )}
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '40px', fontWeight: 700, lineHeight: 1,
                background: 'linear-gradient(135deg, #0D9F6E, #3B82F6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                <CountUpNumber value={result.calories} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 600, letterSpacing: '0.5px' }}>
                KCAL
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Macros 2x2 Grid */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {MACROS.map(({ key, label, emoji, color, bg, border }, i) => {
          const val = macroValues[key];
          return (
            <div key={key} style={{
              padding: '16px', borderRadius: '18px',
              background: bg, border: `1px solid ${border}`,
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '18px' }}>{emoji}</span>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '18px', fontWeight: 700, color,
                }}>
                  <CountUpNumber value={val} suffix="g" />
                </span>
              </div>
              <div>
                <AnimatedBar color={color} targetPct={getPct(val)} delay={200 + i * 100} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, color, opacity: 0.9 }}>{label}</span>
            </div>
          );
        })}
      </motion.div>

      {/* Health Score + Tip */}
      <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px' }}>
        <div style={{
          padding: '16px 20px', borderRadius: '18px',
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          minWidth: '110px',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.5px' }}>
            SCORE
          </span>
          <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="var(--bg-3)" strokeWidth="7" />
              <circle
                cx="40" cy="40" r="36" fill="none"
                stroke="#0D9F6E" strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
              />
            </svg>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: 700, color: 'var(--text-1)' }}>
                {healthScore}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>/10</span>
            </div>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-2)', fontWeight: 500 }}>Saúde</span>
        </div>

        <div style={{
          padding: '16px', borderRadius: '18px',
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0D9F6E', letterSpacing: '0.3px' }}>
            💡 DICA NUTRICIONAL
          </span>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.55 }}>
            {result.nutritionTip ?? 'Não há dicas adicionais para esta refeição.'}
          </p>
        </div>
      </motion.div>

      {/* Substitution Tip */}
      {result.substitutionTip && (
        <motion.div variants={item} style={{
          padding: '14px 16px',
          borderRadius: '16px',
          background: 'rgba(245,158,11,0.07)',
          border: '1px solid rgba(245,158,11,0.22)',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
        }}>
          <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>🔄</span>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#D97706', letterSpacing: '0.3px', display: 'block', marginBottom: '3px' }}>
              SUGESTÃO DE SUBSTITUIÇÃO
            </span>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>
              {result.substitutionTip}
            </p>
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <motion.div variants={item} style={{
        textAlign: 'center',
        fontSize: '11px', color: 'var(--text-3)', fontWeight: 500, letterSpacing: '0.3px',
        paddingBottom: '4px',
      }}>
        Analisado por IA · Precisão estimada: ~85%
      </motion.div>

      {/* Share Button */}
      <motion.div variants={item} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            width: '100%', padding: '15px',
            borderRadius: '16px',
            background: sharing
              ? 'var(--bg-3)'
              : 'linear-gradient(135deg, rgba(13,159,110,0.15), rgba(59,130,246,0.12))',
            border: '1px solid rgba(13,159,110,0.35)',
            color: '#0D9F6E', fontSize: '15px', fontWeight: 700,
            cursor: sharing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'background 0.15s, opacity 0.15s',
            opacity: sharing ? 0.6 : 1,
          }}
        >
          <Share2 size={16} />
          {sharing ? 'Gerando imagem…' : 'Compartilhar análise'}
        </button>
        {shareMsg && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ fontSize: '12px', color: '#0D9F6E', textAlign: 'center', margin: 0 }}
          >
            {shareMsg}
          </motion.p>
        )}
      </motion.div>

      {/* Reset Button */}
      <motion.div variants={item}>
        <button
          onClick={onReset}
          style={{
            width: '100%', padding: '15px',
            borderRadius: '16px',
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            color: 'var(--text-1)', fontSize: '15px', fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-3)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-2)')}
        >
          <RotateCcw size={16} />
          Analisar outra foto
        </button>
      </motion.div>
    </motion.div>
  );
}
