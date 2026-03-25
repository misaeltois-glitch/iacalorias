import React, { useState } from 'react';
import { useCreateCheckoutSession } from '@workspace/api-client-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export function PaywallModal({ isOpen, onClose, sessionId }: PaywallModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<'limited' | 'unlimited' | null>(null);
  const checkoutMutation = useCreateCheckoutSession();

  const handleCheckout = (plan: 'limited' | 'unlimited') => {
    if (loadingPlan) return;
    setLoadingPlan(plan);
    checkoutMutation.mutate({ data: { sessionId, plan } }, {
      onSuccess: (res) => { window.location.href = res.url; },
      onError: () => { setLoadingPlan(null); },
    });
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--bg-surface)',
          borderRadius: '24px 24px 0 0',
          padding: '28px 20px 36px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
      >
        {/* Handle bar */}
        <div style={{
          width: '36px', height: '4px', borderRadius: '99px',
          background: 'var(--border-strong)', margin: '0 auto 24px',
        }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '5px 14px', borderRadius: '99px',
            background: 'rgba(239,68,68,0.12)', color: '#f87171',
            fontSize: '12px', fontWeight: 600, marginBottom: '14px',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Análises gratuitas esgotadas
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--text-1)', marginBottom: '6px', lineHeight: 1.3 }}>
            Continue monitorando sua nutrição
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.5 }}>
            Escolha o plano ideal e continue usando o IA Calorias.
          </p>
        </div>

        {/* Plans — stacked vertically */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>

          {/* Ilimitado — destacado */}
          <div style={{
            border: '2px solid var(--accent)', borderRadius: '16px',
            padding: '18px 20px', background: 'var(--accent-glow)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '-11px', right: '16px',
              background: 'var(--accent)', color: '#fff',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px',
              padding: '3px 10px', borderRadius: '99px',
            }}>
              MAIS POPULAR
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>Ilimitado</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Análises ilimitadas por mês</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                  R$&nbsp;49<span style={{ fontSize: '18px' }}>,90</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px' }}>/mês</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {['✓ Análises ilimitadas', '✓ Macros completos', '✓ Score de saúde', '✓ Metas personalizadas', '✓ Resumo da nutricionista'].map(f => (
                <span key={f} style={{
                  fontSize: '12px', color: 'var(--text-2)',
                  background: 'rgba(34,197,94,0.08)', padding: '3px 8px',
                  borderRadius: '99px', border: '1px solid rgba(34,197,94,0.2)',
                }}>{f}</span>
              ))}
            </div>

            <button
              onClick={() => handleCheckout('unlimited')}
              disabled={!!loadingPlan}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: loadingPlan ? 'var(--bg-3)' : 'linear-gradient(135deg, var(--accent), #059669)',
                color: '#fff', border: 'none',
                fontSize: '15px', fontWeight: 700,
                cursor: loadingPlan ? 'not-allowed' : 'pointer',
                opacity: loadingPlan && loadingPlan !== 'unlimited' ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              {loadingPlan === 'unlimited' ? 'Redirecionando...' : 'Assinar Ilimitado'}
            </button>
          </div>

          {/* Limitado */}
          <div style={{
            border: '1.5px solid var(--border-strong)', borderRadius: '16px',
            padding: '18px 20px', background: 'var(--bg-2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>Limitado</div>
                <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>20 análises por mês</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                  R$&nbsp;29<span style={{ fontSize: '18px' }}>,90</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px' }}>/mês</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {['✓ 20 análises/mês', '✓ Macros completos', '✓ Score de saúde', '✓ Metas personalizadas'].map(f => (
                <span key={f} style={{
                  fontSize: '12px', color: 'var(--text-2)',
                  background: 'var(--bg-3)', padding: '3px 8px',
                  borderRadius: '99px', border: '1px solid var(--border)',
                }}>{f}</span>
              ))}
            </div>

            <button
              onClick={() => handleCheckout('limited')}
              disabled={!!loadingPlan}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                background: 'var(--bg-3)', color: 'var(--text-1)',
                border: '1.5px solid var(--border-strong)',
                fontSize: '15px', fontWeight: 600,
                cursor: loadingPlan ? 'not-allowed' : 'pointer',
                opacity: loadingPlan && loadingPlan !== 'limited' ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              {loadingPlan === 'limited' ? 'Redirecionando...' : 'Começar com Limitado'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center', fontSize: '12px', color: 'var(--text-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Pagamento seguro via Stripe · Cancele quando quiser
        </p>
      </div>
    </div>
  );
}
