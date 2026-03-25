import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Flame, Zap, Wheat, Droplets, Leaf, CalendarDays, Trophy, Lock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

type Period = 'week' | 'month';

interface AnalyticsSummary {
  period: Period;
  periodStart: string;
  periodEnd: string;
  daysInPeriod: number;
  daysWithData: number;
  totals: { calories: number; protein: number; carbs: number; fat: number; fiber: number; meals: number };
  dailyAvg: { calories: number; protein: number; carbs: number; fat: number; fiber: number } | null;
  days: { date: string; calories: number; protein: number; carbs: number; fat: number; fiber: number; mealsCount: number }[];
  streak: number;
  daysOnTarget: number;
  goals: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber: number | null; mealsPerDay: number } | null;
  meals: { id: string; dishName: string; calories: number; protein: number; carbs: number; fat: number; fiber: number | null; healthScore: number | null; createdAt: string }[];
  isPremium: boolean;
  requiresUpgrade: boolean;
}

interface AnalyticsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  isPremium: boolean;
  onUpgrade: () => void;
}

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const DAY_LABELS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatDateLabel(dateStr: string, period: Period): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  if (period === 'week') return DAY_LABELS_SHORT[d.getUTCDay()];
  return String(d.getUTCDate());
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  const day = d.getDate().toString().padStart(2, '0');
  const mon = MONTH_PT[d.getMonth()];
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${mon} ${hh}:${mm}`;
}

function MacroBar({ label, emoji, color, current, goal, unit }: {
  label: string; emoji: string; color: string;
  current: number; goal: number | null; unit: string;
}) {
  const pct = goal && goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : null;
  const isOver = pct !== null && pct > 110;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>{emoji}</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: isOver ? '#ef4444' : color }}>
            {unit === 'kcal' ? Math.round(current) : current.toFixed(0)}{unit}
          </span>
          {goal && (
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              / {unit === 'kcal' ? goal : goal.toFixed(0)}{unit}
            </span>
          )}
          {pct !== null && (
            <span style={{
              fontSize: '10px', fontWeight: 700,
              padding: '1px 5px', borderRadius: '6px',
              background: isOver ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
              color: isOver ? '#ef4444' : '#22c55e',
            }}>
              {pct}%
            </span>
          )}
        </div>
      </div>
      {pct !== null && (
        <div style={{ height: '5px', borderRadius: '99px', background: 'var(--bg-3)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(pct, 100)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: '99px',
              background: isOver ? '#ef4444' : color,
            }}
          />
        </div>
      )}
    </div>
  );
}

function SkeletonBlock({ h = 20, w = '100%', r = 8 }: { h?: number; w?: string | number; r?: number }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: 'var(--bg-3)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

const CustomBar = (props: any) => {
  const { x, y, width, height, goalValue, value } = props;
  if (!height || height <= 0) return null;
  const isOver = goalValue && value > goalValue * 1.1;
  const fill = isOver ? '#ef4444' : '#6366f1';
  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} ry={3} />;
};

const CustomTooltip = ({ active, payload, label, goalValue }: any) => {
  if (!active || !payload?.length) return null;
  const cal = payload[0]?.value ?? 0;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '8px 12px',
      fontSize: '12px',
      color: 'var(--text-1)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    }}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      <div style={{ color: '#6366f1' }}>{Math.round(cal)} kcal</div>
      {goalValue && <div style={{ color: 'var(--text-3)' }}>Meta: {goalValue} kcal</div>}
    </div>
  );
};

export function AnalyticsPanel({ isOpen, onClose, sessionId, isPremium, onUpgrade }: AnalyticsPanelProps) {
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (p: Period) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const r = await fetch(`${BASE}api/analytics/summary?sessionId=${sessionId}&period=${p}`, {
        headers: authHeaders(),
      });
      if (r.ok) setData(await r.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (isOpen) fetchData(period);
  }, [isOpen, period, fetchData]);

  const handlePeriod = (p: Period) => {
    setPeriod(p);
  };

  const chartData = (data?.days ?? []).map(d => ({
    ...d,
    label: formatDateLabel(d.date, period),
  }));

  const goalCalories = data?.goals?.calories ?? null;
  const hasData = (data?.totals?.meals ?? 0) > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="analytics-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.55)',
              zIndex: 200,
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Drawer */}
          <motion.div
            key="analytics-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '100%', maxWidth: '480px',
              background: 'var(--bg-1)',
              zIndex: 201,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: '10px',
                  background: 'rgba(99,102,241,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TrendingUp style={{ width: '17px', height: '17px', color: '#6366f1' }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Análises</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Seu histórico nutricional</div>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-2)',
                }}
              >
                <X style={{ width: '15px', height: '15px' }} />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Period selector */}
              <div style={{
                display: 'flex', gap: '6px',
                background: 'var(--bg-3)', borderRadius: '10px', padding: '3px',
              }}>
                {(['week', 'month'] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePeriod(p)}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px',
                      border: 'none', cursor: 'pointer',
                      fontSize: '13px', fontWeight: 600,
                      transition: 'all 0.15s',
                      background: period === p ? 'var(--bg-surface)' : 'transparent',
                      color: period === p ? 'var(--text-1)' : 'var(--text-3)',
                      boxShadow: period === p ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                    }}
                  >
                    {p === 'week' ? 'Esta semana' : 'Este mês'}
                  </button>
                ))}
              </div>

              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <SkeletonBlock h={80} />
                  <SkeletonBlock h={160} />
                  <SkeletonBlock h={100} />
                  <SkeletonBlock h={120} />
                </div>
              )}

              {!loading && !isPremium && (
                <FreemiumTeaser onUpgrade={onUpgrade} data={data} />
              )}

              {!loading && isPremium && !hasData && (
                <EmptyState />
              )}

              {!loading && isPremium && hasData && data && (
                <>
                  {/* Stats row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <StatCard
                      icon={<CalendarDays style={{ width: '14px', height: '14px' }} />}
                      label="Dias com refeições"
                      value={`${data.daysWithData} de ${data.daysInPeriod}`}
                      color="#6366f1"
                    />
                    <StatCard
                      icon={<Trophy style={{ width: '14px', height: '14px' }} />}
                      label={data.goals?.calories ? 'Dias dentro da meta' : 'Total de refeições'}
                      value={data.goals?.calories ? `${data.daysOnTarget} de ${data.daysWithData}` : String(data.totals.meals)}
                      color="#f59e0b"
                    />
                    {data.streak > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <StatCard
                          icon={<Flame style={{ width: '14px', height: '14px' }} />}
                          label="Sequência atual"
                          value={`${data.streak} dia${data.streak !== 1 ? 's' : ''} consecutivos`}
                          color="#f97316"
                          highlight
                        />
                      </div>
                    )}
                  </div>

                  {/* Bar chart */}
                  <div style={{
                    background: 'var(--bg-2)',
                    borderRadius: '16px', border: '1.5px solid var(--border)',
                    padding: '16px',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '12px' }}>
                      Calorias por dia
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={chartData} barCategoryGap="30%" margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: 'var(--text-3)' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                        />
                        <Tooltip content={<CustomTooltip goalValue={goalCalories} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        {goalCalories && (
                          <ReferenceLine y={goalCalories} stroke="#6366f1" strokeDasharray="4 3" strokeWidth={1.5} />
                        )}
                        <Bar dataKey="calories" radius={[3, 3, 0, 0]} shape={<CustomBar goalValue={goalCalories} />}>
                          {chartData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={goalCalories && entry.calories > goalCalories * 1.1 ? '#ef4444' : '#6366f1'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {goalCalories && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                        <div style={{ width: '20px', height: '2px', background: '#6366f1', borderRadius: '1px', borderStyle: 'dashed' }} />
                        <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Meta diária: {goalCalories} kcal</span>
                      </div>
                    )}
                  </div>

                  {/* Macro progress cards */}
                  <div style={{
                    background: 'var(--bg-2)',
                    borderRadius: '16px', border: '1.5px solid var(--border)',
                    padding: '16px',
                    display: 'flex', flexDirection: 'column', gap: '14px',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>
                      Macros totais do período
                    </div>
                    {[
                      { label: 'Calorias', emoji: '🔥', color: '#f97316', key: 'calories' as const, unit: 'kcal' },
                      { label: 'Proteína', emoji: '🥩', color: '#22c55e', key: 'protein' as const, unit: 'g' },
                      { label: 'Carboidratos', emoji: '🌾', color: '#f59e0b', key: 'carbs' as const, unit: 'g' },
                      { label: 'Gorduras', emoji: '🫒', color: '#ef4444', key: 'fat' as const, unit: 'g' },
                      { label: 'Fibras', emoji: '🥦', color: '#06b6d4', key: 'fiber' as const, unit: 'g' },
                    ].map(({ label, emoji, color, key, unit }) => {
                      const current = key === 'calories' ? data.totals[key] : (data.totals[key] as number);
                      const dailyGoal = data.goals?.[key] ?? null;
                      const periodGoal = dailyGoal && data.daysInPeriod ? dailyGoal * data.daysInPeriod : null;
                      return (
                        <MacroBar
                          key={key}
                          label={label}
                          emoji={emoji}
                          color={color}
                          current={current}
                          goal={periodGoal}
                          unit={unit}
                        />
                      );
                    })}
                  </div>

                  {/* Daily averages */}
                  {data.dailyAvg && (
                    <div style={{
                      background: 'var(--bg-2)',
                      borderRadius: '16px', border: '1.5px solid var(--border)',
                      padding: '16px',
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '12px' }}>
                        Média diária
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        {[
                          { label: '🔥 Calorias', value: `${data.dailyAvg.calories}kcal`, color: '#f97316' },
                          { label: '🥩 Proteína', value: `${data.dailyAvg.protein.toFixed(0)}g`, color: '#22c55e' },
                          { label: '🌾 Carbs', value: `${data.dailyAvg.carbs.toFixed(0)}g`, color: '#f59e0b' },
                          { label: '🫒 Gordura', value: `${data.dailyAvg.fat.toFixed(0)}g`, color: '#ef4444' },
                          { label: '🥦 Fibras', value: `${data.dailyAvg.fiber.toFixed(0)}g`, color: '#06b6d4' },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{
                            background: 'var(--bg-3)', borderRadius: '10px',
                            padding: '10px', textAlign: 'center',
                          }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px' }}>{label}</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meals list */}
                  {data.meals.length > 0 && (
                    <div style={{
                      background: 'var(--bg-2)',
                      borderRadius: '16px', border: '1.5px solid var(--border)',
                      padding: '16px',
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '12px' }}>
                        Refeições do período
                        <span style={{
                          marginLeft: '8px', fontSize: '10px', fontWeight: 600,
                          padding: '2px 7px', borderRadius: '99px',
                          background: 'var(--accent-glow)', color: 'var(--accent)',
                        }}>
                          {data.totals.meals}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {data.meals.map(meal => (
                          <div key={meal.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 12px', borderRadius: '10px',
                            background: 'var(--bg-3)',
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '13px', fontWeight: 600, color: 'var(--text-1)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {meal.dishName}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                                {formatDateTime(meal.createdAt)}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0, marginLeft: '12px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f97316' }}>
                                {meal.calories} kcal
                              </span>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <span style={{ fontSize: '10px', color: '#22c55e' }}>{meal.protein.toFixed(0)}g P</span>
                                <span style={{ fontSize: '10px', color: '#f59e0b' }}>{meal.carbs.toFixed(0)}g C</span>
                                <span style={{ fontSize: '10px', color: '#ef4444' }}>{meal.fat.toFixed(0)}g G</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function StatCard({ icon, label, value, color, highlight = false }: {
  icon: React.ReactNode; label: string; value: string; color: string; highlight?: boolean;
}) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: '12px',
      background: highlight ? `${color}18` : 'var(--bg-2)',
      border: `1.5px solid ${highlight ? `${color}40` : 'var(--border)'}`,
      display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <div style={{
        width: '30px', height: '30px', borderRadius: '8px',
        background: `${color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>{value}</div>
      </div>
    </div>
  );
}

function FreemiumTeaser({ onUpgrade, data }: { onUpgrade: () => void; data: AnalyticsSummary | null }) {
  const hasSomeData = (data?.totals?.meals ?? 0) > 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {hasSomeData && data && (
        <div style={{
          background: 'var(--bg-2)', borderRadius: '14px',
          border: '1.5px solid var(--border)', padding: '14px',
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '8px' }}>Prévia — últimas 7 dias</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { label: '🔥 Calorias', value: `${Math.round(data.totals.calories)} kcal` },
              { label: '🥩 Proteína', value: `${data.totals.protein.toFixed(0)}g` },
              { label: '🌾 Carbs', value: `${data.totals.carbs.toFixed(0)}g` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{label}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.1) 100%)',
        borderRadius: '16px',
        border: '1.5px solid rgba(99,102,241,0.3)',
        padding: '24px 20px',
        textAlign: 'center',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: 'rgba(99,102,241,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Lock style={{ width: '22px', height: '22px', color: '#6366f1' }} />
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>
          Análises completas
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '18px' }}>
          Gráficos de barras diários, progresso de macros, streak de dias dentro da meta e histórico completo de refeições.
        </p>
        <button
          onClick={onUpgrade}
          style={{
            padding: '11px 28px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: '#fff', border: 'none', fontWeight: 700,
            fontSize: '14px', cursor: 'pointer',
          }}
        >
          Ver planos →
        </button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ fontSize: '48px', marginBottom: '14px' }}>📊</div>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>
        Nenhuma refeição no período
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>
        Fotografe suas refeições para ver análises aqui.
      </p>
    </div>
  );
}
