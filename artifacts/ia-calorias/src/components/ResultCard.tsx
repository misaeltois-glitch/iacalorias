import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Sparkles, Share2, Pencil, Check, X, Loader2 } from 'lucide-react';
import type { AnalysisResult } from '@workspace/api-client-react/src/generated/api.schemas';
import { shareResult } from '@/lib/share-card';

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';

const MEAL_TYPES = [
  { key: 'breakfast',       label: '☀️ Café da manhã' },
  { key: 'morning_snack',   label: '🍎 Lanche manhã' },
  { key: 'lunch',           label: '🍽️ Almoço' },
  { key: 'afternoon_snack', label: '🥤 Lanche tarde' },
  { key: 'dinner',          label: '🌙 Jantar' },
  { key: 'other',           label: '➕ Outro' },
] as const;

const SENTIMENT_CONFIG = {
  positive: { emoji: '✅', color: '#0D9F6E', bg: 'rgba(13,159,110,0.08)', border: 'rgba(13,159,110,0.22)', label: 'ÓTIMA ESCOLHA' },
  neutral:  { emoji: '💡', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)', label: 'PODE MELHORAR' },
  negative: { emoji: '⚠️', color: '#EF4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.22)',  label: 'ATENÇÃO' },
} as const;

interface MealFeedback {
  sentiment: 'positive' | 'neutral' | 'negative';
  message: string;
  tips: string[];
}

interface ResultCardProps {
  result: AnalysisResult;
  onReset: () => void;
  photoUrl?: string;
  sessionId?: string;
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

export function ResultCard({ result, onReset, photoUrl, sessionId }: ResultCardProps) {
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mealType, setMealType] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<MealFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [editValues, setEditValues] = useState({
    dishName: result.dishName,
    calories: result.calories,
    protein: result.macros.protein,
    carbs: result.macros.carbs,
    fat: result.macros.fat,
    fiber: result.fiber ?? 0,
  });
  const [liveResult, setLiveResult] = useState(result);

  const handleSaveEdit = useCallback(async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const r = await fetch(`${BASE}api/analysis/${liveResult.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...editValues, sessionId }),
      });
      if (r.ok) {
        setLiveResult(prev => ({
          ...prev,
          dishName: editValues.dishName,
          calories: editValues.calories,
          macros: { protein: editValues.protein, carbs: editValues.carbs, fat: editValues.fat },
          fiber: editValues.fiber,
        }));
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }, [editValues, liveResult.id, sessionId]);

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

  const handleMealSelect = useCallback(async (key: string) => {
    if (mealType === key) return; // no-op if same pill
    setMealType(key);
    setFeedback(null);
    setFeedbackLoading(true);
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const r = await fetch(`${BASE}api/meal-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ analysisId: liveResult.id, mealType: key, sessionId }),
      });
      if (r.ok) {
        const data = await r.json();
        setFeedback(data);
      }
    } catch {
      // silently fail — not critical
    } finally {
      setFeedbackLoading(false);
    }
  }, [liveResult.id, mealType, sessionId]);

  const macroValues = {
    protein: liveResult.macros.protein,
    carbs: liveResult.macros.carbs,
    fiber: liveResult.fiber ?? 0,
    fat: liveResult.macros.fat,
  };

  const maxMacro = Math.max(...Object.values(macroValues), 1);
  const getPct = (v: number) => Math.min(100, (v / maxMacro) * 100);

  const healthScore = liveResult.healthScore ?? 0;
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
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: '12px' }}>
            <h2 style={{
              fontSize: '22px', fontWeight: 800, color: 'var(--text-1)',
              letterSpacing: '-0.4px', lineHeight: 1.2, flex: 1,
            }}>
              {liveResult.dishName}
            </h2>
            <button
              onClick={() => { setEditing(e => !e); setEditValues({ dishName: liveResult.dishName, calories: liveResult.calories, protein: liveResult.macros.protein, carbs: liveResult.macros.carbs, fat: liveResult.macros.fat, fiber: liveResult.fiber ?? 0 }); }}
              style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: editing ? '#0D9F6E' : 'var(--text-3)', borderRadius: 8, flexShrink: 0, marginTop: 2 }}
              title="Editar análise"
            >
              <Pencil size={15} />
            </button>
          </div>

          {/* Inline edit form */}
          <AnimatePresence>
            {editing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: 12 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px', borderRadius: 14, background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                  <input
                    value={editValues.dishName}
                    onChange={e => setEditValues(v => ({ ...v, dishName: e.target.value }))}
                    placeholder="Nome do prato"
                    style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    {([['calories','Kcal',''],['protein','Prot','g'],['carbs','Carbs','g'],['fat','Gord','g'],['fiber','Fibras','g']] as const).map(([key, label, unit]) => (
                      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>{label}</span>
                        <input
                          type="number"
                          min={0}
                          step={key === 'calories' ? 1 : 0.1}
                          value={editValues[key]}
                          onChange={e => setEditValues(v => ({ ...v, [key]: Number(e.target.value) }))}
                          style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%' }}
                        />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setEditing(false)} style={{ flex: 1, padding: '8px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <X size={13} /> Cancelar
                    </button>
                    <button onClick={handleSaveEdit} disabled={saving} style={{ flex: 2, padding: '8px', borderRadius: 10, border: 'none', background: '#0D9F6E', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: saving ? 0.6 : 1 }}>
                      <Check size={13} /> {saving ? 'Salvando…' : 'Salvar'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {liveResult.servingSize && (
                <span style={{
                  padding: '4px 10px', borderRadius: '99px',
                  background: 'var(--bg-3)', border: '1px solid var(--border)',
                  fontSize: '12px', color: 'var(--text-2)',
                }}>
                  {liveResult.servingSize}
                </span>
              )}
              {liveResult.confidence && (
                <span style={{
                  padding: '4px 10px', borderRadius: '99px',
                  background: 'var(--bg-3)', border: '1px solid var(--border)',
                  fontSize: '12px', color: 'var(--text-2)',
                }}>
                  Confiança: {liveResult.confidence}
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
                <CountUpNumber value={liveResult.calories} />
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
            {liveResult.nutritionTip ?? 'Não há dicas adicionais para esta refeição.'}
          </p>
        </div>
      </motion.div>

      {/* Substitution Tip */}
      {liveResult.substitutionTip && (
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
              {liveResult.substitutionTip}
            </p>
          </div>
        </motion.div>
      )}

      {/* Meal Type Selector */}
      <motion.div variants={item} style={{
        borderRadius: '18px',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        padding: '16px',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.5px', marginBottom: '10px' }}>
          🍽️ QUAL REFEIÇÃO É ESSA?
        </div>
        <div style={{
          display: 'flex', gap: '7px',
          overflowX: 'auto', paddingBottom: '2px',
          scrollbarWidth: 'none',
        }}>
          {MEAL_TYPES.map(({ key, label }) => {
            const selected = mealType === key;
            return (
              <button
                key={key}
                onClick={() => handleMealSelect(key)}
                style={{
                  padding: '7px 13px',
                  borderRadius: '99px',
                  border: selected ? '1.5px solid #0D9F6E' : '1px solid var(--border)',
                  background: selected ? 'rgba(13,159,110,0.12)' : 'var(--bg-3)',
                  color: selected ? '#0D9F6E' : 'var(--text-2)',
                  fontSize: '12px', fontWeight: selected ? 700 : 500,
                  cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Meal Feedback */}
      <AnimatePresence>
        {(feedbackLoading || feedback) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            {feedbackLoading ? (
              <div style={{
                padding: '16px',
                borderRadius: '18px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <Loader2 size={16} style={{ color: '#0D9F6E', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>Analisando para o seu objetivo…</span>
              </div>
            ) : feedback && (() => {
              const cfg = SENTIMENT_CONFIG[feedback.sentiment] ?? SENTIMENT_CONFIG.neutral;
              return (
                <div style={{
                  padding: '16px',
                  borderRadius: '18px',
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{cfg.emoji}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, letterSpacing: '0.4px' }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-1)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                    {feedback.message}
                  </p>
                  {feedback.tips.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px', borderTop: `1px solid ${cfg.border}` }}>
                      {feedback.tips.map((tip, i) => (
                        <div key={i} style={{ display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '12px', color: cfg.color, flexShrink: 0, marginTop: '1px' }}>→</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

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
