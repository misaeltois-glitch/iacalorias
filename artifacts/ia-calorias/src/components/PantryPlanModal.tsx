import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, RefreshCw, Loader2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { BASE, authHeaders } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

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
interface PantryCategory {
  id: string;
  emoji: string;
  label: string;
  required: boolean;
  items: string[];
}

// ── Pantry catalog ─────────────────────────────────────────────────────────────

const PANTRY_CATEGORIES: PantryCategory[] = [
  {
    id: 'protein', emoji: '🥩', label: 'Proteínas', required: true,
    items: ['Peito de frango', 'Coxa de frango', 'Frango moído', 'Ovo', 'Carne moída', 'Patinho', 'Acém', 'Contrafilé', 'Atum em lata', 'Sardinha em lata', 'Tilápia', 'Salmão', 'Feijão carioca', 'Feijão preto', 'Lentilha', 'Grão-de-bico', 'Peito de peru', 'Presunto', 'Linguiça'],
  },
  {
    id: 'carbs', emoji: '🌾', label: 'Carboidratos', required: true,
    items: ['Arroz branco', 'Arroz integral', 'Macarrão espaguete', 'Macarrão parafuso', 'Macarrão instantâneo', 'Batata-doce', 'Batata inglesa', 'Mandioca (aipim)', 'Pão integral', 'Pão de forma', 'Pão francês', 'Aveia', 'Tapioca', 'Cuscuz (milho)', 'Quinoa', 'Inhame'],
  },
  {
    id: 'veggies', emoji: '🥦', label: 'Legumes & Verduras', required: true,
    items: ['Alface', 'Tomate', 'Cebola', 'Alho', 'Cenoura', 'Brócolis', 'Abobrinha', 'Espinafre', 'Couve', 'Pimentão', 'Pepino', 'Beterraba', 'Repolho', 'Vagem', 'Berinjela', 'Chuchu', 'Milho verde', 'Quiabo', 'Cará'],
  },
  {
    id: 'fruits', emoji: '🍌', label: 'Frutas', required: false,
    items: ['Banana', 'Maçã', 'Laranja', 'Mamão', 'Morango', 'Abacaxi', 'Uva', 'Melancia', 'Limão', 'Manga', 'Melão', 'Kiwi', 'Pêra', 'Goiaba'],
  },
  {
    id: 'dairy', emoji: '🥛', label: 'Laticínios', required: false,
    items: ['Leite integral', 'Leite desnatado', 'Iogurte natural', 'Queijo minas', 'Queijo prato', 'Requeijão', 'Manteiga', 'Cream cheese', 'Leite de coco'],
  },
  {
    id: 'fats', emoji: '🫒', label: 'Gorduras & Temperos', required: false,
    items: ['Azeite de oliva', 'Óleo de coco', 'Abacate', 'Amendoim', 'Castanha-de-caju', 'Castanha-do-pará', 'Coentro', 'Cheiro-verde', 'Orégano', 'Curry', 'Páprica', 'Cominho', 'Açafrão', 'Alecrim', 'Shoyu'],
  },
  {
    id: 'pantry', emoji: '🧂', label: 'Mercearia', required: false,
    items: ['Molho de tomate', 'Extrato de tomate', 'Ervilha (lata)', 'Milho (lata)', 'Farinha de mandioca', 'Farofa pronta', 'Caldo de galinha', 'Caldo de carne', 'Vinagre', 'Mel', 'Amendoim torrado', 'Leite condensado', 'Achocolatado'],
  },
];

const DAY_LABELS: Record<string, string> = {
  'Segunda-feira': 'SEG', 'Terça-feira': 'TER', 'Quarta-feira': 'QUA',
  'Quinta-feira': 'QUI', 'Sexta-feira': 'SEX', 'Sábado': 'SÁB', 'Domingo': 'DOM',
};
const DAY_EMOJIS: Record<string, string> = {
  'Segunda-feira': '☀️', 'Terça-feira': '🌤️', 'Quarta-feira': '⚡',
  'Quinta-feira': '🌿', 'Sexta-feira': '🎉', 'Sábado': '😴', 'Domingo': '🌞',
};

const PANTRY_KEY = 'ia-calorias-pantry';
const PANTRY_PLAN_KEY = 'ia-calorias-pantry-plan';

// ── Sub-components ─────────────────────────────────────────────────────────────

function MacroChip({ value, unit, color }: { value: number; unit: string; color: string }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '99px',
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>{Math.round(value)}{unit}</span>
  );
}

function MealRow({ meal }: { meal: MealItem }) {
  return (
    <div style={{ padding: '9px 12px', borderRadius: '12px', background: 'var(--bg-3)', marginBottom: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{meal.mealType}</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>{meal.name}</div>
          {meal.description && <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px', lineHeight: 1.4 }}>{meal.description}</div>}
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right', fontSize: '15px', fontWeight: 800, color: '#F97316', lineHeight: 1 }}>
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

function WeekStrip({ weekPlan, activeIndex, onSelect }: { weekPlan: DayPlan[]; activeIndex: number; onSelect: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', padding: '0 20px 0', scrollbarWidth: 'none' }}>
      {weekPlan.map((day, i) => {
        const label = DAY_LABELS[day.day] ?? day.day.slice(0, 3).toUpperCase();
        const isSelected = i === activeIndex;
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            style={{
              flexShrink: 0, minWidth: '46px', padding: '8px 4px',
              borderRadius: '12px', border: `1.5px solid ${isSelected ? '#0D9F6E' : 'var(--border)'}`,
              background: isSelected ? 'rgba(13,159,110,0.12)' : 'var(--bg-2)',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 700, color: isSelected ? '#0D9F6E' : 'var(--text-3)' }}>{label}</span>
            <span style={{ fontSize: '14px', lineHeight: 1 }}>{DAY_EMOJIS[day.day] ?? '📅'}</span>
            <span style={{ fontSize: '9px', color: isSelected ? '#0D9F6E' : 'var(--text-2)', fontWeight: 600 }}>
              {Math.round(day.totalCalories / 100) / 10}k
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface PantryPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export function PantryPlanModal({ isOpen, onClose, sessionId }: PantryPlanModalProps) {
  const [view, setView] = useState<'pantry' | 'plan'>('pantry');
  const [selected, setSelected] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PANTRY_KEY) ?? '[]'); } catch { return []; }
  });
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>(() => {
    try { return JSON.parse(localStorage.getItem(PANTRY_PLAN_KEY) ?? '[]'); } catch { return []; }
  });
  const [openCategory, setOpenCategory] = useState<string>('protein'); // first open by default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  // Persist pantry selection
  useEffect(() => {
    try { localStorage.setItem(PANTRY_KEY, JSON.stringify(selected)); } catch {}
  }, [selected]);

  // If we have a saved plan, go straight to plan view on open
  useEffect(() => {
    if (isOpen && weekPlan.length > 0) setView('plan');
    else if (isOpen) setView('pantry');
  }, [isOpen]);

  const toggle = useCallback((item: string) => {
    setSelected(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  }, []);

  const selectAll = useCallback((category: PantryCategory) => {
    setSelected(prev => {
      const allIn = category.items.every(i => prev.includes(i));
      if (allIn) return prev.filter(i => !category.items.includes(i));
      const next = [...prev];
      for (const i of category.items) { if (!next.includes(i)) next.push(i); }
      return next;
    });
  }, []);

  // Check if required categories have at least 1 item
  const essentialsMet = PANTRY_CATEGORIES
    .filter(c => c.required)
    .every(c => c.items.some(i => selected.includes(i)));

  const generate = useCallback(async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${BASE}api/meal-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ sessionId, pantryIngredients: selected }),
      });
      if (!r.ok) throw new Error('failed');
      const data = await r.json();
      const plan: DayPlan[] = data.weekPlan ?? [];
      setWeekPlan(plan);
      setActiveDayIndex(0);
      try { localStorage.setItem(PANTRY_PLAN_KEY, JSON.stringify(plan)); } catch {}
      setView('plan');
    } catch {
      setError('Erro ao gerar o plano. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, selected]);

  if (!isOpen) return null;

  const requiredCategories = PANTRY_CATEGORIES.filter(c => c.required);
  const optionalCategories = PANTRY_CATEGORIES.filter(c => !c.required);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
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
          padding: '16px 20px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '12px',
          flexShrink: 0,
        }}>
          {view === 'plan' && (
            <button
              onClick={() => setView('pantry')}
              style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <ArrowLeft size={15} style={{ color: 'var(--text-2)' }} />
            </button>
          )}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
              {view === 'pantry' ? '🛒 Minha Despensa' : '📅 Plano Semanal'}
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '2px 0 0' }}>
              {view === 'pantry'
                ? `${selected.length} item${selected.length !== 1 ? 'ns' : ''} selecionado${selected.length !== 1 ? 's' : ''}`
                : 'Seg → Dom com o que você tem em casa'}
            </p>
          </div>
          {view === 'plan' && (
            <button
              onClick={generate}
              disabled={loading}
              title="Regenerar plano"
              style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <RefreshCw size={14} style={{ color: 'var(--text-2)', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <X size={16} style={{ color: 'var(--text-2)' }} />
          </button>
        </div>

        {/* Week strip (plan view) */}
        {view === 'plan' && weekPlan.length > 0 && (
          <div style={{ padding: '12px 0 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <WeekStrip weekPlan={weekPlan} activeIndex={activeDayIndex} onSelect={setActiveDayIndex} />
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 8px' }}>

          {/* ── PANTRY VIEW ── */}
          {view === 'pantry' && (
            <div>
              {/* Required categories */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.5px', marginBottom: '8px' }}>
                CATEGORIAS ESSENCIAIS
              </div>
              {requiredCategories.map(cat => (
                <CategorySection
                  key={cat.id}
                  cat={cat}
                  selected={selected}
                  isOpen={openCategory === cat.id}
                  onToggleOpen={() => setOpenCategory(openCategory === cat.id ? '' : cat.id)}
                  onToggleItem={toggle}
                  onSelectAll={() => selectAll(cat)}
                />
              ))}

              {/* Optional categories */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.5px', marginTop: '16px', marginBottom: '8px' }}>
                CATEGORIAS COMPLEMENTARES
              </div>
              {optionalCategories.map(cat => (
                <CategorySection
                  key={cat.id}
                  cat={cat}
                  selected={selected}
                  isOpen={openCategory === cat.id}
                  onToggleOpen={() => setOpenCategory(openCategory === cat.id ? '' : cat.id)}
                  onToggleItem={toggle}
                  onSelectAll={() => selectAll(cat)}
                />
              ))}

              {error && (
                <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '13px', color: '#EF4444' }}>
                  {error}
                </div>
              )}

              {/* Essentials warning */}
              {!essentialsMet && selected.length > 0 && (
                <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '12px', color: '#D97706' }}>
                  Selecione ao menos 1 item em cada categoria essencial (Proteínas, Carboidratos e Legumes)
                </div>
              )}

              <div style={{ height: '80px' }} /> {/* Space for footer */}
            </div>
          )}

          {/* ── PLAN VIEW ── */}
          {view === 'plan' && (
            <div>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '14px', background: 'rgba(13,159,110,0.08)', border: '1px solid rgba(13,159,110,0.15)', marginBottom: '8px' }}>
                    <Loader2 size={18} style={{ color: '#0D9F6E', animation: 'spin 1s linear infinite' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0D9F6E' }}>Montando plano da sua despensa...</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{selected.length} ingredientes selecionados</div>
                    </div>
                  </div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} style={{ height: '56px', borderRadius: '12px', background: 'var(--bg-3)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }} />
                  ))}
                </div>
              ) : weekPlan.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '16px' }}>Nenhum plano gerado ainda</div>
                  <button onClick={generate} style={{ padding: '12px 28px', borderRadius: '14px', background: 'linear-gradient(135deg, #0D9F6E, #057A55)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                    Gerar plano
                  </button>
                </div>
              ) : weekPlan[activeDayIndex] ? (
                <DayDetail plan={weekPlan[activeDayIndex]} />
              ) : null}
            </div>
          )}
        </div>

        {/* Footer — pantry view */}
        {view === 'pantry' && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-surface)' }}>
            <button
              onClick={generate}
              disabled={loading || !essentialsMet || selected.length === 0}
              style={{
                width: '100%', padding: '14px',
                borderRadius: '14px', border: 'none',
                background: loading || !essentialsMet || selected.length === 0
                  ? 'var(--bg-3)'
                  : 'linear-gradient(135deg, #0D9F6E, #057A55)',
                color: loading || !essentialsMet || selected.length === 0 ? 'var(--text-3)' : '#fff',
                fontSize: '14px', fontWeight: 800,
                cursor: loading || !essentialsMet || selected.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: loading || !essentialsMet || selected.length === 0 ? 'none' : '0 4px 20px rgba(13,159,110,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Gerando plano...</>
                : <><ShoppingBag size={16} /> Gerar Plano Semanal ({selected.length} itens)</>}
            </button>
          </div>
        )}
      </motion.div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── CategorySection ────────────────────────────────────────────────────────────

function CategorySection({ cat, selected, isOpen, onToggleOpen, onToggleItem, onSelectAll }: {
  cat: PantryCategory;
  selected: string[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onToggleItem: (item: string) => void;
  onSelectAll: () => void;
}) {
  const count = cat.items.filter(i => selected.includes(i)).length;
  const allSelected = count === cat.items.length;

  return (
    <div style={{
      borderRadius: '14px', border: `1px solid ${count > 0 && cat.required ? 'rgba(13,159,110,0.3)' : 'var(--border)'}`,
      overflow: 'hidden', marginBottom: '8px',
      background: count > 0 && cat.required ? 'rgba(13,159,110,0.03)' : 'var(--bg-2)',
    }}>
      {/* Header */}
      <button
        onClick={onToggleOpen}
        style={{
          width: '100%', padding: '12px 14px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '18px' }}>{cat.emoji}</span>
        <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>{cat.label}</span>
        {cat.required && (
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '99px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', flexShrink: 0 }}>
            essencial
          </span>
        )}
        {count > 0 && (
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: 'rgba(13,159,110,0.12)', color: '#0D9F6E', border: '1px solid rgba(13,159,110,0.2)', flexShrink: 0 }}>
            {count}
          </span>
        )}
        <span style={{ color: 'var(--text-3)', display: 'flex', flexShrink: 0 }}>
          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {/* Items */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '4px 14px 14px', borderTop: '1px solid var(--border)' }}>
              {/* Select all toggle */}
              <button
                onClick={onSelectAll}
                style={{
                  marginTop: '10px', marginBottom: '8px',
                  padding: '4px 12px', borderRadius: '99px',
                  background: allSelected ? 'rgba(13,159,110,0.12)' : 'var(--bg-3)',
                  border: `1px solid ${allSelected ? 'rgba(13,159,110,0.3)' : 'var(--border)'}`,
                  color: allSelected ? '#0D9F6E' : 'var(--text-2)',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {allSelected ? '✓ Todos selecionados' : 'Selecionar todos'}
              </button>

              {/* Item chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {cat.items.map(item => {
                  const isOn = selected.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => onToggleItem(item)}
                      style={{
                        padding: '5px 12px', borderRadius: '99px',
                        background: isOn ? 'rgba(13,159,110,0.15)' : 'var(--bg-3)',
                        border: `1.5px solid ${isOn ? 'rgba(13,159,110,0.4)' : 'var(--border)'}`,
                        fontSize: '12px', fontWeight: isOn ? 700 : 500,
                        color: isOn ? '#0D9F6E' : 'var(--text-2)',
                        cursor: 'pointer', transition: 'all 0.12s',
                      }}
                    >
                      {isOn ? '✓ ' : ''}{item}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── DayDetail ──────────────────────────────────────────────────────────────────

function DayDetail({ plan }: { plan: DayPlan }) {
  return (
    <motion.div
      key={plan.day}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '22px' }}>{DAY_EMOJIS[plan.day] ?? '📅'}</span>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>{plan.day}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            {plan.meals.length} refeições · {Math.round(plan.totalCalories)} kcal · {Math.round(plan.totalProtein)}g prot
          </div>
        </div>
      </div>

      {plan.meals.map((meal, i) => (
        <MealRow key={i} meal={meal} />
      ))}

      {/* Day macro summary */}
      <div style={{
        marginTop: '10px', padding: '10px 14px', borderRadius: '12px',
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap',
      }}>
        {[
          { label: 'Proteína', value: plan.meals.reduce((s, m) => s + m.protein, 0), unit: 'g', color: '#EF4444' },
          { label: 'Carbos', value: plan.meals.reduce((s, m) => s + m.carbs, 0), unit: 'g', color: '#F59E0B' },
          { label: 'Gordura', value: plan.meals.reduce((s, m) => s + m.fat, 0), unit: 'g', color: '#8B5CF6' },
        ].map(({ label, value, unit, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color }}>{Math.round(value)}{unit}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
