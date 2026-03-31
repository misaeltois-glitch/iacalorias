import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Eye, EyeOff, ArrowLeft, CheckCircle2, Leaf, Dumbbell, BarChart2, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useSession } from '@/hooks/use-session';

type Tab = 'login' | 'register' | 'forgot';

const ACCENT = '#0D9F6E';

const FEATURES = [
  { icon: Leaf, title: 'Análise por foto', desc: 'Envie uma foto da refeição e a IA calcula tudo automaticamente.' },
  { icon: BarChart2, title: 'Acompanhe sua evolução', desc: 'Histórico completo com gráficos de calorias e nutrientes.' },
  { icon: Dumbbell, title: 'Personal Virtual', desc: 'Treinos personalizados gerados na hora para o seu perfil.' },
  { icon: Zap, title: 'Metas inteligentes', desc: 'Defina objetivos e receba alertas quando estiver no caminho certo.' },
];

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
              <p style={{ fontSize: '14px', color: 'var(--text-2)', margin: '0 0 24px', lineHeight: 1.5 }}>
                {tab === 'login'
                  ? 'Entre para continuar de onde parou.'
                  : 'Comece grátis e transforme sua alimentação.'}
              </p>

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
