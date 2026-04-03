import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';

export const FOOD_PREFS_KEY = 'ia-calorias-food-prefs';

export interface MealFoodPrefs {
  breakfast: string[];
  morningSnack: string[];
  lunch: string[];
  afternoonSnack: string[];
  dinner: string[];
}

const MEALS = [
  {
    key: 'breakfast' as keyof MealFoodPrefs,
    label: 'Café da Manhã',
    emoji: '☕',
    foods: [
      { emoji: '🥖', name: 'Pão + Frango' },
      { emoji: '🍳', name: 'Pão + Ovo' },
      { emoji: '🧀', name: 'Pão + Queijo' },
      { emoji: '🥪', name: 'Pão + Presunto e Queijo' },
      { emoji: '🫓', name: 'Tapioca de Queijo' },
      { emoji: '🌮', name: 'Tapioca de Frango' },
      { emoji: '🌽', name: 'Cuscuz + Ovo' },
      { emoji: '🧇', name: 'Pão de Queijo' },
      { emoji: '🍳', name: 'Omelete' },
      { emoji: '🍎', name: 'Maçã' },
      { emoji: '🍌', name: 'Banana' },
      { emoji: '🥭', name: 'Mamão' },
      { emoji: '☕', name: 'Café + Leite Desnatado' },
      { emoji: '☕', name: 'Café' },
      { emoji: '🥛', name: 'Iogurte' },
    ],
  },
  {
    key: 'morningSnack' as keyof MealFoodPrefs,
    label: 'Lanche da Manhã',
    emoji: '🍎',
    optional: true,
    foods: [
      { emoji: '🍌', name: 'Banana' },
      { emoji: '🍎', name: 'Maçã' },
      { emoji: '🥛', name: 'Iogurte Grego' },
      { emoji: '🥜', name: 'Mix de Castanhas' },
      { emoji: '🍊', name: 'Laranja' },
      { emoji: '🫐', name: 'Frutas Vermelhas' },
      { emoji: '🧇', name: 'Barra de Proteína' },
      { emoji: '🥤', name: 'Whey Protein' },
      { emoji: '🌰', name: 'Pasta de Amendoim' },
      { emoji: '🫙', name: 'Queijo Cottage' },
    ],
  },
  {
    key: 'lunch' as keyof MealFoodPrefs,
    label: 'Almoço',
    emoji: '🍽️',
    foods: [
      { emoji: '🍚', name: 'Arroz' },
      { emoji: '🫘', name: 'Feijão Preto' },
      { emoji: '🌽', name: 'Cuscuz' },
      { emoji: '🍝', name: 'Macarrão' },
      { emoji: '🍠', name: 'Batata Doce' },
      { emoji: '🥔', name: 'Mandioca' },
      { emoji: '🥔', name: 'Inhame' },
      { emoji: '🥔', name: 'Batata Inglesa' },
      { emoji: '🎃', name: 'Abóbora' },
      { emoji: '🍗', name: 'Frango Grelhado' },
      { emoji: '🥩', name: 'Carne Assada' },
      { emoji: '🥩', name: 'Carne Grelhada' },
      { emoji: '🥩', name: 'Carne de Porco Lombo' },
      { emoji: '🫀', name: 'Patinho Moído' },
      { emoji: '🐟', name: 'Peixe' },
      { emoji: '🥗', name: 'Salada de Alface e Tomate' },
      { emoji: '🥬', name: 'Salada de Alface' },
      { emoji: '🥗', name: 'Salada de Legumes' },
    ],
  },
  {
    key: 'afternoonSnack' as keyof MealFoodPrefs,
    label: 'Lanche da Tarde',
    emoji: '🍪',
    foods: [
      { emoji: '🥖', name: 'Pão + Frango' },
      { emoji: '🍳', name: 'Pão + Ovo' },
      { emoji: '🧀', name: 'Pão + Queijo' },
      { emoji: '🫓', name: 'Tapioca de Queijo' },
      { emoji: '🌽', name: 'Cuscuz + Ovo' },
      { emoji: '🍳', name: 'Omelete' },
      { emoji: '🍎', name: 'Maçã' },
      { emoji: '🍌', name: 'Banana' },
      { emoji: '🥛', name: 'Iogurte' },
      { emoji: '🥜', name: 'Mix de Castanhas' },
      { emoji: '🫙', name: 'Queijo Cottage' },
      { emoji: '🥤', name: 'Whey Protein' },
    ],
  },
  {
    key: 'dinner' as keyof MealFoodPrefs,
    label: 'Janta',
    emoji: '🌙',
    foods: [
      { emoji: '🍚', name: 'Arroz' },
      { emoji: '🫘', name: 'Feijão Preto' },
      { emoji: '🍠', name: 'Batata Doce' },
      { emoji: '🍝', name: 'Macarrão' },
      { emoji: '🥔', name: 'Mandioca' },
      { emoji: '🍗', name: 'Frango Grelhado' },
      { emoji: '🥩', name: 'Carne Assada' },
      { emoji: '🥩', name: 'Carne Grelhada' },
      { emoji: '🐟', name: 'Peixe' },
      { emoji: '🍳', name: 'Omelete' },
      { emoji: '🥗', name: 'Salada de Legumes' },
      { emoji: '🥬', name: 'Salada de Alface' },
      { emoji: '🥣', name: 'Sopa Leve' },
      { emoji: '🫙', name: 'Iogurte Grego' },
    ],
  },
];

function loadPrefs(): MealFoodPrefs {
  try {
    return JSON.parse(localStorage.getItem(FOOD_PREFS_KEY) ?? '{}');
  } catch {
    return { breakfast: [], morningSnack: [], lunch: [], afternoonSnack: [], dinner: [] };
  }
}

interface MealFoodPrefsModalProps {
  onClose: () => void;
}

export function MealFoodPrefsModal({ onClose }: MealFoodPrefsModalProps) {
  const [prefs, setPrefs] = useState<MealFoodPrefs>(() => ({
    breakfast: [], morningSnack: [], lunch: [], afternoonSnack: [], dinner: [],
    ...loadPrefs(),
  }));
  const [activeMeal, setActiveMeal] = useState(0);

  const toggle = (meal: keyof MealFoodPrefs, food: string) => {
    setPrefs(prev => {
      const list = prev[meal];
      return {
        ...prev,
        [meal]: list.includes(food) ? list.filter(f => f !== food) : [...list, food],
      };
    });
  };

  const handleSave = () => {
    localStorage.setItem(FOOD_PREFS_KEY, JSON.stringify(prefs));
    onClose();
  };

  const totalSelected = Object.values(prefs).flat().length;
  const meal = MEALS[activeMeal];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--bg)',
          borderRadius: '28px 28px 0 0',
          maxHeight: '92dvh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 18px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 14 }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
            <button
              onClick={onClose}
              style={{
                position: 'absolute', right: 0,
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--bg-2)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-2)',
              }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 3px' }}>
              🥗 Personalizar meu cardápio
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>
              Selecione os alimentos que você costuma comer em cada refeição
            </p>
          </div>

          {/* Meal tabs */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
            {MEALS.map((m, i) => {
              const count = prefs[m.key].length;
              return (
                <button
                  key={m.key}
                  onClick={() => setActiveMeal(i)}
                  style={{
                    flexShrink: 0, padding: '6px 12px', borderRadius: 99,
                    border: `1.5px solid ${activeMeal === i ? 'var(--accent)' : 'var(--border)'}`,
                    background: activeMeal === i ? 'var(--accent-glow)' : 'var(--bg-2)',
                    color: activeMeal === i ? 'var(--accent)' : 'var(--text-2)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}{m.optional ? ' (Opc.)' : ''}</span>
                  {count > 0 && (
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: 'var(--accent)', color: '#fff',
                      fontSize: 9, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Food grid */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 18px 100px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
            Selecione os alimentos. {prefs[meal.key].length} selecionado{prefs[meal.key].length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {meal.foods.map(food => {
              const selected = prefs[meal.key].includes(food.name);
              return (
                <motion.button
                  key={food.name}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggle(meal.key, food.name)}
                  style={{
                    padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                    border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                    background: selected ? 'var(--accent-glow)' : 'var(--bg-2)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{food.emoji}</span>
                  <span style={{
                    fontSize: 12, fontWeight: selected ? 700 : 500,
                    color: selected ? 'var(--accent)' : 'var(--text-1)',
                    lineHeight: 1.3, flex: 1,
                  }}>
                    {food.name}
                  </span>
                  {selected && <Check size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Save button */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '12px 18px calc(12px + env(safe-area-inset-bottom, 0))',
          background: 'linear-gradient(to top, var(--bg) 80%, transparent)',
        }}>
          <button
            onClick={handleSave}
            style={{
              width: '100%', padding: '14px', borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
              color: '#fff', fontSize: 15, fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(13,159,110,0.35)',
            }}
          >
            {totalSelected > 0 ? `Salvar preferências (${totalSelected} alimentos)` : 'Salvar preferências'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
