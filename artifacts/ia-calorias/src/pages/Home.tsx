import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Moon, Sun, ArrowLeft, Crown } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';

import { UploadZone } from '@/components/UploadZone';
import { ResultCard } from '@/components/ResultCard';
import { HistorySidebar } from '@/components/HistorySidebar';
import { PaywallModal } from '@/components/PaywallModal';

import { 
  useAnalyzeFood, 
  useGetAnalysisHistory, 
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

  const { data: history = [], refetch: refetchHistory } = useGetAnalysisHistory(
    { sessionId: sessionId! },
    { query: { enabled: !!sessionId } }
  );

  const analyzeMutation = useAnalyzeFood();

  // Initialization & Theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');

    // Check for success checkout redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
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
    if (theme === 'dark') {
      root.classList.remove('dark');
      setTheme('light');
    } else {
      root.classList.add('dark');
      setTheme('dark');
    }
  };

  const handleAnalyze = async (file: File) => {
    if (!sessionId) return;

    // Proactive paywall check
    if (subStatus?.tier === 'free' && subStatus.trialRemaining <= 0) {
      setShowPaywall(true);
      return;
    }

    analyzeMutation.mutate({
      data: { image: file, sessionId }
    }, {
      onSuccess: (data) => {
        setCurrentResult(data);
        refetchHistory();
        refetchStatus();
      },
      onError: (error: any) => {
        // Backend should return 402 if trial limit exceeded
        if (error?.status === 402 || error?.requiresUpgrade) {
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Abstract Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20 mix-blend-screen">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
          alt="" 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-transparent via-background/80 to-background" />

      {/* Header */}
      <header className="relative z-10 w-full border-b border-border/40 bg-background/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
              <Leaf className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">IA Calorias</span>
          </div>

          <div className="flex items-center gap-4">
            {subStatus && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50 text-sm font-medium">
                {subStatus.tier === 'free' ? (
                  <>
                    <span className="text-muted-foreground">{3 - subStatus.trialRemaining} de 3 grátis</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-primary hover:bg-primary/10 ml-2"
                      onClick={() => setShowPaywall(true)}
                    >
                      Premium
                    </Button>
                  </>
                ) : (
                  <span className="flex items-center gap-1 text-amber-500">
                    <Crown className="w-4 h-4" /> 
                    {subStatus.tier === 'unlimited' ? 'Ilimitado' : `${subStatus.analysisCount}/20 usados`}
                  </span>
                )}
              </div>
            )}
            
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex gap-8">
        
        {/* Left Column - Core Interaction */}
        <div className="flex-1 flex flex-col items-center">
          
          <AnimatePresence mode="wait">
            {!currentResult ? (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                className="w-full flex flex-col items-center mt-8 md:mt-16"
              >
                <div className="text-center mb-10 max-w-xl">
                  <h1 className="text-4xl md:text-6xl font-display font-extrabold tracking-tight mb-4 text-gradient">
                    Sua nutrição,<br /> decodificada por IA.
                  </h1>
                  <p className="text-lg md:text-xl text-muted-foreground">
                    Fotografe seu prato. A inteligência artificial revela instantaneamente as calorias e macronutrientes.
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
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full pt-4"
              >
                <div className="mb-8 flex justify-center">
                  <Button variant="outline" className="rounded-full pl-4 pr-6 h-12 shadow-sm" onClick={handleReset}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Analisar outro prato
                  </Button>
                </div>
                <ResultCard result={currentResult} />
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Right Column - History (Desktop) */}
        <div className="hidden lg:block w-96 flex-shrink-0">
          <HistorySidebar history={history} />
        </div>
      </main>

      {/* History (Mobile) - Stacked at bottom */}
      <div className="block lg:hidden w-full px-4 pb-12 relative z-10">
        <div className="h-96">
          <HistorySidebar history={history} />
        </div>
      </div>

      <PaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)} 
        sessionId={sessionId}
      />
    </div>
  );
}
