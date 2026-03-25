import React, { useState } from 'react';
import { useCreateCheckoutSession } from '@workspace/api-client-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
}

export function PaywallModal({ isOpen, onClose, sessionId }: PaywallModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<'limited' | 'unlimited' | null>(null);
  const checkoutMutation = useCreateCheckoutSession();

  const handleCheckout = (plan: 'limited' | 'unlimited') => {
    if (!sessionId || loadingPlan) return;
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
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: '560px',
        background: 'var(--bg-surface)',
        borderRadius: '28px 28px 0 0',
        padding: '32px 24px 40px',
        boxShadow: 'var(--shadow-lg)',
        transform: 'translateY(0)',
        transition: 'transform 0.3s ease',
      }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '5px 12px', borderRadius: '99px',
            background: 'rgba(239,68,68,0.1)', color: '#f87171',
            fontSize: '12px', fontWeight: 600, marginBottom: '16px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            Suas análises gratuitas acabaram
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-1)', marginBottom: '8px' }}>
            Continue monitorando sua nutrição
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-2)' }}>
            Escolha o plano ideal para continuar usando o IA Calorias.
          </p>
        </div>

        {/* Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {/* Limitado */}
          <div style={{
            border: '1.5px solid var(--border-strong)', borderRadius: '16px',
            padding: '20px', background: 'var(--bg-2)',
          }}>
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>Limitado</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)' }}>R$ 29</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>,90</span>
                <span style={{ fontSize: '13px', color: 'var(--text-2)', marginLeft: '3px' }}>/mês</span>
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {['20 análises por mês', 'Macronutrientes completos', 'Score de saúde', 'Dicas nutricionais'].map(f => (
                <li key={f} style={{ fontSize: '13px', color: 'var(--text-2)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout('limited')}
              disabled={!!loadingPlan}
              style={{
                width: '100%', padding: '11px', borderRadius: '10px',
                background: 'var(--bg-3)', color: 'var(--text-1)',
                border: '1.5px solid var(--border-strong)',
                fontSize: '14px', fontWeight: 600, cursor: loadingPlan ? 'not-allowed' : 'pointer',
                opacity: loadingPlan ? 0.6 : 1, transition: 'all 0.2s',
              }}
            >
              {loadingPlan === 'limited' ? 'Aguarde...' : 'Começar agora'}
            </button>
          </div>

          {/* Ilimitado */}
          <div style={{
            border: '2px solid var(--accent)', borderRadius: '16px',
            padding: '20px', background: 'var(--accent-glow)',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--accent)', color: '#fff',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.3px',
              padding: '3px 12px', borderRadius: '99px', whiteSpace: 'nowrap',
            }}>
              Mais popular
            </div>
            <div style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '6px' }}>Ilimitado</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1px' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)' }}>R$ 49</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>,90</span>
                <span style={{ fontSize: '13px', color: 'var(--text-2)', marginLeft: '3px' }}>/mês</span>
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {['Análises ilimitadas', 'Macronutrientes completos', 'Score de saúde', 'Dicas nutricionais', 'Processamento prioritário'].map(f => (
                <li key={f} style={{ fontSize: '13px', color: 'var(--text-2)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>✓</span>
                  {f === 'Análises ilimitadas' ? <><strong style={{ color: 'var(--text-1)' }}>ilimitadas</strong></> : f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout('unlimited')}
              disabled={!!loadingPlan}
              style={{
                width: '100%', padding: '11px', borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--accent), #059669)',
                color: '#fff', border: 'none',
                fontSize: '14px', fontWeight: 600, cursor: loadingPlan ? 'not-allowed' : 'pointer',
                opacity: loadingPlan ? 0.6 : 1, transition: 'all 0.2s',
                boxShadow: '0 4px 14px var(--accent-glow)',
              }}
            >
              {loadingPlan === 'unlimited' ? 'Aguarde...' : 'Assinar ilimitado'}
            </button>
          </div>
        </div>

        {/* Security */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Pagamento seguro via Stripe · Cancele quando quiser
        </p>
      </div>
    </div>
  );
}
