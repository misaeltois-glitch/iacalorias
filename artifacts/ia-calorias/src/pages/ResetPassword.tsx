import React, { useState, useEffect } from 'react';
import { PieChart } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function ResetPassword() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { resetPassword } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token') || '';
    setToken(t);
    if (!t) setError('Link inválido. Solicite um novo email de recuperação.');
  }, []);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    background: 'var(--bg-2)', color: 'var(--text-1)',
    border: '1.5px solid var(--border-strong)',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const msg = await resetPassword(token, password);
      setSuccess(msg);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 20px',
    }}>
      {/* Header */}
      <div style={{
        width: '100%', maxWidth: '460px',
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '20px 0', borderBottom: '1px solid var(--border)',
        marginBottom: '32px',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'var(--accent)', display: 'flex', alignItems: 'center',
          justifyContent: 'center',
        }}>
          <PieChart style={{ width: '16px', height: '16px', color: '#fff' }} />
        </div>
        <span style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: '15px' }}>IA Calorias</span>
      </div>

      <div style={{ width: '100%', maxWidth: '460px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>
          Nova senha
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '28px' }}>
          Escolha uma nova senha segura para sua conta.
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', color: '#f87171',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px', padding: '12px 16px',
            fontSize: '14px', marginBottom: '20px',
          }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>
              Senha alterada!
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '24px' }}>
              {success}
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block', padding: '13px 32px',
                background: 'var(--accent)', color: '#fff',
                borderRadius: '12px', fontWeight: 700, fontSize: '15px',
                textDecoration: 'none',
              }}
            >
              Ir para o app →
            </a>
          </div>
        ) : !error.includes('inválido') && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
                Nova senha
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" required autoComplete="new-password"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
                Confirmar nova senha
              </label>
              <input
                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="new-password"
                style={inputStyle}
              />
            </div>
            <button
              type="submit" disabled={loading || !token}
              style={{
                padding: '13px', borderRadius: '12px',
                background: 'var(--accent)', color: '#fff', border: 'none',
                fontSize: '15px', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
