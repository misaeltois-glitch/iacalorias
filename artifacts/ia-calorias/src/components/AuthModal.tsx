import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

type Tab = 'login' | 'register' | 'forgot';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sessionId: string;
  initialTab?: Tab;
}

export function AuthModal({ isOpen, onClose, onSuccess, sessionId, initialTab = 'login' }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const { login, register, forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const resetForm = (newTab: Tab) => {
    setTab(newTab);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, sessionId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, sessionId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const msg = await forgotPassword(email);
      setSuccess(msg);
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar redefinição.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: '10px',
    background: 'var(--bg-2)', color: 'var(--text-1)',
    border: '1.5px solid var(--border-strong)',
    fontSize: '15px', outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  };

  const primaryBtnStyle: React.CSSProperties = {
    width: '100%', padding: '13px',
    borderRadius: '12px',
    background: 'var(--accent)',
    color: '#fff', border: 'none',
    fontSize: '15px', fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'opacity 0.2s',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
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
          width: '100%', maxWidth: '460px',
          background: 'var(--bg-surface)',
          borderRadius: '24px 24px 0 0',
          padding: '28px 24px 40px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
          maxHeight: '90dvh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: 'var(--border-strong)', margin: '0 auto 24px' }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '22px', margin: '0 auto 12px',
          }}>🥗</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            {tab === 'login' && 'Entrar na sua conta'}
            {tab === 'register' && 'Criar conta gratuita'}
            {tab === 'forgot' && 'Recuperar senha'}
          </h2>
        </div>

        {/* Tabs (only for login/register) */}
        {tab !== 'forgot' && (
          <div style={{
            display: 'flex', gap: '4px',
            background: 'var(--bg-2)', borderRadius: '12px', padding: '4px',
            marginBottom: '20px',
          }}>
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => resetForm(t)}
                style={{
                  flex: 1, padding: '9px',
                  borderRadius: '8px', border: 'none',
                  background: tab === t ? 'var(--bg-surface)' : 'transparent',
                  color: tab === t ? 'var(--text-1)' : 'var(--text-2)',
                  fontSize: '14px', fontWeight: tab === t ? 600 : 400,
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                {t === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', color: '#f87171',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px', padding: '10px 14px',
            fontSize: '13px', marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{
            background: 'rgba(34,197,94,0.1)', color: '#4ade80',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: '10px', padding: '10px 14px',
            fontSize: '13px', marginBottom: '16px',
          }}>
            {success}
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required autoComplete="email"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Senha</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
                style={inputStyle}
              />
            </div>
            <button
              type="button"
              onClick={() => resetForm('forgot')}
              style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                fontSize: '13px', cursor: 'pointer', textAlign: 'right', padding: 0,
              }}
            >
              Esqueci minha senha
            </button>
            <button type="submit" disabled={loading} style={primaryBtnStyle}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button
              type="button" onClick={onClose}
              style={{
                background: 'none', border: 'none', color: 'var(--text-2)',
                fontSize: '14px', cursor: 'pointer', padding: '8px 0',
              }}
            >
              Continuar sem se identificar
            </button>
          </form>
        )}

        {/* ── REGISTER FORM ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required autoComplete="email"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Senha</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" required autoComplete="new-password"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Confirmar senha</label>
              <input
                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="new-password"
                style={inputStyle}
              />
            </div>
            <button type="submit" disabled={loading} style={primaryBtnStyle}>
              {loading ? 'Criando conta...' : 'Criar conta grátis'}
            </button>
            <button
              type="button" onClick={onClose}
              style={{
                background: 'none', border: 'none', color: 'var(--text-2)',
                fontSize: '14px', cursor: 'pointer', padding: '8px 0',
              }}
            >
              Continuar sem se identificar
            </button>
          </form>
        )}

        {/* ── FORGOT PASSWORD FORM ── */}
        {tab === 'forgot' && !success && (
          <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '4px', lineHeight: 1.5 }}>
              Informe seu email e enviaremos um link para criar uma nova senha.
            </p>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com" required autoComplete="email"
                style={inputStyle}
              />
            </div>
            <button type="submit" disabled={loading} style={primaryBtnStyle}>
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
            <button
              type="button" onClick={() => resetForm('login')}
              style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                fontSize: '14px', cursor: 'pointer', padding: '8px 0',
              }}
            >
              ← Voltar para login
            </button>
          </form>
        )}

        {tab === 'forgot' && success && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📧</div>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '20px' }}>
              {success}
            </p>
            <button
              onClick={() => resetForm('login')}
              style={{ ...primaryBtnStyle, width: 'auto', padding: '11px 28px' }}
            >
              Voltar para login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
