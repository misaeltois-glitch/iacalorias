import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Eye, EyeOff, ArrowLeft, CheckCircle2, Leaf, Dumbbell, BarChart2, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useSession } from '@/hooks/use-session';
import { trackEvent } from '@/lib/tracking';

type Tab = 'login' | 'register' | 'forgot';

const ACCENT = '#0D9F6E';

const FEATURES = [
  { icon: Leaf, title: 'Análise por foto', desc: 'Envie uma foto da refeição e a IA calcula tudo automaticamente.' },
  { icon: BarChart2, title: 'Acompanhe sua evolução', desc: 'Histórico completo com gráficos de calorias e nutrientes.' },
  { icon: Dumbbell, title: 'Personal Virtual', desc: 'Treinos personalizados gerados na hora para o seu perfil.' },
  { icon: Zap, title: 'Metas inteligentes', desc: 'Defina objetivos e receba alertas quando estiver no caminho certo.' },
];

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login, register, forgotPassword, isAuthenticated } = useAuth();
  const { sessionId } = useSession();

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Carrega o script do Google Identity Services
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (document.getElementById('gsi-script')) return;
    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const handleGoogleLogin = () => {
    if (!GOOGLE_CLIENT_ID || !(window as any).google) {
      setError('Login com Google indisponível. Tente com email e senha.');
      return;
    }
    setError('');
    setGoogleLoading(true);
    const google = (window as any).google;
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: { credential: string }) => {
        try {
          const r = await fetch(`${BASE}api/auth/google-oauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential, sessionId }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.message ?? 'Erro ao autenticar com Google.');
          localStorage.setItem(AUTH_TOKEN_KEY, data.token);
          trackEvent('CompleteRegistration');
          navigate('/');
        } catch (err: any) {
          setError(err.message || 'Erro ao autenticar com Google.');
        } finally {
          setGoogleLoading(false);
        }
      },
    });
    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setGoogleLoading(false);
      }
    });
  };

  useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'register') setTab('register');
  }, []);

  const reset = (t: Tab) => {
    setTab(t); setError(''); setSuccess('');
    setEmail(''); setPassword(''); setConfirmPassword(''); setName('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password, sessionId);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login.');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      await register(email, password, sessionId);
      trackEvent('CompleteRegistration');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
    } finally { setLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const msg = await forgotPassword(email);
      setSuccess(msg);
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar redefinição.');
    } finally { setLoading(false); }
  };

  const inputCls: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: '12px',
    background: 'var(--bg-2)', color: 'var(--text-1)',
    border: '1.5px solid var(--border-strong)',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex',
      background: 'var(--bg)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* ── LEFT PANEL (desktop only) ── */}
      <div style={{
        display: 'none',
        flex: '0 0 480px', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 52px',
        background: 'linear-gradient(160deg, #0a3d2a 0%, #0D9F6E 60%, #057A55 100%)',
        position: 'relative', overflow: 'hidden',
      }}
        className="login-left-panel"
      >
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -40, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '60px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', backdropFilter: 'blur(8px)' }}>🥗</div>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>IA Calorias</span>
          </div>
          <h1 style={{ fontSize: '38px', fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-1px', marginBottom: '16px' }}>
            Sua alimentação<br />inteligente começa aqui.
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: '48px' }}>
            Conte calorias com uma foto, acompanhe seus nutrientes e alcance seus objetivos com o apoio da IA.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(6px)' }}>
                  <Icon size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{title}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          © 2026 IA Calorias · Feito no Brasil 🇧🇷
        </div>
      </div>

      {/* ── RIGHT PANEL / FORM ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', overflowY: 'auto', minHeight: '100dvh',
      }}>
        {/* Back to app (mobile) */}
        <div style={{ width: '100%', maxWidth: '420px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <button
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: '14px', fontWeight: 500, padding: 0, fontFamily: 'inherit' }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>IA Calorias</div>
        </div>

        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Logo for mobile */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }} className="login-mobile-logo">
            <div style={{ width: 56, height: 56, borderRadius: '16px', background: `linear-gradient(135deg, ${ACCENT}, #057A55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(13,159,110,0.3)' }}>🥗</div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 6px', letterSpacing: '-0.5px' }}>IA Calorias</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0 }}>Nutrição inteligente no seu bolso</p>
          </div>

          {tab !== 'forgot' && (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                {tab === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: '0 0 20px', lineHeight: 1.5 }}>
                {tab === 'login'
                  ? 'Entre para continuar de onde parou.'
                  : 'Comece grátis e transforme sua alimentação.'}
              </p>

              {/* Botão Google */}
              {GOOGLE_CLIENT_ID && (
                <>
                  <button
                    onClick={handleGoogleLogin}
                    disabled={googleLoading}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '12px',
                      background: '#fff', border: '1.5px solid #dadce0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      fontSize: '15px', fontWeight: 600, color: '#3c4043',
                      cursor: googleLoading ? 'not-allowed' : 'pointer',
                      opacity: googleLoading ? 0.7 : 1,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      transition: 'box-shadow 0.15s',
                      fontFamily: 'inherit', marginBottom: '4px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
                  >
                    <GoogleIcon />
                    {googleLoading ? 'Aguarde...' : 'Continuar com Google'}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>ou</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                  </div>
                </>
              )}

              {/* Tab switcher */}
              <div style={{ display: 'flex', background: 'var(--bg-2)', borderRadius: '12px', padding: '4px', marginBottom: '24px', gap: '4px' }}>
                {(['login', 'register'] as Tab[]).map(t => (
                  <button key={t} onClick={() => reset(t)} style={{
                    flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: tab === t ? 'var(--bg-surface)' : 'transparent',
                    color: tab === t ? 'var(--text-1)' : 'var(--text-2)',
                    fontSize: '14px', fontWeight: tab === t ? 700 : 400,
                    boxShadow: tab === t ? '0 1px 6px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}>
                    {t === 'login' ? 'Entrar' : 'Criar conta'}
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'forgot' && (
            <div style={{ marginBottom: '28px' }}>
              <button onClick={() => reset('login')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: ACCENT, fontSize: '14px', fontWeight: 600, padding: 0, marginBottom: '20px', fontFamily: 'inherit' }}>
                <ArrowLeft size={14} /> Voltar para login
              </button>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 6px' }}>Recuperar senha</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>
                Informe seu email e enviaremos um link para criar uma nova senha.
              </p>
            </div>
          )}

          {error && (
            <div translate="no" style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(13,159,110,0.09)', border: '1px solid rgba(13,159,110,0.2)', marginBottom: '16px', textAlign: 'center' }}>
              <CheckCircle2 size={32} color={ACCENT} style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '14px', color: 'var(--text-1)', margin: '0 0 16px', lineHeight: 1.6 }}>{success}</p>
              <button onClick={() => reset('login')} style={{ background: ACCENT, color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit' }}>
                Voltar para login
              </button>
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required autoComplete="email" style={inputCls} />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)' }}>Senha</label>
                  <button type="button" onClick={() => reset('forgot')} style={{ background: 'none', border: 'none', color: ACCENT, fontSize: '13px', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontWeight: 500 }}>
                    Esqueci a senha
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" style={{ ...inputCls, paddingRight: '44px' }} />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 0 }}>
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: `linear-gradient(135deg, ${ACCENT}, #057A55)`,
                color: '#fff', fontSize: '15px', fontWeight: 700, opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.2s', fontFamily: 'inherit', marginTop: '4px',
              }}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
              <button type="button" onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '14px', cursor: 'pointer', padding: '6px 0', fontFamily: 'inherit' }}>
                Continuar sem conta
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Nome (opcional)</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Como você quer ser chamado?" autoComplete="name" style={inputCls} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required autoComplete="email" style={inputCls} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Senha</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required autoComplete="new-password" style={{ ...inputCls, paddingRight: '44px' }} />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 0 }}>
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Confirmar senha</label>
                <div style={{ position: 'relative' }}>
                  <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required autoComplete="new-password" style={{ ...inputCls, paddingRight: '44px' }} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 0 }}>
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', borderRadius: '12px', background: 'rgba(13,159,110,0.07)', border: '1px solid rgba(13,159,110,0.18)', marginTop: '4px' }}>
                {[
                  '💾 Histórico completo de todas as refeições',
                  '📊 Calorias, nutrientes e metas diárias',
                  '🔥 Sequência de dias e analytics detalhados',
                ].map(t => (
                  <div key={t} style={{ fontSize: '13px', color: 'var(--text-1)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: `linear-gradient(135deg, ${ACCENT}, #057A55)`,
                color: '#fff', fontSize: '15px', fontWeight: 700, opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.2s', fontFamily: 'inherit',
              }}>
                {loading ? 'Criando conta...' : 'Criar conta grátis'}
              </button>
              <button type="button" onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '14px', cursor: 'pointer', padding: '6px 0', fontFamily: 'inherit' }}>
                Continuar sem conta
              </button>
            </form>
          )}

          {/* ── FORGOT FORM ── */}
          {tab === 'forgot' && !success && (
            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required autoComplete="email" style={inputCls} />
              </div>
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: `linear-gradient(135deg, ${ACCENT}, #057A55)`,
                color: '#fff', fontSize: '15px', fontWeight: 700, opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.2s', fontFamily: 'inherit',
              }}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          )}

          <p style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', marginTop: '32px', lineHeight: 1.6 }}>
            Ao continuar, você concorda com os{' '}
            <span onClick={() => navigate('/termos')} style={{ color: ACCENT, cursor: 'pointer', textDecoration: 'underline' }}>Termos de Uso</span>{' '}
            e a{' '}
            <span onClick={() => navigate('/privacidade')} style={{ color: ACCENT, cursor: 'pointer', textDecoration: 'underline' }}>Política de Privacidade</span>.
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 860px) {
          .login-left-panel { display: flex !important; }
          .login-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
