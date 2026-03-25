import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ShieldCheck, Loader2 } from 'lucide-react';
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
      <DialogContent className="max-w-[720px] p-0 overflow-hidden bg-background border-border sm:rounded-[2rem] gap-0">
        <DialogTitle className="sr-only">Escolha um plano</DialogTitle>
        <div className="p-6 md:p-10 flex flex-col items-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold mb-6">
            Suas análises gratuitas acabaram
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-10 tracking-tight">
            Continue monitorando<br />sua nutrição
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
            {/* Limited Plan */}
            <div 
              onClick={() => setSelectedPlan('limited')}
              className={`
                relative p-6 rounded-3xl border-2 cursor-pointer transition-all duration-200 text-left
                ${selectedPlan === 'limited' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-background-2 hover:border-border-strong'}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg text-foreground">Limitado</span>
                <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center ${selectedPlan === 'limited' ? 'border-primary' : 'border-muted-foreground'}`}>
                  {selectedPlan === 'limited' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                </div>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold text-foreground">R$ 29,90</span>
                <span className="text-sm text-muted-foreground font-medium">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                20 análises por mês
              </p>
            </div>

            {/* Unlimited Plan */}
            <div 
              onClick={() => setSelectedPlan('unlimited')}
              className={`
                relative p-6 rounded-3xl border-2 cursor-pointer transition-all duration-200 text-left
                ${selectedPlan === 'unlimited' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border bg-background-2 hover:border-border-strong'}
              `}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-[11px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap">
                Mais popular
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg text-foreground">Ilimitado</span>
                <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center ${selectedPlan === 'unlimited' ? 'border-primary' : 'border-muted-foreground'}`}>
                  {selectedPlan === 'unlimited' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                </div>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold text-foreground">R$ 49,90</span>
                <span className="text-sm text-muted-foreground font-medium">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Análises ilimitadas
              </p>
            </div>
          </div>

          <button 
            className="w-full h-14 rounded-2xl bg-foreground text-background font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            onClick={handleCheckout}
            disabled={checkoutMutation.isPending}
          >
            {checkoutMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Continuar'
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium">
            <ShieldCheck className="w-4 h-4" />
            Pagamento seguro via Stripe · Cancele quando quiser
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
