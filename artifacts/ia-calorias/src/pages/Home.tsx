import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, PieChart, Settings, LogIn, LogOut, User, BarChart2, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

import { UploadZone } from '@/components/UploadZone';
import { ResultCard } from '@/components/ResultCard';
import { PaywallModal } from '@/components/PaywallModal';
import { OnboardingModal, type CalculatedGoals } from '@/components/OnboardingModal';
import { GoalsPanel } from '@/components/GoalsPanel';
import { DailyProgress } from '@/components/DailyProgress';
import { AnalyticsPanel } from '@/components/AnalyticsPanel';
import { AuthModal } from '@/components/AuthModal';
import { LGPDConsentPopup, useLGPDConsent } from '@/components/LGPDConsentPopup';
import { SplashScreen } from '@/components/SplashScreen';
import { OnboardingCarousel } from '@/components/OnboardingCarousel';
import { BottomNav, type BottomNavTab } from '@/components/BottomNav';
import { WorkoutPanel } from '@/components/WorkoutPanel';
import { ProgressView } from '@/components/ProgressView';
import { WaterTracker } from '@/components/WaterTracker';
import { AppTour } from '@/components/AppTour';
import { useTour } from '@/hooks/use-tour';
import { GoalCelebration, hasCelebratedToday, markCelebratedToday } from '@/components/GoalCelebration';
import { NutritionistChat } from '@/components/NutritionistChat';
import { WeightTracker } from '@/components/WeightTracker';
import { OnboardingAuthPrompt } from '@/components/OnboardingAuthPrompt';
import { MealPlanModal } from '@/components/MealPlanModal';
import { ProfileSetupBanner } from '@/components/ProfileSetupBanner';
import { InstallPrompt, OpenInAppBanner } from '@/components/InstallPrompt';
import { ReferralCard, applyPendingReferral, REFERRAL_CODE_KEY } from '@/components/ReferralCard';
import { MealReminders } from '@/components/MealReminders';
import { useMealReminders } from '@/hooks/use-meal-reminders';
import { RecipeSuggestor } from '@/components/RecipeSuggestor';
import { MealFoodPrefsModal } from '@/components/MealFoodPrefsModal';
import { SupportChat } from '@/components/SupportChat';
import { trackEvent } from '@/lib/tracking';

import {
  useAnalyzeFood,
  useGetSubscriptionStatus,
} from '@workspace/api-client-react';

import type { AnalysisResult } from '@workspace/api-client-react/src/generated/api.schemas';

type Period = 'day' | 'week' | 'month';

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';
const ONBOARDED_KEY = 'ia-calorias-onboarded';
const MANDATORY_ONBOARDING_KEY = 'ia-calorias-mandatory-done';
const FIRST_USE_TS_KEY = 'ia-calorias-first-use-ts';
const FREE_TRIAL_DAYS = 7;
const FREE_PERIOD_MS = FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000;
const WORKOUT_TRIAL_START_KEY = 'ia-calorias-workout-trial-ts';
const WORKOUT_TRIAL_MS = FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000;

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Cookie helpers — cookies persist longer than localStorage on iOS Safari
const ONBOARDED_COOKIE = 'iac_onboarded';
function setOnboardedCookie() {
  document.cookie = `${ONBOARDED_COOKIE}=1; max-age=31536000; SameSite=Lax; path=/`;
}
function isOnboardedCookie(): boolean {
  return document.cookie.split(';').some(c => c.trim().startsWith(`${ONBOARDED_COOKIE}=`));
}
function isAlreadyOnboarded(): boolean {
  return !!(
    localStorage.getItem(ONBOARDED_KEY) ||
    localStorage.getItem(MANDATORY_ONBOARDING_KEY) ||
    localStorage.getItem(AUTH_TOKEN_KEY) ||
    isOnboardedCookie()
  );
}

async function saveGoals(sessionId: string, goals: CalculatedGoals) {
  await fetch(`${BASE}api/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ sessionId, ...goals, restrictions: goals.restrictions }),
  });
}

async function fetchDailySummary(sessionId: string, period: Period = 'day') {
  const tzOffset = new Date().getTimezoneOffset(); // minutes behind UTC (positive = behind, e.g. 180 for UTC-3)
  const r = await fetch(`${BASE}api/goals/daily-summary?sessionId=${sessionId}&period=${period}&tzOffset=${tzOffset}`, { headers: authHeaders() });
  if (!r.ok) return null;
  return r.json();
}

function getHourGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function UsageBar({ remaining, max, onClick }: { remaining: number; max: number; onClick: () => void }) {
  const used = max - remaining;
  const pct = Math.min(100, (used / max) * 100);
  const isExpired = remaining === 0;
  const isUrgent = !isExpired && remaining <= 2;
  const barColor = isExpired ? '#EF4444' : isUrgent ? '#F59E0B' : '#10B981';
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: '12px',
        background: isExpired ? 'rgba(239,68,68,0.06)' : 'var(--bg-2)',
        border: `1px solid ${isExpired ? 'rgba(239,68,68,0.25)' : isUrgent ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
        cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500 }}>
          {isExpired ? '⚠️ Teste encerrado' : `🎁 Teste grátis · ${remaining} dia${remaining !== 1 ? 's' : ''}`}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
          background: isExpired ? 'rgba(239,68,68,0.12)' : 'rgba(13,159,110,0.10)',
          color: isExpired ? '#EF4444' : '#0D9F6E',
        }}>
          {isExpired ? 'Expirado' : 'Ativo'}
        </span>
      </div>
      <div style={{ width: '100%', height: '4px', borderRadius: '99px', background: 'var(--bg-3)' }}>
        <div style={{
          height: '100%', borderRadius: '99px', background: barColor,
          width: `${pct}%`, transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: '2px',
      }}>
        <span style={{ fontSize: '11px', color: isExpired ? '#EF4444' : isUrgent ? '#F59E0B' : 'var(--text-3)', fontWeight: 500 }}>
          {isExpired ? 'Faça upgrade para continuar analisando' : isUrgent ? `⏳ Últimos ${remaining} dia${remaining !== 1 ? 's' : ''}!` : 'Análises ilimitadas no período de teste'}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9F6E', whiteSpace: 'nowrap', marginLeft: 8 }}>
          Fazer upgrade →
        </span>
      </div>
    </button>
  );
}

export default function Home() {
  const { toast } = useToast();
  const sessionId = useSession();
  const { user, isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();
  const { accepted: lgpdAccepted, accept: acceptLGPD } = useLGPDConsent();
  const { showTour, maybeStartTour, endTour, resetTour } = useTour();
  useMealReminders();

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallDisableClose, setPaywallDisableClose] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGoalsPanel, setShowGoalsPanel] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showWorkout, setShowWorkout] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [showSplash, setShowSplash] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);

  type MandatoryStep = 'goals' | 'workout' | 'auth' | null;
  const [mandatoryStep, setMandatoryStep] = useState<MandatoryStep>(null);
  const [celebration, setCelebration] = useState<{ show: boolean; type: 'calories' | 'meals' }>({ show: false, type: 'calories' });
  const [showChat, setShowChat] = useState(false);
  const [showMealPlan, setShowMealPlan] = useState(false);
  const [showRecipeSuggestor, setShowRecipeSuggestor] = useState(false);
  const [showFoodPrefs, setShowFoodPrefs] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showAITools, setShowAITools] = useState(() => {
    try { return localStorage.getItem('iac-ai-tools-expanded') === 'true'; } catch { return false; }
  });
  const celebrationQueue = useRef<Array<'calories' | 'meals'>>([]);
  const celebrationInflight = useRef<Set<'calories' | 'meals'>>(new Set());
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showUserMenu]);

  const [savedGoals, setSavedGoals] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [period, setPeriod] = useState<Period>('day');
  const [hasWorkoutPlan, setHasWorkoutPlan] = useState(false);

  const [activeTab, setActiveTab] = useState<BottomNavTab>('home');
  const [goalsRefreshKey, setGoalsRefreshKey] = useState(0);

  const prevTrialRemaining = useRef<number | null>(null);

  const { data: subStatus, refetch: refetchStatus } = useGetSubscriptionStatus(
    { sessionId },
    { query: { enabled: !!sessionId } }
  );

  const analyzeMutation = useAnalyzeFood();
  const isPremium = subStatus?.tier === 'limited' || subStatus?.tier === 'unlimited';

  // Trial por dias de calendário: dia 1 = dia do primeiro uso, dia 2 = dia seguinte, etc.
  const trialDaysRemaining = (() => {
    if (isPremium) return 0;
    const ts = localStorage.getItem(FIRST_USE_TS_KEY);
    if (!ts) return FREE_TRIAL_DAYS;
    const startDate = new Date(parseInt(ts, 10));
    const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
    const now = new Date();
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const daysElapsed = Math.round((nowMidnight - startMidnight) / 86400000);
    return Math.max(0, FREE_TRIAL_DAYS - daysElapsed);
  })();
  const trialRemaining = subStatus?.trialRemaining ?? trialDaysRemaining;
  const daysElapsed = FREE_TRIAL_DAYS - trialRemaining;

  const workoutTrialDaysRemaining = isPremium ? null : trialRemaining;

  const isWorkoutFreeAccessActive = isPremium || trialRemaining > 0;

  const refreshSummary = useCallback(async (p?: Period) => {
    if (!sessionId) return;
    const activePeriod = p ?? period;
    const summary = await fetchDailySummary(sessionId, activePeriod);
    if (summary) {
      setDailySummary(summary);
      setSavedGoals(summary.rawGoals ?? summary.goals);
    }
    if (activePeriod !== 'day') {
      const daySummary = await fetchDailySummary(sessionId, 'day');
      if (daySummary) {
        setTodaySummary(daySummary);
      }
    } else {
      setTodaySummary(summary);
    }
    setGoalsLoaded(true);
  }, [sessionId, isPremium, period]);

  const loadGoalsDirect = useCallback(async () => {
    if (!sessionId) return;
    try {
      const r = await fetch(`${BASE}api/goals?sessionId=${sessionId}`, { headers: authHeaders() });
      if (r.ok) {
        const data = await r.json();
        if (data) setSavedGoals(data);
      }
    } finally {
      setGoalsLoaded(true);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) refreshSummary();
  }, [sessionId, isPremium, refreshSummary]);

  // Quando o usuário troca de conta, limpa dados anteriores e recarrega
  const prevUserIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    const currentId = user?.id ?? null;
    if (prevUserIdRef.current !== null && prevUserIdRef.current !== currentId) {
      setDailySummary(null);
      setCurrentResult(null);
      refetchStatus();
      if (sessionId) refreshSummary();
    }
    prevUserIdRef.current = currentId;
  }, [user?.id]);

  useEffect(() => {
    if (!sessionId) return;
    setHasWorkoutPlan(false);
    fetch(`${BASE}api/workout/profile?sessionId=${sessionId}`, { headers: authHeaders() })
      .then(r => setHasWorkoutPlan(r.ok))
      .catch(() => setHasWorkoutPlan(false));
  }, [sessionId, isAuthenticated]);

  // After login, check if user had a pending upgrade plan and open checkout
  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = localStorage.getItem('ia-calorias-pending-plan') as 'limited' | 'unlimited' | null;
    if (pending) {
      localStorage.removeItem('ia-calorias-pending-plan');
      setPaywallDisableClose(false);
      setShowPaywall(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const t = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(t as 'light' | 'dark');
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout_success') === 'true') {
      toast({ title: "Assinatura confirmada!", description: "Seu plano foi ativado. Aproveite!" });
      window.history.replaceState({}, document.title, window.location.pathname);
      trackEvent('Purchase', { content_name: 'subscription' });
      refetchStatus();
    }
    const refCode = params.get('ref');
    if (refCode && /^IAC[A-Z0-9]{6,8}$/.test(refCode)) {
      localStorage.setItem(REFERRAL_CODE_KEY, refCode);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Start trial timer on very first app open — regardless of onboarding path
    if (!localStorage.getItem(FIRST_USE_TS_KEY)) {
      localStorage.setItem(FIRST_USE_TS_KEY, String(Date.now()));
    }

    if (!isAlreadyOnboarded()) {
      setShowSplash(true);
    } else {
      maybeStartTour(1200);
    }
  }, []);

  const showNextCelebration = useCallback((delay = 0) => {
    const next = celebrationQueue.current.shift();
    if (next) {
      if (delay > 0) {
        setTimeout(() => setCelebration({ show: true, type: next }), delay);
      } else {
        setCelebration({ show: true, type: next });
      }
    }
  }, []);

  useEffect(() => {
    if (celebration.show) {
      celebrationInflight.current.delete(celebration.type);
      markCelebratedToday(celebration.type);
    }
  }, [celebration.show, celebration.type]);

  const handleCelebrationClose = useCallback(() => {
    setCelebration(c => ({ ...c, show: false }));
    if (celebrationQueue.current.length > 0) {
      setTimeout(() => showNextCelebration(0), 500);
    }
  }, [showNextCelebration]);

  useEffect(() => {
    const summary = todaySummary ?? dailySummary;
    if (!summary || !summary.rawGoals || summary.period !== 'day' || !isPremium) return;
    const { rawGoals, totals } = summary;

    const toQueue: Array<'calories' | 'meals'> = [];
    const types: Array<'calories' | 'meals'> = ['calories', 'meals'];
    for (const type of types) {
      const eligible = type === 'calories'
        ? rawGoals.calories && totals.calories >= rawGoals.calories
        : rawGoals.mealsPerDay && totals.meals >= rawGoals.mealsPerDay;
      if (eligible && !hasCelebratedToday(type) && !celebrationInflight.current.has(type)) {
        celebrationInflight.current.add(type);
        toQueue.push(type);
      }
    }
    if (toQueue.length > 0) {
      celebrationQueue.current.push(...toQueue);
      if (celebration.show === false) {
        showNextCelebration(600);
      }
    }
  }, [dailySummary, todaySummary, isPremium, showNextCelebration, celebration.show]);


  useEffect(() => {
    if (subStatus?.trialRemaining !== undefined) {
      prevTrialRemaining.current = subStatus.trialRemaining;
    }
  }, [subStatus?.trialRemaining]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setTheme(next);
  };

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    refreshSummary(p);
  };

  const getErrorMessage = (error: any): { title: string; description: string } => {
    const body = error?.response?.data ?? error?.data ?? {};
    const code = body?.error;
    const msgs: Record<string, { title: string; description: string }> = {
      not_food: { title: "Nenhum alimento detectado", description: body?.message || "Envie uma foto de um prato ou refeição." },
      file_too_large: { title: "Imagem muito grande", description: "Máximo 10 MB. Reduza o tamanho e tente novamente." },
      invalid_file_type: { title: "Formato inválido", description: "Envie uma imagem JPG, PNG ou WEBP." },
      invalid_image: { title: "Imagem inválida", description: "Arquivo pode estar corrompido. Tente outra foto." },
      incomplete_analysis: { title: "Foto pouco nítida", description: body?.message || "Tire uma foto mais clara e bem iluminada." },
      parse_error: { title: "Erro de processamento", description: body?.message || "Tente novamente com uma foto mais clara." },
      rate_limited: { title: "Muitas requisições", description: "Aguarde alguns segundos e tente novamente." },
    };
    return msgs[code] ?? { title: "Erro na análise", description: body?.message || "Ocorreu um erro inesperado." };
  };

  const handleAnalyze = async (file: File) => {
    if (!sessionId) return;
    if (check24hExpiry()) return;
    if (subStatus?.tier === 'free' && subStatus.trialRemaining <= 0) {
      setPaywallDisableClose(true);
      setShowPaywall(true);
      return;
    }
    analyzeMutation.mutate({ data: { image: file, sessionId } }, {
      onSuccess: async (data) => {
        setCurrentResult(data);
        refetchStatus();
        if (isPremium) await refreshSummary();
      },
      onError: (error: any) => {
        const status = error?.response?.status ?? error?.status;
        const body = error?.response?.data ?? error?.data ?? {};
        if (status === 402 || body?.requiresUpgrade) {
          setPaywallDisableClose(true);
          setShowPaywall(true);
          return;
        }
        const { title, description } = getErrorMessage(error);
        toast({ title, description, variant: "destructive" });
      },
    });
  };

  const handleFileSelected = (_file: File, url: string) => {
    setPhotoUrl(url);
  };

  const handleGoalsSave = async (goals: CalculatedGoals) => {
    if (!sessionId) return;
    await saveGoals(sessionId, goals);
    setShowOnboarding(false);
    toast({ title: "Metas salvas!", description: "Seu progresso diário já está ativo." });
    await refreshSummary();
  };

  const handleAuthSuccess = () => {
    refetchStatus();
    refreshSummary();
    toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
    if (sessionId) applyPendingReferral(sessionId);
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    // Limpa dados em memória para não vazar dados entre contas
    setDailySummary(null);
    setCurrentResult(null);
    refetchStatus();
    toast({ title: "Até logo!", description: "Você saiu da sua conta." });
  };

  const handleWorkoutNutrition = useCallback(async (targets: { calories: number; protein: number; carbs: number; fat: number; fiber: number; weight: number; height: number; age: number; sex: string; activityFactor: number }) => {
    if (!sessionId || !isPremium) return;
    const goals = {
      calories: targets.calories,
      protein: targets.protein,
      carbs: targets.carbs,
      fat: targets.fat,
      fiber: targets.fiber,
      weight: targets.weight,
      height: targets.height,
      age: targets.age,
      sex: targets.sex,
      objective: 'treino',
      activityLevel: targets.activityFactor,
      restrictions: [],
    };
    await saveGoals(sessionId, goals as any);
    await refreshSummary();
  }, [sessionId, isPremium, refreshSummary]);

  const handleCameraCapture = (file: File) => {
    setActiveTab('analyze');
    setCurrentResult(null);
    handleAnalyze(file);
  };

  const handleSplashDone = () => {
    setShowSplash(false);
    setShowCarousel(true);
  };

  const handleCarouselDone = () => {
    setShowCarousel(false);
    localStorage.setItem(ONBOARDED_KEY, 'true');
    setOnboardedCookie();
    maybeStartTour(800);
  };

  const handleTourEnd = useCallback(() => {
    endTour();
    const mandatoryDone = localStorage.getItem(MANDATORY_ONBOARDING_KEY);
    if (mandatoryDone) return; // Already completed — nothing to do
    if (isAuthenticated) {
      // Authenticated user — skip goals flow, just mark as done
      localStorage.setItem(MANDATORY_ONBOARDING_KEY, 'true');
      return;
    }
    setTimeout(() => setMandatoryStep('goals'), 400);
  }, [endTour, isAuthenticated]);

  const handleMandatoryGoalsDone = useCallback(async (goals: CalculatedGoals) => {
    if (!sessionId) return;
    await saveGoals(sessionId, goals);
    setShowOnboarding(false);
    localStorage.setItem(MANDATORY_ONBOARDING_KEY, 'true');
    localStorage.setItem(ONBOARDED_KEY, 'true');
    setOnboardedCookie();
    if (!localStorage.getItem(FIRST_USE_TS_KEY)) {
      localStorage.setItem(FIRST_USE_TS_KEY, String(Date.now()));
    }
    // Start workout trial from onboarding completion
    if (!localStorage.getItem(WORKOUT_TRIAL_START_KEY)) {
      localStorage.setItem(WORKOUT_TRIAL_START_KEY, String(Date.now()));
    }
    // Save workout profile if collected in onboarding
    if (goals.workoutGoal && goals.workoutLevel && sessionId) {
      try {
        await fetch(`${BASE}api/workout/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            sessionId,
            goal: goals.workoutGoal,
            level: goals.workoutLevel,
            gym: goals.workoutGym ?? 'full_gym',
            trainingDays: goals.workoutTrainingDays ?? ['mon', 'wed', 'fri'],
            sex: goals.sex,
            age: goals.age,
            weight: goals.weight,
            height: goals.height,
            sessionDuration: 60,
            hasInjuries: false,
            injuries: [],
            equipment: [],
            cardio: 'none',
            warmup: 'basic',
            techniques: [],
          }),
        });
      } catch {}
    }
    try { await refreshSummary(); } catch {}
    setMandatoryStep('auth');
  }, [sessionId, refreshSummary]);

  const handleMandatoryWorkoutDone = useCallback(() => {
    setShowWorkout(false);
    setHasWorkoutPlan(true);
    setMandatoryStep('auth');
  }, []);

  const handleMandatoryAuthDone = useCallback(() => {
    setMandatoryStep(null);
    localStorage.setItem(MANDATORY_ONBOARDING_KEY, 'true');
    if (!localStorage.getItem(FIRST_USE_TS_KEY)) {
      localStorage.setItem(FIRST_USE_TS_KEY, String(Date.now()));
    }
  }, []);

  const check24hExpiry = useCallback((): boolean => {
    if (isPremium) return false;
    const ts = localStorage.getItem(FIRST_USE_TS_KEY);
    if (!ts) return false;
    const elapsed = Date.now() - parseInt(ts, 10);
    if (elapsed > FREE_PERIOD_MS) {
      setPaywallDisableClose(true);
      setShowPaywall(true);
      return true;
    }
    return false;
  }, [isPremium, isAuthenticated]);

  const handleTabChange = (tab: BottomNavTab) => {
    setActiveTab(tab);
    if (tab !== 'profile') setShowUserMenu(false);
    if (tab === 'home') { setCurrentResult(null); }
    if (tab === 'workout') {
      if (isWorkoutFreeAccessActive) {
        // Start trial on first open if not started from onboarding
        if (!localStorage.getItem(WORKOUT_TRIAL_START_KEY)) {
          localStorage.setItem(WORKOUT_TRIAL_START_KEY, String(Date.now()));
        }
        setShowWorkout(true);
      } else {
        setPaywallDisableClose(false);
        setShowPaywall(true);
      }
    }
    if (tab === 'analyze') { setCurrentResult(null); }
    if (tab === 'profile') { isAuthenticated ? navigate('/profile') : navigate('/login'); }
  };

  const renderUsagePill = () => {
    if (!subStatus) return null;
    if (subStatus.tier === 'free') return (
      <button onClick={() => setShowPaywall(true)} style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '5px 12px', borderRadius: '99px',
        background: 'rgba(13,159,110,0.1)', color: '#0D9F6E',
        fontSize: '12px', fontWeight: 700, border: '1px solid rgba(13,159,110,0.2)',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0D9F6E', display: 'inline-block', flexShrink: 0 }} />
        {trialRemaining}d grátis
      </button>
    );
    if (subStatus.tier === 'limited') return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '5px 12px', borderRadius: '99px',
        background: 'rgba(245,158,11,0.1)', color: '#F59E0B',
        fontSize: '12px', fontWeight: 700, border: '1px solid rgba(245,158,11,0.2)',
      }}>
        {subStatus.analysisCount}/20
      </div>
    );
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '5px 12px', borderRadius: '99px',
        background: 'rgba(139,92,246,0.1)', color: '#8B5CF6',
        fontSize: '12px', fontWeight: 700, border: '1px solid rgba(139,92,246,0.2)',
      }}>
        ✦ Ilimitado
      </div>
    );
  };

  const greeting = getHourGreeting();
  const displayName = user?.email?.split('@')[0] ?? null;

  const calorieOverrunKcal = (() => {
    const s = todaySummary ?? (dailySummary?.period === 'day' ? dailySummary : null);
    if (!s || !s.rawGoals?.calories || !isPremium) return 0;
    const over = Math.round(s.totals.calories - s.rawGoals.calories);
    return over > 0 ? over : 0;
  })();

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowX: 'hidden', maxWidth: '100vw' }}>

      {/* Splash + Onboarding */}
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" onDone={handleSplashDone} />}
        {showCarousel && <OnboardingCarousel key="carousel" onDone={handleCarouselDone} />}
      </AnimatePresence>

      {/* Install PWA prompt */}
      <InstallPrompt />
      <OpenInAppBanner />

      {/* LGPD */}
      {!lgpdAccepted && <LGPDConsentPopup onAccept={acceptLGPD} />}

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        width: '100%', display: 'flex', justifyContent: 'center',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{
          width: '100%', maxWidth: '720px', padding: '0 16px',
          height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onClick={() => { setCurrentResult(null); setActiveTab('home'); }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PieChart size={18} color="#fff" strokeWidth={2} />
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.3px' }}>IA Calorias</span>
            <span style={{
              padding: '2px 6px', borderRadius: '6px',
              background: 'var(--bg-3)', fontSize: '10px', fontWeight: 700,
              color: 'var(--text-2)', letterSpacing: '0.5px',
            }}>
              BETA
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flexShrink: 0 }}>
            <div data-tour="usage-pill" style={{ display: 'flex', flexShrink: 1, minWidth: 0, overflow: 'hidden' }}>{renderUsagePill()}</div>

            <button
              onClick={() => setShowAnalytics(true)}
              style={{ padding: '6px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', flexShrink: 0 }}
            >
              <BarChart2 size={16} />
            </button>

            <button
              onClick={() => setShowGoalsPanel(true)}
              style={{ padding: '6px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', flexShrink: 0 }}
            >
              <Settings size={16} />
            </button>

            {isAuthenticated ? (
              <div ref={userMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  style={{ padding: '2px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {user?.avatarUrl
                    ? <img src={user.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />
                    : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #0D9F6E, #057A55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                        {(user?.name || user?.email || '?').slice(0, 2).toUpperCase()}
                      </div>}
                </button>
                {showUserMenu && (
                  <>
                    <div style={{
                      position: 'absolute', right: 0, top: '42px',
                      background: 'var(--bg-2)', border: '1px solid var(--border)',
                      borderRadius: '16px', padding: '8px',
                      minWidth: '200px', maxWidth: '260px', width: 'max-content',
                      zIndex: 101,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    }}>
                      <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                        {user?.name && <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>{user.name}</div>}
                        <div style={{ fontSize: '12px', color: 'var(--text-2)', wordBreak: 'break-all' }}>{user?.email}</div>
                        <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700,
                          background: subStatus?.tier === 'unlimited' ? 'rgba(139,92,246,0.12)' : subStatus?.tier === 'limited' ? 'rgba(245,158,11,0.12)' : 'var(--bg-3)',
                          color: subStatus?.tier === 'unlimited' ? '#8B5CF6' : subStatus?.tier === 'limited' ? '#F59E0B' : 'var(--text-2)',
                          border: `1px solid ${subStatus?.tier === 'unlimited' ? 'rgba(139,92,246,0.25)' : subStatus?.tier === 'limited' ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
                        }}>
                          {subStatus?.tier === 'unlimited' ? '👑 Ilimitado' : subStatus?.tier === 'limited' ? '⚡ Limitado' : '🆓 Gratuito'}
                        </div>
                      </div>
                      {subStatus?.tier === 'limited' && (
                        <button
                          onClick={() => { setShowUserMenu(false); setPaywallDisableClose(false); setShowPaywall(true); }}
                          style={{
                            width: '100%', padding: '8px 12px',
                            background: 'rgba(13,159,110,0.08)', border: 'none', color: '#0D9F6E',
                            fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderRadius: '10px',
                            display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left',
                            marginBottom: '2px',
                          }}
                        >
                          <Crown size={13} />
                          Upgrade para Ilimitado
                        </button>
                      )}
                      <button
                        onClick={() => { setShowUserMenu(false); navigate('/profile'); }}
                        style={{
                          width: '100%', padding: '8px 12px',
                          background: 'none', border: 'none', color: 'var(--text-2)',
                          fontSize: '13px', cursor: 'pointer', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left',
                          marginBottom: '2px',
                        }}
                      >
                        <User size={14} />
                        Meu Perfil
                      </button>
                      <button
                        onClick={() => { setShowUserMenu(false); resetTour(); }}
                        style={{
                          width: '100%', padding: '8px 12px',
                          background: 'none', border: 'none', color: 'var(--text-2)',
                          fontSize: '13px', cursor: 'pointer', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left',
                          marginBottom: '2px',
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>🗺️</span>
                        Tour do aplicativo
                      </button>
                      <button
                        onClick={() => { setShowUserMenu(false); setShowSupport(true); }}
                        style={{
                          width: '100%', padding: '8px 12px',
                          background: 'none', border: 'none', color: 'var(--text-2)',
                          fontSize: '13px', cursor: 'pointer', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left',
                          marginBottom: '2px',
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>🛟</span>
                        Suporte
                      </button>
                      <button
                        onClick={() => { toggleTheme(); }}
                        style={{
                          width: '100%', padding: '8px 12px',
                          background: 'none', border: 'none', color: 'var(--text-2)',
                          fontSize: '13px', cursor: 'pointer', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left',
                          marginBottom: '2px',
                        }}
                      >
                        {theme === 'dark'
                          ? <Sun size={14} />
                          : <Moon size={14} />}
                        {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                      </button>
                      <button
                        onClick={handleLogout}
                        style={{
                          width: '100%', padding: '8px 12px',
                          background: 'none', border: 'none', color: '#f87171',
                          fontSize: '14px', cursor: 'pointer', borderRadius: '10px',
                          display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left',
                        }}
                      >
                        <LogOut size={14} />
                        Sair da conta
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={toggleTheme}
                  style={{ padding: '6px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', flexShrink: 0 }}
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button
                  onClick={() => navigate('/login')}
                  style={{ padding: '6px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', flexShrink: 0 }}
                >
                  <LogIn size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        width: '100%', maxWidth: '720px', padding: '16px 16px 96px',
        display: 'flex', flexDirection: 'column', flex: 1,
      }}>

        <AnimatePresence mode="wait">

          {/* ─── Aba Progresso ─── */}
          {activeTab === 'analytics' ? (
            <motion.div
              key="progress-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ width: '100%', paddingTop: '4px' }}
            >
              {/* Title row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.3px', margin: 0 }}>
                    Progresso
                  </h1>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, marginTop: '2px' }}>
                    Seu histórico nutricional
                  </p>
                </div>
                <button
                  onClick={() => setShowGoalsPanel(true)}
                  style={{ padding: '8px 14px', borderRadius: '10px', background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Settings size={13} /> Metas
                </button>
              </div>
              <ProgressView
                sessionId={sessionId}
                isPremium={isPremium || trialRemaining > 0}
                refreshSignal={goalsRefreshKey}
                onUpgrade={() => { setPaywallDisableClose(false); setShowPaywall(true); }}
                onSetGoals={() => setShowGoalsPanel(true)}
              />
            </motion.div>
          ) : !currentResult ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', paddingTop: '8px' }}
            >
              {/* Greeting */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h1 style={{
                    fontSize: '22px', fontWeight: 800, color: 'var(--text-1)',
                    letterSpacing: '-0.4px', lineHeight: 1.2,
                  }}>
                    {greeting}{displayName ? `, ${displayName}` : '!'}
                    {!displayName && ' 👋'}
                  </h1>
                  <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '2px' }}>
                    {isPremium
                      ? 'Registre sua próxima refeição'
                      : trialRemaining === 0
                        ? 'Seu teste encerrou — faça upgrade para continuar'
                        : `${trialRemaining} dia${trialRemaining !== 1 ? 's' : ''} de teste grátis restante${trialRemaining !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
{isPremium && subStatus?.tier === 'unlimited' && (
                  <div style={{
                    padding: '5px 12px', borderRadius: '99px',
                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    fontSize: '12px', fontWeight: 700, color: '#8B5CF6',
                  }}>
                    <Crown size={12} />
                    Premium
                  </div>
                )}
              </div>
              </div>

              {/* Trial days bar */}
              {subStatus?.tier === 'free' && (
                <UsageBar remaining={subStatus.trialRemaining} max={FREE_TRIAL_DAYS} onClick={() => setShowPaywall(true)} />
              )}

              {/* Urgency banner — últimos 3 dias */}
              {subStatus?.tier === 'free' && trialRemaining > 0 && trialRemaining <= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setShowPaywall(true)}
                  style={{
                    padding: '12px 16px', borderRadius: '14px', cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.06))',
                    border: '1px solid rgba(239,68,68,0.25)',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>⏳</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '2px' }}>
                      Seu teste acaba em {trialRemaining} dia{trialRemaining !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                      Não perca seu histórico de {subStatus.analysisCount} refeição{subStatus.analysisCount !== 1 ? 'ões' : ''} registrada{subStatus.analysisCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', color: '#0D9F6E', fontWeight: 700, flexShrink: 0 }}>Upgrade →</span>
                </motion.div>
              )}

              {/* Camera card + upload */}
              <div style={{
                borderRadius: '24px',
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                padding: '20px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              }}>
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
                      Analise sua refeição
                    </h2>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '3px 9px', borderRadius: '99px',
                      background: 'rgba(13,159,110,0.1)', border: '1px solid rgba(13,159,110,0.18)',
                      fontSize: '11px', fontWeight: 600, color: '#0D9F6E',
                    }}>
                      🌿 +12.500 análises realizadas
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '6px' }}>
                    Tire uma foto ou escolha da galeria
                  </p>
                </div>
                <div data-tour="upload-zone">
                  <UploadZone
                    onAnalyze={handleAnalyze}
                    onFileSelected={handleFileSelected}
                    isAnalyzing={analyzeMutation.isPending}
                    usageLabel={undefined}
                  />
                </div>
              </div>

              {/* Profile setup banner */}
              {goalsLoaded && (!isAuthenticated || !savedGoals?.calories || !hasWorkoutPlan) && (
                <ProfileSetupBanner
                  isAuthenticated={isAuthenticated}
                  hasGoals={!!(savedGoals?.calories)}
                  hasWorkoutPlan={hasWorkoutPlan}
                  onLogin={() => navigate('/login')}
                  onSetupGoals={() => setShowOnboarding(true)}
                  onSetupWorkout={() => setShowWorkout(true)}
                />
              )}

              {/* CTA for non-authenticated */}
              {!isAuthenticated && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderRadius: '14px',
                  background: 'var(--bg-2)', border: '1px solid var(--border)',
                }}>
                  <User size={16} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-2)', flex: 1 }}>
                    Salve seu histórico criando uma conta gratuita
                  </span>
                  <button
                    onClick={() => navigate('/login')}
                    style={{
                      padding: '6px 14px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                      color: '#fff', border: 'none', fontSize: '12px', fontWeight: 700,
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    Entrar
                  </button>
                </div>
              )}

              {/* Feature discovery — jornada guiada dias 1-4 */}
              {!isPremium && trialRemaining > 0 && daysElapsed >= 1 && daysElapsed <= 4 && (
                <button
                  onClick={() => setShowChat(true)}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(13,159,110,0.08), rgba(59,130,246,0.06))',
                    border: '1px solid rgba(13,159,110,0.2)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '22px', flexShrink: 0 }}>💡</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>
                      Sabia que você pode perguntar para a Sofia?
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                      "O que comer antes do treino?" · "Como bater minha meta de proteína?" — grátis no teste
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', color: '#0D9F6E', fontWeight: 700, flexShrink: 0 }}>Testar →</span>
                </button>
              )}

              {/* Upgrade banner for free users */}
              {!isPremium && (
                <button
                  data-tour="upgrade-banner"
                  onClick={() => setShowPaywall(true)}
                  style={{
                    width: '100%', padding: '14px 18px', borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(13,159,110,0.1))',
                    border: '1px solid rgba(245,158,11,0.25)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #F59E0B, #0D9F6E)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Crown size={18} color="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>
                      Desbloqueie o IA Calorias completo
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {['📸 Ilimitado', '💪 Treino IA', '📊 Analytics', '🩺 Nutricionista'].map(tag => (
                        <span key={tag} style={{ fontSize: '10.5px', color: 'var(--text-2)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 99, padding: '1.5px 7px' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', color: '#0D9F6E', fontWeight: 700, flexShrink: 0 }}>Ver planos →</span>
                </button>
              )}

              {/* Calorie overrun banner — stays visible while calories > goal */}
              {calorieOverrunKcal > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 14px', borderRadius: '14px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.25)',
                  }}
                >
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: '2px' }}>
                      Você ultrapassou sua meta de hoje em {calorieOverrunKcal} kcal
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                      Prefira vegetais, proteínas magras e bastante água nas próximas refeições.
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Daily progress */}
              {goalsLoaded && (
                <div data-tour="daily-progress">
                  <DailyProgress
                    totals={todaySummary?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: 0 }}
                    goals={savedGoals}
                    alerts={todaySummary?.alerts ?? []}
                    aiSummary={todaySummary?.aiSummary ?? null}
                    analysesCount={todaySummary?.analysesCount ?? 0}
                    period={'day'}
                    onPeriodChange={undefined}
                    onSetGoals={() => setShowGoalsPanel(true)}
                    isPremium={isPremium}
                  />
                </div>
              )}

              {/* Meal Reminders */}
              <MealReminders />

              {/* Weight Tracker */}
              <WeightTracker sessionId={sessionId} />

              {/* Referral Card — authenticated users only */}
              {isAuthenticated && <ReferralCard />}

              {/* Ferramentas IA — bloco recolhível */}
              <div style={{ borderRadius: '18px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <style>{`
                  @keyframes iac-pulse-ring {
                    0% { box-shadow: 0 0 0 0 rgba(13,159,110,0.55); }
                    70% { box-shadow: 0 0 0 8px rgba(13,159,110,0); }
                    100% { box-shadow: 0 0 0 0 rgba(13,159,110,0); }
                  }
                  @keyframes iac-shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                  }
                `}</style>
                {/* Header toggle */}
                <button
                  onClick={() => {
                    const next = !showAITools;
                    setShowAITools(next);
                    try { localStorage.setItem('iac-ai-tools-expanded', String(next)); } catch {}
                  }}
                  style={{
                    width: '100%', padding: '13px 18px',
                    background: 'var(--bg-2)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>🤖</span>
                  <span style={{
                    flex: 1, fontSize: '14px', fontWeight: 800,
                    background: 'linear-gradient(90deg, #0D9F6E 0%, #34d399 40%, #0D9F6E 60%, #057A55 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: showAITools ? 'none' : 'iac-shimmer 2.4s linear infinite',
                  }}>
                    Ferramentas de IA
                  </span>
                  <span style={{ display: 'flex', gap: '4px', marginRight: '8px' }}>
                    {['🩺','🥗','🍳'].map(e => (
                      <span key={e} style={{ fontSize: '13px', opacity: showAITools ? 0 : 0.6 }}>{e}</span>
                    ))}
                  </span>
                  <motion.span
                    animate={{ rotate: showAITools ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'flex', color: '#0D9F6E', fontSize: '16px', lineHeight: 1,
                      borderRadius: '50%',
                      animation: showAITools ? 'none' : 'iac-pulse-ring 1.8s ease-out infinite',
                    }}
                  >
                    ▾
                  </motion.span>
                </button>

                {/* Conteúdo animado */}
                <AnimatePresence initial={false}>
                  {showAITools && (
                    <motion.div
                      key="ai-tools"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border)' }}>

                        {/* Sofia */}
                        <button
                          onClick={() => setShowChat(true)}
                          style={{
                            width: '100%', padding: '14px 18px',
                            background: 'var(--bg-2)', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
                          }}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #0D9F6E, #057A55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🩺</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>Sofia — Nutricionista IA</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Tire dúvidas sobre sua alimentação</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9F6E', padding: '3px 9px', borderRadius: 99, background: 'rgba(13,159,110,0.1)', border: '1px solid rgba(13,159,110,0.2)', flexShrink: 0 }}>
                            {isPremium ? 'Ilimitado' : '🎁 Grátis'}
                          </span>
                        </button>

                        {/* Cardápio semanal */}
                        <button
                          onClick={() => { if (!isPremium) { setPaywallDisableClose(false); setShowPaywall(true); return; } setShowMealPlan(true); }}
                          style={{
                            width: '100%', padding: '14px 18px',
                            background: 'var(--bg-2)', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
                          }}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #F59E0B, #EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🥗</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>Cardápio semanal com IA</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>7 dias de refeições baseadas nas suas metas</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: 99, flexShrink: 0, background: isPremium ? 'rgba(245,158,11,0.1)' : 'rgba(139,92,246,0.1)', border: `1px solid ${isPremium ? 'rgba(245,158,11,0.2)' : 'rgba(139,92,246,0.2)'}`, color: isPremium ? '#F59E0B' : '#8B5CF6' }}>
                            {isPremium ? 'Gerar' : '👑 Premium'}
                          </span>
                        </button>

                        {/* Personalizar cardápio */}
                        <button
                          onClick={() => setShowFoodPrefs(true)}
                          style={{
                            width: '100%', padding: '14px 18px',
                            background: 'var(--bg-2)', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
                          }}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #0D9F6E, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🥗</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>Personalizar meu cardápio</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Selecione os alimentos que você costuma comer</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9F6E', padding: '3px 9px', borderRadius: 99, background: 'rgba(13,159,110,0.1)', border: '1px solid rgba(13,159,110,0.2)', flexShrink: 0 }}>Grátis</span>
                        </button>

                        {/* Receita */}
                        <button
                          onClick={() => setShowRecipeSuggestor(true)}
                          style={{
                            width: '100%', padding: '14px 18px',
                            background: 'var(--bg-2)', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left',
                          }}
                        >
                          <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #F59E0B, #EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🍳</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>Receita com o que tenho</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Informe os ingredientes e a IA cria uma receita</div>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', padding: '3px 9px', borderRadius: 99, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', flexShrink: 0 }}>Grátis</span>
                        </button>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Como funciona */}
              <div style={{ paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)', marginBottom: '14px', letterSpacing: '-0.3px' }}>
                  Como funciona
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {[
                    { num: '01', title: 'Fotografe', desc: 'Tire uma foto clara da sua refeição ou faça upload de uma imagem.', emoji: '📸' },
                    { num: '02', title: 'IA analisa', desc: 'GPT-4o Vision identifica os alimentos e calcula calorias, proteínas, carboidratos e gordura automaticamente.', emoji: '⚡' },
                    { num: '03', title: 'Acompanhe', desc: 'Acumule refeições e veja seu progresso diário em tempo real.', emoji: '📊' },
                  ].map(({ num, title, desc, emoji }) => (
                    <div key={num} style={{
                      padding: '16px', borderRadius: '16px',
                      background: 'var(--bg-2)', border: '1px solid var(--border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '22px' }}>{emoji}</span>
                        <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--border-strong)', letterSpacing: '-1px' }}>{num}</span>
                      </div>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '5px' }}>{title}</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ width: '100%', paddingTop: '8px' }}
            >
              <ResultCard result={currentResult} onReset={() => { setCurrentResult(null); setPhotoUrl(undefined); }} photoUrl={photoUrl} sessionId={sessionId} />

              {/* Post-result save CTA — anonymous only */}
              {!isAuthenticated && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  style={{
                    marginTop: '12px',
                    padding: '18px 20px', borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(13,159,110,0.10), rgba(59,130,246,0.08))',
                    border: '1px solid rgba(13,159,110,0.25)',
                    display: 'flex', flexDirection: 'column', gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>💾</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>
                        Salve esta análise!
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '2px' }}>
                        Crie uma conta grátis e nunca perca seu histórico
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { navigate('/login'); }}
                    style={{
                      width: '100%', padding: '13px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                      color: '#fff', border: 'none',
                      fontSize: '14px', fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Criar conta gratuita →
                  </button>
                </motion.div>
              )}

              {goalsLoaded && (
                <div style={{ marginTop: '20px' }}>
                  <DailyProgress
                    totals={dailySummary?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: 0 }}
                    goals={savedGoals}
                    alerts={dailySummary?.alerts ?? []}
                    aiSummary={dailySummary?.aiSummary ?? null}
                    analysesCount={dailySummary?.analysesCount ?? 0}
                    period={period}
                    onPeriodChange={handlePeriodChange}
                    onSetGoals={() => setShowGoalsPanel(true)}
                    isPremium={isPremium}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isPremium={isPremium}
        onCameraCapture={handleCameraCapture}
      />

      {/* Panels / Modals */}
      <AnalyticsPanel
        isOpen={showAnalytics}
        onClose={() => { setShowAnalytics(false); setActiveTab('home'); }}
        sessionId={sessionId}
        isPremium={isPremium || trialRemaining > 0}
        onUpgrade={() => { setShowAnalytics(false); setPaywallDisableClose(false); setShowPaywall(true); }}
      />

      <WorkoutPanel
        isOpen={showWorkout}
        onClose={() => {
          setShowWorkout(false);
          setActiveTab('home');
          setHasWorkoutPlan(true);
          if (mandatoryStep === 'workout') handleMandatoryWorkoutDone();
        }}
        sessionId={sessionId}
        isPremium={isPremium}
        onUpgrade={() => { setShowWorkout(false); setPaywallDisableClose(false); setShowPaywall(true); }}
        onNutritionTargets={handleWorkoutNutrition}
        onboardingMode={mandatoryStep === 'workout'}
        onOnboardingComplete={handleMandatoryWorkoutDone}
        biometrics={savedGoals ? { age: savedGoals.age, weight: savedGoals.weight, height: savedGoals.height, sex: savedGoals.sex } : undefined}
        workoutTrialDaysRemaining={workoutTrialDaysRemaining}
      />

      <SupportChat
        isOpen={showSupport}
        onClose={() => setShowSupport(false)}
        sessionId={sessionId}
      />

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => { setShowPaywall(false); setPaywallDisableClose(false); }}
        sessionId={sessionId}
        disableClose={paywallDisableClose}
        onShowAuth={paywallDisableClose ? () => { setShowPaywall(false); setPaywallDisableClose(false); navigate('/login'); } : undefined}
        retrospective={!isPremium && trialRemaining === 0 && subStatus ? { mealCount: subStatus.analysisCount, daysUsed: FREE_TRIAL_DAYS } : undefined}
        userObjective={savedGoals?.objective ?? undefined}
      />

      <AnimatePresence>
        {showGoalsPanel && (
          <GoalsPanel
            isOpen={showGoalsPanel}
            onClose={() => { setShowGoalsPanel(false); refreshSummary(); setGoalsRefreshKey(k => k + 1); }}
            sessionId={sessionId}
            onOpenBiometrics={() => setShowOnboarding(true)}
            isPremium={isPremium}
            onUpgrade={() => { setShowGoalsPanel(false); setPaywallDisableClose(false); setShowPaywall(true); }}
          />
        )}
      </AnimatePresence>

      <OnboardingModal
        isOpen={showOnboarding || mandatoryStep === 'goals'}
        onComplete={mandatoryStep === 'goals' ? handleMandatoryGoalsDone : handleGoalsSave}
        onSkip={() => {
          setShowOnboarding(false);
          if (mandatoryStep === 'goals') {
            // User chose to skip — mark as done so it never shows again
            setMandatoryStep(null);
            localStorage.setItem(MANDATORY_ONBOARDING_KEY, 'true');
            if (!localStorage.getItem(FIRST_USE_TS_KEY)) {
              localStorage.setItem(FIRST_USE_TS_KEY, String(Date.now()));
            }
          }
        }}
        mandatory={mandatoryStep === 'goals'}
      />

      {mandatoryStep === 'auth' && (
        <OnboardingAuthPrompt onComplete={handleMandatoryAuthDone} />
      )}

      {showTour && <AppTour onDone={handleTourEnd} />}

      <GoalCelebration
        show={celebration.show}
        goalType={celebration.type}
        onClose={handleCelebrationClose}
      />


      {sessionId && (
        <NutritionistChat
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          sessionId={sessionId}
          isPremium={isPremium}
          onUpgrade={() => { setShowChat(false); setPaywallDisableClose(false); setShowPaywall(true); }}
        />
      )}

      {sessionId && (
        <MealPlanModal
          isOpen={showMealPlan}
          onClose={() => setShowMealPlan(false)}
          sessionId={sessionId}
          isPremium={isPremium}
          onUpgrade={() => { setShowMealPlan(false); setPaywallDisableClose(false); setShowPaywall(true); }}
        />
      )}

      {showRecipeSuggestor && sessionId && (
        <RecipeSuggestor
          onClose={() => setShowRecipeSuggestor(false)}
          sessionId={sessionId}
        />
      )}

      {showFoodPrefs && (
        <MealFoodPrefsModal onClose={() => setShowFoodPrefs(false)} />
      )}

      <style>{`
        @keyframes ping {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
