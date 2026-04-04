import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChefHat, Loader2, RotateCcw, ChevronDown } from 'lucide-react';

interface FoodSubcategory {
  name: string;
  items: string[];
}
interface FoodCategory {
  emoji: string;
  name: string;
  subcategories: FoodSubcategory[];
}

const FOOD_CATALOG: FoodCategory[] = [
  {
    emoji: '🥩', name: 'Carnes & Proteínas',
    subcategories: [
      { name: 'Frango', items: ['peito de frango', 'coxa de frango', 'sobrecoxa', 'frango inteiro', 'frango moído', 'fígado de frango'] },
      { name: 'Bovina', items: ['patinho moído', 'acém', 'músculo', 'coxão mole', 'picanha', 'costela', 'contra-filé', 'alcatra', 'maminha'] },
      { name: 'Suína', items: ['lombo suíno', 'pernil', 'costelinha suína', 'bacon', 'linguiça calabresa', 'linguiça toscana'] },
      { name: 'Peixe & Frutos do Mar', items: ['atum em lata', 'sardinha em lata', 'tilápia', 'salmão', 'merluza', 'camarão', 'bacalhau'] },
      { name: 'Ovos', items: ['ovo de galinha', 'ovo de codorna', 'clara de ovo'] },
      { name: 'Frios & Embutidos', items: ['peito de peru', 'presunto', 'apresuntado', 'salsicha', 'mortadela'] },
    ],
  },
  {
    emoji: '🌾', name: 'Grãos & Carboidratos',
    subcategories: [
      { name: 'Arroz & Cereais', items: ['arroz branco', 'arroz integral', 'arroz parboilizado', 'arroz arbóreo', 'quinoa', 'aveia em flocos', 'granola', 'milho verde', 'cuscuz (milho)'] },
      { name: 'Massas', items: ['macarrão espaguete', 'macarrão parafuso', 'macarrão penne', 'macarrão instantâneo', 'nhoque', 'lasanha'] },
      { name: 'Pães & Farinhas', items: ['pão de forma', 'pão francês', 'pão integral', 'pão de queijo', 'tapioca', 'farinha de trigo', 'farinha de mandioca', 'farinha de aveia', 'farinha de arroz', 'amido de milho'] },
      { name: 'Tubérculos', items: ['batata-doce', 'batata inglesa', 'mandioca (aipim)', 'inhame', 'cará', 'mandioquinha'] },
    ],
  },
  {
    emoji: '🫘', name: 'Leguminosas',
    subcategories: [
      { name: 'Feijões', items: ['feijão carioca', 'feijão preto', 'feijão branco', 'feijão-fradinho', 'feijão de corda'] },
      { name: 'Outras', items: ['lentilha', 'grão-de-bico', 'ervilha seca', 'ervilha em lata', 'soja', 'edamame'] },
    ],
  },
  {
    emoji: '🥦', name: 'Vegetais',
    subcategories: [
      { name: 'Folhas', items: ['alface', 'rúcula', 'espinafre', 'couve', 'acelga', 'repolho', 'agrião', 'manjericão'] },
      { name: 'Legumes', items: ['brócolis', 'couve-flor', 'chuchu', 'abobrinha', 'pepino', 'berinjela', 'pimentão', 'vagem', 'cenoura', 'beterraba', 'milho verde', 'abóbora', 'jiló'] },
      { name: 'Temperos frescos', items: ['tomate', 'cebola', 'alho', 'gengibre', 'salsinha', 'cebolinha', 'coentro', 'alho-poró'] },
    ],
  },
  {
    emoji: '🍎', name: 'Frutas',
    subcategories: [
      { name: 'Comuns', items: ['banana', 'maçã', 'laranja', 'mamão', 'melancia', 'melão', 'manga', 'uva', 'pera', 'pêssego'] },
      { name: 'Tropicais', items: ['abacaxi', 'goiaba', 'maracujá', 'caju', 'acerola', 'abacate', 'coco', 'jaca'] },
      { name: 'Vermelhas & Berries', items: ['morango', 'amora', 'framboesa', 'mirtilo (blueberry)', 'açaí'] },
    ],
  },
  {
    emoji: '🥛', name: 'Laticínios',
    subcategories: [
      { name: 'Leites', items: ['leite integral', 'leite desnatado', 'leite semidesnatado', 'leite condensado', 'creme de leite'] },
      { name: 'Queijos', items: ['queijo mussarela', 'queijo prato', 'queijo minas', 'queijo coalho', 'queijo cottage', 'ricota', 'requeijão', 'cream cheese'] },
      { name: 'Iogurtes', items: ['iogurte natural', 'iogurte grego', 'iogurte desnatado', 'coalhada'] },
      { name: 'Outros', items: ['manteiga', 'margarina', 'nata', 'ghee'] },
    ],
  },
  {
    emoji: '🥜', name: 'Oleaginosas & Sementes',
    subcategories: [
      { name: 'Oleaginosas', items: ['amendoim', 'castanha-do-pará', 'castanha de caju', 'amêndoas', 'nozes', 'avelã', 'pistache'] },
      { name: 'Sementes & Pastas', items: ['chia', 'linhaça', 'gergelim', 'semente de abóbora', 'pasta de amendoim', 'tahine'] },
    ],
  },
  {
    emoji: '🛢️', name: 'Óleos & Gorduras',
    subcategories: [
      { name: 'Óleos', items: ['azeite de oliva', 'óleo de coco', 'óleo de milho', 'óleo de girassol', 'óleo de soja'] },
    ],
  },
  {
    emoji: '🧂', name: 'Temperos & Molhos',
    subcategories: [
      { name: 'Secos', items: ['sal', 'pimenta-do-reino', 'cúrcuma', 'páprica', 'cominho', 'orégano', 'curry', 'canela', 'noz-moscada'] },
      { name: 'Molhos', items: ['molho de tomate', 'molho shoyu', 'molho inglês', 'vinagre', 'limão', 'mostarda', 'ketchup', 'molho tabasco'] },
    ],
  },
  {
    emoji: '🍫', name: 'Outros',
    subcategories: [
      { name: 'Doces & Panificação', items: ['açúcar', 'mel', 'cacau em pó', 'chocolate meio amargo', 'achocolatado', 'geleia', 'fermento biológico', 'fermento químico', 'extrato de baunilha'] },
      { name: 'Suplementos', items: ['whey protein', 'proteína vegana', 'albumina', 'colágeno', 'creatina'] },
    ],
  },
];

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';

interface RecipeMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface Recipe {
  name: string;
  emoji: string;
  prepTime: string;
  servings: number;
  ingredients: string[];
  steps: string[];
  macros: RecipeMacros;
  tip: string;
}

interface RecipeSuggestorProps {
  onClose: () => void;
  sessionId: string;
}

export function RecipeSuggestor({ onClose, sessionId }: RecipeSuggestorProps) {
  const [inputValue, setInputValue] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openSubcategory, setOpenSubcategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const parts = raw.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    setTags(prev => {
      const newTags = [...prev];
      for (const p of parts) {
        if (p && !newTags.includes(p) && newTags.length < 20) newTags.push(p);
      }
      return newTags;
    });
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const removeTag = (idx: number) => setTags(prev => prev.filter((_, i) => i !== idx));

  const handleGenerate = async () => {
    const allIngredients = [...tags];
    if (inputValue.trim()) {
      addTag(inputValue);
      allIngredients.push(...inputValue.split(/[,;]+/).map(s => s.trim()).filter(Boolean));
    }
    if (allIngredients.length === 0) {
      setError('Adicione ao menos um ingrediente.');
      return;
    }
    setLoading(true);
    setError(null);
    setRecipe(null);
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const r = await fetch(`${BASE}api/recipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId, ingredients: allIngredients }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.message ?? 'Erro ao gerar receita.');
      } else {
        setRecipe(data);
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRecipe(null);
    setError(null);
    setTags([]);
    setInputValue('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

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
        {/* Handle + header */}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 46, height: 46, borderRadius: '14px', flexShrink: 0,
              background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
            }}>
              🍳
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2 }}>
                Receita com o que tenho
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                Informe os ingredientes disponíveis
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 18px 24px' }}>
          <AnimatePresence mode="wait">
            {!recipe ? (
              <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Ingredient input */}
                <div
                  onClick={() => inputRef.current?.focus()}
                  style={{
                    minHeight: 54, padding: '8px 12px',
                    borderRadius: 16, border: '1.5px solid var(--border)',
                    background: 'var(--bg-2)',
                    display: 'flex', flexWrap: 'wrap', gap: 6,
                    alignItems: 'center', cursor: 'text',
                    marginBottom: 12,
                  }}
                >
                  {tags.map((tag, i) => (
                    <motion.span
                      key={tag}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px 3px 10px', borderRadius: 99,
                        background: 'rgba(245,158,11,0.12)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        fontSize: 13, color: '#D97706', fontWeight: 600,
                      }}
                    >
                      {tag}
                      <button
                        onClick={e => { e.stopPropagation(); removeTag(i); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#D97706', opacity: 0.7 }}
                      >
                        <X size={11} />
                      </button>
                    </motion.span>
                  ))}
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
                    placeholder={tags.length === 0 ? 'Ex: frango, brócolis, ovo…' : 'Adicionar mais…'}
                    style={{
                      flex: '1 1 120px', minWidth: 80,
                      background: 'none', border: 'none', outline: 'none',
                      fontSize: 14, color: 'var(--text-1)', fontFamily: 'inherit',
                      padding: '4px 0',
                    }}
                  />
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.5 }}>
                  Pressione <strong>Enter</strong> ou <strong>vírgula</strong> para digitar, ou selecione por categoria abaixo.
                </div>

                {/* Categorized food browser */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.4px', marginBottom: 8 }}>
                    SELECIONAR POR CATEGORIA
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {FOOD_CATALOG.map(cat => {
                      const isOpen = openCategory === cat.name;
                      return (
                        <div key={cat.name} style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                          {/* Category header */}
                          <button
                            onClick={() => {
                              setOpenCategory(isOpen ? null : cat.name);
                              setOpenSubcategory(null);
                            }}
                            style={{
                              width: '100%', padding: '10px 12px',
                              background: isOpen ? 'rgba(245,158,11,0.07)' : 'var(--bg-2)',
                              border: 'none', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                            }}
                          >
                            <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{cat.name}</span>
                            <motion.span
                              animate={{ rotate: isOpen ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              style={{ display: 'flex', color: 'var(--text-3)' }}
                            >
                              <ChevronDown size={14} />
                            </motion.span>
                          </button>

                          {/* Subcategories */}
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ overflow: 'hidden', background: 'var(--bg)' }}
                              >
                                <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {cat.subcategories.map(sub => {
                                    const subOpen = openSubcategory === `${cat.name}/${sub.name}`;
                                    return (
                                      <div key={sub.name}>
                                        {/* Subcategory toggle */}
                                        <button
                                          onClick={() => setOpenSubcategory(subOpen ? null : `${cat.name}/${sub.name}`)}
                                          style={{
                                            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
                                            fontSize: 11, fontWeight: 700, color: subOpen ? '#D97706' : 'var(--text-2)',
                                            letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: 4,
                                            textTransform: 'uppercase',
                                          }}
                                        >
                                          <motion.span animate={{ rotate: subOpen ? 90 : 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex' }}>
                                            <ChevronDown size={11} style={{ transform: 'rotate(-90deg)' }} />
                                          </motion.span>
                                          {sub.name}
                                        </button>
                                        <AnimatePresence initial={false}>
                                          {subOpen && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: 'auto', opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={{ duration: 0.15 }}
                                              style={{ overflow: 'hidden' }}
                                            >
                                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingTop: 6 }}>
                                                {sub.items.map(item => (
                                                  <button
                                                    key={item}
                                                    onClick={() => { if (!tags.includes(item)) setTags(prev => [...prev, item]); }}
                                                    style={{
                                                      padding: '4px 10px', borderRadius: 99,
                                                      background: tags.includes(item) ? 'rgba(245,158,11,0.15)' : 'var(--bg-2)',
                                                      border: `1px solid ${tags.includes(item) ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                                                      fontSize: 12, color: tags.includes(item) ? '#D97706' : 'var(--text-2)',
                                                      cursor: tags.includes(item) ? 'default' : 'pointer',
                                                      fontWeight: 500, transition: 'all 0.12s',
                                                    }}
                                                  >
                                                    {tags.includes(item) ? '✓ ' : '+ '}{item}
                                                  </button>
                                                ))}
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={loading || (tags.length === 0 && !inputValue.trim())}
                  style={{
                    width: '100%', padding: '14px',
                    borderRadius: 16, border: 'none',
                    background: loading || (tags.length === 0 && !inputValue.trim())
                      ? 'var(--bg-3)'
                      : 'linear-gradient(135deg, #F59E0B, #EF4444)',
                    color: loading || (tags.length === 0 && !inputValue.trim()) ? 'var(--text-3)' : '#fff',
                    fontSize: 15, fontWeight: 800,
                    cursor: loading || (tags.length === 0 && !inputValue.trim()) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: loading || (tags.length === 0 && !inputValue.trim()) ? 'none' : '0 4px 20px rgba(245,158,11,0.35)',
                    transition: 'all 0.2s',
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Criando receita…
                    </>
                  ) : (
                    <>
                      <ChefHat size={16} />
                      Gerar receita com IA
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div key="recipe" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {/* Recipe header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 28, marginBottom: 4 }}>{recipe.emoji}</div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
                      {recipe.name}
                    </h2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {recipe.prepTime && (
                        <span style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--bg-2)', padding: '3px 8px', borderRadius: 99, border: '1px solid var(--border)' }}>
                          ⏱ {recipe.prepTime}
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--bg-2)', padding: '3px 8px', borderRadius: 99, border: '1px solid var(--border)' }}>
                        🍽 {recipe.servings} {recipe.servings === 1 ? 'porção' : 'porções'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    style={{
                      padding: '6px 10px', borderRadius: 10, flexShrink: 0,
                      background: 'var(--bg-2)', border: '1px solid var(--border)',
                      color: 'var(--text-2)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <RotateCcw size={12} /> Nova
                  </button>
                </div>

                {/* Macros strip */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6,
                  marginBottom: 16,
                }}>
                  {[
                    { label: 'Kcal', value: recipe.macros.calories, unit: '', color: '#f97316' },
                    { label: 'Prot', value: recipe.macros.protein, unit: 'g', color: '#22c55e' },
                    { label: 'Carbs', value: recipe.macros.carbs, unit: 'g', color: '#f59e0b' },
                    { label: 'Gord', value: recipe.macros.fat, unit: 'g', color: '#ef4444' },
                    { label: 'Fibra', value: recipe.macros.fiber, unit: 'g', color: '#06b6d4' },
                  ].map(m => (
                    <div key={m.label} style={{
                      textAlign: 'center', padding: '8px 4px', borderRadius: 12,
                      background: 'var(--bg-2)', border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: m.color, lineHeight: 1 }}>
                        {m.value}{m.unit}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600, marginTop: 2 }}>
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ingredients */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.4px', marginBottom: 8 }}>
                    🛒 INGREDIENTES
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {recipe.ingredients.map((ing, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', flexShrink: 0, marginTop: 6 }} />
                        <span style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5 }}>{ing}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Steps */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.4px', marginBottom: 8 }}>
                    👨‍🍳 MODO DE PREPARO
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {recipe.steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
                          color: '#fff', fontSize: 11, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginTop: 1,
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, flex: 1 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tip */}
                {recipe.tip && (
                  <div style={{
                    padding: '12px 14px', borderRadius: 14,
                    background: 'rgba(245,158,11,0.07)',
                    border: '1px solid rgba(245,158,11,0.22)',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    marginBottom: 16,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>{recipe.tip}</p>
                  </div>
                )}

                <button
                  onClick={handleReset}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 14,
                    background: 'var(--bg-2)', border: '1.5px solid var(--border)',
                    color: 'var(--text-1)', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <RotateCcw size={14} /> Gerar com outros ingredientes
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
