import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Sun, Camera, PieChart, Sparkles, Image as ImageIcon, Zap, Info } from 'lucide-react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';

import { UploadZone } from '@/components/UploadZone';
import { ResultCard } from '@/components/ResultCard';
import { PaywallModal } from '@/components/PaywallModal';

import { 
  useAnalyzeFood, 
  useGetSubscriptionStatus 
} from '@workspace/api-client-react';

import type { AnalysisResult } from '@workspace/api-client-react/src/generated/api.schemas';

export default function Home() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const sessionId = useSession();
  
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  // Queries
  const { data: subStatus, refetch: refetchStatus } = useGetSubscriptionStatus(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId } }
  );

  const analyzeMutation = useAnalyzeFood();

  // Initialization & Theme
  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(currentTheme as 'light' | 'dark');

    // Check for success checkout redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout_success') === 'true') {
      toast({
        title: "Assinatura confirmada!",
        description: "Seu plano foi ativado com sucesso. Aproveite suas análises!",
      });
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      if (sessionId) {
        refetchStatus();
      }
    }
  }, [sessionId, refetchStatus, toast]);

  const toggleTheme = () => {
    const root = document.documentElement;
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
  };

  const handleAnalyze = async (file: File) => {
    if (!sessionId) return;

    if (subStatus?.tier === 'free' && subStatus.trialRemaining <= 0) {
      setShowPaywall(true);
      return;
    }

    analyzeMutation.mutate({
      data: { image: file, sessionId }
    }, {
      onSuccess: (data) => {
        setCurrentResult(data);
        refetchStatus();
      },
      onError: (error: any) => {
        if (error?.response?.status === 402 || error?.status === 402 || error?.response?.data?.requiresUpgrade) {
          setShowPaywall(true);
        } else {
          toast({
            title: "Erro na análise",
            description: "Não foi possível analisar sua foto. Tente novamente com uma imagem mais clara.",
            variant: "destructive"
          });
        }
      }
    });
  };

  const handleReset = () => {
    setCurrentResult(null);
  };

  const renderUsagePill = () => {
    if (!subStatus) return null;
    
    if (subStatus.tier === 'free') {
      return (
        <button 
          onClick={() => setShowPaywall(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium border border-green-500/20 hover:bg-green-500/20 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {subStatus.trialRemaining} de 3 grátis
        </button>
      );
    }
    
    if (subStatus.tier === 'limited') {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-medium border border-amber-500/20">
          {subStatus.analysisCount}/20 usados
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-sm font-medium border border-purple-500/20">
        Ilimitado
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background relative flex flex-col items-center">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full flex justify-center border-b border-border/40 glass">
        <div className="w-full max-w-[720px] px-4 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <PieChart className="w-5 h-5" />
            </div>
            <span className="font-semibold text-foreground tracking-tight">IA Calorias</span>
            <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground uppercase tracking-wider ml-1">
              Beta
            </span>
          </div>

          <div className="flex items-center gap-3">
            {renderUsagePill()}
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full text-muted-foreground hover:bg-background-2 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-[720px] px-4 py-8 flex flex-col min-h-[calc(100vh-60px)]">
        
        <AnimatePresence mode="wait">
          {!currentResult ? (
            <motion.div 
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              className="flex flex-col items-center w-full mt-4 md:mt-12"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background-2 text-xs font-medium text-muted-foreground mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                GPT-4o Vision · Análise instantânea
              </div>

              <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-foreground leading-[1.1]">
                  Fotografe seu prato.<br />
                  <span className="text-gradient">Conheça as calorias.</span>
                </h1>
                <p className="text-muted-foreground max-w-[480px] mx-auto text-base">
                  Descubra calorias, macronutrientes e receba um score de saúde para qualquer refeição com o poder da Inteligência Artificial.
                </p>
              </div>

              <UploadZone 
                onAnalyze={handleAnalyze} 
                isAnalyzing={analyzeMutation.isPending} 
              />
            </motion.div>
          ) : (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <ResultCard result={currentResult} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Como funciona Section */}
        <div className="mt-20 mb-12 w-full pt-12 border-t border-border">
          <h2 className="text-xl font-semibold mb-6 text-foreground">Como funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-background-2 border border-border">
              <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center mb-4">
                <Camera className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">01. Fotografe seu prato</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tire uma foto clara da sua refeição ou faça upload da galeria do seu celular.
              </p>
            </div>
            
            <div className="p-5 rounded-2xl bg-background-2 border border-border">
              <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">02. IA analisa em segundos</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nossa IA com GPT-4o Vision identifica os alimentos e porções com alta precisão.
              </p>
            </div>
            
            <div className="p-5 rounded-2xl bg-background-2 border border-border">
              <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center mb-4">
                <Info className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">03. Resultados detalhados</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Receba as calorias exatas, macros e um score de saúde para melhorar sua dieta.
              </p>
            </div>
          </div>
        </div>

      </main>

      <PaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)} 
        sessionId={sessionId}
      />
    </div>
  );
}
