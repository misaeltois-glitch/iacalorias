import React, { useState } from 'react';

const LGPD_KEY = 'lgpd-accepted';

export function useLGPDConsent() {
  const [accepted, setAccepted] = useState<boolean>(() => {
    return localStorage.getItem(LGPD_KEY) === 'true';
  });

  const accept = () => {
    localStorage.setItem(LGPD_KEY, 'true');
    setAccepted(true);
  };

  return { accepted, accept };
}

interface LGPDConsentPopupProps {
  onAccept: () => void;
}

export function LGPDConsentPopup({ onAccept }: LGPDConsentPopupProps) {
  const [loading, setLoading] = useState(false);

  const handleAccept = () => {
    setLoading(true);
    onAccept();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0',
    }}>
      <div style={{
        width: '100%', maxWidth: '520px',
        background: 'var(--bg-surface)',
        borderRadius: '24px 24px 0 0',
        padding: '28px 24px 40px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>
        {/* Handle */}
        <div style={{
          width: '36px', height: '4px', borderRadius: '99px',
          background: 'var(--border-strong)', margin: '0 auto 24px',
        }} />

        {/* Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '18px', flexShrink: 0,
          }}>🥗</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>IA Calorias</div>
            <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>Privacidade e Cookies</div>
          </div>
        </div>

        <h2 style={{
          fontSize: '18px', fontWeight: 700, color: 'var(--text-1)',
          marginBottom: '12px', lineHeight: 1.3,
        }}>
          Antes de começar
        </h2>

        <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.65, marginBottom: '16px' }}>
          Para funcionar, o IA Calorias coleta e processa seus dados de uso, incluindo as fotos de refeições que você enviar e informações de navegação, de acordo com a <strong style={{ color: 'var(--text-1)' }}>Lei Geral de Proteção de Dados (LGPD)</strong>.
        </p>

        <div style={{
          background: 'var(--bg-2)', borderRadius: '12px',
          padding: '14px 16px', marginBottom: '20px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✓</span>
              <span>Suas imagens são processadas pelo GPT-4o Vision e <strong style={{ color: 'var(--text-1)' }}>não são armazenadas permanentemente</strong></span>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✓</span>
              <span>Dados de análise são associados à sua sessão ou conta</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>✓</span>
              <span>Você pode solicitar exclusão dos seus dados a qualquer momento</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleAccept}
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            borderRadius: '12px',
            background: 'var(--accent)',
            color: '#fff', border: 'none',
            fontSize: '15px', fontWeight: 700,
            cursor: 'pointer', marginBottom: '12px',
            transition: 'opacity 0.2s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          Aceito e quero continuar
        </button>

        <p style={{
          textAlign: 'center', fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.5,
        }}>
          Ao continuar, você concorda com nossos{' '}
          <span style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>
            Termos de Uso
          </span>
          {' '}e{' '}
          <span style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>
            Política de Privacidade
          </span>
          .
        </p>
      </div>
    </div>
  );
}
