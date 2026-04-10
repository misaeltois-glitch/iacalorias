import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, ChevronDown, ChevronUp, Lock, Settings2, ShoppingCart, Copy, Check, Loader2, TrendingUp, TrendingDown, Minus, Scale } from 'lucide-react';
import { BASE, AUTH_TOKEN_KEY, authHeaders, apiFetch } from '@/lib/api';

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
  onOpenFoodPrefs?: () => void;
}

interface WeightTrend {
  currentKg: number;
  goalKg: number | null;
  weeklyChangeKg: number;
  objective: string | null;
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

const DAY_LABELS: Record<string, string> = {
  'Segunda-feira': 'SEG',
  'Terça-feira': 'TER',
  'Quarta-feira': 'QUA',
  'Quinta-feira': 'QUI',
  'Sexta-feira': 'SEX',
  'Sábado': 'SÁB',
  'Domingo': 'DOM',
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

function DayCard({ plan, isActive, onClick }: { plan: DayPlan; isActive: boolean; onClick: () => void }) {
  const emoji = DAY_EMOJIS[plan.day] ?? '📅';
  return (
    <div style={{
      borderRadius: '16px',
      background: 'var(--bg-2)', border: `1px solid ${isActive ? 'rgba(13,159,110,0.4)' : 'var(--border)'}`,
      overflow: 'hidden', marginBottom: '8px',
      transition: 'border-color 0.2s',
    }}>
      <button
        onClick={onClick}
        style={{
          width: '100%', padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: isActive ? 'rgba(13,159,110,0.06)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
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
            {isActive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isActive && (
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

// Horizontal week strip for quick navigation
function WeekStrip({ weekPlan, activeIndex, onSelect }: {
  weekPlan: DayPlan[];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '0 20px 12px', scrollbarWidth: 'none' }}>
      {weekPlan.map((day, i) => {
        const label = DAY_LABELS[day.day] ?? day.day.slice(0, 3).toUpperCase();
        const isSelected = i === activeIndex;
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            style={{
              flexShrink: 0, width: '46px', padding: '8px 0',
              borderRadius: '12px', border: `1.5px solid ${isSelected ? '#0D9F6E' : 'var(--border)'}`,
              background: isSelected ? 'rgba(13,159,110,0.12)' : 'var(--bg-2)',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 700, color: isSelected ? '#0D9F6E' : 'var(--text-3)' }}>{label}</span>
            <span style={{ fontSize: '9px', color: isSelected ? '#0D9F6E' : 'var(--text-2)', fontWeight: 600 }}>
              {Math.round(day.totalCalories / 100) / 10}k
            </span>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: isSelected ? '#0D9F6E' : 'var(--bg-3)',
            }} />
          </button>
        );
      })}
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

interface ShoppingCategory {
  name: string;
  emoji: string;
  items: string[];
}

interface HistoryEntry {
  id: string;
  createdAt: string;
  weekPlan: DayPlan[];
  weightTrendSnapshot?: string;
}

const MEAL_PLAN_HISTORY_KEY = 'ia-calorias-meal-plan-history';
const MAX_HISTORY = 5;

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(MEAL_PLAN_HISTORY_KEY) ?? '[]'); }
  catch { return []; }
}

function saveToHistory(plan: DayPlan[], trendLabel?: string) {
  try {
    const history = loadHistory();
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      weekPlan: plan,
      weightTrendSnapshot: trendLabel,
    };
    const next = [entry, ...history].slice(0, MAX_HISTORY);
    localStorage.setItem(MEAL_PLAN_HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch { return []; }
}

// Fetch weight trend from API
async function fetchWeightTrend(sessionId: string): Promise<WeightTrend | null> {
  try {
    const r = await apiFetch(`api/weight?sessionId=${encodeURIComponent(sessionId)}`);
    if (!r.ok) return null;
    const data = await r.json();
    const logs: { weightKg: number; logDate: string }[] = data.logs ?? [];
    if (logs.length < 2) return null;

    // Sort by date ascending (most recent last)
    const sorted = [...logs].sort((a, b) => a.logDate.localeCompare(b.logDate));
    const current = sorted[sorted.length - 1].weightKg;
    const goalKg = data.goalWeight ?? null;

    // Weekly change: compare last 2 readings and estimate per-week rate
    const recent = sorted.slice(-4); // up to last 4 readings
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    const daysDiff = Math.max(1,
      (new Date(newest.logDate).getTime() - new Date(oldest.logDate).getTime()) / 86400000
    );
    const weeklyChangeKg = ((newest.weightKg - oldest.weightKg) / daysDiff) * 7;

    // Try to get objective from goals
    let objective: string | null = null;
    try {
      const gr = await apiFetch(`api/goals?sessionId=${encodeURIComponent(sessionId)}`);
      if (gr.ok) {
        const gd = await gr.json();
        objective = gd.objective ?? null;
      }
    } catch { /* ignore */ }

    return { currentKg: current, goalKg, weeklyChangeKg, objective };
  } catch {
    return null;
  }
}

function WeightTrendBanner({ trend, onAdapt, adapting }: {
  trend: WeightTrend;
  onAdapt: () => void;
  adapting: boolean;
}) {
  const isLosing = trend.weeklyChangeKg < -0.15;
  const isGaining = trend.weeklyChangeKg > 0.15;
  const changeAbs = Math.abs(trend.weeklyChangeKg).toFixed(1);

  let icon = <Minus size={14} />;
  let color = '#6B7280';
  let bg = 'rgba(107,114,128,0.08)';
  let border = 'rgba(107,114,128,0.2)';
  let message = `Peso estável em ${trend.currentKg}kg`;
  let isAlert = false;

  if (isLosing) {
    icon = <TrendingDown size={14} />;
    color = '#3B82F6';
    bg = 'rgba(59,130,246,0.08)';
    border = 'rgba(59,130,246,0.2)';
    message = `Perdendo ${changeAbs}kg/sem · atual ${trend.currentKg}kg`;
    if (trend.weeklyChangeKg < -1.2 && trend.objective === 'lose_weight') isAlert = true;
  } else if (isGaining) {
    icon = <TrendingUp size={14} />;
    color = trend.objective === 'lose_weight' ? '#EF4444' : '#0D9F6E';
    bg = trend.objective === 'lose_weight' ? 'rgba(239,68,68,0.08)' : 'rgba(13,159,110,0.08)';
    border = trend.objective === 'lose_weight' ? 'rgba(239,68,68,0.2)' : 'rgba(13,159,110,0.2)';
    message = `Ganhando ${changeAbs}kg/sem · atual ${trend.currentKg}kg`;
    if (trend.objective === 'lose_weight') isAlert = true;
  }

  return (
    <div style={{
      margin: '0 0 12px',
      padding: '10px 14px',
      borderRadius: '12px',
      background: bg,
      border: `1px solid ${border}`,
      display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <div style={{ color, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color }}>
          {isAlert ? '⚠️ Ajuste recomendado' : 'Progresso de peso'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '1px' }}>{message}</div>
      </div>
      <button
        onClick={onAdapt}
        disabled={adapting}
        style={{
          flexShrink: 0,
          padding: '5px 10px', borderRadius: '8px', border: 'none',
          background: color, color: '#fff',
          fontSize: '11px', fontWeight: 700, cursor: 'pointer',
          opacity: adapting ? 0.7 : 1,
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
      >
        {adapting ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Scale size={11} />}
        Adaptar
      </button>
    </div>
  );
}

export function MealPlanModal({ isOpen, onClose, sessionId, isPremium, onUpgrade, onOpenFoodPrefs }: MealPlanModalProps) {
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [showShopping, setShowShopping] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingCategory[]>([]);
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [historySelected, setHistorySelected] = useState<HistoryEntry | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [weightTrend, setWeightTrend] = useState<WeightTrend | null>(null);
  const [weightLoading, setWeightLoading] = useState(false);

  // Load weight trend when modal opens
  useEffect(() => {
    if (!isOpen || !isPremium) return;
    setWeightLoading(true);
    fetchWeightTrend(sessionId)
      .then(t => setWeightTrend(t))
      .finally(() => setWeightLoading(false));
  }, [isOpen, isPremium, sessionId]);

  const generate = useCallback(async (withWeightTrend?: WeightTrend | null) => {
    setLoading(true);
    setError(null);
    setShowShopping(false);
    try {
      const foodPrefs = (() => { try { return JSON.parse(localStorage.getItem('ia-calorias-food-prefs') ?? '{}'); } catch { return {}; } })();
      const body: any = { sessionId, foodPrefs };
      if (withWeightTrend) body.weightTrend = withWeightTrend;

      const r = await fetch(`${BASE}api/meal-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (r.status === 403) { setError('forbidden'); return; }
      if (!r.ok) throw new Error('failed');
      const data = await r.json();
      const plan = data.weekPlan ?? [];
      setWeekPlan(plan);
      setGenerated(true);
      setActiveDayIndex(0);
      if (plan.length > 0) {
        const trendLabel = withWeightTrend
          ? `${withWeightTrend.currentKg}kg · ${withWeightTrend.weeklyChangeKg > 0 ? '+' : ''}${withWeightTrend.weeklyChangeKg.toFixed(1)}kg/sem`
          : undefined;
        setHistory(saveToHistory(plan, trendLabel));
      }
    } catch {
      setError('Erro ao gerar o cardápio. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const generateShoppingList = useCallback(async () => {
    if (weekPlan.length === 0) return;
    setShoppingLoading(true);
    try {
      const r = await fetch(`${BASE}api/meal-plan/shopping-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ sessionId, weekPlan }),
      });
      if (!r.ok) return;
      const data = await r.json();
      setShoppingList(data.categories ?? []);
      setShowShopping(true);
    } finally {
      setShoppingLoading(false);
    }
  }, [weekPlan, sessionId]);

  const handleCopyList = useCallback(() => {
    const text = shoppingList
      .map(cat => `${cat.emoji} ${cat.name}\n${cat.items.map(i => `• ${i}`).join('\n')}`)
      .join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shoppingList]);

  // Auto-generate when modal opens
  useEffect(() => {
    if (isOpen && isPremium && !generated && !loading) {
      generate();
    }
  }, [isOpen, isPremium]);

  if (!isOpen) return null;

  const displayPlan = historySelected?.weekPlan ?? weekPlan;

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
          maxHeight: '92dvh',
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
              Personalizado às suas metas e progresso de peso
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenFoodPrefs && (
              <button
                onClick={onOpenFoodPrefs}
                title="Preferências alimentares"
                style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: 'var(--bg-3)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Settings2 size={15} style={{ color: 'var(--text-2)' }} />
              </button>
            )}
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
        </div>

        {/* Tabs */}
        {isPremium && (generated || history.length > 0) && (
          <div style={{ display: 'flex', padding: '8px 20px', borderBottom: '1px solid var(--border)', gap: '4px', flexShrink: 0 }}>
            {(['current', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setHistorySelected(null); }}
                style={{
                  padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  background: activeTab === tab ? 'rgba(13,159,110,0.12)' : 'transparent',
                  color: activeTab === tab ? '#0D9F6E' : 'var(--text-3)',
                }}
              >
                {tab === 'current' ? '📋 Cardápio atual' : `🕐 Histórico (${history.length})`}
              </button>
            ))}
          </div>
        )}

        {/* Week strip (when plan exists) */}
        {activeTab === 'current' && displayPlan.length > 0 && !loading && (
          <div style={{ borderBottom: '1px solid var(--border)', flexShrink: 0, paddingTop: '12px' }}>
            <WeekStrip
              weekPlan={displayPlan}
              activeIndex={activeDayIndex}
              onSelect={setActiveDayIndex}
            />
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* History tab */}
          {activeTab === 'history' ? (
            historySelected ? (
              <div>
                <button
                  onClick={() => setHistorySelected(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: '13px', fontWeight: 600, marginBottom: '14px', padding: '0' }}
                >
                  ← Voltar
                </button>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>
                  Gerado em {new Date(historySelected.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                {historySelected.weightTrendSnapshot && (
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '12px' }}>
                    Peso na época: {historySelected.weightTrendSnapshot}
                  </div>
                )}
                {historySelected.weekPlan.map((day, i) => (
                  <DayCard key={i} plan={day} isActive={activeDayIndex === i} onClick={() => setActiveDayIndex(activeDayIndex === i ? -1 : i)} />
                ))}
              </div>
            ) : (
              <div>
                {history.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '13px', padding: '32px 0' }}>
                    Nenhum cardápio gerado ainda.
                  </p>
                ) : (
                  history.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => { setHistorySelected(entry); setActiveDayIndex(0); }}
                      style={{
                        width: '100%', padding: '14px 16px', borderRadius: '14px',
                        background: 'var(--bg-2)', border: '1px solid var(--border)',
                        cursor: 'pointer', textAlign: 'left', marginBottom: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>
                          🥗 Cardápio de {entry.weekPlan.length} dias
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                          {new Date(entry.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {entry.weightTrendSnapshot ? ` · ${entry.weightTrendSnapshot}` : ''}
                        </div>
                      </div>
                      <ChevronDown size={14} style={{ color: 'var(--text-3)', transform: 'rotate(-90deg)' }} />
                    </button>
                  ))
                )}
              </div>
            )
          ) : null}

          {activeTab === 'current' && (
            <>
              {/* Paywall */}
              {!isPremium || error === 'forbidden' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 16px', textAlign: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #0D9F6E, #057A55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🥗</div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>Cardápio semanal personalizado</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, maxWidth: '300px', margin: '0 auto' }}>
                      Sofia monta um plano de 7 dias com culinária brasileira, respeitando suas metas e progresso de peso.
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '280px' }}>
                    {['7 dias de refeições variadas', 'Adapta ao seu progresso de peso', 'Culinária brasileira', 'Lista de compras automática'].map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-2)' }}>
                        <Lock size={12} style={{ color: '#0D9F6E' }} />
                        {f}
                      </div>
                    ))}
                  </div>
                  <button onClick={onUpgrade} style={{ padding: '13px 32px', borderRadius: '14px', background: 'linear-gradient(135deg, #0D9F6E, #057A55)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                    Fazer upgrade →
                  </button>
                </div>
              ) : loading ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(13,159,110,0.08)', border: '1px solid rgba(13,159,110,0.15)', marginBottom: '16px' }}>
                    <div style={{ fontSize: '20px', animation: 'spin 2s linear infinite', display: 'inline-block' }}>🌀</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0D9F6E' }}>Sofia está preparando seu cardápio...</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Analisando seu progresso e metas</div>
                    </div>
                  </div>
                  {[...Array(7)].map((_, i) => <SkeletonDay key={i} />)}
                </div>
              ) : error ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>😕</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-1)', fontWeight: 600, marginBottom: '6px' }}>Erro ao gerar cardápio</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '16px' }}>{error}</div>
                  <button onClick={() => generate()} style={{ padding: '10px 24px', borderRadius: '12px', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                    Tentar novamente
                  </button>
                </div>
              ) : weekPlan.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🥗</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>
                    Gere seu cardápio personalizado
                  </div>
                  <button onClick={() => generate(weightTrend)} style={{ padding: '12px 28px', borderRadius: '14px', background: 'linear-gradient(135deg, #0D9F6E, #057A55)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                    Gerar cardápio
                  </button>
                </div>
              ) : (
                <div>
                  {/* Weight trend banner */}
                  {weightTrend && !weightLoading && (
                    <WeightTrendBanner
                      trend={weightTrend}
                      adapting={loading}
                      onAdapt={() => generate(weightTrend)}
                    />
                  )}

                  {/* Active day full card */}
                  {weekPlan[activeDayIndex] && (
                    <DayCard
                      plan={weekPlan[activeDayIndex]}
                      isActive={true}
                      onClick={() => {}}
                    />
                  )}

                  {/* Other days (collapsed) */}
                  {weekPlan.map((day, i) => {
                    if (i === activeDayIndex) return null;
                    return (
                      <DayCard
                        key={i}
                        plan={day}
                        isActive={false}
                        onClick={() => setActiveDayIndex(i)}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Shopping list panel */}
        <AnimatePresence>
          {showShopping && shoppingList.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden', borderTop: '1px solid var(--border)', flexShrink: 0 }}
            >
              <div style={{ padding: '16px 20px', maxHeight: '280px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>🛒 Lista de compras</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleCopyList}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '5px 10px', borderRadius: '8px',
                        background: copied ? 'rgba(13,159,110,0.15)' : 'var(--bg-3)',
                        border: 'none', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 600,
                        color: copied ? '#0D9F6E' : 'var(--text-2)',
                      }}
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                    <button onClick={() => setShowShopping(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px' }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
                {shoppingList.map(cat => (
                  <div key={cat.name} style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '4px' }}>
                      {cat.emoji} {cat.name}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {cat.items.map(item => (
                        <span key={item} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '99px', background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        {isPremium && generated && !loading && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: '8px' }}>
            <button
              onClick={() => showShopping ? setShowShopping(false) : generateShoppingList()}
              disabled={shoppingLoading}
              style={{
                flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid var(--border)',
                background: showShopping ? 'rgba(13,159,110,0.08)' : 'var(--bg-2)',
                color: showShopping ? '#0D9F6E' : 'var(--text-1)',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              {shoppingLoading
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Gerando...</>
                : <><ShoppingCart size={14} /> Lista de compras</>}
            </button>
            <button
              onClick={() => generate(weightTrend)}
              style={{
                flex: 1, padding: '12px', borderRadius: '12px', border: '1.5px solid var(--border)',
                background: 'var(--bg-2)', color: 'var(--text-1)',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}
            >
              <RefreshCw size={14} style={{ color: 'var(--text-2)' }} />
              Novo cardápio
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
