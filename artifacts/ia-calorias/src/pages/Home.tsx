import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, PieChart, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';

import { UploadZone } from '@/components/UploadZone';
import { ResultCard } from '@/components/ResultCard';
import { PaywallModal } from '@/components/PaywallModal';
import { OnboardingModal, type CalculatedGoals } from '@/components/OnboardingModal';
import { DailyProgress } from '@/components/DailyProgress';

import {
  useAnalyzeFood,
  useGetSubscriptionStatus,
} from '@workspace/api-client-react';

import type { AnalysisResult } from '@workspace/api-client-react/src/generated/api.schemas';

const BASE = import.meta.env.BASE_URL ?? '/';

// ── Simple fetchers (goals API não está no codegen, chamada manual) ──────────
async function fetchGoals(sessionId: string) {
  const r = await fetch(`${BASE}api/goals?sessionId=${sessionId}`);
  if (!r.ok) return null;
  return r.json();
}
async function saveGoals(sessionId: string, goals: CalculatedGoals) {
  await fetch(`${BASE}api/goals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, ...goals, restrictions: goals.restrictions }),
  });
}
async function fetchDailySummary(sessionId: string) {
  const r = await fetch(`${BASE}api/goals/daily-summary?sessionId=${sessionId}`);
  if (!r.ok) return null;
  return r.json();
}

export default function Home() {
  const { toast } = useToast();
  const sessionId = useSession();

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Goals & daily summary state
  const [savedGoals, setSavedGoals] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [goalsLoaded, setGoalsLoaded] = useState(false);

  const { data: subStatus, refetch: refetchStatus } = useGetSubscriptionStatus(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId } }
  );

  const analyzeMutation = useAnalyzeFood();
  const isPremium = subStatus?.tier === 'limited' || subStatus?.tier === 'unlimited';

  // ── Load goals & daily summary when premium ───────────────────────────────
  const refreshSummary = useCallback(async () => {
    if (!sessionId || !isPremium) return;
    const summary = await fetchDailySummary(sessionId);
    if (summary) {
      setDailySummary(summary);
      setSavedGoals(summary.goals);
    }
    setGoalsLoaded(true);
  }, [sessionId, isPremium]);

  useEffect(() => {
    if (sessionId && isPremium) refreshSummary();
    else if (sessionId && !isPremium) setGoalsLoaded(true);
  }, [sessionId, isPremium, refreshSummary]);

  // ── Theme & URL params ────────────────────────────────────────────────────
  useEffect(() => {
    const t = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(t as 'light' | 'dark');

    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout_success') === 'true') {
      toast({ title: "Assinatura confirmada!", description: "Seu plano foi ativado. Aproveite!" });
      window.history.replaceState({}, document.title, window.location.pathname);
      refetchStatus();
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setTheme(next);
  };

  // ── Error messages ────────────────────────────────────────────────────────
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

  // ── Analyze food ──────────────────────────────────────────────────────────
  const handleAnalyze = async (file: File) => {
    if (!sessionId) return;
    if (subStatus?.tier === 'free' && subStatus.trialRemaining <= 0) { setShowPaywall(true); return; }

    analyzeMutation.mutate({ data: { image: file, sessionId } }, {
      onSuccess: async (data) => {
        setCurrentResult(data);
        refetchStatus();
        if (isPremium) await refreshSummary();
      },
      onError: (error: any) => {
        const status = error?.response?.status ?? error?.status;
        const body = error?.response?.data ?? error?.data ?? {};
        if (status === 402 || body?.requiresUpgrade) { setShowPaywall(true); return; }
        const { title, description } = getErrorMessage(error);
        toast({ title, description, variant: "destructive" });
      },
    });
  };

  // ── Save goals from onboarding ────────────────────────────────────────────
  const handleGoalsSave = async (goals: CalculatedGoals) => {
    if (!sessionId) return;
    await saveGoals(sessionId, goals);
    setShowOnboarding(false);
    toast({ title: "Metas salvas! 🎯", description: "Seu progresso diário já está ativo." });
    await refreshSummary();
  };

  // ── Usage pill ────────────────────────────────────────────────────────────
  const renderUsagePill = () => {
    if (!subStatus) return null;
    if (subStatus.tier === 'free') return (
      <button onClick={() => setShowPaywall(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium border border-green-500/20 hover:bg-green-500/20 transition-colors">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        {subStatus.trialRemaining} de 3 grátis
      </button>
    );
    if (subStatus.tier === 'limited') return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium border border-amber-500/20">
        {subStatus.analysisCount}/20
      </div>
    );
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-sm font-medium border border-purple-500/20">
        ✦ Ilimitado
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background relative flex flex-col items-center">

      {/* Header */}
      <header className="sticky top-0 z-50 w-full flex justify-center border-b border-border/40 glass">
        <div className="w-full max-w-[720px] px-4 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentResult(null)}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <PieChart className="w-5 h-5" />
            </div>
            <span className="font-semibold text-foreground tracking-tight">IA Calorias</span>
            <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground uppercase tracking-wider ml-1">Beta</span>
          </div>

          <div className="flex items-center gap-2">
            {renderUsagePill()}
            {isPremium && (
              <button
                onClick={() => setShowOnboarding(true)}
                title="Configurar metas"
                className="p-2 rounded-full text-muted-foreground hover:bg-background-2 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button onClick={toggleTheme} className="p-2 rounded-full text-muted-foreground hover:bg-background-2 transition-colors">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="w-full max-w-[720px] px-4 py-8 flex flex-col min-h-[calc(100vh-60px)]">

        <AnimatePresence mode="wait">
          {!currentResult ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              className="flex flex-col items-center w-full mt-4 md:mt-10"
            >
              {/* Eyebrow */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background-2 text-xs font-medium text-muted-foreground mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                GPT-4o Vision · Análise instantânea
              </div>

              {/* Hero */}
              <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground leading-[1.1]">
                  Fotografe seu prato.<br />
                  <span className="text-gradient">Conheça as calorias.</span>
                </h1>
                <p className="text-muted-foreground max-w-[480px] mx-auto text-base">
                  Descubra calorias, macronutrientes e receba um score de saúde para qualquer refeição com o poder da Inteligência Artificial.
                </p>
              </div>

              <UploadZone onAnalyze={handleAnalyze} isAnalyzing={analyzeMutation.isPending} />

              {/* Daily Progress Panel (premium only, below upload) */}
              {goalsLoaded && (
                <div className="w-full mt-8">
                  <DailyProgress
                    totals={dailySummary?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: 0 }}
                    goals={savedGoals}
                    alerts={dailySummary?.alerts ?? []}
                    aiSummary={dailySummary?.aiSummary ?? null}
                    analysesCount={dailySummary?.analysesCount ?? 0}
                    onSetGoals={() => isPremium ? setShowOnboarding(true) : setShowPaywall(true)}
                    isPremium={isPremium}
                  />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <ResultCard result={currentResult} onReset={() => setCurrentResult(null)} />

              {/* Show daily progress after result too */}
              {goalsLoaded && isPremium && (
                <div className="mt-6">
                  <DailyProgress
                    totals={dailySummary?.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, meals: 0 }}
                    goals={savedGoals}
                    alerts={dailySummary?.alerts ?? []}
                    aiSummary={dailySummary?.aiSummary ?? null}
                    analysesCount={dailySummary?.analysesCount ?? 0}
                    onSetGoals={() => setShowOnboarding(true)}
                    isPremium={isPremium}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Como funciona */}
        <div className="mt-20 mb-12 w-full pt-12 border-t border-border">
          <h2 className="text-2xl font-bold text-center text-foreground mb-7 tracking-tight">Como funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                num: '01', title: 'Fotografe seu prato',
                desc: 'Tire uma foto clara da sua refeição ou faça upload de uma imagem existente.',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
              },
              {
                num: '02', title: 'IA analisa em segundos',
                desc: 'GPT-4o Vision identifica os alimentos, porções e calcula macronutrientes automaticamente.',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
              },
              {
                num: '03', title: 'Acompanhe suas metas',
                desc: 'Acumule refeições, veja anéis de progresso e receba resumos personalizados da nutricionista IA.',
                icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
              },
            ].map(({ num, title, desc, icon }) => (
              <div key={num} className="p-5 rounded-2xl bg-background-2 border border-border">
                <div className="flex items-start gap-4 mb-3">
                  <span style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1, color: 'var(--border-strong)', letterSpacing: '-1px', minWidth: '36px' }}>{num}</span>
                  <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">{icon}</div>
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Modals */}
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} sessionId={sessionId} />
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleGoalsSave}
        onSkip={() => setShowOnboarding(false)}
      />
    </div>
  );
}
