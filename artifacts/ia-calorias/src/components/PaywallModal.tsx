import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { useCreateCheckoutSession } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
}

export function PaywallModal({ isOpen, onClose, sessionId }: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'limited' | 'unlimited'>('unlimited');
  const checkoutMutation = useCreateCheckoutSession();
  const { toast } = useToast();

  const handleCheckout = () => {
    if (!sessionId) return;
    
    checkoutMutation.mutate({
      data: {
        sessionId,
        plan: selectedPlan
      }
    }, {
      onSuccess: (res) => {
        window.location.href = res.url;
      },
      onError: () => {
        toast({
          title: "Erro ao processar",
          description: "Ocorreu um erro ao iniciar o pagamento. Tente novamente.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background/95 backdrop-blur-3xl border-border/50">
        <div className="grid md:grid-cols-2">
          {/* Left Side: Context */}
          <div className="p-8 md:p-12 bg-muted/30 flex flex-col justify-center">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <DialogHeader className="text-left mb-6">
              <DialogTitle className="text-3xl md:text-4xl font-display mb-2">Eleve sua nutrição</DialogTitle>
              <DialogDescription className="text-base md:text-lg text-muted-foreground">
                Você atingiu o limite gratuito de 3 análises. Assine um de nossos planos para continuar descobrindo a verdade nutricional de seus pratos com a precisão da Inteligência Artificial.
              </DialogDescription>
            </DialogHeader>
            
            <ul className="space-y-4">
              {[
                'Análise fotográfica instantânea',
                'Macronutrientes detalhados',
                'Histórico completo de refeições',
                'Suporte prioritário'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Right Side: Pricing */}
          <div className="p-8 md:p-12 space-y-6">
            <div className="space-y-4">
              {/* Limited Plan */}
              <div 
                onClick={() => setSelectedPlan('limited')}
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                  selectedPlan === 'limited' 
                    ? 'border-primary bg-primary/5 shadow-xl shadow-primary/5' 
                    : 'border-border/50 bg-card hover:border-border'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-lg">Plano Limitado</h4>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'limited' ? 'border-primary' : 'border-muted-foreground/30'
                  }`}>
                    {selectedPlan === 'limited' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                  </div>
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-display font-bold">R$ 29,90</span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>
                <p className="text-sm text-muted-foreground">20 análises precisas por mês.</p>
              </div>

              {/* Unlimited Plan */}
              <div 
                onClick={() => setSelectedPlan('unlimited')}
                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                  selectedPlan === 'unlimited' 
                    ? 'border-primary bg-primary/5 shadow-xl shadow-primary/5' 
                    : 'border-border/50 bg-card hover:border-border'
                }`}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-full">
                  Recomendado
                </div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-lg">Plano Ilimitado</h4>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === 'unlimited' ? 'border-primary' : 'border-muted-foreground/30'
                  }`}>
                    {selectedPlan === 'unlimited' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                  </div>
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-display font-bold">R$ 49,90</span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>
                <p className="text-sm text-muted-foreground">Análises ilimitadas, sem restrições.</p>
              </div>
            </div>

            <Button 
              className="w-full h-14 text-lg rounded-xl font-semibold shadow-xl"
              onClick={handleCheckout}
              disabled={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              {checkoutMutation.isPending ? 'Redirecionando...' : 'Assinar Agora'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Cancelamento fácil a qualquer momento. Pagamento seguro via Stripe.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
