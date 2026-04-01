import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Dumbbell, Clock, Flame, Target, Apple, Play, Check, RotateCcw, Crown, Zap, Heart, Wind, Smile, BarChart2, ChevronDown, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { generateWorkoutPlan, calculateNutrition, getGoalLabel, getLevelLabel, formatRest, getTodayKey, type WorkoutProfile, type WorkoutPlan, type WorkoutSession, type SessionExercise, type WorkoutGoal, type ExperienceLevel, type GymType } from '@/lib/workout-engine';
import { getExercisesByMuscle, filterByInjuries, type MuscleGroup, type InjuryKey } from '@/lib/exercise-database';

const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';
const BASE = import.meta.env.BASE_URL ?? '/';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface WorkoutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  isPremium: boolean;
  onUpgrade: () => void;
  onNutritionTargets?: (targets: { calories: number; protein: number; carbs: number; fat: number; fiber: number; weight: number; height: number; age: number; sex: string; activityFactor: number }) => void;
  onboardingMode?: boolean;
  onOnboardingComplete?: () => void;
  biometrics?: { age?: number; weight?: number; height?: number; sex?: string };
  workoutTrialDaysRemaining?: number | null;
}

type PanelView = 'loading' | 'questionnaire' | 'plan' | 'player' | 'quick-picker' | 'ai-preview' | 'muscle-builder' | 'done';
type MbPhase = 'groups' | 'exercises';

const MB_MUSCLES: { label: string; muscle: MuscleGroup; emoji: string; desc: string }[] = [
  { label: 'Peito', muscle: 'chest', emoji: '🏋️', desc: 'Peitoral maior e menor' },
  { label: 'Costas', muscle: 'back', emoji: '🦅', desc: 'Dorsal, trapézio, romboides' },
  { label: 'Ombros', muscle: 'shoulders', emoji: '💪', desc: 'Deltóide ant., med. e post.' },
  { label: 'Bíceps', muscle: 'biceps', emoji: '💪', desc: 'Bíceps braquial e braquial' },
  { label: 'Tríceps', muscle: 'triceps', emoji: '🦾', desc: 'Tríceps todas as cabeças' },
  { label: 'Quadríceps', muscle: 'quads', emoji: '🦵', desc: 'Quadríceps e coxa dianteira' },
  { label: 'Posteriores', muscle: 'hamstrings', emoji: '🦵', desc: 'Isquiotibiais e posteriores' },
  { label: 'Glúteos', muscle: 'glutes', emoji: '🍑', desc: 'Glúteo máximo e médio' },
  { label: 'Panturrilha', muscle: 'calves', emoji: '🦶', desc: 'Gastrocnêmio e sóleo' },
  { label: 'Abdômen', muscle: 'abs', emoji: '⚡', desc: 'Core, oblíquos e transverso' },
];

function calcPrescriptionLocal(goal: WorkoutGoal, level: ExperienceLevel, isCompound: boolean) {
  const baseSets = level === 'beginner' ? 3 : level === 'intermediate' ? 4 : 5;
  const sets = isCompound ? baseSets : Math.max(2, baseSets - 1);
  const repMap: Record<WorkoutGoal, { comp: string; iso: string }> = {
    hypertrophy: { comp: '8-12', iso: '10-15' },
    strength: { comp: '3-6', iso: '6-10' },
    fat_loss: { comp: '12-15', iso: '15-20' },
    endurance: { comp: '15-20', iso: '20-25' },
    wellness: { comp: '10-15', iso: '12-15' },
  };
  const reps = isCompound ? repMap[goal].comp : repMap[goal].iso;
  const restMap: Record<WorkoutGoal, { comp: number; iso: number }> = {
    hypertrophy: { comp: 90, iso: 60 },
    strength: { comp: 240, iso: 120 },
    fat_loss: { comp: 45, iso: 30 },
    endurance: { comp: 30, iso: 30 },
    wellness: { comp: 60, iso: 45 },
  };
  const restSeconds = isCompound ? restMap[goal].comp : restMap[goal].iso;
  const rpe = isCompound ? (goal === 'strength' ? 8 : 7) : 8;
  return { sets, reps, restSeconds, rpe };
}

const DAYS = [
  { key: 'mon', label: 'SEG' }, { key: 'tue', label: 'TER' }, { key: 'wed', label: 'QUA' },
  { key: 'thu', label: 'QUI' }, { key: 'fri', label: 'SEX' }, { key: 'sat', label: 'SÁB' }, { key: 'sun', label: 'DOM' },
];

const INJURIES_LIST = [
  { key: 'lumbar_disc', label: 'Hérnia de disco lombar' },
  { key: 'lumbar_pain', label: 'Lombalgia crônica' },
  { key: 'knee_condromalacia', label: 'Condromalácia patelar' },
  { key: 'lca', label: 'Lesão de LCA/LCP' },
  { key: 'knee_meniscus', label: 'Lesão de menisco' },
  { key: 'shoulder_impingement', label: 'Impacto do ombro' },
  { key: 'rotator_cuff', label: 'Lesão do manguito rotador' },
  { key: 'tennis_elbow', label: 'Epicondilite (cotovelo)' },
  { key: 'ankle', label: 'Entorse de tornozelo recorrente' },
];

export function WorkoutPanel({ isOpen, onClose, sessionId, isPremium, onUpgrade, onNutritionTargets, onboardingMode, onOnboardingComplete, biometrics, workoutTrialDaysRemaining }: WorkoutPanelProps) {
  const { user } = useAuth();
  const [view, setView] = useState<PanelView>('loading');
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<WorkoutProfile>>({
    trainingDays: ['mon', 'wed', 'fri'],
    sessionDuration: 60,
    gym: 'full_gym',
    equipment: [],
    hasInjuries: false,
    injuries: [],
    techniques: [],
    cardio: 'none',
    warmup: 'basic',
    age: biometrics?.age ?? 25,
    weight: biometrics?.weight ?? 75,
    height: biometrics?.height ?? 170,
    sex: biometrics?.sex ?? undefined,
  });
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState(getTodayKey());
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [quickMuscles, setQuickMuscles] = useState<Set<string>>(new Set());
  const [quickCustom, setQuickCustom] = useState<string>('');
  const [isQuickLoading, setIsQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [playerExIdx, setPlayerExIdx] = useState(0);
  const [playerSetIdx, setPlayerSetIdx] = useState(0);
  const [restTimer, setRestTimer] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workoutStartRef = useRef<Date | null>(null);
  const fromAiRef = useRef(false);
  const biometricsRef = useRef(biometrics);
  useEffect(() => { biometricsRef.current = biometrics; }, [biometrics]);
  const [completedSession, setCompletedSession] = useState<{ sessionName: string; durationMinutes: number; exerciseCount: number; estimatedBurn: number } | null>(null);


  // muscle-builder state
  const [mbPhase, setMbPhase] = useState<MbPhase>('groups');
  const [mbMuscles, setMbMuscles] = useState<Set<MuscleGroup>>(new Set());
  const [mbCurrentMuscle, setMbCurrentMuscle] = useState<MuscleGroup | null>(null);
  const [mbSelectedIds, setMbSelectedIds] = useState<Map<MuscleGroup, Set<string>>>(new Map());
  const [customSession, setCustomSession] = useState<WorkoutSession | null>(null);

  // saved custom sessions per day (persisted in localStorage)
  const [savedCustomSessions, setSavedCustomSessions] = useState<Map<string, WorkoutSession>>(new Map());
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [planHeaderExpanded, setPlanHeaderExpanded] = useState(false);

  // calorie dashboard state
  const [todayCalories, setTodayCalories] = useState<{ consumed: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadProfile();
  }, [isOpen, sessionId]);

  useEffect(() => {
    if (!isOpen || view !== 'plan') return;
    fetch(`${BASE}api/goals/daily-summary?sessionId=${sessionId}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.totals) {
          setTodayCalories({ consumed: Math.round(data.totals.calories ?? 0) });
        }
      })
      .catch(() => null);
  }, [isOpen, view, sessionId]);

  const loadProfile = async () => {
    setView('loading');
    try {
      const r = await fetch(`${BASE}api/workout/profile?sessionId=${sessionId}`, { headers: authHeaders() });
      if (r.ok) {
        const data = await r.json();
        const loaded: WorkoutProfile = {
          goal: data.goal, sex: data.sex ?? biometrics?.sex, age: data.age ?? biometrics?.age, weight: data.weight ?? biometrics?.weight, height: data.height ?? biometrics?.height,
          bodyFat: data.bodyFat, level: data.level, trainingDays: data.trainingDays ?? [],
          sessionDuration: data.sessionDuration, preferredTime: data.preferredTime,
          gym: data.gym, equipment: data.equipment ?? [], hasInjuries: data.hasInjuries,
          injuries: data.injuries ?? [], medicalNotes: data.medicalNotes,
          cardio: data.cardio ?? 'none', warmup: data.warmup ?? 'basic', techniques: data.techniques ?? [],
        };
        setProfile(loaded);
        const p = generateWorkoutPlan(loaded);
        setPlan(p);
        onNutritionTargets?.({ ...p.nutritionTargets, weight: loaded.weight, height: loaded.height, age: loaded.age, sex: loaded.sex, activityFactor: p.nutritionTargets.activityFactor });
        loadSavedCustomSessions();
        setView('plan');
      } else {
        // Fetch biometrics from nutrition goals directly
        try {
          const gr = await fetch(`${BASE}api/goals?sessionId=${sessionId}`, { headers: authHeaders() });
          if (gr.ok) {
            const g = await gr.json();
            if (g) {
              setProfile(prev => ({
                ...prev,
                ...(g.age ? { age: g.age } : {}),
                ...(g.weight ? { weight: g.weight } : {}),
                ...(g.height ? { height: g.height } : {}),
                ...(g.sex ? { sex: g.sex } : {}),
              }));
            }
          }
        } catch {}
        setView('questionnaire');
        setStep(1);
      }
    } catch {
      setView('questionnaire');
      setStep(1);
    }
  };

  const saveProfile = async (p: WorkoutProfile) => {
    await fetch(`${BASE}api/workout/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ ...p, sessionId }),
    });
  };

  const getCustomStorageKey = useCallback(() => `ia-workout-customs-${sessionId}`, [sessionId]);

  const persistCustomSessions = useCallback((map: Map<string, WorkoutSession>) => {
    try {
      const obj: Record<string, WorkoutSession> = {};
      for (const [k, v] of map) obj[k] = v;
      localStorage.setItem(getCustomStorageKey(), JSON.stringify(obj));
    } catch {}
  }, [getCustomStorageKey]);

  const loadSavedCustomSessions = useCallback(() => {
    try {
      const raw = localStorage.getItem(getCustomStorageKey());
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, WorkoutSession>;
      setSavedCustomSessions(new Map(Object.entries(parsed)));
    } catch {}
  }, [getCustomStorageKey]);

  const handleSaveCustomForDay = useCallback((dayKey: string, session: WorkoutSession) => {
    const dayLabel = DAYS.find(d => d.key === dayKey)?.label ?? session.dayLabel;
    setSavedCustomSessions(prev => {
      const next = new Map(prev);
      next.set(dayKey, { ...session, dayKey, dayLabel });
      persistCustomSessions(next);
      return next;
    });
    setCustomSession(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  }, [persistCustomSessions]);

  const handleClearCustomForDay = useCallback((dayKey: string) => {
    setSavedCustomSessions(prev => {
      const next = new Map(prev);
      next.delete(dayKey);
      persistCustomSessions(next);
      return next;
    });
  }, [persistCustomSessions]);

  const handleFinishQuestionnaire = async () => {
    if (!profile.goal || !profile.sex || !profile.age || !profile.weight || !profile.height || !profile.level) return;
    setIsGenerating(true);
    const fullProfile = profile as WorkoutProfile;
    const generated = generateWorkoutPlan(fullProfile);
    setPlan(generated);
    onNutritionTargets?.({ ...generated.nutritionTargets, weight: fullProfile.weight, height: fullProfile.height, age: fullProfile.age, sex: fullProfile.sex, activityFactor: generated.nutritionTargets.activityFactor });
    await saveProfile(fullProfile);
    setIsGenerating(false);
    setView('plan');
  };

  const handleStartPlayer = (session: WorkoutSession) => {
    if (!isPremium) { onUpgrade(); return; }
    fromAiRef.current = false;
    setActiveSession(session);
    setPlayerExIdx(0);
    setPlayerSetIdx(0);
    setIsResting(false);
    setRestTimer(0);
    workoutStartRef.current = new Date();
    setView('player');
  };

  const handleQuickWorkout = async () => {
    const selected = [...quickMuscles];
    if (quickCustom.trim()) selected.push(quickCustom.trim());
    if (selected.length === 0) return;
    const muscleGroup = selected.join(' + ');
    setIsQuickLoading(true);
    setQuickError(null);
    try {
      const r = await fetch(`${BASE}api/workout/ai-quick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ muscleGroup, sessionId }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? 'Erro ao gerar treino');
      }
      const session: WorkoutSession = await r.json();
      setActiveSession(session);
      setView('ai-preview');
    } catch (e: any) {
      setQuickError(e.message ?? 'Tente novamente');
    } finally {
      setIsQuickLoading(false);
    }
  };

  const handleStartAiPlayer = () => {
    if (!activeSession) return;
    if (!isPremium) { onUpgrade(); return; }
    fromAiRef.current = true;
    setPlayerExIdx(0);
    setPlayerSetIdx(0);
    setIsResting(false);
    setRestTimer(0);
    workoutStartRef.current = new Date();
    setView('player');
  };

  const mbTotalSelected = [...mbSelectedIds.values()].reduce((a, s) => a + s.size, 0);

  const handleSaveMuscleBuilder = () => {
    if (mbMuscles.size === 0 || mbTotalSelected === 0) return;
    const goal = (profile.goal ?? 'hypertrophy') as WorkoutGoal;
    const level = (profile.level ?? 'intermediate') as ExperienceLevel;

    let allSessionExercises: SessionExercise[] = [];
    const muscleLabels: string[] = [];
    const muscleList: MuscleGroup[] = [];

    for (const muscle of mbMuscles) {
      const info = MB_MUSCLES.find(m => m.muscle === muscle);
      if (!info) continue;
      const selectedForMuscle = mbSelectedIds.get(muscle) ?? new Set<string>();
      if (selectedForMuscle.size === 0) continue;
      muscleList.push(muscle);
      muscleLabels.push(info.label);
      const allExs = getExercisesByMuscle(muscle);
      const selectedExs = allExs.filter(e => selectedForMuscle.has(e.id));
      const exs: SessionExercise[] = selectedExs.map((ex, idx) => {
        const isCompound = ex.category !== 'isolation';
        const presc = calcPrescriptionLocal(goal, level, isCompound);
        return { exercise: ex, order: allSessionExercises.length + idx + 1, ...presc, notes: ex.tip };
      });
      allSessionExercises = [...allSessionExercises, ...exs];
    }

    if (allSessionExercises.length === 0) return;

    const focusLabel = muscleLabels.join(' + ');
    const totalSecs = allSessionExercises.reduce((a, e) => a + e.sets * (35 + e.restSeconds), 0);
    const estimatedMinutes = Math.round(totalSecs / 60) + 5;

    const session: WorkoutSession = {
      dayKey: 'custom',
      dayLabel: 'Personalizado',
      sessionName: muscleLabels.length === 1 ? `Treino de ${muscleLabels[0]}` : `Treino Personalizado`,
      focusLabel,
      primaryMuscles: muscleList,
      secondaryMuscles: [],
      warmup: [{ name: 'Aquecimento articular e mobilidade', duration: '5 min' }],
      exercises: allSessionExercises,
      cooldown: [{ name: 'Alongamento e relaxamento geral', duration: '3 min' }],
      estimatedMinutes,
      isRestDay: false,
    };
    handleSaveCustomForDay(selectedDayKey, session);
    setView('plan');
  };

  const startRest = (seconds: number) => {
    setIsResting(true);
    setRestTimer(seconds);
    restRef.current = setInterval(() => {
      setRestTimer(prev => {
        if (prev <= 1) {
          clearInterval(restRef.current!);
          setIsResting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleWorkoutDone = async (session: WorkoutSession) => {
    clearInterval(restRef.current!);
    const endTime = new Date();
    const startTime = workoutStartRef.current ?? endTime;
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60000));
    const weight = profile.weight ?? 75;
    const goal = (profile.goal ?? 'hypertrophy') as WorkoutGoal;
    const MET_MAP: Record<WorkoutGoal, number> = { hypertrophy: 5.0, strength: 4.5, fat_loss: 6.0, endurance: 6.5, wellness: 4.0 };
    const estimatedBurn = Math.round((MET_MAP[goal] ?? 5.0) * weight * (durationMinutes / 60));

    setCompletedSession({
      sessionName: session.sessionName,
      durationMinutes,
      exerciseCount: session.exercises.length,
      estimatedBurn,
    });
    setView('done');

    try {
      await fetch(`${BASE}api/workout/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          sessionId,
          sessionName: session.sessionName,
          date: new Date().toISOString().slice(0, 10),
          durationMinutes,
          exercises: session.exercises.map(se => ({
            name: se.exercise.name,
            sets: se.sets,
            reps: se.reps,
            muscle: se.exercise.primaryMuscle,
          })),
        }),
      });
    } catch {}

    fetch(`${BASE}api/goals/daily-summary?sessionId=${sessionId}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.totals) setTodayCalories({ consumed: Math.round(data.totals.calories ?? 0) }); })
      .catch(() => null);
  };

  const handleCompleteSet = (session: WorkoutSession) => {
    const ex = session.exercises[playerExIdx];
    if (playerSetIdx < ex.sets - 1) {
      setPlayerSetIdx(s => s + 1);
      startRest(ex.restSeconds);
    } else if (playerExIdx < session.exercises.length - 1) {
      setPlayerExIdx(i => i + 1);
      setPlayerSetIdx(0);
      startRest(ex.restSeconds);
    } else {
      handleWorkoutDone(session);
    }
  };

  const set = (key: keyof WorkoutProfile, val: unknown) => setProfile(p => ({ ...p, [key]: val }));

  const canProceed = () => {
    if (step === 1) return !!profile.goal;
    if (step === 2) return !!(profile.sex && profile.age && profile.weight && profile.height);
    if (step === 3) return !!profile.level;
    if (step === 4) return (profile.trainingDays?.length ?? 0) >= 2;
    if (step === 5) return !!profile.gym;
    return true;
  };

  const selectedSession = plan?.sessions.find(s => s.dayKey === selectedDayKey);

  if (!isOpen) return null;

  const accent = '#0D9F6E';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

      {/* ── LOADING ── */}
      {view === 'loading' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: `linear-gradient(135deg, ${accent}, #057A55)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Dumbbell size={24} color="#fff" />
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>Carregando seu plano...</p>
        </div>
      )}

      {/* ── QUESTIONNAIRE ── */}
      {view === 'questionnaire' && (
        <>
          {/* Questionnaire Header */}
          <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={onClose} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}>
              <X size={20} />
            </button>
            <div style={{ display: 'flex', gap: '5px' }}>
              {[1,2,3,4,5,6,7].map(n => (
                <div key={n} style={{ width: n === step ? '20px' : '6px', height: '6px', borderRadius: '99px', transition: 'all 0.3s', background: n <= step ? accent : 'var(--bg-3)' }} />
              ))}
            </div>
            <div style={{ width: '36px' }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 120px' }}>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>

                {/* STEP 1 — OBJETIVO */}
                {step === 1 && (
                  <div>
                    <StepHeader title="Qual é o seu objetivo principal?" subtitle="Isso define toda a estrutura do seu treino" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {([
                        { id: 'hypertrophy', icon: <Dumbbell size={18} />, label: 'Hipertrofia', sub: 'Ganho de massa muscular · Rep: 8-12 · Descanso: 60-90s' },
                        { id: 'strength', icon: <Zap size={18} />, label: 'Força', sub: 'Aumento de carga máxima · Rep: 3-6 · Descanso: 3-5min' },
                        { id: 'fat_loss', icon: <Flame size={18} />, label: 'Emagrecimento', sub: 'Perda de gordura · Circuitos e HIIT · Rep: 12-20' },
                        { id: 'endurance', icon: <Wind size={18} />, label: 'Condicionamento', sub: 'Resistência geral · Cardio integrado · Rep: 15-25' },
                        { id: 'wellness', icon: <Heart size={18} />, label: 'Saúde e Bem-Estar', sub: 'Funcional e mobilidade · Rep: 10-15' },
                      ] as Array<{ id: WorkoutGoal; icon: React.ReactNode; label: string; sub: string }>).map(opt => (
                        <OptionCard key={opt.id} selected={profile.goal === opt.id} onClick={() => set('goal', opt.id)} icon={opt.icon} label={opt.label} sub={opt.sub} accent={accent} />
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 2 — DADOS ANTROPOMÉTRICOS */}
                {step === 2 && (
                  <div>
                    <StepHeader title="Seus dados físicos" subtitle="Usamos para calcular seu plano e metas nutricionais ideais" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Sexo biológico</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {[{ id: 'male', label: '♂ Masculino' }, { id: 'female', label: '♀ Feminino' }].map(s => (
                            <button key={s.id} onClick={() => set('sex', s.id)} style={{ padding: '12px', borderRadius: '12px', border: `2px solid ${profile.sex === s.id ? accent : 'var(--border)'}`, background: profile.sex === s.id ? `rgba(13,159,110,0.08)` : 'var(--bg-2)', color: profile.sex === s.id ? accent : 'var(--text-1)', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <NumberInput label="Idade (anos)" value={profile.age} min={14} max={80} onChange={v => set('age', v)} />
                      <NumberInput label="Peso atual (kg)" value={profile.weight} min={30} max={250} step={0.5} onChange={v => set('weight', v)} />
                      <NumberInput label="Altura (cm)" value={profile.height} min={130} max={230} onChange={v => set('height', v)} />
                      <NumberInput label="% Gordura corporal (opcional)" value={profile.bodyFat} min={4} max={60} placeholder="Deixe em branco se não souber" onChange={v => set('bodyFat', v)} />
                    </div>
                  </div>
                )}

                {/* STEP 3 — NÍVEL */}
                {step === 3 && (
                  <div>
                    <StepHeader title="Há quanto tempo você treina?" subtitle="Define a complexidade dos exercícios e volume semanal" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {([
                        { id: 'beginner', dot: '#10B981', label: 'Iniciante', sub: '0-6 meses · Full Body · 10-12 séries/músculo/semana · Foco em técnica' },
                        { id: 'intermediate', dot: '#F59E0B', label: 'Intermediário', sub: '6 meses a 2 anos · Upper/Lower ou PPL · 14-18 séries/músculo' },
                        { id: 'advanced', dot: '#EF4444', label: 'Avançado', sub: '2+ anos contínuos · PPL 6x ou mais · 18-25 séries/músculo' },
                      ] as Array<{ id: ExperienceLevel; dot: string; label: string; sub: string }>).map(opt => (
                        <button key={opt.id} onClick={() => set('level', opt.id)} style={{ padding: '16px', borderRadius: '16px', border: `2px solid ${profile.level === opt.id ? accent : 'var(--border)'}`, background: profile.level === opt.id ? 'rgba(13,159,110,0.06)' : 'var(--bg-2)', cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: opt.dot, flexShrink: 0 }} />
                            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-1)' }}>{opt.label}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-2)', marginLeft: '20px', lineHeight: 1.5 }}>{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 4 — DISPONIBILIDADE */}
                {step === 4 && (
                  <div>
                    <StepHeader title="Disponibilidade de treino" subtitle="Selecione os dias e o tempo disponível por sessão" />
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '10px' }}>Dias da semana ({profile.trainingDays?.length ?? 0} selecionados)</label>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {DAYS.map(d => {
                          const active = profile.trainingDays?.includes(d.key);
                          return (
                            <button key={d.key} onClick={() => {
                              const curr = profile.trainingDays ?? [];
                              set('trainingDays', active ? curr.filter(x => x !== d.key) : [...curr, d.key]);
                            }} style={{ padding: '8px 12px', borderRadius: '10px', border: `2px solid ${active ? accent : 'var(--border)'}`, background: active ? `rgba(13,159,110,0.1)` : 'var(--bg-2)', color: active ? accent : 'var(--text-2)', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                      {(profile.trainingDays?.length ?? 0) < 2 && (
                        <p style={{ fontSize: '12px', color: '#F59E0B', marginTop: '8px' }}>⚠️ Selecione pelo menos 2 dias</p>
                      )}
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '10px' }}>
                        Duração da sessão: <span style={{ color: 'var(--text-1)' }}>{profile.sessionDuration} minutos</span>
                      </label>
                      <input type="range" min={30} max={120} step={15} value={profile.sessionDuration ?? 60} onChange={e => set('sessionDuration', Number(e.target.value))}
                        style={{ width: '100%', accentColor: accent }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                        <span>30min</span><span>60min</span><span>90min</span><span>2h</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '10px' }}>Horário preferido (opcional)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {[
                          { id: 'morning', label: '🌅 Manhã', sub: '5h–9h' },
                          { id: 'midday', label: '☀️ Meio-dia', sub: '10h–14h' },
                          { id: 'afternoon', label: '🌤️ Tarde', sub: '15h–18h' },
                          { id: 'night', label: '🌙 Noite', sub: '19h–23h' },
                        ].map(t => (
                          <button key={t.id} onClick={() => set('preferredTime', profile.preferredTime === t.id ? undefined : t.id)} style={{ padding: '10px', borderRadius: '12px', border: `2px solid ${profile.preferredTime === t.id ? accent : 'var(--border)'}`, background: profile.preferredTime === t.id ? 'rgba(13,159,110,0.08)' : 'var(--bg-2)', cursor: 'pointer', textAlign: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>{t.label}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{t.sub}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5 — EQUIPAMENTOS */}
                {step === 5 && (
                  <div>
                    <StepHeader title="Onde você vai treinar?" subtitle="Adaptamos os exercícios ao que você tem disponível" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {([
                        { id: 'full_gym', icon: '🏢', label: 'Academia Completa', sub: 'Barras, halteres, máquinas, cabos, smith — acesso total' },
                        { id: 'home_gym', icon: '🏠', label: 'Home Gym', sub: 'Halteres, barra, banco, elásticos — exercícios adaptados' },
                        { id: 'bodyweight', icon: '🤸', label: 'Sem Equipamento', sub: 'Apenas o próprio corpo — calistênico e isométrico' },
                        { id: 'custom', icon: '🔧', label: 'Personalizado', sub: 'Selecione exatamente o que você tem disponível' },
                      ] as Array<{ id: GymType; icon: string; label: string; sub: string }>).map(opt => (
                        <button key={opt.id} onClick={() => set('gym', opt.id)} style={{ padding: '14px 16px', borderRadius: '14px', border: `2px solid ${profile.gym === opt.id ? accent : 'var(--border)'}`, background: profile.gym === opt.id ? 'rgba(13,159,110,0.06)' : 'var(--bg-2)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '24px' }}>{opt.icon}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-1)' }}>{opt.label}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>{opt.sub}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 6 — LESÕES */}
                {step === 6 && (
                  <div>
                    <StepHeader title="Lesões ou restrições?" subtitle="Sua segurança é prioridade — adaptamos o treino para você" />
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {[{ v: false, label: '✅ Sem restrições' }, { v: true, label: '⚠️ Tenho lesões' }].map(opt => (
                          <button key={String(opt.v)} onClick={() => set('hasInjuries', opt.v)} style={{ padding: '12px', borderRadius: '12px', border: `2px solid ${profile.hasInjuries === opt.v ? accent : 'var(--border)'}`, background: profile.hasInjuries === opt.v ? 'rgba(13,159,110,0.08)' : 'var(--bg-2)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', color: 'var(--text-1)' }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {profile.hasInjuries && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '4px' }}>Selecione as lesões que possui:</p>
                        {INJURIES_LIST.map(inj => {
                          const checked = profile.injuries?.includes(inj.key);
                          return (
                            <button key={inj.key} onClick={() => {
                              const curr = profile.injuries ?? [];
                              set('injuries', checked ? curr.filter(x => x !== inj.key) : [...curr, inj.key]);
                            }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${checked ? '#F59E0B' : 'var(--border)'}`, background: checked ? 'rgba(245,158,11,0.06)' : 'var(--bg-2)', cursor: 'pointer', textAlign: 'left' }}>
                              <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `2px solid ${checked ? '#F59E0B' : 'var(--border)'}`, background: checked ? '#F59E0B' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                              </div>
                              <span style={{ fontSize: '13px', color: 'var(--text-1)' }}>{inj.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 7 — PREFERÊNCIAS */}
                {step === 7 && (
                  <div>
                    <StepHeader title="Personalize seu estilo" subtitle="Últimos detalhes para deixar o treino perfeito" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '10px' }}>Cardio integrado ao treino</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {[
                            { id: 'none', label: 'Sem cardio — só musculação' },
                            { id: 'light', label: '🚶 Cardio leve — 10min caminhada pós-treino' },
                            { id: 'moderate', label: '🚴 Cardio moderado — 20min esteira/bike' },
                            { id: 'hiit', label: '⚡ HIIT — intervalado de alta intensidade' },
                          ].map(c => (
                            <button key={c.id} onClick={() => set('cardio', c.id)} style={{ padding: '11px 14px', borderRadius: '10px', border: `2px solid ${profile.cardio === c.id ? accent : 'var(--border)'}`, background: profile.cardio === c.id ? 'rgba(13,159,110,0.08)' : 'var(--bg-2)', cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: 'var(--text-1)', fontWeight: profile.cardio === c.id ? 700 : 400 }}>
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '10px' }}>Aquecimento</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {[
                            { id: 'full', label: '🔥 Completo — mobilidade + ativação (10-15min)' },
                            { id: 'basic', label: '⚡ Básico — aquecimento simples (5min)' },
                            { id: 'none', label: '❌ Não, faço por conta própria' },
                          ].map(w => (
                            <button key={w.id} onClick={() => set('warmup', w.id)} style={{ padding: '11px 14px', borderRadius: '10px', border: `2px solid ${profile.warmup === w.id ? accent : 'var(--border)'}`, background: profile.warmup === w.id ? 'rgba(13,159,110,0.08)' : 'var(--bg-2)', cursor: 'pointer', textAlign: 'left', fontSize: '13px', color: 'var(--text-1)', fontWeight: profile.warmup === w.id ? 700 : 400 }}>
                              {w.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'var(--bg)', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} style={{ padding: '14px 20px', borderRadius: '14px', background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronLeft size={16} /> Voltar
              </button>
            )}
            {step < 7 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: canProceed() ? `linear-gradient(135deg, ${accent}, #057A55)` : 'var(--bg-3)', color: '#fff', fontWeight: 700, fontSize: '15px', border: 'none', cursor: canProceed() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                Continuar <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={handleFinishQuestionnaire} disabled={isGenerating} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: `linear-gradient(135deg, ${accent}, #057A55)`, color: '#fff', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isGenerating ? 'Gerando plano...' : <><Dumbbell size={16} /> Gerar meu plano de treino</>}
              </button>
            )}
          </div>
        </>
      )}

      {/* ── PLAN VIEW ── */}
      {view === 'plan' && plan && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Workout trial badge for free users */}
          {!isPremium && workoutTrialDaysRemaining !== null && workoutTrialDaysRemaining !== undefined && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '8px 16px',
              background: workoutTrialDaysRemaining <= 1 ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.1)',
              borderBottom: `1px solid ${workoutTrialDaysRemaining <= 1 ? 'rgba(239,68,68,0.2)' : 'rgba(249,115,22,0.15)'}`,
            }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: workoutTrialDaysRemaining <= 1 ? '#EF4444' : '#F97316' }}>
                🏋️ {workoutTrialDaysRemaining > 0
                  ? `Treino grátis: ${workoutTrialDaysRemaining} dia${workoutTrialDaysRemaining !== 1 ? 's' : ''} restante${workoutTrialDaysRemaining !== 1 ? 's' : ''}`
                  : 'Trial de treino expirado'}
              </span>
              {workoutTrialDaysRemaining <= 0 && (
                <button onClick={onUpgrade} style={{
                  fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px',
                  background: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer',
                }}>Fazer upgrade</button>
              )}
            </div>
          )}
          {/* Plan Header */}
          <div style={{ background: `linear-gradient(135deg, ${accent} 0%, #057A55 100%)`, padding: planHeaderExpanded ? '20px 20px 20px' : '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {!onboardingMode ? (
                <button onClick={onClose} style={{ padding: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: '#fff' }}>
                  <X size={18} />
                </button>
              ) : (
                <div style={{ width: 34 }} />
              )}
              <button
                onClick={() => setPlanHeaderExpanded(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
              >
                <span style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>Meu Plano de Treino</span>
                <ChevronDown size={16} color="#fff" style={{ transform: planHeaderExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>
              <button onClick={() => { setStep(1); setView('questionnaire'); }} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '20px', cursor: 'pointer', color: '#fff', fontSize: '12px', fontWeight: 600 }}>
                Editar
              </button>
            </div>
            {planHeaderExpanded && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
                <Badge label={plan.splitName} />
                <Badge label={getGoalLabel(profile.goal as WorkoutGoal)} />
                <Badge label={getLevelLabel(profile.level as ExperienceLevel)} />
                <Badge label={`${profile.trainingDays?.length ?? 0}x/semana`} />
              </div>
            )}
          </div>

          {/* Custom session card — replaces "Treino do Dia" when set */}
          {customSession && (
            <div style={{ padding: '12px 16px 0' }}>
              <div style={{
                borderRadius: '20px', overflow: 'hidden',
                border: '2px solid #0D9F6E',
                background: 'linear-gradient(135deg, rgba(13,159,110,0.06), rgba(13,159,110,0.02))',
              }}>
                <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(13,159,110,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#0D9F6E', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      🎯 Meu Treino Personalizado
                    </span>
                    <button
                      onClick={() => setCustomSession(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px', display: 'flex', alignItems: 'center' }}
                      title="Remover treino personalizado"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-1)', marginBottom: '2px' }}>{customSession.sessionName}</div>
                      <div style={{ fontSize: '12px', color: '#0D9F6E', fontWeight: 600 }}>{customSession.focusLabel}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-2)' }}>
                      <Clock size={12} />&nbsp;~{customSession.estimatedMinutes}min
                    </div>
                  </div>
                </div>
                <div style={{ padding: '10px 16px 6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {isPremium ? (
                    <button
                      onClick={() => handleStartPlayer(customSession)}
                      style={{
                        width: '100%', padding: '12px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                        color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      }}
                    >
                      <Play size={14} fill="#fff" /> Iniciar Treino
                    </button>
                  ) : (
                    <button
                      onClick={onUpgrade}
                      style={{
                        width: '100%', padding: '12px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(139,92,246,0.08))',
                        border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B',
                        fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                      }}
                    >
                      <Crown size={14} /> Desbloquear Player
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const preloaded = new Set(customSession.primaryMuscles as MuscleGroup[]);
                      setMbPhase('groups');
                      setMbMuscles(preloaded);
                      setMbCurrentMuscle(null);
                      setMbSelectedIds(new Map());
                      setView('muscle-builder');
                    }}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '12px',
                      background: 'var(--bg-3)', border: '1.5px solid var(--border)',
                      color: 'var(--text-1)', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    <RotateCcw size={13} /> Alterar Treino
                  </button>
                </div>
                <div style={{ padding: '0 16px 12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {customSession.exercises.slice(0, 6).map(se => (
                      <span key={se.exercise.id} style={{ background: 'var(--bg-3)', padding: '2px 8px', borderRadius: '99px' }}>
                        {se.exercise.name}
                      </span>
                    ))}
                    {customSession.exercises.length > 6 && (
                      <span style={{ background: 'var(--bg-3)', padding: '2px 8px', borderRadius: '99px' }}>
                        +{customSession.exercises.length - 6} mais
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action banners */}
          <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Treino do Dia IA banner */}
            <button
              onClick={() => { setQuickMuscles(new Set()); setQuickCustom(''); setQuickError(null); setView('quick-picker'); }}
              style={{
                width: '100%', padding: '13px 16px', borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(13,159,110,0.1))',
                border: '1px solid rgba(139,92,246,0.25)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: 'linear-gradient(135deg, #8B5CF6, #0D9F6E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={18} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>
                  Treino do Dia com o Personal ✨
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                  Escolha os músculos de hoje e o Personal monta na hora
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            </button>

            {/* Montar Treino Personalizado banner */}
            <button
              onClick={() => {
                setMbPhase('groups');
                setMbMuscles(new Set());
                setMbCurrentMuscle(null);
                setMbSelectedIds(new Map());
                setView('muscle-builder');
              }}
              style={{
                width: '100%', padding: '13px 16px', borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(13,159,110,0.09), rgba(59,130,246,0.06))',
                border: '1px solid rgba(13,159,110,0.2)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
              }}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: 'linear-gradient(135deg, #0D9F6E, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Dumbbell size={18} color="#fff" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>
                  Montar Meu Treino 🎯
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                  {customSession ? `Editar: ${customSession.focusLabel}` : 'Escolha músculos e exercícios, do seu jeito'}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            </button>
          </div>

          {/* Week Calendar */}
          <div style={{ padding: '16px 16px 0', overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: '6px', minWidth: 'max-content' }}>
              {DAYS.map(({ key, label }) => {
                const s = plan.sessions.find(x => x.dayKey === key);
                const isToday = key === getTodayKey();
                const isSelected = key === selectedDayKey;
                const isRest = s?.isRestDay;
                return (
                  <button key={key} onClick={() => setSelectedDayKey(key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 10px', borderRadius: '14px', border: `2px solid ${isSelected ? accent : 'transparent'}`, background: isSelected ? 'rgba(13,159,110,0.1)' : isToday ? 'var(--bg-2)' : 'transparent', cursor: 'pointer', minWidth: '44px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: isSelected ? accent : 'var(--text-3)' }}>{label}</span>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isRest ? 'var(--bg-3)' : isToday ? '#F59E0B' : accent }} />
                    <span style={{ fontSize: '9px', color: isSelected ? accent : 'var(--text-3)', fontWeight: 500 }}>{isRest ? 'DSC' : s?.sessionName?.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session Detail */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 100px' }}>
            {selectedSession && !selectedSession.isRestDay ? (() => {
              const savedSession = savedCustomSessions.get(selectedDayKey);
              const displaySession = savedSession ?? selectedSession;
              const isCustomized = !!savedSession;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Session title card */}
                  <div style={{ padding: '18px 20px', borderRadius: '20px', background: 'var(--bg-2)', border: `1.5px solid ${isCustomized ? '#0D9F6E' : 'var(--border)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>{displaySession.sessionName}</h2>
                        {isCustomized && (
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#0D9F6E', background: 'rgba(13,159,110,0.1)', padding: '2px 8px', borderRadius: '99px', flexShrink: 0 }}>
                            🎯 Personalizado
                          </span>
                        )}
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-2)', fontWeight: 600, flexShrink: 0 }}>
                        <Clock size={13} /> ~{displaySession.estimatedMinutes}min
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: accent, fontWeight: 600, margin: '0 0 14px' }}>{displaySession.focusLabel}</p>

                    {/* Save custom session button — shown when customSession exists */}
                    {customSession && (
                      <button
                        onClick={() => handleSaveCustomForDay(selectedDayKey, customSession)}
                        style={{
                          width: '100%', padding: '11px', borderRadius: '12px', marginBottom: '8px',
                          background: saveSuccess ? 'rgba(13,159,110,0.12)' : 'rgba(13,159,110,0.07)',
                          border: `2px solid ${saveSuccess ? '#0D9F6E' : 'rgba(13,159,110,0.4)'}`,
                          color: '#0D9F6E', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                          transition: 'all 0.2s',
                        }}
                      >
                        {saveSuccess
                          ? <><Check size={14} /> Treino salvo com sucesso!</>
                          : <>💾 Salvar Treino Personalizado para {DAYS.find(d => d.key === selectedDayKey)?.label ?? selectedDayKey}</>}
                      </button>
                    )}

                    {/* Start Workout Button */}
                    {isPremium ? (
                      <button onClick={() => handleStartPlayer(displaySession)} style={{ width: '100%', padding: '13px', borderRadius: '12px', background: `linear-gradient(135deg, ${accent}, #057A55)`, color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Play size={16} fill="#fff" /> Iniciar Treino
                      </button>
                    ) : (
                      <button onClick={onUpgrade} style={{ width: '100%', padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Crown size={16} /> Desbloqueie o Player de Treino
                      </button>
                    )}

                    {/* Restore recommendation link — shown when saved custom exists */}
                    {isCustomized && (
                      <button
                        onClick={() => handleClearCustomForDay(selectedDayKey)}
                        style={{ background: 'none', border: 'none', padding: '8px 0 0', cursor: 'pointer', color: 'var(--text-3)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', width: '100%', justifyContent: 'center' }}
                      >
                        <RotateCcw size={11} /> Restaurar treino recomendado pela IA
                      </button>
                    )}
                  </div>

                  {/* Warmup */}
                  {displaySession.warmup.length > 0 && (
                    <SectionCard title="🔥 Aquecimento" items={displaySession.warmup.map(w => `${w.name} — ${w.duration}`)} />
                  )}

                  {/* Exercises */}
                  <div style={{ borderRadius: '20px', background: 'var(--bg-2)', border: `1.5px solid ${isCustomized ? 'rgba(13,159,110,0.25)' : 'var(--border)'}`, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
                        💪 {displaySession.exercises.length} Exercícios
                      </h3>
                      {isCustomized && (
                        <span style={{ fontSize: '11px', color: '#0D9F6E', fontWeight: 600 }}>Personalizado</span>
                      )}
                    </div>
                    {displaySession.exercises.map((se, i) => (
                      <div key={`${se.exercise.id}-${i}`} style={{ padding: '14px 18px', borderBottom: i < displaySession.exercises.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(13,159,110,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: "'DM Mono', monospace", fontSize: '11px', fontWeight: 700, color: accent }}>
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-1)', marginBottom: '4px' }}>{se.exercise.name}</div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <Pill label={`${se.sets} séries`} />
                            <Pill label={`${se.reps} reps`} />
                            <Pill label={`${formatRest(se.restSeconds)} desc.`} />
                            <Pill label={`RPE ${se.rpe}`} />
                          </div>
                          {se.notes && <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px', lineHeight: 1.4 }}>💡 {se.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cooldown */}
                  {displaySession.cooldown.length > 0 && (
                    <SectionCard title="🧊 Volta à Calma" items={displaySession.cooldown.map(w => `${w.name} — ${w.duration}`)} />
                  )}

                  {/* Calorie Balance Card */}
                  <CalorieBurnCard
                    consumedKcal={todayCalories?.consumed ?? 0}
                    sessionMinutes={displaySession.estimatedMinutes}
                    weight={profile.weight ?? 75}
                    goal={(profile.goal ?? 'hypertrophy') as WorkoutGoal}
                    hasData={todayCalories !== null}
                  />

                  {/* Nutrition Integration Card */}
                  <NutritionCard nutrition={plan.nutritionTargets} goal={profile.goal as WorkoutGoal} />
                </div>
              );
            })() : (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>😴</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>Dia de Descanso</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '20px' }}>Seu corpo está se recuperando e crescendo. Mantenha a hidratação e a proteína alta hoje.</p>
                <NutritionCard nutrition={plan.nutritionTargets} goal={profile.goal as WorkoutGoal} restDay />
              </div>
            )}
          </div>

          {/* Onboarding mode: sticky "Avançar" button */}
          {onboardingMode && onOnboardingComplete && (
            <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-1)', flexShrink: 0 }}>
              <button
                onClick={onOnboardingComplete}
                style={{
                  width: '100%', padding: '15px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                  border: 'none', color: '#fff',
                  fontSize: 15, fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(13,159,110,0.3)',
                }}
              >
                Continuar com este plano →
              </button>
              <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 8 }}>
                Você pode editar seu plano a qualquer momento
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── QUICK PICKER ── */}
      {view === 'quick-picker' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #0D9F6E 100%)', padding: '20px 20px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <button onClick={() => setView(plan ? 'plan' : 'questionnaire')} style={{ padding: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: '#fff' }}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>Treino do Dia com o Personal</span>
              <button onClick={onClose} style={{ padding: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: '#fff' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              Selecione os músculos que quer trabalhar hoje e o Personal monta um treino para você em segundos.
            </p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 120px' }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '12px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              QUAIS MÚSCULOS VOCÊ QUER TREINAR HOJE?
            </p>

            {/* Muscle grid — multi-select */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { key: 'Peito', emoji: '🏋️', desc: 'Peitoral maior e menor' },
                { key: 'Costas', emoji: '🦅', desc: 'Dorsal, trapézio e romboides' },
                { key: 'Ombros', emoji: '💪', desc: 'Deltóide anterior, medial e posterior' },
                { key: 'Bíceps', emoji: '💪', desc: 'Bíceps braquial e braquial' },
                { key: 'Tríceps', emoji: '🦾', desc: 'Tríceps todas as cabeças' },
                { key: 'Pernas', emoji: '🦵', desc: 'Quadríceps, posteriores e glúteos' },
                { key: 'Glúteos', emoji: '🍑', desc: 'Glúteo máximo, médio e mínimo' },
                { key: 'Abdômen', emoji: '⚡', desc: 'Core, oblíquos e transverso' },
                { key: 'Panturrilha', emoji: '🦶', desc: 'Gastrocnêmio e sóleo' },
                { key: 'Antebraço', emoji: '🤜', desc: 'Flexores e extensores' },
              ].map(m => {
                const sel = quickMuscles.has(m.key);
                return (
                  <button
                    key={m.key}
                    onClick={() => setQuickMuscles(prev => {
                      const next = new Set(prev);
                      sel ? next.delete(m.key) : next.add(m.key);
                      return next;
                    })}
                    style={{
                      padding: '14px 12px', borderRadius: '16px', position: 'relative',
                      border: `2px solid ${sel ? '#8B5CF6' : 'var(--border)'}`,
                      background: sel ? 'rgba(139,92,246,0.10)' : 'var(--bg-2)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    {sel && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px', width: '18px', height: '18px', borderRadius: '50%', background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={11} color="#fff" strokeWidth={3} />
                      </div>
                    )}
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>{m.emoji}</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: sel ? '#8B5CF6' : 'var(--text-1)', marginBottom: '2px' }}>{m.key}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.3 }}>{m.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom muscle input */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '8px' }}>ADICIONAR OUTRO MÚSCULO:</p>
              <input
                type="text"
                placeholder="Ex: Posterior de coxa"
                value={quickCustom}
                onChange={e => setQuickCustom(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: '12px',
                  border: '1px solid var(--border)', background: 'var(--bg-2)',
                  color: 'var(--text-1)', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {quickError && (
              <div style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={14} /> {quickError}
              </div>
            )}
          </div>

          {/* Footer CTA */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleQuickWorkout}
              disabled={(quickMuscles.size === 0 && !quickCustom.trim()) || isQuickLoading}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: (quickMuscles.size > 0 || quickCustom.trim()) && !isQuickLoading
                  ? 'linear-gradient(135deg, #8B5CF6, #0D9F6E)'
                  : 'var(--bg-3)',
                color: (quickMuscles.size > 0 || quickCustom.trim()) ? '#fff' : 'var(--text-3)',
                border: 'none', fontWeight: 700, fontSize: '15px',
                cursor: (quickMuscles.size > 0 || quickCustom.trim()) && !isQuickLoading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              {isQuickLoading
                ? <><div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} /> Criando treino com o Personal...</>
                : <><Zap size={16} /> {(quickMuscles.size > 0 || quickCustom.trim()) ? `Crie com o Personal (${quickMuscles.size + (quickCustom.trim() ? 1 : 0)} músculo${quickMuscles.size + (quickCustom.trim() ? 1 : 0) !== 1 ? 's' : ''})` : 'Selecione ao menos 1 músculo'}</>}
            </button>
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── AI PREVIEW ── */}
      {view === 'ai-preview' && activeSession && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #0D9F6E 100%)', padding: '20px 20px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <button onClick={() => setView('quick-picker')} style={{ padding: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: '#fff' }}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>Treino Gerado pela IA ✨</span>
              <button onClick={onClose} style={{ padding: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: '#fff' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#fff', fontSize: '17px', marginBottom: '2px' }}>{activeSession.sessionName}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎯 {activeSession.focusLabel}</span>
                  <span>·</span>
                  <Clock size={12} />
                  <span>~{activeSession.estimatedMinutes} min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Exercise list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 120px' }}>
            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
              {[
                { label: 'Exercícios', value: `${activeSession.exercises.length}`, icon: '💪' },
                { label: 'Duração est.', value: `${activeSession.estimatedMinutes}min`, icon: '⏱' },
                { label: 'Foco', value: activeSession.focusLabel.split('+')[0].trim(), icon: '🎯' },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{ padding: '12px 8px', borderRadius: '14px', background: 'var(--bg-2)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>{value}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{label}</div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.4px', marginBottom: '10px', textTransform: 'uppercase' }}>
              Exercícios do treino
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeSession.exercises.map((se, idx) => (
                <div key={idx} style={{ padding: '14px 16px', borderRadius: '14px', background: 'var(--bg-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(139,92,246,0.12)', color: '#8B5CF6', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{se.exercise.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                      {se.sets} séries · {se.reps} reps · {formatRest(se.restSeconds)} descanso
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
            {isPremium ? (
              <button
                onClick={handleStartAiPlayer}
                style={{
                  width: '100%', padding: '15px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #8B5CF6, #0D9F6E)',
                  color: '#fff', border: 'none', fontWeight: 700, fontSize: '15px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <Play size={16} fill="#fff" /> Iniciar Treino
              </button>
            ) : (
              <button
                onClick={onUpgrade}
                style={{
                  width: '100%', padding: '15px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(139,92,246,0.08))',
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: '#F59E0B', fontWeight: 700, fontSize: '15px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <Crown size={16} /> Desbloqueie o Player de Treino
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MUSCLE BUILDER ── */}
      {view === 'muscle-builder' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #0D9F6E 0%, #059669 100%)', padding: '20px 20px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <button
                onClick={() => mbPhase === 'exercises' ? setMbPhase('groups') : setView(plan ? 'plan' : 'questionnaire')}
                style={{ padding: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: '#fff' }}
              >
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontWeight: 700, color: '#fff', fontSize: '15px' }}>
                {mbPhase === 'groups' ? 'Montar Meu Treino' : 'Escolher Exercícios'}
              </span>
              <button onClick={onClose} style={{ padding: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: '#fff' }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
              {mbPhase === 'groups'
                ? 'Selecione um ou mais grupos musculares que quer treinar hoje.'
                : `Escolha os exercícios por músculo. Você pode adicionar e remover à vontade.`}
            </p>
          </div>

          {/* ── Muscle Groups Phase ── */}
          {mbPhase === 'groups' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 100px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '12px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  QUAIS MÚSCULOS VOCÊ QUER TRABALHAR?
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {MB_MUSCLES.map(m => {
                    const isSelected = mbMuscles.has(m.muscle);
                    return (
                      <button
                        key={m.muscle}
                        onClick={() => {
                          setMbMuscles(prev => {
                            const next = new Set(prev);
                            isSelected ? next.delete(m.muscle) : next.add(m.muscle);
                            return next;
                          });
                        }}
                        style={{
                          padding: '14px 12px', borderRadius: '16px',
                          border: `2px solid ${isSelected ? '#0D9F6E' : 'var(--border)'}`,
                          background: isSelected ? 'rgba(13,159,110,0.09)' : 'var(--bg-2)',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                          position: 'relative',
                        }}
                      >
                        {isSelected && (
                          <div style={{
                            position: 'absolute', top: '8px', right: '8px',
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: '#0D9F6E', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Check size={11} color="#fff" strokeWidth={3} />
                          </div>
                        )}
                        <div style={{ fontSize: '22px', marginBottom: '6px' }}>{m.emoji}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: isSelected ? '#0D9F6E' : 'var(--text-1)', marginBottom: '2px' }}>{m.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.3 }}>{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Footer CTA — groups */}
              <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => {
                    const first = [...mbMuscles][0];
                    if (first) { setMbCurrentMuscle(first); setMbPhase('exercises'); }
                  }}
                  disabled={mbMuscles.size === 0}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '14px',
                    background: mbMuscles.size > 0 ? 'linear-gradient(135deg, #0D9F6E, #059669)' : 'var(--bg-3)',
                    color: mbMuscles.size > 0 ? '#fff' : 'var(--text-3)',
                    border: 'none', fontWeight: 700, fontSize: '15px',
                    cursor: mbMuscles.size > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s',
                  }}
                >
                  {mbMuscles.size > 0
                    ? `Escolher Exercícios (${mbMuscles.size} músculo${mbMuscles.size !== 1 ? 's' : ''}) →`
                    : 'Selecione ao menos 1 músculo'}
                </button>
              </div>
            </>
          )}

          {/* ── Exercises Phase ── */}
          {mbPhase === 'exercises' && (() => {
            const goal = (profile.goal ?? 'hypertrophy') as WorkoutGoal;
            const level = (profile.level ?? 'intermediate') as ExperienceLevel;
            const activeMuscle = mbCurrentMuscle ?? [...mbMuscles][0];
            const activeMuscleInfo = MB_MUSCLES.find(m => m.muscle === activeMuscle);
            const allExs = activeMuscle ? getExercisesByMuscle(activeMuscle) : [];
            const injuryKeys = (profile.injuries ?? []) as InjuryKey[];
            const filtered = filterByInjuries(allExs, injuryKeys);
            const compounds = filtered.filter(e => e.category !== 'isolation');
            const isolation = filtered.filter(e => e.category === 'isolation');
            const isStrengthFocus = goal === 'strength' || goal === 'hypertrophy';
            const maxCompRec = isStrengthFocus ? (level === 'advanced' ? 2 : 1) : 1;
            const maxIsoRec = !isStrengthFocus ? (level === 'advanced' ? 2 : 1) : (level === 'beginner' ? 0 : (level === 'advanced' ? 2 : 1));
            const recommended = new Set([...compounds.slice(0, maxCompRec), ...isolation.slice(0, maxIsoRec)].map(e => e.id));
            const currentSelected = activeMuscle ? (mbSelectedIds.get(activeMuscle) ?? new Set<string>()) : new Set<string>();
            const currentCount = currentSelected.size;

            const toggleExercise = (exId: string) => {
              if (!activeMuscle) return;
              setMbSelectedIds(prev => {
                const next = new Map(prev);
                const cur = new Set(next.get(activeMuscle) ?? []);
                cur.has(exId) ? cur.delete(exId) : cur.add(exId);
                next.set(activeMuscle, cur);
                return next;
              });
            };

            const renderExerciseButton = (ex: ReturnType<typeof getExercisesByMuscle>[number], color: string) => {
              const isSelected = currentSelected.has(ex.id);
              const isRecommended = recommended.has(ex.id);
              return (
                <button
                  key={ex.id}
                  onClick={() => toggleExercise(ex.id)}
                  style={{
                    padding: '12px 14px', borderRadius: '14px',
                    border: `2px solid ${isSelected ? color : isRecommended ? `${color}40` : 'var(--border)'}`,
                    background: isSelected ? `${color}14` : isRecommended ? `${color}06` : 'var(--bg-2)',
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: '10px',
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, marginTop: '1px',
                    border: `2px solid ${isSelected ? color : 'var(--border)'}`,
                    background: isSelected ? color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>{ex.name}</span>
                      {isRecommended && (
                        <span style={{ fontSize: '9px', fontWeight: 700, color, background: `${color}20`, padding: '1px 6px', borderRadius: '99px' }}>
                          RECOMENDADO
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0, lineHeight: 1.4 }}>{ex.tip}</p>
                  </div>
                </button>
              );
            };

            return (
              <>
                {/* Muscle tabs */}
                <div style={{ display: 'flex', gap: '6px', padding: '12px 16px 0', overflowX: 'auto' }}>
                  {[...mbMuscles].map(muscle => {
                    const info = MB_MUSCLES.find(m => m.muscle === muscle)!;
                    const count = mbSelectedIds.get(muscle)?.size ?? 0;
                    const isActive = activeMuscle === muscle;
                    return (
                      <button
                        key={muscle}
                        onClick={() => setMbCurrentMuscle(muscle)}
                        style={{
                          padding: '7px 12px', borderRadius: '99px', whiteSpace: 'nowrap', flexShrink: 0,
                          background: isActive ? '#0D9F6E' : 'var(--bg-2)',
                          color: isActive ? '#fff' : 'var(--text-2)',
                          border: `1.5px solid ${isActive ? '#0D9F6E' : 'var(--border)'}`,
                          fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {info.emoji} {info.label}{count > 0 ? ` (${count})` : ''}
                      </button>
                    );
                  })}
                </div>

                {/* Counter */}
                <div style={{ padding: '8px 18px 0' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', margin: 0 }}>
                    {currentCount} exercício{currentCount !== 1 ? 's' : ''} selecionado{currentCount !== 1 ? 's' : ''} em {activeMuscleInfo?.label ?? ''}
                    {mbTotalSelected > 0 && ` · ${mbTotalSelected} no total`}
                  </p>
                </div>

                {/* Exercise list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 100px' }}>
                  {compounds.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#0D9F6E', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        Exercícios Compostos
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {compounds.map(ex => renderExerciseButton(ex, '#0D9F6E'))}
                      </div>
                    </div>
                  )}
                  {isolation.length > 0 && (
                    <div>
                      <p style={{ fontSize: '11px', fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        Exercícios de Isolamento
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {isolation.map(ex => renderExerciseButton(ex, '#8B5CF6'))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer CTA — exercises */}
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 20px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={handleSaveMuscleBuilder}
                    disabled={mbTotalSelected === 0}
                    style={{
                      width: '100%', padding: '14px', borderRadius: '14px',
                      background: mbTotalSelected > 0 ? 'linear-gradient(135deg, #0D9F6E, #059669)' : 'var(--bg-3)',
                      color: mbTotalSelected > 0 ? '#fff' : 'var(--text-3)',
                      border: 'none', fontWeight: 700, fontSize: '15px',
                      cursor: mbTotalSelected > 0 ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Check size={16} />
                    {mbTotalSelected > 0
                      ? `Salvar Meu Treino (${mbTotalSelected} exercício${mbTotalSelected !== 1 ? 's' : ''})`
                      : 'Selecione ao menos 1 exercício'}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── PLAYER ── */}
      {view === 'player' && activeSession && (
        <WorkoutPlayer
          session={activeSession}
          exerciseIdx={playerExIdx}
          setIdx={playerSetIdx}
          isResting={isResting}
          restTimer={restTimer}
          onCompleteSet={() => handleCompleteSet(activeSession)}
          onSkipRest={() => { clearInterval(restRef.current!); setIsResting(false); }}
          onPrev={() => { clearInterval(restRef.current!); setIsResting(false); if (playerExIdx > 0) { setPlayerExIdx(i => i - 1); setPlayerSetIdx(0); } else setView(fromAiRef.current ? 'ai-preview' : 'plan'); }}
          onClose={() => { clearInterval(restRef.current!); setView(fromAiRef.current ? 'ai-preview' : 'plan'); }}
          goal={profile.goal as WorkoutGoal}
        />
      )}

      {/* ── DONE ── */}
      {view === 'done' && completedSession && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ background: 'linear-gradient(135deg, #0D9F6E 0%, #057A55 100%)', padding: '40px 24px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🏆</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.4px' }}>Treino Concluído!</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>{completedSession.sessionName}</p>
          </div>

          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { icon: '⏱', label: 'Duração', value: `${completedSession.durationMinutes} min` },
                { icon: '💪', label: 'Exercícios', value: `${completedSession.exerciseCount}` },
                { icon: '🔥', label: 'Queima est.', value: `${completedSession.estimatedBurn} kcal` },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ padding: '14px 10px', borderRadius: '16px', background: 'var(--bg-2)', border: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', marginBottom: '4px' }}>{icon}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>{value}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(13,159,110,0.08)', border: '1px solid rgba(13,159,110,0.2)' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
                💡 <strong style={{ color: 'var(--text-1)' }}>Recuperação nutricional:</strong> Consuma proteína e carboidratos na janela pós-treino (até 45 min) para maximizar a síntese muscular.
              </p>
            </div>

            {todayCalories !== null && (
              <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '6px', fontWeight: 600 }}>Saldo calórico de hoje</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: '#EF4444' }}>{todayCalories.consumed.toLocaleString('pt-BR')}</span> kcal consumidas
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>−</span>
                  <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: '#0D9F6E' }}>{completedSession.estimatedBurn.toLocaleString('pt-BR')}</span> kcal queimadas
                  </div>
                </div>
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace", fontSize: '16px', fontWeight: 800,
                    color: (todayCalories.consumed - completedSession.estimatedBurn) < 0 ? '#0D9F6E' : '#F59E0B',
                  }}>
                    {todayCalories.consumed - completedSession.estimatedBurn > 0 ? '+' : ''}
                    {(todayCalories.consumed - completedSession.estimatedBurn).toLocaleString('pt-BR')} kcal líquidas
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => { setCompletedSession(null); setView('plan'); }}
              style={{
                width: '100%', padding: '15px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                color: '#fff', border: 'none', fontSize: '15px', fontWeight: 700,
                cursor: 'pointer', marginTop: '4px',
              }}
            >
              Ver meu plano de treino →
            </button>

            <button
              onClick={onClose}
              style={{
                width: '100%', padding: '13px', borderRadius: '14px',
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                color: 'var(--text-2)', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SUB-COMPONENTS ──

function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.4px', marginBottom: '6px', lineHeight: 1.3 }}>{title}</h1>
      <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.5 }}>{subtitle}</p>
    </div>
  );
}

function OptionCard({ selected, onClick, icon, label, sub, accent }: { selected: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub: string; accent: string }) {
  return (
    <button onClick={onClick} style={{ padding: '16px', borderRadius: '16px', border: `2px solid ${selected ? accent : 'var(--border)'}`, background: selected ? 'rgba(13,159,110,0.06)' : 'var(--bg-2)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: '12px', transition: 'all 0.15s' }}>
      <div style={{ padding: '8px', borderRadius: '10px', background: selected ? 'rgba(13,159,110,0.12)' : 'var(--bg-3)', color: selected ? accent : 'var(--text-2)', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-1)', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.4 }}>{sub}</div>
      </div>
      {selected && <div style={{ marginLeft: 'auto', color: accent, flexShrink: 0 }}><Check size={18} /></div>}
    </button>
  );
}

function NumberInput({ label, value, min, max, step = 1, placeholder, onChange }: { label: string; value?: number; min: number; max: number; step?: number; placeholder?: string; onChange: (v: number | undefined) => void }) {
  return (
    <div>
      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>{label}</label>
      <input type="number" value={value ?? ''} min={min} max={max} step={step} placeholder={placeholder ?? ''}
        onChange={e => { const v = e.target.value === '' ? undefined : Number(e.target.value); onChange(v); }}
        style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', background: 'var(--bg-2)', border: '1.5px solid var(--border)', color: 'var(--text-1)', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span style={{ padding: '4px 10px', borderRadius: '99px', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '11px', fontWeight: 700 }}>{label}</span>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-3)', color: 'var(--text-2)', fontSize: '11px', fontWeight: 600 }}>{label}</span>
  );
}

function SectionCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ padding: '16px 18px', borderRadius: '18px', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '10px' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-3)', marginTop: '8px', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NutritionCard({ nutrition, goal, restDay = false }: { nutrition: WorkoutPlan['nutritionTargets']; goal: WorkoutGoal; restDay?: boolean }) {
  const restDayCalories = restDay ? Math.round(nutrition.calories * 0.9) : nutrition.calories;
  const restDayCarbs = restDay ? Math.round(nutrition.carbs * 0.8) : nutrition.carbs;
  return (
    <div style={{ padding: '18px 20px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(13,159,110,0.07), rgba(59,130,246,0.05))', border: '1px solid rgba(13,159,110,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <Apple size={16} style={{ color: '#0D9F6E' }} />
        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-1)' }}>
          {restDay ? 'Nutrição — Dia de Descanso' : 'Nutrição — Dia de Treino'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {[
          { label: 'Calorias', val: `${restDayCalories}`, unit: 'kcal', color: '#0D9F6E' },
          { label: 'Proteína', val: `${nutrition.protein}g`, unit: 'proteinase', color: '#EF4444' },
          { label: 'Carboidrato', val: `${restDayCarbs}g`, unit: '', color: '#F59E0B' },
          { label: 'Gordura', val: `${nutrition.fat}g`, unit: '', color: '#8B5CF6' },
          { label: 'Fibra', val: `${nutrition.fiber}g`, unit: '', color: '#10B981' },
          { label: 'TDEE', val: `${nutrition.tdee}`, unit: 'kcal', color: 'var(--text-2)' },
        ].map(item => (
          <div key={item.label} style={{ padding: '10px', borderRadius: '12px', background: 'var(--bg-2)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '15px', fontWeight: 700, color: item.color }}>{item.val}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{item.label}</div>
          </div>
        ))}
      </div>
      {restDay ? (
        <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>💡 Mantenha a proteína alta. Reduza carboidratos em ~20%. Foco em alimentos anti-inflamatórios.</p>
      ) : (
        <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>💡 Concentre <strong>35-40% dos carboidratos</strong> no pré-treino e <strong>30%</strong> no pós-treino para máxima recuperação.</p>
      )}
    </div>
  );
}

function CalorieBurnCard({ consumedKcal, sessionMinutes, weight, goal, hasData }: {
  consumedKcal: number;
  sessionMinutes: number;
  weight: number;
  goal: WorkoutGoal;
  hasData: boolean;
}) {
  const MET_MAP: Record<WorkoutGoal, number> = {
    hypertrophy: 5.0,
    strength: 4.5,
    fat_loss: 6.0,
    endurance: 6.5,
    wellness: 4.0,
  };
  const met = MET_MAP[goal] ?? 5.0;
  const estimatedBurn = Math.round(met * weight * (sessionMinutes / 60));
  const net = consumedKcal - estimatedBurn;
  const pct = consumedKcal > 0 ? Math.min(100, Math.round((estimatedBurn / consumedKcal) * 100)) : 0;

  return (
    <div style={{ padding: '16px 18px', borderRadius: '18px', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <Flame size={15} style={{ color: '#EF4444' }} />
        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-1)' }}>Balanço Calórico do Dia</span>
      </div>

      {!hasData ? (
        <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-3)', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0 }}>
            📸 Registre sua primeira refeição hoje para ver o balanço calórico aqui.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', textAlign: 'center' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '16px', fontWeight: 700, color: '#EF4444' }}>{consumedKcal.toLocaleString('pt-BR')}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>Consumidas</div>
            </div>
            <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(13,159,110,0.06)', border: '1px solid rgba(13,159,110,0.15)', textAlign: 'center' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '16px', fontWeight: 700, color: '#0D9F6E' }}>{estimatedBurn.toLocaleString('pt-BR')}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>Queima est.</div>
            </div>
            <div style={{ padding: '10px', borderRadius: '12px', background: net <= 0 ? 'rgba(13,159,110,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${net <= 0 ? 'rgba(13,159,110,0.15)' : 'rgba(245,158,11,0.15)'}`, textAlign: 'center' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '16px', fontWeight: 700, color: net <= 0 ? '#0D9F6E' : '#F59E0B' }}>
                {net > 0 ? '+' : ''}{net.toLocaleString('pt-BR')}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>Saldo líq.</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-3)', marginBottom: '4px' }}>
              <span>Queima vs Consumo</span>
              <span>{pct}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '99px', background: 'var(--bg-3)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, background: pct >= 80 ? 'linear-gradient(90deg, #0D9F6E, #10B981)' : 'linear-gradient(90deg, #F59E0B, #EF4444)', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        </>
      )}
      <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: hasData ? 0 : '8px 0 0', lineHeight: 1.4 }}>
        💡 Queima estimada: {estimatedBurn} kcal em {sessionMinutes} min (MET {met.toFixed(1)}, {weight}kg).
      </p>
    </div>
  );
}

function WorkoutPlayer({ session, exerciseIdx, setIdx, isResting, restTimer, onCompleteSet, onSkipRest, onPrev, onClose, goal }: {
  session: WorkoutSession; exerciseIdx: number; setIdx: number;
  isResting: boolean; restTimer: number;
  onCompleteSet: () => void; onSkipRest: () => void; onPrev: () => void; onClose: () => void;
  goal: WorkoutGoal;
}) {
  const currentExercise = session.exercises[exerciseIdx];
  const totalSets = currentExercise.sets;
  const progress = ((exerciseIdx * totalSets + setIdx) / (session.exercises.reduce((a, e) => a + e.sets, 0))) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Player Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onPrev} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>{session.sessionName}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-1)', fontWeight: 700 }}>Exercício {exerciseIdx + 1} de {session.exercises.length}</div>
        </div>
        <button onClick={onClose} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}>
          <X size={20} />
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ height: '3px', background: 'var(--bg-3)' }}>
        <div style={{ height: '100%', background: '#0D9F6E', width: `${progress}%`, transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 120px' }}>
        {/* Exercise Name */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '99px', background: 'rgba(13,159,110,0.1)', color: '#0D9F6E', fontSize: '11px', fontWeight: 700, marginBottom: '10px' }}>
            <Dumbbell size={10} /> {currentExercise.exercise.category === 'compound' ? 'COMPOSTO' : currentExercise.exercise.category === 'bodyweight' ? 'PESO CORPORAL' : 'ISOLAMENTO'}
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.4px' }}>{currentExercise.exercise.name}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
            {currentExercise.sets} séries · {currentExercise.reps} reps · RPE {currentExercise.rpe}
          </p>
        </div>

        {/* Sets Tracker */}
        <div style={{ borderRadius: '20px', background: 'var(--bg-2)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>Série {setIdx + 1} de {totalSets}</span>
          </div>
          {Array.from({ length: totalSets }).map((_, i) => (
            <div key={i} style={{ padding: '12px 18px', borderBottom: i < totalSets - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px', opacity: i > setIdx ? 0.4 : 1 }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: i < setIdx ? '#0D9F6E' : i === setIdx ? 'rgba(13,159,110,0.15)' : 'var(--bg-3)', border: `2px solid ${i <= setIdx ? '#0D9F6E' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {i < setIdx && <Check size={12} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: '14px', color: 'var(--text-1)', fontWeight: i === setIdx ? 700 : 400 }}>
                Série {i + 1} — {currentExercise.reps} reps
              </span>
            </div>
          ))}
        </div>

        {/* Tip */}
        {currentExercise.notes && (
          <div style={{ padding: '14px 16px', borderRadius: '14px', background: 'rgba(13,159,110,0.05)', border: '1px solid rgba(13,159,110,0.15)' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>💡 {currentExercise.notes}</p>
          </div>
        )}

        {/* Rest Timer */}
        <AnimatePresence>
          {isResting && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ marginTop: '20px', padding: '20px', borderRadius: '20px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', textAlign: 'center' }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '40px', fontWeight: 700, color: '#3B82F6' }}>
                {Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, '0')}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '4px 0 14px' }}>Descanso entre séries</p>
              <button onClick={onSkipRest} style={{ padding: '8px 20px', borderRadius: '10px', background: 'none', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: '13px', cursor: 'pointer' }}>
                Pular descanso →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Player Footer */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
        <button onClick={onCompleteSet} disabled={isResting} style={{ width: '100%', padding: '15px', borderRadius: '14px', background: isResting ? 'var(--bg-3)' : 'linear-gradient(135deg, #0D9F6E, #057A55)', color: isResting ? 'var(--text-3)' : '#fff', fontWeight: 700, fontSize: '15px', border: 'none', cursor: isResting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {isResting ? <><Clock size={16} /> Descansando...</> : <><Check size={16} /> Série Concluída</>}
        </button>
      </div>
    </div>
  );
}
