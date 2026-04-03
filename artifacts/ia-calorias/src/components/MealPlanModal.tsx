import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, ChevronDown, ChevronUp, Lock } from 'lucide-react';

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface MealItem {
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
}

interface DayPlan {
  day: string;
  meals: MealItem[];
  totalCalories: number;
  totalProtein: number;
}

interface MealPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  isPremium: boolean;
  onUpgrade: () => void;
}

const DAY_EMOJIS: Record<string, string> = {
  'Segunda-feira': '☀️',
  'Terça-feira': '🌤️',
  'Quarta-feira': '⚡',
  'Quinta-feira': '🌿',
  'Sexta-feira': '🎉',
  'Sábado': '😴',
  'Domingo': '🌞',
};

function MacroChip({ value, unit, color }: { value: number; unit: string; color: string }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '99px',
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      {Math.round(value)}{unit}
    </span>
  );
}

function MealRow({ meal }: { meal: MealItem }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: '12px',
      background: 'var(--bg-3)', marginBottom: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {meal.mealType}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>
            {meal.name}
          </div>
          {meal.description && (
            <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px', lineHeight: 1.4 }}>
              {meal.description}
            </div>
          )}
        </div>
        <div style={{
          flexShrink: 0, textAlign: 'right',
          fontSize: '16px', fontWeight: 800, color: '#F97316',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>
          {Math.round(meal.calories)}
          <div style={{ fontSize: '9px', color: 'var(--text-3)', fontWeight: 500 }}>kcal</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
        <MacroChip value={meal.protein} unit="g prot" color="#EF4444" />
        <MacroChip value={meal.carbs} unit="g carb" color="#F59E0B" />
        <MacroChip value={meal.fat} unit="g gord" color="#8B5CF6" />
      </div>
    </div>
  );
}

function DayCard({ plan }: { plan: DayPlan }) {
  const [open, setOpen] = useState(false);
  const emoji = DAY_EMOJIS[plan.day] ?? '📅';
  return (
    <div style={{
      borderRadius: '16px',
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      overflow: 'hidden', marginBottom: '8px',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{emoji}</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>
              {plan.day}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>
              {plan.meals.length} refeições · {Math.round(plan.totalCalories)} kcal
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#F97316' }}>
              {Math.round(plan.totalCalories)}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-3)' }}>kcal</div>
          </div>
          <div style={{ color: 'var(--text-3)', display: 'flex' }}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--border)' }}>
              <div style={{ marginTop: '10px' }}>
                {plan.meals.map((meal, i) => (
                  <MealRow key={i} meal={meal} />
                ))}
              </div>
              <div style={{
                marginTop: '8px', padding: '8px 12px', borderRadius: '10px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap',
              }}>
                {[
                  { label: 'Proteína', value: plan.meals.reduce((s, m) => s + (m.protein || 0), 0), unit: 'g', color: '#EF4444' },
                  { label: 'Carbos', value: plan.meals.reduce((s, m) => s + (m.carbs || 0), 0), unit: 'g', color: '#F59E0B' },
                  { label: 'Gordura', value: plan.meals.reduce((s, m) => s + (m.fat || 0), 0), unit: 'g', color: '#8B5CF6' },
                ].map(({ label, value, unit, color }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color }}>{Math.round(value)}{unit}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SkeletonDay() {
  return (
    <div style={{
      borderRadius: '16px', background: 'var(--bg-2)', border: '1px solid var(--border)',
      padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-3)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '100px', height: '13px', borderRadius: '6px', background: 'var(--bg-3)', marginBottom: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '140px', height: '10px', borderRadius: '6px', background: 'var(--bg-3)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

export function MealPlanModal({ isOpen, onClose, sessionId, isPremium, onUpgrade }: MealPlanModalProps) {
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${BASE}api/meal-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          sessionId,
          foodPrefs: (() => { try { return JSON.parse(localStorage.getItem('ia-calorias-food-prefs') ?? '{}'); } catch { return {}; } })(),
        }),
      });
      if (r.status === 403) {
        setError('forbidden');
        return;
      }
      if (!r.ok) throw new Error('failed');
      const data = await r.json();
      setWeekPlan(data.weekPlan ?? []);
      setGenerated(true);
    } catch {
      setError('Erro ao gerar o cardápio. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Auto-generate when modal opens and not yet generated
  React.useEffect(() => {
    if (isOpen && isPremium && !generated && !loading) {
      generate();
    }
  }, [isOpen, isPremium]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        style={{
          width: '100%', maxWidth: '720px',
          maxHeight: '90dvh',
          background: 'var(--bg-surface)',
          borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
              🥗 Cardápio semanal
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-2)', margin: '3px 0 0' }}>
              Plano personalizado baseado nas suas metas
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--bg-3)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} style={{ color: 'var(--text-2)' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* Paywall state */}
          {!isPremium || error === 'forbidden' ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '16px', padding: '32px 16px', textAlign: 'center',
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '20px',
                background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
              }}>
                🥗
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>
                  Cardápio semanal personalizado
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, maxWidth: '300px', margin: '0 auto' }}>
                  Sofia monta um plano de 7 dias com culinária brasileira, respeitando suas metas de calorias e macros.
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '280px' }}>
                {['7 dias de refeições variadas', 'Culinária brasileira', 'Baseado nas suas metas', 'Regenere quando quiser'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-2)' }}>
                    <Lock size={12} style={{ color: '#0D9F6E' }} />
                    {f}
                  </div>
                ))}
              </div>
              <button
                onClick={onUpgrade}
                style={{
                  padding: '13px 32px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                  color: '#fff', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer',
                }}
              >
                Fazer upgrade →
              </button>
            </div>
          ) : loading ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(13,159,110,0.08)', border: '1px solid rgba(13,159,110,0.15)', marginBottom: '16px' }}>
                <div style={{ fontSize: '20px', animation: 'spin 2s linear infinite', display: 'inline-block' }}>🌀</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0D9F6E' }}>Sofia está preparando seu cardápio...</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Isso pode levar alguns segundos</div>
                </div>
              </div>
              {[...Array(7)].map((_, i) => <SkeletonDay key={i} />)}
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>😕</div>
              <div style={{ fontSize: '14px', color: 'var(--text-1)', fontWeight: 600, marginBottom: '6px' }}>Erro ao gerar cardápio</div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '16px' }}>{error}</div>
              <button onClick={generate} style={{ padding: '10px 24px', borderRadius: '12px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                Tentar novamente
              </button>
            </div>
          ) : weekPlan.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🥗</div>
              <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>
                Clique em gerar para criar seu cardápio personalizado
              </div>
              <button onClick={generate} style={{ padding: '12px 28px', borderRadius: '14px', background: 'linear-gradient(135deg, #0D9F6E, #057A55)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                Gerar cardápio
              </button>
            </div>
          ) : (
            <div>
              {weekPlan.map((day, i) => (
                <DayCard key={i} plan={day} />
              ))}
            </div>
          )}
        </div>

        {/* Footer — regenerate button */}
        {isPremium && generated && !loading && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              onClick={generate}
              style={{
                width: '100%', padding: '12px',
                borderRadius: '12px', border: '1.5px solid var(--border)',
                background: 'var(--bg-2)', color: 'var(--text-1)',
                fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <RefreshCw size={15} style={{ color: 'var(--text-2)' }} />
              Gerar novo cardápio
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
