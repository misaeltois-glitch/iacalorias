import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flame, Beef, Wheat, Droplets } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface DayData {
  date: string; // YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  mealsCount: number;
}

interface MealEntry {
  id: string;
  dishName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  createdAt: string;
}

interface Goals {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface NutritionCalendarProps {
  sessionId: string;
  goals: Goals | null;
}

const DAY_LABELS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_LABELS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function toLocalDate(isoDate: string) {
  // Parse YYYY-MM-DD as local date (not UTC)
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function dateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Circular progress ring
function Ring({ pct, color, size = 36, stroke = 3.5, children }: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(1, pct) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <foreignObject x={0} y={0} width={size} height={size}>
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </div>
      </foreignObject>
    </svg>
  );
}

export function NutritionCalendar({ sessionId, goals }: NutritionCalendarProps) {
  const today = todayStr();
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week
  const [weekDays, setWeekDays] = useState<DayData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [dayMeals, setDayMeals] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);

  // Compute week start (Monday) for weekOffset
  const getWeekStart = useCallback((offset: number) => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun..6=Sat
    const daysFromMon = (day + 6) % 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - daysFromMon + offset * 7);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }, []);

  const fetchWeek = useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const weekStart = getWeekStart(offset);
      const tzOffset = new Date().getTimezoneOffset(); // minutes behind UTC
      const dateParam = dateStr(weekStart);
      const r = await apiFetch(
        `api/analytics/summary?sessionId=${encodeURIComponent(sessionId)}&period=week&date=${dateParam}&tzOffset=${tzOffset}`
      );
      if (!r.ok) return;
      const data = await r.json();
      setWeekDays(data.days ?? []);
    } finally {
      setLoading(false);
    }
  }, [sessionId, getWeekStart]);

  const fetchDay = useCallback(async (date: string) => {
    setDayLoading(true);
    setDayMeals([]);
    try {
      const tzOffset = new Date().getTimezoneOffset();
      const r = await apiFetch(
        `api/analytics/summary?sessionId=${encodeURIComponent(sessionId)}&period=day&date=${date}&tzOffset=${tzOffset}`
      );
      if (!r.ok) return;
      const data = await r.json();
      setDayMeals(data.meals ?? []);
    } finally {
      setDayLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchWeek(weekOffset);
  }, [weekOffset, fetchWeek]);

  useEffect(() => {
    fetchDay(selectedDate);
  }, [selectedDate, fetchDay]);

  const weekStart = getWeekStart(weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const calGoal = goals?.calories ?? 2000;
  const proteinGoal = goals?.protein ?? null;
  const carbsGoal = goals?.carbs ?? null;
  const fatGoal = goals?.fat ?? null;

  const selectedDay = weekDays.find(d => d.date === selectedDate);

  function getCalColor(pct: number) {
    if (pct <= 0) return 'var(--bg-3)';
    if (pct < 0.5) return '#3B82F6';
    if (pct < 0.85) return '#F59E0B';
    if (pct <= 1.1) return '#0D9F6E';
    return '#EF4444'; // over goal
  }

  function calPct(cal: number) {
    return calGoal > 0 ? cal / calGoal : 0;
  }

  const weekLabel = (() => {
    const startMonth = MONTH_LABELS_PT[weekStart.getMonth()];
    const endMonth = MONTH_LABELS_PT[weekEnd.getMonth()];
    if (weekStart.getMonth() === weekEnd.getMonth()) {
      return `${weekStart.getDate()}–${weekEnd.getDate()} de ${startMonth}`;
    }
    return `${weekStart.getDate()} ${startMonth} – ${weekEnd.getDate()} ${endMonth}`;
  })();

  return (
    <div style={{ borderRadius: '20px', background: 'var(--bg-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>Calendário Nutricional</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>{weekLabel}</div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setWeekOffset(v => v - 1)}
            style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--bg-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={14} style={{ color: 'var(--text-2)' }} />
          </button>
          {weekOffset < 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              style={{ padding: '0 8px', height: '28px', borderRadius: '8px', background: 'var(--bg-3)', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 700, color: 'var(--text-2)' }}
            >
              Hoje
            </button>
          )}
          <button
            onClick={() => setWeekOffset(v => Math.min(0, v + 1))}
            disabled={weekOffset === 0}
            style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--bg-3)', border: 'none', cursor: weekOffset === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: weekOffset === 0 ? 0.3 : 1 }}
          >
            <ChevronRight size={14} style={{ color: 'var(--text-2)' }} />
          </button>
        </div>
      </div>

      {/* 7-day strip */}
      <div style={{ display: 'flex', gap: '4px', padding: '0 12px 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ flex: 1, minWidth: '40px', height: '76px', borderRadius: '12px', background: 'var(--bg-3)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
            ))
          : (() => {
              // Build 7 days Mon..Sun aligned to weekDays array
              const days = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(weekStart);
                d.setDate(weekStart.getDate() + i);
                const ds = dateStr(d);
                const data = weekDays.find(x => x.date === ds) ?? { date: ds, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, mealsCount: 0 };
                return data;
              });

              return days.map((day, i) => {
                const isToday = day.date === today;
                const isSelected = day.date === selectedDate;
                const isFuture = day.date > today;
                const pct = calPct(day.calories);
                const color = isFuture ? 'var(--bg-3)' : getCalColor(pct);
                const d = toLocalDate(day.date);
                const label = DAY_LABELS_PT[d.getDay()];

                return (
                  <button
                    key={day.date}
                    onClick={() => !isFuture && setSelectedDate(day.date)}
                    style={{
                      flex: 1, minWidth: '40px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      padding: '8px 4px 8px',
                      borderRadius: '12px',
                      border: `2px solid ${isSelected ? '#0D9F6E' : isToday ? 'rgba(13,159,110,0.3)' : 'transparent'}`,
                      background: isSelected ? 'rgba(13,159,110,0.1)' : isToday ? 'var(--bg-3)' : 'transparent',
                      cursor: isFuture ? 'default' : 'pointer',
                      opacity: isFuture ? 0.35 : 1,
                    }}
                  >
                    <span style={{ fontSize: '9px', fontWeight: 700, color: isSelected ? '#0D9F6E' : 'var(--text-3)' }}>
                      {label.toUpperCase()}
                    </span>
                    <Ring pct={pct} color={color} size={32} stroke={3}>
                      <span style={{ fontSize: '8px', fontWeight: 700, color: isFuture ? 'var(--text-3)' : 'var(--text-2)' }}>
                        {day.calories > 0 ? Math.round(day.calories / 100) : '·'}
                      </span>
                    </Ring>
                    <span style={{ fontSize: '8px', color: isSelected ? '#0D9F6E' : 'var(--text-3)', fontWeight: 500 }}>
                      {day.mealsCount > 0 ? `${day.mealsCount}🍽️` : isToday ? 'hoje' : '–'}
                    </span>
                  </button>
                );
              });
            })()}
      </div>

      {/* Day detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDate}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {/* Macro summary row */}
          {selectedDay && selectedDay.calories > 0 ? (
            <div style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '8px', fontWeight: 600 }}>
                {toLocalDate(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {[
                  { label: 'Kcal', value: Math.round(selectedDay.calories), goal: calGoal, color: '#F97316', icon: <Flame size={11} /> },
                  { label: 'Prot', value: Math.round(selectedDay.protein), goal: proteinGoal, color: '#EF4444', unit: 'g', icon: <Beef size={11} /> },
                  { label: 'Carb', value: Math.round(selectedDay.carbs), goal: carbsGoal, color: '#F59E0B', unit: 'g', icon: <Wheat size={11} /> },
                  { label: 'Gord', value: Math.round(selectedDay.fat), goal: fatGoal, color: '#8B5CF6', unit: 'g', icon: <Droplets size={11} /> },
                ].map(({ label, value, goal, color, unit = '', icon }) => (
                  <div key={label} style={{
                    flex: 1, padding: '8px 6px', borderRadius: '10px',
                    background: `${color}10`, border: `1px solid ${color}25`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  }}>
                    <div style={{ color, display: 'flex', alignItems: 'center', gap: '2px' }}>{icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color }}>{value}{unit}</div>
                    {goal && <div style={{ fontSize: '9px', color: 'var(--text-3)' }}>/ {goal}{unit}</div>}
                    <div style={{ fontSize: '9px', color: 'var(--text-3)', fontWeight: 600 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              {calGoal > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px' }}>
                    <span>{Math.round(calPct(selectedDay.calories) * 100)}% da meta diária</span>
                    <span>{Math.round(selectedDay.calories)} / {calGoal} kcal</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '99px', background: 'var(--bg-3)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '99px',
                      width: `${Math.min(100, calPct(selectedDay.calories) * 100)}%`,
                      background: getCalColor(calPct(selectedDay.calories)),
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Meal list */}
              {dayLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ height: '48px', borderRadius: '10px', background: 'var(--bg-3)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              ) : dayMeals.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {dayMeals.map(meal => (
                    <div key={meal.id} style={{
                      padding: '9px 12px', borderRadius: '10px',
                      background: 'var(--bg-3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {meal.dishName}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '1px' }}>
                          {Math.round(meal.protein)}g prot · {Math.round(meal.carbs)}g carb · {Math.round(meal.fat)}g gord
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#F97316' }}>{Math.round(meal.calories)}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-3)' }}>kcal</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>
                {selectedDate > today ? '📅' : '🍽️'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                {selectedDate > today
                  ? toLocalDate(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
                  : `Nenhuma refeição registrada em ${toLocalDate(selectedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
