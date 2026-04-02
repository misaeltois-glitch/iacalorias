import React, { useEffect, useState } from 'react';
import { X, Share, Plus } from 'lucide-react';

type Platform = 'android' | 'ios' | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const SESSION_KEY = 'iac_install_prompt_shown';
const INSTALLED_KEY = 'iac_app_installed';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  // Desktop Chrome also supports install
  return 'android'; // trata desktop como android (usa o evento nativo)
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Não mostra se já está instalado
    if (isStandalone()) return;
    // Não mostra mais de uma vez por sessão
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const plat = detectPlatform();
    setPlatform(plat);

    if (plat === 'ios') {
      // iOS não tem evento — mostra instruções após pequeno delay
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }

    // Android/desktop — aguarda o evento do browser
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 2000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setShow(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(INSTALLED_KEY, '1'); // marca como instalado
      sessionStorage.setItem(SESSION_KEY, '1');
      setShow(false);
    }
    setInstalling(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'var(--bg)',
        borderRadius: '24px 24px 0 0',
        padding: '0 0 env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border)' }} />
        </div>

        {/* Fechar */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'var(--bg-2)', border: 'none', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-3)',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ padding: '16px 24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Ícone + título */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src="/icon-512.png"
              alt="IA Calorias"
              style={{ width: 60, height: 60, borderRadius: 14, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)', marginBottom: 3 }}>
                Instale o IA Calorias
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.4 }}>
                Acesso rápido pela tela inicial, sem abrir o navegador
              </div>
            </div>
          </div>

          {/* Benefícios */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: '⚡', text: 'Abre em 1 toque, direto da tela inicial' },
              { icon: '📵', text: 'Funciona mesmo com internet lenta' },
              { icon: '🔔', text: 'Experiência de app nativo, sem anúncios' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          {platform === 'ios' ? (
            /* Instruções iOS */
            <div style={{
              background: 'rgba(13,159,110,0.07)',
              border: '1px solid rgba(13,159,110,0.2)',
              borderRadius: 14, padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>
                Como instalar no iPhone/iPad:
              </div>
              {[
                { step: '1', icon: <Share size={15} />, text: 'Toque no botão Compartilhar (⬆️) do Safari' },
                { step: '2', icon: <Plus size={15} />, text: 'Selecione "Adicionar à Tela de Início"' },
                { step: '3', text: 'Toque em "Adicionar" no canto superior direito' },
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: '#0D9F6E', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                  }}>{item.step}</div>
                  <span style={{ fontSize: 13, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {item.icon}{item.text}
                  </span>
                </div>
              ))}
              <button
                onClick={handleDismiss}
                style={{
                  marginTop: 4, width: '100%', padding: '12px',
                  borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                  color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}
              >
                Entendido!
              </button>
            </div>
          ) : (
            /* Botão Android/Desktop */
            <button
              onClick={handleInstall}
              disabled={installing || !deferredPrompt}
              style={{
                width: '100%', padding: '14px',
                borderRadius: 14, border: 'none',
                background: deferredPrompt
                  ? 'linear-gradient(135deg, #0D9F6E, #057A55)'
                  : 'var(--bg-3)',
                color: deferredPrompt ? '#fff' : 'var(--text-3)',
                fontWeight: 700, fontSize: 15, cursor: deferredPrompt ? 'pointer' : 'not-allowed',
                boxShadow: deferredPrompt ? '0 4px 20px rgba(13,159,110,0.3)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {installing ? 'Instalando...' : '📲 Instalar agora'}
            </button>
          )}

          <button
            onClick={handleDismiss}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--text-3)', padding: '4px 0',
            }}
          >
            Agora não
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  );
}

// ── Banner "Abrir no app" ─────────────────────────────────────────────────────
// Aparece quando o usuário já instalou o PWA mas está acessando pelo browser

const OPEN_BANNER_KEY = 'iac_open_banner_dismissed';

export function OpenInAppBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Não mostra se já está dentro do app instalado
    if (isStandalone()) return;
    // Não mostra se o usuário já fechou este banner hoje
    if (sessionStorage.getItem(OPEN_BANNER_KEY)) return;

    // Verifica se o app foi instalado via flag local ou via API do browser
    const checkInstalled = async () => {
      // Flag salva quando o usuário aceitou o prompt de instalação
      if (localStorage.getItem(INSTALLED_KEY)) {
        setShow(true);
        return;
      }
      // API nativa do Chrome (Android) para detectar apps instalados
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const apps = await (navigator as any).getInstalledRelatedApps();
          if (apps.length > 0) {
            setShow(true);
          }
        } catch {}
      }
    };

    // Pequeno delay para não competir com outros popups
    const t = setTimeout(checkInstalled, 3500);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(OPEN_BANNER_KEY, '1');
    setShow(false);
  };

  const handleOpen = () => {
    // Navegar para a URL raiz — o SO redireciona para o app instalado
    window.location.href = window.location.origin + '/';
    handleDismiss();
  };

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 12, right: 12, zIndex: 9990,
      background: 'var(--bg)',
      border: '1px solid rgba(13,159,110,0.3)',
      borderRadius: 16,
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      animation: 'slideUp 0.3s ease',
    }}>
      <img src="/icon-512.png" alt="IA Calorias" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 1 }}>
          App instalado
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
          Você tem o IA Calorias instalado
        </div>
      </div>

      <button
        onClick={handleOpen}
        style={{
          padding: '8px 14px', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
          color: '#fff', fontWeight: 700, fontSize: 13,
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        Abrir →
      </button>

      <button
        onClick={handleDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-3)', padding: 4, flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
