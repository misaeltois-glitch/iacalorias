import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, ChevronDown, ChevronUp, Lock, Settings2, ShoppingCart, Copy, Check, Loader2 } from 'lucide-react';

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
  onOpenFoodPrefs?: () => void;
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

interface ShoppingCategory {
  name: string;
  emoji: string;
  items: string[];
}

interface HistoryEntry {
  id: string;
  createdAt: string; // ISO
  weekPlan: DayPlan[];
}

const MEAL_PLAN_HISTORY_KEY = 'ia-calorias-meal-plan-history';
const MAX_HISTORY = 5;

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(MEAL_PLAN_HISTORY_KEY) ?? '[]'); }
  catch { return []; }
}

function saveToHistory(plan: DayPlan[]) {
  try {
    const history = loadHistory();
    const entry: HistoryEntry = { id: Date.now().toString(), createdAt: new Date().toISOString(), weekPlan: plan };
    const next = [entry, ...history].slice(0, MAX_HISTORY);
    localStorage.setItem(MEAL_PLAN_HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch { return []; }
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
      const plan = data.weekPlan ?? [];
      setWeekPlan(plan);
      setGenerated(true);
      if (plan.length > 0) {
        setHistory(saveToHistory(plan));
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
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '12px' }}>
                  Gerado em {new Date(historySelected.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                {historySelected.weekPlan.map((day, i) => (
                  <DayCard key={i} plan={day} />
                ))}
              </div>
            ) : (
              <div>
                {history.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '13px', padding: '32px 0' }}>
                    Nenhum cardápio gerado ainda. Gere seu primeiro cardápio!
                  </p>
                ) : (
                  history.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => setHistorySelected(entry)}
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
                    <button
                      onClick={() => setShowShopping(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px' }}
                    >
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
                        <span key={item} style={{
                          fontSize: '11px', padding: '3px 9px', borderRadius: '99px',
                          background: 'var(--bg-3)', color: 'var(--text-2)',
                          border: '1px solid var(--border)',
                        }}>{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer — regenerate + shopping list buttons */}
        {isPremium && generated && !loading && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: '8px' }}>
            <button
              onClick={() => showShopping ? setShowShopping(false) : generateShoppingList()}
              disabled={shoppingLoading}
              style={{
                flex: 1, padding: '12px',
                borderRadius: '12px', border: '1.5px solid var(--border)',
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
              onClick={generate}
              style={{
                flex: 1, padding: '12px',
                borderRadius: '12px', border: '1.5px solid var(--border)',
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
