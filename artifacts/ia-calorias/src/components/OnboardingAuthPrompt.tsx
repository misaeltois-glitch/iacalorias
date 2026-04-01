import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { X } from 'lucide-react';

interface OnboardingAuthPromptProps {
  onComplete: () => void;
}

export function OnboardingAuthPrompt({ onComplete }: OnboardingAuthPromptProps) {
  const [, navigate] = useLocation();

  const handleCreateAccount = () => {
    onComplete();
    navigate('/login?tab=register');
  };

  const handleLogin = () => {
    onComplete();
    navigate('/login');
  };

  const handleContinueAnonymous = () => {
    onComplete();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleContinueAnonymous(); }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--bg-2)',
          borderRadius: '28px 28px 0 0',
          padding: '0 0 env(safe-area-inset-bottom, 0)',
          overflow: 'hidden',
        }}
      >
        {/* Handle + close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px 0', position: 'relative' }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border)' }} />
          <button
            onClick={handleContinueAnonymous}
            style={{
              position: 'absolute', right: 16,
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--bg-3)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={15} style={{ color: 'var(--text-2)' }} />
          </button>
        </div>

        <div style={{ padding: '16px 24px 32px' }}>
          {/* Icon + title */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
              Tudo pronto para começar!
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
              Suas metas e plano de treino estão configurados. Crie uma conta para salvar seu progresso.
            </p>
          </div>

          {/* Benefits list */}
          <div style={{
            background: 'var(--bg-3)', borderRadius: 16,
            padding: '14px 16px', marginBottom: 20,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {[
              { icon: '📊', text: 'Histórico de análises salvo para sempre' },
              { icon: '🎯', text: 'Metas e plano de treino sincronizados' },
              { icon: '📱', text: 'Acesse de qualquer dispositivo' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.4 }}>{text}</span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleCreateAccount}
              style={{
                width: '100%', padding: '15px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                border: 'none', color: '#fff',
                fontSize: 16, fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(13,159,110,0.35)',
              }}
            >
              Criar conta gratuita →
            </button>
            <button
              onClick={handleLogin}
              style={{
                width: '100%', padding: '13px',
                borderRadius: 14,
                background: 'var(--bg-3)',
                border: '1.5px solid var(--border)',
                color: 'var(--text-1)',
                fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Já tenho conta — Entrar
            </button>
            <button
              onClick={handleContinueAnonymous}
              style={{
                width: '100%', padding: '11px',
                background: 'none', border: 'none',
                color: 'var(--text-3)',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              Continuar sem identificar
            </button>
          </div>

          {/* Fine print */}
          <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
            Plano gratuito: 3 análises por dia · 1 plano de treino · 24h de acesso
          </p>
        </div>
      </motion.div>
    </div>
  );
}
