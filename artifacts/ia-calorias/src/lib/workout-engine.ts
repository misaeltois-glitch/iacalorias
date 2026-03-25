import { exercises, filterByEquipment, filterByInjuries, type Exercise, type MuscleGroup, type Equipment, type InjuryKey } from './exercise-database';

export type WorkoutGoal = 'hypertrophy' | 'strength' | 'fat_loss' | 'endurance' | 'wellness';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type GymType = 'full_gym' | 'home_gym' | 'bodyweight' | 'custom';
export type CardioType = 'none' | 'light' | 'moderate' | 'hiit';
export type WarmupType = 'full' | 'basic' | 'none';

export interface WorkoutProfile {
  goal: WorkoutGoal;
  sex: 'male' | 'female';
  age: number;
  weight: number;
  height: number;
  bodyFat?: number;
  waist?: number;
  level: ExperienceLevel;
  trainingDays: string[];
  sessionDuration: number;
  preferredTime?: string;
  gym: GymType;
  equipment: string[];
  hasInjuries: boolean;
  injuries: string[];
  medicalNotes?: string;
  cardio: CardioType;
  warmup: WarmupType;
  techniques: string[];
}

export interface SessionExercise {
  exercise: Exercise;
  order: number;
  sets: number;
  reps: string;
  restSeconds: number;
  rpe: number;
  notes?: string;
}

export interface WarmupItem {
  name: string;
  duration: string;
}

export interface WorkoutSession {
  dayKey: string;
  dayLabel: string;
  sessionName: string;
  focusLabel: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  warmup: WarmupItem[];
  exercises: SessionExercise[];
  cooldown: WarmupItem[];
  estimatedMinutes: number;
  isRestDay: boolean;
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  tmb: number;
  tdee: number;
  activityFactor: number;
}

export interface WorkoutPlan {
  splitName: string;
  sessions: WorkoutSession[];
  nutritionTargets: NutritionTargets;
  deloadWeek: number;
  generatedAt: string;
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Segunda', tue: 'Terça', wed: 'Quarta',
  thu: 'Quinta', fri: 'Sexta', sat: 'Sábado', sun: 'Domingo',
};
const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// ═══ CÁLCULOS DE NUTRIÇÃO ═══

export function calculateTMB(profile: WorkoutProfile): number {
  if (profile.bodyFat && profile.bodyFat > 0) {
    const leanMass = profile.weight * (1 - profile.bodyFat / 100);
    return 370 + 21.6 * leanMass;
  }
  if (profile.sex === 'male') {
    return 88.362 + 13.397 * profile.weight + 4.799 * profile.height - 5.677 * profile.age;
  }
  return 447.593 + 9.247 * profile.weight + 3.098 * profile.height - 4.33 * profile.age;
}

export function getActivityFactor(daysPerWeek: number): number {
  if (daysPerWeek === 0) return 1.2;
  if (daysPerWeek <= 2) return 1.375;
  if (daysPerWeek <= 4) return 1.55;
  if (daysPerWeek <= 6) return 1.725;
  return 1.9;
}

export function calculateNutrition(profile: WorkoutProfile): NutritionTargets {
  const tmb = Math.round(calculateTMB(profile));
  const activityFactor = getActivityFactor(profile.trainingDays.length);
  const tdee = Math.round(tmb * activityFactor);

  const adjustments: Record<WorkoutGoal, number> = {
    hypertrophy: 400, strength: 300, fat_loss: -400, endurance: 0, wellness: -100,
  };
  let calories = Math.round(tdee + adjustments[profile.goal]);

  const minCal = profile.sex === 'female' ? 1200 : 1500;
  calories = Math.max(calories, minCal);

  const macroMultipliers: Record<WorkoutGoal, { protein: number; fat: number; fiber: number }> = {
    hypertrophy: { protein: 2.0, fat: 0.9, fiber: 30 },
    strength:    { protein: 1.8, fat: 1.0, fiber: 28 },
    fat_loss:    { protein: 2.2, fat: 0.7, fiber: 35 },
    endurance:   { protein: 1.6, fat: 0.9, fiber: 28 },
    wellness:    { protein: 1.4, fat: 1.0, fiber: 27 },
  };
  const m = macroMultipliers[profile.goal];
  const protein = Math.round(profile.weight * m.protein);
  const fat = Math.round(profile.weight * m.fat);
  const proteinCal = protein * 4;
  const fatCal = fat * 9;
  const carbs = Math.round(Math.max(0, calories - proteinCal - fatCal) / 4);

  return { calories, protein, carbs, fat, fiber: m.fiber, tmb, tdee, activityFactor };
}

// ═══ SELEÇÃO DO SPLIT ═══

interface SplitSession {
  sessionName: string;
  focusLabel: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
}

function determineSplit(profile: WorkoutProfile): SplitSession[] {
  const { trainingDays, level, goal } = profile;
  const days = trainingDays.length;

  if (days <= 2) {
    return [
      { sessionName: 'Full Body A', focusLabel: 'Corpo Todo — Ênfase Superior', primaryMuscles: ['chest', 'back', 'shoulders'], secondaryMuscles: ['triceps', 'biceps', 'quads', 'abs'] },
      { sessionName: 'Full Body B', focusLabel: 'Corpo Todo — Ênfase Inferior', primaryMuscles: ['quads', 'hamstrings', 'glutes'], secondaryMuscles: ['calves', 'back', 'abs'] },
    ];
  }

  if (days === 3) {
    if (level === 'beginner') {
      return [
        { sessionName: 'Full Body A', focusLabel: 'Corpo Todo A', primaryMuscles: ['chest', 'back', 'quads'], secondaryMuscles: ['shoulders', 'abs'] },
        { sessionName: 'Full Body B', focusLabel: 'Corpo Todo B', primaryMuscles: ['back', 'hamstrings', 'glutes'], secondaryMuscles: ['biceps', 'abs'] },
        { sessionName: 'Full Body C', focusLabel: 'Corpo Todo C', primaryMuscles: ['shoulders', 'quads', 'chest'], secondaryMuscles: ['triceps', 'calves'] },
      ];
    }
    return [
      { sessionName: 'Push', focusLabel: 'Peito, Ombros, Tríceps', primaryMuscles: ['chest', 'shoulders'], secondaryMuscles: ['triceps'] },
      { sessionName: 'Pull', focusLabel: 'Costas e Bíceps', primaryMuscles: ['back'], secondaryMuscles: ['biceps', 'shoulders'] },
      { sessionName: 'Legs', focusLabel: 'Pernas e Glúteos', primaryMuscles: ['quads', 'hamstrings', 'glutes'], secondaryMuscles: ['calves', 'abs'] },
    ];
  }

  if (days === 4) {
    if (level === 'beginner') {
      return [
        { sessionName: 'Upper A', focusLabel: 'Superior A — Peito + Costas', primaryMuscles: ['chest', 'back'], secondaryMuscles: ['triceps', 'biceps'] },
        { sessionName: 'Lower A', focusLabel: 'Inferior A — Quadríceps', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['calves', 'abs'] },
        { sessionName: 'Upper B', focusLabel: 'Superior B — Ombros + Costas', primaryMuscles: ['shoulders', 'back'], secondaryMuscles: ['triceps', 'biceps'] },
        { sessionName: 'Lower B', focusLabel: 'Inferior B — Posteriores', primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['calves', 'abs'] },
      ];
    }
    return [
      { sessionName: 'Push', focusLabel: 'Peito, Ombros, Tríceps', primaryMuscles: ['chest', 'shoulders'], secondaryMuscles: ['triceps'] },
      { sessionName: 'Pull', focusLabel: 'Costas e Bíceps', primaryMuscles: ['back'], secondaryMuscles: ['biceps'] },
      { sessionName: 'Legs', focusLabel: 'Pernas e Glúteos', primaryMuscles: ['quads', 'hamstrings', 'glutes'], secondaryMuscles: ['calves'] },
      { sessionName: 'Upper', focusLabel: 'Superior Completo', primaryMuscles: ['chest', 'back', 'shoulders'], secondaryMuscles: ['triceps', 'biceps', 'abs'] },
    ];
  }

  if (days === 5) {
    return [
      { sessionName: 'Push A', focusLabel: 'Peito, Ombros, Tríceps', primaryMuscles: ['chest', 'shoulders'], secondaryMuscles: ['triceps'] },
      { sessionName: 'Pull A', focusLabel: 'Costas e Bíceps', primaryMuscles: ['back'], secondaryMuscles: ['biceps', 'shoulders'] },
      { sessionName: 'Legs', focusLabel: 'Pernas Completo', primaryMuscles: ['quads', 'hamstrings', 'glutes'], secondaryMuscles: ['calves', 'abs'] },
      { sessionName: 'Upper', focusLabel: 'Superior — Volume Extra', primaryMuscles: ['chest', 'back'], secondaryMuscles: ['shoulders', 'triceps', 'biceps'] },
      { sessionName: 'Lower', focusLabel: 'Inferior — Volume Extra', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'calves', 'abs'] },
    ];
  }

  return [
    { sessionName: 'Push A', focusLabel: 'Peito, Ombros, Tríceps', primaryMuscles: ['chest', 'shoulders'], secondaryMuscles: ['triceps'] },
    { sessionName: 'Pull A', focusLabel: 'Costas e Bíceps', primaryMuscles: ['back'], secondaryMuscles: ['biceps'] },
    { sessionName: 'Legs A', focusLabel: 'Pernas — Volume Alto', primaryMuscles: ['quads', 'hamstrings', 'glutes'], secondaryMuscles: ['calves'] },
    { sessionName: 'Push B', focusLabel: 'Peito e Ombros — Intensidade', primaryMuscles: ['chest', 'shoulders'], secondaryMuscles: ['triceps', 'abs'] },
    { sessionName: 'Pull B', focusLabel: 'Costas — Intensidade', primaryMuscles: ['back'], secondaryMuscles: ['biceps', 'abs'] },
    { sessionName: 'Legs B', focusLabel: 'Pernas — Isolamento', primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'calves'] },
  ];
}

// ═══ SELEÇÃO DE EXERCÍCIOS ═══

function getAvailableEquipment(profile: WorkoutProfile): Equipment[] {
  if (profile.gym === 'full_gym') return ['barbell', 'dumbbells', 'bench', 'cable', 'machine', 'pullup_bar', 'dips_bar', 'ez_bar', 'bands', 'none', 'leg_press', 'smith', 'kettlebell'];
  if (profile.gym === 'home_gym') return ['dumbbells', 'bench', 'bands', 'none', 'pullup_bar', 'barbell'];
  if (profile.gym === 'bodyweight') return ['none', 'pullup_bar', 'dips_bar', 'bands'];
  return profile.equipment.length ? profile.equipment as Equipment[] : ['dumbbells', 'none', 'bands'];
}

function getInjuryKeys(injuries: string[]): InjuryKey[] {
  return injuries as InjuryKey[];
}

function selectExercisesForMuscle(
  muscle: MuscleGroup,
  available: Equipment[],
  injuries: InjuryKey[],
  isPrimary: boolean,
  goal: WorkoutGoal,
  level: ExperienceLevel,
): Exercise[] {
  let pool = exercises.filter(e => e.primaryMuscle === muscle);
  pool = filterByEquipment(pool, available);
  pool = filterByInjuries(pool, injuries);

  const maxExs = isPrimary ? (level === 'advanced' ? 4 : 3) : (level === 'advanced' ? 2 : 1);

  const compounds = pool.filter(e => e.category === 'compound' || e.category === 'bodyweight');
  const isolation = pool.filter(e => e.category === 'isolation');

  const selected: Exercise[] = [];

  if (isPrimary) {
    if (compounds.length > 0) selected.push(compounds[0]);
    if (compounds.length > 1 && selected.length < maxExs) selected.push(compounds[1]);
    if (isolation.length > 0 && selected.length < maxExs) selected.push(isolation[0]);
    if (isolation.length > 1 && selected.length < maxExs) selected.push(isolation[1]);
  } else {
    const all = [...compounds, ...isolation];
    if (all.length > 0) selected.push(all[0]);
    if (all.length > 1 && maxExs > 1) selected.push(all[1]);
  }

  return selected.slice(0, maxExs);
}

function calcPrescription(goal: WorkoutGoal, level: ExperienceLevel, isCompound: boolean): { sets: number; reps: string; restSeconds: number; rpe: number } {
  const baseSets = level === 'beginner' ? 3 : level === 'intermediate' ? 4 : 5;
  const sets = isCompound ? baseSets : Math.max(2, baseSets - 1);

  const repMap: Record<WorkoutGoal, { comp: string; iso: string }> = {
    hypertrophy: { comp: '8-12', iso: '10-15' },
    strength:    { comp: '3-6',  iso: '6-10'  },
    fat_loss:    { comp: '12-15', iso: '15-20' },
    endurance:   { comp: '15-20', iso: '20-25' },
    wellness:    { comp: '10-15', iso: '12-15' },
  };
  const reps = isCompound ? repMap[goal].comp : repMap[goal].iso;

  const restMap: Record<WorkoutGoal, { comp: number; iso: number }> = {
    hypertrophy: { comp: 90,  iso: 60  },
    strength:    { comp: 240, iso: 120 },
    fat_loss:    { comp: 45,  iso: 30  },
    endurance:   { comp: 30,  iso: 30  },
    wellness:    { comp: 60,  iso: 45  },
  };
  const restSeconds = isCompound ? restMap[goal].comp : restMap[goal].iso;

  const rpe = isCompound ? (goal === 'strength' ? 8 : 7) : 8;

  return { sets, reps, restSeconds, rpe };
}

function buildWarmup(primaryMuscles: MuscleGroup[], warmupType: WarmupType): WarmupItem[] {
  if (warmupType === 'none') return [];
  const full = warmupType === 'full';
  const items: WarmupItem[] = [{ name: '5 min de caminhada ou bicicleta leve', duration: '5 min' }];
  if (full) {
    if (primaryMuscles.includes('chest') || primaryMuscles.includes('shoulders')) {
      items.push({ name: 'Rotação de ombros e mobilidade peitoral', duration: '2 min' });
    }
    if (primaryMuscles.includes('quads') || primaryMuscles.includes('hamstrings')) {
      items.push({ name: 'Mobilidade de quadril — mundo e agachamento sem peso', duration: '3 min' });
      items.push({ name: 'Ativação de glúteo com elástico', duration: '2 min' });
    }
    if (primaryMuscles.includes('back')) {
      items.push({ name: 'Mobilidade torácica com rolo', duration: '2 min' });
      items.push({ name: 'Band pull-apart — ativação de escapula', duration: '2x15' });
    }
  }
  return items;
}

function buildCooldown(): WarmupItem[] {
  return [
    { name: 'Alongamento quadríceps em pé', duration: '30s cada lado' },
    { name: 'Alongamento posterior de coxa deitado', duration: '30s cada lado' },
    { name: 'Alongamento peitoral na parede', duration: '30s cada lado' },
    { name: 'Respiração diafragmática — relaxamento', duration: '2 min' },
  ];
}

function estimateMinutes(exercises: SessionExercise[], warmup: WarmupItem[], goal: WorkoutGoal): number {
  const setTimeSeconds = goal === 'strength' ? 60 : 35;
  const exerciseTime = exercises.reduce((acc, e) => acc + e.sets * (setTimeSeconds + e.restSeconds), 0);
  const warmupTime = warmup.reduce((acc, _) => acc + 5 * 60, 0);
  return Math.round((exerciseTime + warmupTime + 5 * 60) / 60);
}

// ═══ GERAÇÃO DO PLANO ═══

export function generateWorkoutPlan(profile: WorkoutProfile): WorkoutPlan {
  const available = getAvailableEquipment(profile);
  const injuries = getInjuryKeys(profile.injuries);
  const splitSessions = determineSplit(profile);
  const nutrition = calculateNutrition(profile);

  const sessions: WorkoutSession[] = ALL_DAYS.map(dayKey => {
    const trainingIndex = profile.trainingDays.indexOf(dayKey);
    if (trainingIndex === -1) {
      return {
        dayKey, dayLabel: DAY_LABELS[dayKey],
        sessionName: 'Descanso', focusLabel: 'Dia de Descanso ativo',
        primaryMuscles: [], secondaryMuscles: [],
        warmup: [], exercises: [], cooldown: [],
        estimatedMinutes: 0, isRestDay: true,
      };
    }

    const split = splitSessions[trainingIndex % splitSessions.length];
    const warmup = buildWarmup(split.primaryMuscles, profile.warmup);
    const cooldown = buildCooldown();

    const sessionExercises: SessionExercise[] = [];
    let order = 1;

    for (const muscle of split.primaryMuscles) {
      const exs = selectExercisesForMuscle(muscle, available, injuries, true, profile.goal, profile.level);
      for (const ex of exs) {
        const isCompound = ex.category !== 'isolation';
        const presc = calcPrescription(profile.goal, profile.level, isCompound);
        sessionExercises.push({ exercise: ex, order: order++, ...presc, notes: ex.tip });
      }
    }
    for (const muscle of split.secondaryMuscles) {
      const exs = selectExercisesForMuscle(muscle, available, injuries, false, profile.goal, profile.level);
      for (const ex of exs) {
        const isCompound = ex.category !== 'isolation';
        const presc = calcPrescription(profile.goal, profile.level, isCompound);
        sessionExercises.push({ exercise: ex, order: order++, ...presc, notes: ex.tip });
      }
    }

    const trimmed = sessionExercises.slice(0, 8);
    const estimated = estimateMinutes(trimmed, warmup, profile.goal);

    return {
      dayKey, dayLabel: DAY_LABELS[dayKey],
      sessionName: split.sessionName, focusLabel: split.focusLabel,
      primaryMuscles: split.primaryMuscles, secondaryMuscles: split.secondaryMuscles,
      warmup, exercises: trimmed, cooldown,
      estimatedMinutes: estimated, isRestDay: false,
    };
  });

  const deloadWeeks: Record<ExperienceLevel, number> = { beginner: 8, intermediate: 6, advanced: 4 };
  const splitName = splitSessions.length <= 2 ? 'Full Body A/B' :
    splitSessions.length === 3 ? (profile.level === 'beginner' ? 'Full Body 3x' : 'Push/Pull/Legs') :
    splitSessions.length === 4 ? (profile.level === 'beginner' ? 'Upper/Lower 4x' : 'Push/Pull/Legs/Upper') :
    splitSessions.length === 5 ? 'PPLUL' : 'PPL x2';

  return { splitName, sessions, nutritionTargets: nutrition, deloadWeek: deloadWeeks[profile.level], generatedAt: new Date().toISOString() };
}

export function getTodayKey(): string {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[new Date().getDay()];
}

export function getGoalLabel(goal: WorkoutGoal): string {
  const labels: Record<WorkoutGoal, string> = {
    hypertrophy: 'Hipertrofia',
    strength: 'Força',
    fat_loss: 'Emagrecimento',
    endurance: 'Condicionamento',
    wellness: 'Saúde e Bem-Estar',
  };
  return labels[goal];
}

export function getLevelLabel(level: ExperienceLevel): string {
  return level === 'beginner' ? 'Iniciante' : level === 'intermediate' ? 'Intermediário' : 'Avançado';
}

export function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}min${seconds % 60 ? ` ${seconds % 60}s` : ''}`;
}
