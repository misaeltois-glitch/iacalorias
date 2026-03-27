import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';

const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';
const BASE = import.meta.env.BASE_URL ?? '/';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type Period = 'day' | 'week' | 'month';

interface DayData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  mealsCount: number;
}

interface Meal {
  id: string;
  dishName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  healthScore: number | null;
  createdAt: string;
}

interface SummaryData {
  period: string;
  totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number; meals: number };
  goals: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null; mealsPerDay: number } | null;
  days: DayData[];
  meals: Meal[];
  daysInPeriod: number;
  daysWithData: number;
  streak: number;
  dailyAvg: { calories: number; protein: number; carbs: number; fat: number; fiber: number } | null;
  pagination: { page: number; pageSize: number; total: number; totalPages: number; hasMore: boolean };
  isPremium: boolean;
}

interface ProgressViewProps {
  sessionId: string;
  isPremium: boolean;
  refreshSignal?: number;
  onUpgrade: () => void;
  onSetGoals: () => void;
}

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

function SkeletonBlock({ h }: { h: number }) {
  return (
    <div style={{
      height: h, borderRadius: '16px', background: 'var(--bg-2)',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }} />
  );
}

export function ProgressView({ sessionId, isPremium, refreshSignal, onUpgrade, onSetGoals }: ProgressViewProps) {
  const now = new Date();
  const [period, setPeriod] = useState<Period>('day');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [monthData, setMonthData] = useState<SummaryData | null>(null);

  const today = todayStr();

  const fetchData = useCallback(async (p: Period, date: string) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const url = `${BASE}api/analytics/summary?sessionId=${sessionId}&period=${p}&date=${date}&pageSize=50`;
      const r = await fetch(url, { headers: authHeaders() });
      if (r.ok) setData(await r.json());
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const fetchMonthData = useCallback(async (year: number, month: number) => {
    if (!sessionId) return;
    try {
      const url = `${BASE}api/analytics/summary?sessionId=${sessionId}&period=month&date=${firstDayOfMonth(year, month)}&pageSize=1`;
      const r = await fetch(url, { headers: authHeaders() });
      if (r.ok) setMonthData(await r.json());
    } catch { /* silent */ }
  }, [sessionId]);

  useEffect(() => {
    fetchData(period, selectedDate);
  }, [period, selectedDate, fetchData, refreshSignal]);

  useEffect(() => {
    fetchMonthData(calYear, calMonth);
  }, [calYear, calMonth, fetchMonthData, refreshSignal]);

  const handlePeriod = (p: Period) => {
    setPeriod(p);
    if (p !== 'day') setSelectedDate(today);
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setPeriod('day');
    const d = new Date(dateStr + 'T12:00:00Z');
    setCalYear(d.getUTCFullYear());
    setCalMonth(d.getUTCMonth());
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };

  const nextMonth = () => {
    const nowYear = new Date().getFullYear();
    const nowMonth = new Date().getMonth();
    if (calYear < nowYear || (calYear === nowYear && calMonth < nowMonth)) {
      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
      else setCalMonth(m => m + 1);
    }
  };

  const isNextDisabled = (() => {
    const n = new Date();
    return calYear === n.getFullYear() && calMonth === n.getMonth();
  })();

  const buildCalendarCells = () => {
    const firstDay = new Date(Date.UTC(calYear, calMonth, 1));
    const daysInMonth = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate();
    const startDow = (firstDay.getUTCDay() + 6) % 7;
    const cells: Array<{ dateStr: string | null; dayNum: number | null }> = [];
    for (let i = 0; i < startDow; i++) cells.push({ dateStr: null, dayNum: null });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        dateStr: `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        dayNum: d,
      });
    }
    return cells;
  };

  const getDayColor = (dateStr: string) => {
    const dayData = monthData?.days.find(d => d.date === dateStr);
    const goal = monthData?.goals?.calories;
    if (!dayData || dayData.mealsCount === 0) return { bg: 'transparent', text: 'var(--text-2)', dot: '' };
    if (!goal) return { bg: 'rgba(99,102,241,0.12)', text: '#6366f1', dot: '#6366f1' };
    const ratio = dayData.calories / goal;
    if (ratio >= 1.1) return { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', dot: '#ef4444' };
    if (ratio >= 0.8) return { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', dot: '#22c55e' };
    if (ratio >= 0.4) return { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', dot: '#f59e0b' };
    return { bg: 'rgba(148,163,184,0.08)', text: 'var(--text-3)', dot: 'var(--text-3)' };
  };

  const calendarCells = buildCalendarCells();

  const consumed = Math.round(data?.totals.calories ?? 0);
  const goalCalories = data?.goals?.calories ?? null;
  const periodGoal = goalCalories ? Math.round(goalCalories * (period === 'day' ? 1 : (data?.daysInPeriod ?? 1))) : null;
  const balance = periodGoal !== null ? consumed - periodGoal : null;
  const pct = periodGoal ? Math.min(100, (consumed / periodGoal) * 100) : null;
  const isExcess = balance !== null && balance > 0;
  const isDeficit = balance !== null && balance < 0;
  const balanceColor = isExcess ? '#ef4444' : isDeficit ? '#22c55e' : '#6366f1';
  const balanceLabel = isExcess ? 'EXCESSO' : isDeficit ? 'DÉFICIT' : 'NA META';
  const balanceBg = isExcess ? 'rgba(239,68,68,0.06)' : isDeficit ? 'rgba(34,197,94,0.06)' : 'rgba(99,102,241,0.06)';
  const periodLabel = period === 'day'
    ? (selectedDate !== today ? new Date(selectedDate + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : 'Hoje')
    : period === 'week' ? 'Esta semana'
    : 'Este mês';

  return (
    <motion.div
      key="progress-view"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}
    >
      {/* Period pills */}
      <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-3)', borderRadius: '12px', padding: '3px' }}>
        {([
          { key: 'day' as Period, label: 'Hoje' },
          { key: 'week' as Period, label: 'Semana' },
          { key: 'month' as Period, label: 'Mês' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handlePeriod(key)}
            style={{
              flex: 1, padding: '9px 6px', borderRadius: '10px',
              border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              transition: 'all 0.15s',
              background: period === key ? 'var(--bg)' : 'transparent',
              color: period === key ? 'var(--text-1)' : 'var(--text-3)',
              boxShadow: period === key ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <SkeletonBlock h={160} />
          <SkeletonBlock h={120} />
          <SkeletonBlock h={260} />
        </div>
      )}

      {!loading && !isPremium && (
        <div style={{
          padding: '32px 20px', borderRadius: '20px',
          background: 'var(--bg-2)', border: '1.5px dashed var(--border)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📊</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>
            Progresso completo
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '20px', lineHeight: 1.55 }}>
            Veja seu balanço calórico, calendário nutricional e histórico de refeições com um plano pago.
          </p>
          <button
            onClick={onUpgrade}
            style={{
              padding: '13px 28px', borderRadius: '13px',
              background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
              color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            }}
          >
            Desbloquear Progresso
          </button>
        </div>
      )}

      {!loading && isPremium && data && (
        <>
          {/* ─── Calorie Balance ─── */}
          <div style={{ background: 'var(--bg-2)', borderRadius: '18px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>🔥 Calorias</span>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '1px' }}>Consumido vs. meta do período</div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{periodLabel}</span>
            </div>

            {/* Consumido */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-2)', fontWeight: 500 }}>Consumido</span>
              </div>
              <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
                {consumed.toLocaleString('pt-BR')} kcal
              </span>
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-3)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-2)', fontWeight: 500 }}>Meta</span>
              </div>
              {periodGoal ? (
                <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
                  {periodGoal.toLocaleString('pt-BR')} kcal
                </span>
              ) : (
                <button onClick={onSetGoals} style={{ fontSize: '13px', color: '#0D9F6E', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Target size={13} /> Definir meta
                </button>
              )}
            </div>

            {/* Saldo */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: balance !== null ? balanceBg : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: balanceColor, flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-2)', fontWeight: 500 }}>Saldo</span>
              </div>
              {balance !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 800, color: balanceColor, fontVariantNumeric: 'tabular-nums' }}>
                    {isExcess ? '+' : ''}{balance.toLocaleString('pt-BR')} kcal
                  </span>
                  <span style={{
                    fontSize: '10px', fontWeight: 800, color: balanceColor,
                    background: isExcess ? 'rgba(239,68,68,0.12)' : isDeficit ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.12)',
                    padding: '2px 8px', borderRadius: '99px',
                  }}>
                    {balanceLabel}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>—</span>
              )}
            </div>

            {/* Progress bar */}
            {pct !== null && (
              <div style={{ padding: '10px 16px 13px', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{Math.round(pct)}% da meta</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: balanceColor }}>
                    {isDeficit ? `Faltam ${Math.abs(balance!).toLocaleString('pt-BR')} kcal` : isExcess ? `${balance!.toLocaleString('pt-BR')} kcal acima` : '✓ Na meta!'}
                  </span>
                </div>
                <div style={{ height: '7px', borderRadius: '99px', background: 'var(--bg-3)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '99px', transition: 'width 0.6s ease',
                    width: `${Math.min(pct, 100)}%`,
                    background: pct >= 110 ? '#ef4444' : pct >= 90 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#6366f1',
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* ─── Nutrientes ─── */}
          <div style={{ background: 'var(--bg-2)', borderRadius: '18px', border: '1.5px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>💊 Nutrientes</span>
            {([
              { label: 'Proteína',     key: 'protein' as const, color: '#ef4444' },
              { label: 'Carboidratos', key: 'carbs'   as const, color: '#f59e0b' },
              { label: 'Gorduras',     key: 'fat'     as const, color: '#8B5CF6' },
              { label: 'Fibras',       key: 'fiber'   as const, color: '#10B981' },
            ]).map(({ label, key, color }) => {
              const current = Math.round((data.totals[key] as number) * 10) / 10;
              const dailyGoal = data.goals?.[key] ?? null;
              const pGoal = dailyGoal ? Math.round(dailyGoal * (period === 'day' ? 1 : data.daysInPeriod) * 10) / 10 : null;
              const pctN = pGoal ? Math.min(100, (current / pGoal) * 100) : null;
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
                      {current}g{pGoal ? ` / ${pGoal}g` : ''}
                    </span>
                  </div>
                  <div style={{ height: '5px', borderRadius: '99px', background: 'var(--bg-3)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '99px', background: color,
                      width: `${pctN ?? (current > 0 ? 20 : 0)}%`,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── Calendário ─── */}
          <div style={{ background: 'var(--bg-2)', borderRadius: '18px', border: '1.5px solid var(--border)', padding: '14px 16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>
                📅 {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={prevMonth} style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
                  <ChevronLeft size={14} />
                </button>
                <button onClick={nextMonth} disabled={isNextDisabled} style={{ width: '28px', height: '28px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-3)', cursor: isNextDisabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isNextDisabled ? 'var(--text-3)' : 'var(--text-2)', opacity: isNextDisabled ? 0.4 : 1 }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Day-of-week headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
              {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--text-3)', padding: '3px 0' }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
              {calendarCells.map((cell, i) => {
                if (!cell.dateStr) return <div key={i} />;
                const colors = getDayColor(cell.dateStr);
                const isToday = cell.dateStr === today;
                const isSelected = cell.dateStr === selectedDate && period === 'day';
                const isFuture = cell.dateStr > today;
                return (
                  <button
                    key={cell.dateStr}
                    onClick={() => !isFuture && handleDayClick(cell.dateStr!)}
                    disabled={isFuture}
                    style={{
                      padding: '7px 2px', borderRadius: '8px', border: 'none',
                      background: isSelected ? '#0D9F6E' : isToday ? 'rgba(13,159,110,0.1)' : colors.bg,
                      cursor: isFuture ? 'default' : 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                      opacity: isFuture ? 0.25 : 1,
                      outline: isToday && !isSelected ? '2px solid rgba(13,159,110,0.35)' : 'none',
                      outlineOffset: '-1px',
                    }}
                  >
                    <span style={{
                      fontSize: '12px', fontWeight: isToday || isSelected ? 800 : 500, lineHeight: 1,
                      color: isSelected ? '#fff' : isToday ? '#0D9F6E' : colors.text,
                    }}>
                      {cell.dayNum}
                    </span>
                    {colors.dot && !isSelected && (
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: colors.dot }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
              {[
                { color: '#22c55e', label: 'Na meta' },
                { color: '#f59e0b', label: 'Parcial' },
                { color: '#ef4444', label: 'Excesso' },
                { color: '#6366f1', label: 'Sem meta' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Refeições ─── */}
          {data.meals.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>🍽 Refeições</span>
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  {data.totals.meals} {data.totals.meals === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              {/* Grouped by date */}
              {(() => {
                const groups: Map<string, typeof data.meals> = new Map();
                for (const meal of data.meals) {
                  const d = new Date(meal.createdAt).toISOString().slice(0, 10);
                  if (!groups.has(d)) groups.set(d, []);
                  groups.get(d)!.push(meal);
                }
                const todayLocal = new Date().toISOString().slice(0, 10);
                const yesterdayLocal = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

                function dayLabel(dateKey: string): string {
                  if (dateKey === todayLocal) return 'Hoje';
                  if (dateKey === yesterdayLocal) return 'Ontem';
                  const d = new Date(dateKey + 'T12:00:00');
                  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
                }

                return Array.from(groups.entries()).map(([dateKey, meals]) => (
                  <div key={dateKey} style={{ background: 'var(--bg-2)', borderRadius: '18px', border: '1.5px solid var(--border)', overflow: 'hidden' }}>
                    {/* Date header — only when multiple days */}
                    {(period !== 'day' || groups.size > 1) && (
                      <div style={{
                        padding: '8px 16px', background: 'var(--bg-3)',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)', textTransform: 'capitalize' }}>
                          {dayLabel(dateKey)}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                          {Math.round(meals.reduce((s, m) => s + m.calories, 0))} kcal
                        </span>
                      </div>
                    )}
                    {meals.map((meal, i) => {
                      const mealDate = new Date(meal.createdAt);
                      const timeStr = mealDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      const score = meal.healthScore;
                      return (
                        <div key={meal.id} style={{
                          padding: '12px 16px',
                          borderBottom: i < meals.length - 1 ? '1px solid var(--border)' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {meal.dishName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                              {timeStr}{score != null && ` · ⭐ ${score}/10`}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
                              {meal.calories} kcal
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                              P {Math.round(meal.protein)}g · C {Math.round(meal.carbs)}g · G {Math.round(meal.fat)}g
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-3)', fontSize: '13px', lineHeight: 1.6 }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🍽️</div>
              Nenhuma refeição registrada{period === 'day' ? (selectedDate !== today ? ' neste dia' : ' hoje') : ' neste período'}.
              <br />Fotografe sua próxima refeição!
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
