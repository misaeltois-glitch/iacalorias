import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, PieChart, Settings, LogIn, LogOut, User, BarChart2, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';
import { useAuth } from '@/hooks/use-auth';

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
      {used >= max && (
        <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>
          Limite atingido — Faça upgrade para continuar ✨
        </span>
      )}
    </button>
  );
}

export default function Home() {
  const { toast } = useToast();
  const sessionId = useSession();
  const { user, isAuthenticated, logout } = useAuth();
  const { accepted: lgpdAccepted, accept: acceptLGPD } = useLGPDConsent();

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallDisableClose, setPaywallDisableClose] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showGoalsPanel, setShowGoalsPanel] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [showSplash, setShowSplash] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);

  const [savedGoals, setSavedGoals] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [goalsLoaded, setGoalsLoaded] = useState(false);
  const [period, setPeriod] = useState<Period>('day');

  const [activeTab, setActiveTab] = useState<BottomNavTab>('home');

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
    setGoalsLoaded(true);
  }, [sessionId, isPremium, period]);

  useEffect(() => {
    if (sessionId && isPremium) refreshSummary();
    else if (sessionId && !isPremium) setGoalsLoaded(true);
  }, [sessionId, isPremium, refreshSummary]);

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
    }
  }, []);

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
    toast({ title: "Até logo!", description: "Você saiu da sua conta." });
  };

  const handleSplashDone = () => {
    setShowSplash(false);
    setShowCarousel(true);
  };

  const handleCarouselDone = () => {
    setShowCarousel(false);
    localStorage.setItem(ONBOARDED_KEY, 'true');
  };

  const handleTabChange = (tab: BottomNavTab) => {
    setActiveTab(tab);
    if (tab === 'home') { setCurrentResult(null); }
    if (tab === 'history') { setShowAnalytics(true); }
    if (tab === 'analyze') { setCurrentResult(null); }
    if (tab === 'goals') { isPremium ? setShowGoalsPanel(true) : setShowPaywall(true); }
    if (tab === 'profile') { isAuthenticated ? setShowUserMenu(v => !v) : setShowAuth(true); }
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

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

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
        background: 'rgba(var(--bg-rgb, 250,251,252), 0.85)',
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
            {renderUsagePill()}

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
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  style={{ padding: '8px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}
                >
                  <User size={16} />
                </button>
                {showUserMenu && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setShowUserMenu(false)} />
                    <div style={{
                      position: 'absolute', right: 0, top: '42px',
                      background: 'var(--bg-2)', border: '1px solid var(--border)',
                      borderRadius: '16px', padding: '8px',
                      minWidth: '200px', zIndex: 101,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    }}>
                      <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '2px' }}>Conectado como</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', wordBreak: 'break-all' }}>{user?.email}</div>
                      </div>
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
              <button
                onClick={() => setShowAuth(true)}
                style={{ padding: '8px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}
              >
                <LogIn size={16} />
              </button>
            )}

            <button
              onClick={toggleTheme}
              style={{ padding: '8px', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        width: '100%', maxWidth: '720px', padding: '16px 16px 96px',
        display: 'flex', flexDirection: 'column', flex: 1,
      }}>

        <AnimatePresence mode="wait">
          {!currentResult ? (
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
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '3px' }}>
                    Analise sua refeição
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-2)' }}>
                    Tire uma foto ou escolha da galeria
                  </p>
                </div>
                <UploadZone
                  onAnalyze={handleAnalyze}
                  onFileSelected={handleFileSelected}
                  isAnalyzing={analyzeMutation.isPending}
                  usageLabel={!isAuthenticated && subStatus?.tier === 'free' ? `(${3 - trialUsed} de 3 grátis)` : undefined}
                />
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
                    onClick={() => setShowAuth(true)}
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
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>
                      Desbloqueie análises ilimitadas
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                      Metas personalizadas · Histórico completo · Alertas de nutricionista
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', color: '#0D9F6E', fontWeight: 700, flexShrink: 0 }}>Ver planos →</span>
                </button>
              )}

              {/* Daily progress */}
              {goalsLoaded && (
                <DailyProgress
                  totals={dailySummary?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: 0 }}
                  goals={savedGoals}
                  alerts={dailySummary?.alerts ?? []}
                  aiSummary={dailySummary?.aiSummary ?? null}
                  analysesCount={dailySummary?.analysesCount ?? 0}
                  period={period}
                  onPeriodChange={handlePeriodChange}
                  onSetGoals={() => isPremium ? setShowGoalsPanel(true) : setShowPaywall(true)}
                  isPremium={isPremium}
                />
              )}

              {/* Como funciona */}
              <div style={{ paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)', marginBottom: '14px', letterSpacing: '-0.3px' }}>
                  Como funciona
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {[
                    { num: '01', title: 'Fotografe', desc: 'Tire uma foto clara da sua refeição ou faça upload de uma imagem.', emoji: '📸' },
                    { num: '02', title: 'IA analisa', desc: 'GPT-4o Vision identifica alimentos e calcula macronutrientes automaticamente.', emoji: '⚡' },
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
      />

      {/* Panels / Modals */}
      <AnalyticsPanel
        isOpen={showAnalytics}
        onClose={() => { setShowAnalytics(false); setActiveTab('home'); }}
        sessionId={sessionId}
        isPremium={isPremium}
        onUpgrade={() => { setShowAnalytics(false); setPaywallDisableClose(false); setShowPaywall(true); }}
      />

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => { setShowPaywall(false); setPaywallDisableClose(false); }}
        sessionId={sessionId}
        disableClose={paywallDisableClose}
        onShowAuth={paywallDisableClose ? () => { setShowPaywall(false); setPaywallDisableClose(false); setShowAuth(true); } : undefined}
      />

      <AnimatePresence>
        {showGoalsPanel && (
          <GoalsPanel
            isOpen={showGoalsPanel}
            onClose={() => { setShowGoalsPanel(false); setActiveTab('home'); refreshSummary(); }}
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

      <AuthModal
        isOpen={showAuth}
        onClose={() => { setShowAuth(false); setActiveTab('home'); }}
        onSuccess={handleAuthSuccess}
        sessionId={sessionId}
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
