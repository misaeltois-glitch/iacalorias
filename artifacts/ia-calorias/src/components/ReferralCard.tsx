import React, { useState, useEffect } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';
export const REFERRAL_CODE_KEY = 'ia-calorias-ref';
export const REFERRAL_APPLIED_KEY = 'ia-calorias-ref-applied';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface ReferralStats {
  code: string;
  appliedCount: number;
  convertedCount: number;
  bonusDays: number;
}

export function ReferralCard() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${BASE}api/referral`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {});
  }, []);

  if (!stats) return null;

  const shareUrl = `${window.location.origin}/?ref=${stats.code}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `🥗 Estou usando o IA Calorias para monitorar minha alimentação com inteligência artificial!\n\nUse meu link e ganhe 3 dias de teste grátis:\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div style={{
      borderRadius: '18px',
      background: 'linear-gradient(135deg, rgba(13,159,110,0.08), rgba(59,130,246,0.06))',
      border: '1px solid rgba(13,159,110,0.2)',
      padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
        }}>
          🎁
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>
            Indique amigos e ganhe
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
            Cada amigo que assinar te dá +30 dias grátis
          </div>
        </div>
      </div>

      {/* Stats row */}
      {(stats.appliedCount > 0 || stats.bonusDays > 0) && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{
            flex: 1, textAlign: 'center', padding: '8px',
            borderRadius: '10px', background: 'var(--bg-2)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0D9F6E' }}>{stats.appliedCount}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>indicado{stats.appliedCount !== 1 ? 's' : ''}</div>
          </div>
          <div style={{
            flex: 1, textAlign: 'center', padding: '8px',
            borderRadius: '10px', background: 'var(--bg-2)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#F59E0B' }}>{stats.convertedCount}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>assinou{stats.convertedCount !== 1 ? 'ram' : ''}</div>
          </div>
          {stats.bonusDays > 0 && (
            <div style={{
              flex: 1, textAlign: 'center', padding: '8px',
              borderRadius: '10px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#8B5CF6' }}>+{stats.bonusDays}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>dias bônus</div>
            </div>
          )}
        </div>
      )}

      {/* Link box */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 10px', borderRadius: '10px',
        background: 'var(--bg-2)', border: '1px solid var(--border)',
      }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-3)', fontWeight: 600, marginBottom: '1px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Seu link de indicação
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {shareUrl}
          </div>
        </div>
        <button
          onClick={handleCopy}
          style={{
            flexShrink: 0, padding: '6px 10px', borderRadius: '8px',
            background: copied ? 'rgba(34,197,94,0.1)' : 'var(--bg-3)',
            border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
            color: copied ? '#22c55e' : 'var(--text-2)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', fontWeight: 600, transition: 'all 0.15s',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>

      {/* Share buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleWhatsApp}
          style={{
            flex: 1, padding: '10px',
            borderRadius: '12px', border: 'none',
            background: '#25D366', color: '#fff',
            fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
        >
          <span>📲</span> Compartilhar no WhatsApp
        </button>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: 'IA Calorias', url: shareUrl }).catch(() => {});
            } else {
              handleCopy();
            }
          }}
          style={{
            padding: '10px 14px',
            borderRadius: '12px', border: '1px solid var(--border)',
            background: 'var(--bg-2)', color: 'var(--text-2)',
            fontWeight: 600, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Share2 size={15} />
        </button>
      </div>
    </div>
  );
}

// Utility: apply a pending referral code after login
export async function applyPendingReferral(sessionId: string) {
  const code = localStorage.getItem(REFERRAL_CODE_KEY);
  const alreadyApplied = localStorage.getItem(REFERRAL_APPLIED_KEY);
  if (!code || alreadyApplied) return;
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const r = await fetch(`${BASE}api/referral/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ code, sessionId }),
    });
    if (r.ok || r.status === 409) {
      localStorage.removeItem(REFERRAL_CODE_KEY);
      localStorage.setItem(REFERRAL_APPLIED_KEY, '1');
    }
  } catch {}
}
