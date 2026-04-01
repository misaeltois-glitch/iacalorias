import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Target, Loader2, Check, X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (goals: CalculatedGoals) => void;
  onSkip: () => void;
  mandatory?: boolean;
}

export interface CalculatedGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  weight: number;
  height: number;
  age: number;
  sex: string;
  objective: string;
  activityLevel: number;
  restrictions: string[];
}

// ── Mifflin-St Jeor + Harris-Benedict activity factor ──────────────────────
function calcGoals(data: {
  weight: number; height: number; age: number; sex: string;
  objective: string; activityLevel: number;
}): Omit<CalculatedGoals, 'weight' | 'height' | 'age' | 'sex' | 'objective' | 'activityLevel' | 'restrictions'> {
  // TMB via Mifflin-St Jeor
  const tmb = data.sex === 'female'
    ? 10 * data.weight + 6.25 * data.height - 5 * data.age - 161
    : 10 * data.weight + 6.25 * data.height - 5 * data.age + 5;

  const actFactors = [1.2, 1.375, 1.55, 1.725, 1.9];
  const get = tmb * actFactors[data.activityLevel - 1];

  // Adjust GET by objective
  const calMap: Record<string, number> = {
    fat_loss: Math.round(get * 0.8),
    muscle_gain: Math.round(get * 1.1),
    maintenance: Math.round(get),
    health: Math.round(get),
  };
  const calories = calMap[data.objective] ?? Math.round(get);

  // Protein (g/kg)
  const protRatio: Record<string, number> = {
    fat_loss: 1.4, muscle_gain: 2.0, maintenance: 1.4, health: 1.2,
  };
  const protein = Math.round(data.weight * (protRatio[data.objective] ?? 1.4));

  // Fat: 27% of calories
  const fat = Math.round((calories * 0.27) / 9);

  // Carbs: remaining
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  // Fiber: 14g per 1000kcal (DRI)
  const fiber = Math.round((calories / 1000) * 14);

  return { calories, protein, carbs: Math.max(carbs, 50), fat, fiber };
}

const OBJECTIVES = [
  { id: 'fat_loss', label: 'Perda de gordura', emoji: '🔥', desc: 'Déficit calórico controlado preservando músculo' },
  { id: 'muscle_gain', label: 'Ganho de massa', emoji: '💪', desc: 'Superávit calórico com alta proteína' },
  { id: 'maintenance', label: 'Manutenção', emoji: '⚖️', desc: 'Manter peso e composição atuais' },
  { id: 'health', label: 'Saúde geral', emoji: '🌱', desc: 'Equilíbrio nutricional sem foco em peso' },
];

const ACTIVITY_LEVELS = [
  { level: 1, label: 'Sedentário', desc: 'Trabalho de mesa, sem exercício regular' },
  { level: 2, label: 'Levemente ativo', desc: 'Exercício leve 1–3x/semana' },
  { level: 3, label: 'Moderadamente ativo', desc: 'Exercício moderado 3–5x/semana' },
  { level: 4, label: 'Muito ativo', desc: 'Exercício intenso 6–7x/semana' },
  { level: 5, label: 'Atleta', desc: 'Treino 2x/dia, trabalho físico' },
];

const RESTRICTIONS = ['Vegetariano', 'Vegano', 'Sem glúten', 'Sem lactose'];

export function OnboardingModal({ isOpen, onComplete, onSkip, mandatory }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [objective, setObjective] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [activityLevel, setActivityLevel] = useState(0);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [calculated, setCalculated] = useState<ReturnType<typeof calcGoals> | null>(null);
  const [manualGoals, setManualGoals] = useState<{calories:number;protein:number;carbs:number;fat:number;fiber:number} | null>(null);

  const STEPS = ['Objetivo', 'Biometria', 'Atividade', 'Restrições', 'Suas metas', 'Confirmar'];

  const canNext = [
    true, // objective is optional — user can skip
    !!(weight && height && age && sex),
    !!activityLevel,
    true,
    true,
    true,
  ];

  const handleNext = () => {
    if (step === 3) {
      const g = calcGoals({
        weight: parseFloat(weight), height: parseFloat(height),
        age: parseInt(age), sex, objective, activityLevel,
      });
      setCalculated(g);
      setManualGoals(g);
    }
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const handleConfirm = async () => {
    if (!manualGoals) return;
    setSaving(true);
    onComplete({
      ...manualGoals,
      weight: parseFloat(weight), height: parseFloat(height),
      age: parseInt(age), sex, objective, activityLevel, restrictions,
    });
  };

  const toggleRestriction = (r: string) =>
    setRestrictions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const goals = manualGoals ?? calculated;

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onSkip(); }}
    >
      <div style={{
        width: '100%', maxWidth: '520px', background: 'var(--bg-surface)',
        borderRadius: '24px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        position: 'relative',
      }}>
        {/* Close button */}
        <button
          onClick={onSkip}
          style={{
            position: 'absolute', top: '12px', right: '12px', zIndex: 10,
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'var(--bg-3)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={15} style={{ color: 'var(--text-2)' }} />
        </button>

        {/* Progress bar */}
        <div style={{ height: '3px', background: 'var(--bg-3)' }}>
          <div style={{
            height: '100%', width: `${((step + 1) / STEPS.length) * 100}%`,
            background: 'var(--accent)', transition: 'width 0.4s ease',
          }} />
        </div>

        <div style={{ padding: '28px 28px 24px' }}>
          {/* Step indicator */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{
                  width: i === step ? '20px' : '8px', height: '8px',
                  borderRadius: '99px', transition: 'all 0.3s',
                  background: i <= step ? 'var(--accent)' : 'var(--bg-3)',
                }} />
              ))}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              {step + 1} de {STEPS.length}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >

              {/* Step 0: Objetivo */}
              {step === 0 && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Target style={{ width: '18px', height: '18px', color: 'var(--accent)' }} />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Etapa 1 de 6</span>
                    </div>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>Qual é seu objetivo?</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.5 }}>Suas metas de calorias e nutrientes serão ajustadas para esse objetivo.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {OBJECTIVES.map(o => (
                      <button key={o.id} onClick={() => setObjective(o.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
                          borderRadius: '14px', border: `2px solid ${objective === o.id ? 'var(--accent)' : 'var(--border-strong)'}`,
                          background: objective === o.id ? 'var(--accent-glow)' : 'var(--bg-2)',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                        }}>
                        <span style={{ fontSize: '24px' }}>{o.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '15px' }}>{o.label}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>{o.desc}</div>
                        </div>
                        {objective === o.id && <Check style={{ width: '18px', height: '18px', color: 'var(--accent)', marginLeft: 'auto', flexShrink: 0 }} />}
                      </button>
                    ))}
                    <button
                      onClick={onSkip}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '13px', color: 'var(--text-3)', padding: '6px 0',
                        textDecoration: 'underline', textUnderlineOffset: '3px',
                      }}
                    >
                      Pular configuração
                    </button>
                  </div>
                </div>
              )}

              {/* Step 1: Biometria */}
              {step === 1 && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Etapa 2 de 6</span>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-1)', margin: '6px 0' }}>Seus dados biométricos</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>Usamos a fórmula Mifflin-St Jeor para calcular seu gasto energético.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {(['male', 'female'] as const).map(s => (
                        <button key={s} onClick={() => setSex(s)} style={{
                          flex: 1, padding: '12px', borderRadius: '12px',
                          border: `2px solid ${sex === s ? 'var(--accent)' : 'var(--border-strong)'}`,
                          background: sex === s ? 'var(--accent-glow)' : 'var(--bg-2)',
                          color: 'var(--text-1)', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
                        }}>
                          {s === 'male' ? '♂ Masculino' : '♀ Feminino'}
                        </button>
                      ))}
                    </div>
                    {[
                      { label: 'Peso (kg)', value: weight, set: setWeight, placeholder: 'Ex: 75', min: 30, max: 300 },
                      { label: 'Altura (cm)', value: height, set: setHeight, placeholder: 'Ex: 175', min: 100, max: 250 },
                      { label: 'Idade (anos)', value: age, set: setAge, placeholder: 'Ex: 28', min: 10, max: 100 },
                    ].map(f => (
                      <div key={f.label}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                        <input
                          type="number" value={f.value} onChange={e => f.set(e.target.value)}
                          placeholder={f.placeholder}
                          style={{
                            width: '100%', padding: '12px 14px', borderRadius: '10px',
                            border: '1.5px solid var(--border-strong)', background: 'var(--bg-2)',
                            color: 'var(--text-1)', fontSize: '15px', boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Atividade */}
              {step === 2 && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Etapa 3 de 6</span>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-1)', margin: '6px 0' }}>Nível de atividade</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>Selecione o que melhor descreve sua rotina semanal.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ACTIVITY_LEVELS.map(a => (
                      <button key={a.level} onClick={() => setActivityLevel(a.level)} style={{
                        display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px',
                        borderRadius: '12px', border: `2px solid ${activityLevel === a.level ? 'var(--accent)' : 'var(--border-strong)'}`,
                        background: activityLevel === a.level ? 'var(--accent-glow)' : 'var(--bg-2)',
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                      }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                          background: activityLevel === a.level ? 'var(--accent)' : 'var(--bg-3)',
                          color: activityLevel === a.level ? '#fff' : 'var(--text-2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '13px',
                        }}>{a.level}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '14px' }}>{a.label}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '1px' }}>{a.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Restrições */}
              {step === 3 && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Etapa 4 de 6</span>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-1)', margin: '6px 0' }}>Restrições alimentares</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>Selecione todas que se aplicam, ou deixe em branco.</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {RESTRICTIONS.map(r => (
                      <button key={r} onClick={() => toggleRestriction(r)} style={{
                        padding: '14px', borderRadius: '12px',
                        border: `2px solid ${restrictions.includes(r) ? 'var(--accent)' : 'var(--border-strong)'}`,
                        background: restrictions.includes(r) ? 'var(--accent-glow)' : 'var(--bg-2)',
                        color: 'var(--text-1)', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        {r}
                        {restrictions.includes(r) && <Check style={{ width: '16px', height: '16px', color: 'var(--accent)' }} />}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setRestrictions([])} style={{
                    marginTop: '10px', width: '100%', padding: '12px', borderRadius: '12px',
                    border: `2px solid ${restrictions.length === 0 ? 'var(--accent)' : 'var(--border-strong)'}`,
                    background: restrictions.length === 0 ? 'var(--accent-glow)' : 'var(--bg-2)',
                    color: 'var(--text-1)', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    Nenhuma restrição
                    {restrictions.length === 0 && <Check style={{ width: '16px', height: '16px', color: 'var(--accent)' }} />}
                  </button>
                </div>
              )}

              {/* Step 4: Metas calculadas + ajuste manual */}
              {step === 4 && goals && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Etapa 5 de 6</span>
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-1)', margin: '6px 0' }}>Suas metas calculadas</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>Baseadas em evidências clínicas. Ajuste se quiser.</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { key: 'calories' as const, label: '🔥 Calorias', unit: 'kcal', color: '#f97316' },
                      { key: 'protein' as const, label: '🥩 Proteína', unit: 'g', color: '#22c55e' },
                      { key: 'carbs' as const, label: '🌾 Carboidratos', unit: 'g', color: '#f59e0b' },
                      { key: 'fat' as const, label: '🫒 Gorduras', unit: 'g', color: '#ef4444' },
                      { key: 'fiber' as const, label: '🥦 Fibras', unit: 'g', color: '#06b6d4' },
                    ].map(({ key, label, unit, color }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-2)', border: '1.5px solid var(--border)' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            value={goals[key]}
                            onChange={e => setManualGoals(prev => prev ? { ...prev, [key]: parseInt(e.target.value) || 0 } : null)}
                            style={{
                              width: '70px', padding: '6px 8px', textAlign: 'right',
                              borderRadius: '8px', border: `1.5px solid ${color}40`,
                              background: 'var(--bg-3)', color, fontWeight: 700,
                              fontSize: '15px', outline: 'none',
                            }}
                          />
                          <span style={{ fontSize: '12px', color: 'var(--text-2)', minWidth: '28px' }}>{unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Confirmar */}
              {step === 5 && goals && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '52px', marginBottom: '12px' }}>🎯</div>
                  <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>Tudo pronto!</h2>
                  <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '24px' }}>
                    Suas metas diárias estão calibradas para <strong style={{ color: 'var(--text-1)' }}>{OBJECTIVES.find(o => o.id === objective)?.label}</strong>. A cada análise feita, seu progresso do dia será atualizado.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
                    {[
                      { label: 'Calorias', value: `${goals.calories} kcal`, color: '#f97316' },
                      { label: 'Proteína', value: `${goals.protein}g`, color: '#22c55e' },
                      { label: 'Carboidratos', value: `${goals.carbs}g`, color: '#f59e0b' },
                      { label: 'Gorduras', value: `${goals.fat}g`, color: '#ef4444' },
                      { label: 'Fibras', value: `${goals.fiber}g`, color: '#06b6d4' },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-2)', border: '1.5px solid var(--border)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '4px' }}>{label}</div>
                        <div style={{ fontWeight: 700, color, fontSize: '18px' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.5 }}>
                    ⚕️ Metas calculadas por algoritmo clínico (Mifflin-St Jeor + DRI). Para condições médicas específicas, consulte um nutricionista.
                  </p>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{
                padding: '13px 18px', borderRadius: '12px',
                border: '1.5px solid var(--border-strong)', background: 'var(--bg-2)',
                color: 'var(--text-1)', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <ChevronLeft style={{ width: '16px', height: '16px' }} />
                Voltar
              </button>
            )}
            <button
              onClick={step === STEPS.length - 1 ? handleConfirm : handleNext}
              disabled={!canNext[step] || saving}
              style={{
                flex: 1, padding: '13px', borderRadius: '12px',
                background: canNext[step] ? 'var(--accent)' : 'var(--bg-3)',
                color: canNext[step] ? '#fff' : 'var(--text-3)',
                fontWeight: 700, cursor: canNext[step] ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontSize: '15px', border: 'none', transition: 'all 0.2s',
              }}
            >
              {saving ? <Loader2 style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} /> :
                step === STEPS.length - 1 ? 'Salvar minhas metas ✓' : (
                  <>Continuar <ChevronRight style={{ width: '16px', height: '16px' }} /></>
                )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
