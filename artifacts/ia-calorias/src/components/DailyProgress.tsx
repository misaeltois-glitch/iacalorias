import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Sparkles, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Info } from 'lucide-react';

type Period = 'day' | 'week' | 'month';

interface MacroRing {
  label: string;
  emoji: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  trackColor: string;
}

interface Alert {
  type: 'tip' | 'warning' | 'ok';
  macro: string;
  message: string;
}

interface DailyProgressProps {
  totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number; meals: number };
  goals: { calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null; fiber?: number | null; objective?: string | null } | null;
  alerts: Alert[];
  aiSummary: string | null;
  analysesCount: number;
  period: Period;
  onPeriodChange?: (p: Period) => void;
  onSetGoals: () => void;
  isPremium: boolean;
}

function MacroRingComponent({ label, emoji, current, goal, unit, color, trackColor }: MacroRing) {
  const size = 80;
  const strokeWidth = 7;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(1, current / goal) : 0;
  const offset = circ * (1 - pct);
  const isOver = goal > 0 && current > goal * 1.1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={isOver ? '#ef4444' : color}
            strokeWidth={strokeWidth}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '9px' }}>{emoji}</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: isOver ? '#ef4444' : color, lineHeight: 1 }}>
            {Math.round(current)}
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)' }}>{label}</div>
        <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>/ {goal}{unit}</div>
      </div>
    </div>
  );
}

const PERIOD_LABELS: Record<Period, string> = { day: 'Hoje', week: 'Semana', month: 'Mês' };

export function DailyProgress({ totals, goals, alerts, aiSummary, analysesCount, period, onPeriodChange, onSetGoals, isPremium }: DailyProgressProps) {
  const [showSummary, setShowSummary] = useState(false);

  const macros: MacroRing[] = [
    { label: 'Calorias', emoji: '🔥', current: totals.calories, goal: goals?.calories ?? 0, unit: 'kcal', color: '#f97316', trackColor: 'rgba(249,115,22,0.15)' },
    { label: 'Proteína', emoji: '🥩', current: totals.protein, goal: goals?.protein ?? 0, unit: 'g', color: '#22c55e', trackColor: 'rgba(34,197,94,0.15)' },
    { label: 'Carbs', emoji: '🌾', current: totals.carbs, goal: goals?.carbs ?? 0, unit: 'g', color: '#f59e0b', trackColor: 'rgba(245,158,11,0.15)' },
    { label: 'Gordura', emoji: '🫒', current: totals.fat, goal: goals?.fat ?? 0, unit: 'g', color: '#ef4444', trackColor: 'rgba(239,68,68,0.15)' },
    { label: 'Fibras', emoji: '🥦', current: totals.fiber, goal: goals?.fiber ?? 0, unit: 'g', color: '#06b6d4', trackColor: 'rgba(6,182,212,0.15)' },
  ];

  const alertIcons = { tip: Info, warning: AlertCircle, ok: CheckCircle2 };
  const alertColors = { tip: '#3b82f6', warning: '#f59e0b', ok: '#22c55e' };
  const alertBg = { tip: 'rgba(59,130,246,0.08)', warning: 'rgba(245,158,11,0.08)', ok: 'rgba(34,197,94,0.08)' };

  if (!isPremium) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '20px', borderRadius: '20px',
          background: 'var(--bg-2)', border: '1.5px dashed var(--border-strong)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎯</div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>Metas e progresso diário</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px', lineHeight: 1.5 }}>
          Configure suas metas de calorias, proteínas, carboidratos e gordura e acompanhe seu progresso em tempo real.
        </p>
        <button onClick={onSetGoals} style={{
          padding: '10px 20px', borderRadius: '10px',
          background: 'var(--accent)', color: '#fff',
          fontWeight: 600, fontSize: '14px', border: 'none', cursor: 'pointer',
        }}>
          Ver planos →
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target style={{ width: '18px', height: '18px', color: 'var(--accent)' }} />
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Progresso</span>
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
            background: 'var(--accent-glow)', color: 'var(--accent)',
          }}>
            {analysesCount} {analysesCount === 1 ? 'refeição' : 'refeições'}
          </span>
        </div>

        {/* Right side: period filter OR "Visualize suas metas" */}
        {onPeriodChange ? (
          <div style={{ display: 'flex', background: 'var(--bg-3)', borderRadius: '8px', padding: '2px', gap: '2px' }}>
            {(['day', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                style={{
                  padding: '4px 10px', borderRadius: '6px', border: 'none',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  background: period === p ? 'var(--accent)' : 'transparent',
                  color: period === p ? '#fff' : 'var(--text-2)',
                }}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        ) : goals ? (
          <button
            onClick={onSetGoals}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
              fontSize: '12px', fontWeight: 600, color: 'var(--accent)',
            }}
          >
            Visualize suas metas →
          </button>
        ) : null}
      </div>

      {/* Macro rings */}
      <div style={{
        padding: '20px', borderRadius: '20px', background: 'var(--bg-2)',
        border: '1.5px solid var(--border)',
      }}>
        {goals ? (
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start' }}>
            {macros.map(m => <MacroRingComponent key={m.label} {...m} />)}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '12px' }}>
              Você registrou <strong style={{ color: 'var(--text-1)' }}>{analysesCount} {analysesCount === 1 ? 'refeição' : 'refeições'}</strong>. Configure metas para ver o progresso.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {[
                { label: '🔥 Calorias', value: `${Math.round(totals.calories)} kcal`, color: '#f97316' },
                { label: '🥩 Proteína', value: `${totals.protein.toFixed(0)}g`, color: '#22c55e' },
                { label: '🌾 Carbs', value: `${totals.carbs.toFixed(0)}g`, color: '#f59e0b' },
                { label: '🥦 Fibras', value: `${totals.fiber.toFixed(0)}g`, color: '#06b6d4' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{label}</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alerts (day only) */}
      {alerts.length > 0 && period === 'day' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.map((alert, i) => {
            const Icon = alertIcons[alert.type];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '12px 14px', borderRadius: '14px',
                  background: alertBg[alert.type],
                  border: `1px solid ${alertColors[alert.type]}30`,
                }}
              >
                <Icon style={{ width: '16px', height: '16px', color: alertColors[alert.type], marginTop: '1px', flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: 'var(--text-1)', lineHeight: 1.5, margin: 0 }}>{alert.message}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* AI Summary (day only) */}
      {aiSummary && period === 'day' && (
        <div style={{ borderRadius: '16px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
          <button
            onClick={() => setShowSummary(s => !s)}
            style={{
              width: '100%', padding: '12px 16px', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg-2)', border: 'none', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles style={{ width: '15px', height: '15px', color: 'var(--accent)' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>Resumo da nutricionista IA</span>
            </div>
            {showSummary
              ? <ChevronUp style={{ width: '16px', height: '16px', color: 'var(--text-2)' }} />
              : <ChevronDown style={{ width: '16px', height: '16px', color: 'var(--text-2)' }} />
            }
          </button>
          {showSummary && (
            <div style={{ padding: '14px 16px', background: 'var(--bg-3)', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-1)', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
                "{aiSummary}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Set goals CTA */}
      {!goals && (
        <button onClick={onSetGoals} style={{
          padding: '12px', borderRadius: '14px',
          border: '1.5px dashed var(--accent)', background: 'var(--accent-glow)',
          color: 'var(--accent)', fontWeight: 600, fontSize: '14px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <Target style={{ width: '16px', height: '16px' }} />
          Configurar minhas metas diárias
        </button>
      )}
    </motion.div>
  );
}
