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
import { AppTour } from '@/components/AppTour';
import { useTour } from '@/hooks/use-tour';
import { GoalCelebration, hasCelebratedToday, markCelebratedToday } from '@/components/GoalCelebration';

import {
  useAnalyzeFood,
  useGetSubscriptionStatus,
} from '@workspace/api-client-react';

import type { AnalysisResult } from '@workspace/api-client-react/src/generated/api.schemas';

type Period = 'day' | 'week' | 'month';

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';
const ONBOARDED_KEY = 'ia-calorias-onboarded';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function saveGoals(sessionId: string, goals: CalculatedGoals) {
  await fetch(`${BASE}api/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ sessionId, ...goals, restrictions: goals.restrictions }),
  });
}

async function fetchDailySummary(sessionId: string, period: Period = 'day') {
  const r = await fetch(`${BASE}api/goals/daily-summary?sessionId=${sessionId}&period=${period}`, { headers: authHeaders() });
  if (!r.ok) return null;
  return r.json();
}

function getHourGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function UsageBar({ used, max, onClick }: { used: number; max: number; onClick: () => void }) {
  const pct = Math.min(100, (used / max) * 100);
  const color = pct === 0 ? '#10B981' : pct <= 33 ? '#10B981' : pct <= 66 ? '#F59E0B' : '#EF4444';
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: '12px',
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-2)', fontWeight: 500 }}>
          Análises gratuitas
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, color }}>
          {used}/{max} usadas
        </span>
      </div>
      <div style={{ width: '100%', height: '5px', borderRadius: '99px', background: 'var(--bg-3)' }}>
        <div style={{
          height: '100%', borderRadius: '99px', background: color,
          width: `${pct}%`, transition: 'width 0.5s ease',
        }} />
      </div>
      {used >= max ? (
        <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>
          ⚠️ Limite atingido — Faça upgrade para continuar
        </span>
      ) : used === max - 1 ? (
        <span style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 600 }}>
          ⏳ Só 1 análise gratuita restante!
        </span>
      ) : null}
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
  const [celebration, setCelebration] = useState<{ show: boolean; type: 'calories' | 'meals' }>({ show: false, type: 'calories' });
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

  const [activeTab, setActiveTab] = useState<BottomNavTab>('home');
  const [goalsRefreshKey, setGoalsRefreshKey] = useState(0);

  const prevTrialRemaining = useRef<number | null>(null);

  const { data: subStatus, refetch: refetchStatus } = useGetSubscriptionStatus(
    { sessionId },
    { query: { enabled: !!sessionId } }
  );

  const analyzeMutation = useAnalyzeFood();
  const isPremium = subStatus?.tier === 'limited' || subStatus?.tier === 'unlimited';
  const trialRemaining = subStatus?.trialRemaining ?? 3;
  const trialUsed = Math.max(0, 3 - trialRemaining);

  const refreshSummary = useCallback(async (p?: Period) => {
    if (!sessionId || !isPremium) return;
    const activePeriod = p ?? period;
    const summary = await fetchDailySummary(sessionId, activePeriod);
    if (summary) {
      setDailySummary(summary);
      setSavedGoals(summary.rawGoals ?? summary.goals);
    }
    if (activePeriod !== 'day') {
      const daySummary = await fetchDailySummary(sessionId, 'day');
      if (daySummary) setTodaySummary(daySummary);
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
    if (sessionId && isPremium) refreshSummary();
    else if (sessionId && !isPremium) loadGoalsDirect();
  }, [sessionId, isPremium, refreshSummary, loadGoalsDirect]);

  useEffect(() => {
    const t = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(t as 'light' | 'dark');
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout_success') === 'true') {
      toast({ title: "Assinatura confirmada!", description: "Seu plano foi ativado. Aproveite!" });
      window.history.replaceState({}, document.title, window.location.pathname);
      refetchStatus();
    }

    const alreadyOnboarded = localStorage.getItem(ONBOARDED_KEY);
    if (!alreadyOnboarded) {
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
    if (subStatus?.tier === 'free' && prevTrialRemaining.current !== null) {
      const prev = prevTrialRemaining.current;
      const curr = subStatus.trialRemaining;
      if (curr < prev) {
        const used = 3 - curr;
        if (curr === 2) toast({ title: `${used} de 3 análises gratuitas usadas`, description: 'Restam 2 análises.' });
        if (curr === 1) toast({ title: `${used} de 3 análises gratuitas usadas`, description: 'Última análise gratuita restante!' });
        if (curr === 0) toast({ title: 'Análises gratuitas esgotadas', description: 'Faça upgrade para continuar.' });
      }
    }
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
      file_too_large: { title: "Imagem muito grande", description: "Máximo 4 MB. Reduza o tamanho e tente novamente." },
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
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
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
    maybeStartTour(800);
  };

  const handleTabChange = (tab: BottomNavTab) => {
    setActiveTab(tab);
    if (tab !== 'profile') setShowUserMenu(false);
    if (tab === 'home') { setCurrentResult(null); }
    if (tab === 'workout') { setShowWorkout(true); }
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
        cursor: 'pointer',
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0D9F6E', display: 'inline-block', animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }} />
        {subStatus.trialRemaining} de 3 grátis
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div data-tour="usage-pill" style={{ display: 'flex' }}>{renderUsagePill()}</div>

            <button
              onClick={() => setShowAnalytics(true)}
              style={{ padding: '8px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}
            >
              <BarChart2 size={16} />
            </button>

            {isPremium && (
              <button
                onClick={() => setShowGoalsPanel(true)}
                style={{ padding: '8px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}
              >
                <Settings size={16} />
              </button>
            )}

            {isAuthenticated ? (
              <div ref={userMenuRef} style={{ position: 'relative' }}>
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
                      minWidth: '200px', zIndex: 101,
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
                  style={{ padding: '8px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button
                  onClick={() => navigate('/login')}
                  style={{ padding: '8px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}
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
                {isPremium && (
                  <button
                    onClick={() => setShowGoalsPanel(true)}
                    style={{ padding: '8px 14px', borderRadius: '10px', background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Settings size={13} /> Metas
                  </button>
                )}
              </div>
              <ProgressView
                sessionId={sessionId}
                isPremium={isPremium}
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
                      : `${3 - trialUsed} análise${(3 - trialUsed) !== 1 ? 's' : ''} gratuita${(3 - trialUsed) !== 1 ? 's' : ''} disponível`}
                  </p>
                </div>
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

              {/* Anonymous usage bar */}
              {!isAuthenticated && subStatus?.tier === 'free' && (
                <UsageBar used={trialUsed} max={3} onClick={() => setShowPaywall(true)} />
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
                    usageLabel={!isAuthenticated && subStatus?.tier === 'free' ? `(${3 - trialUsed} de 3 grátis)` : undefined}
                  />
                </div>
              </div>

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
                    onSetGoals={() => isPremium ? setShowGoalsPanel(true) : setShowPaywall(true)}
                    isPremium={isPremium}
                  />
                </div>
              )}

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
              <ResultCard result={currentResult} onReset={() => { setCurrentResult(null); setPhotoUrl(undefined); }} photoUrl={photoUrl} />

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

              {goalsLoaded && isPremium && (
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
        isPremium={isPremium}
        onUpgrade={() => { setShowAnalytics(false); setPaywallDisableClose(false); setShowPaywall(true); }}
      />

      <WorkoutPanel
        isOpen={showWorkout}
        onClose={() => { setShowWorkout(false); setActiveTab('home'); }}
        sessionId={sessionId}
        isPremium={isPremium}
        onUpgrade={() => { setShowWorkout(false); setPaywallDisableClose(false); setShowPaywall(true); }}
        onNutritionTargets={handleWorkoutNutrition}
      />

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => { setShowPaywall(false); setPaywallDisableClose(false); }}
        sessionId={sessionId}
        disableClose={paywallDisableClose}
        onShowAuth={paywallDisableClose ? () => { setShowPaywall(false); setPaywallDisableClose(false); navigate('/login'); } : undefined}
      />

      <AnimatePresence>
        {showGoalsPanel && (
          <GoalsPanel
            isOpen={showGoalsPanel}
            onClose={() => { setShowGoalsPanel(false); if (isPremium) refreshSummary(); else loadGoalsDirect(); setGoalsRefreshKey(k => k + 1); }}
            sessionId={sessionId}
            onOpenBiometrics={() => setShowOnboarding(true)}
          />
        )}
      </AnimatePresence>

      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleGoalsSave}
        onSkip={() => setShowOnboarding(false)}
      />


      {showTour && <AppTour onDone={endTour} />}

      <GoalCelebration
        show={celebration.show}
        goalType={celebration.type}
        onClose={handleCelebrationClose}
      />

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
