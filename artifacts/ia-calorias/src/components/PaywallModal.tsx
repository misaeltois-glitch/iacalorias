import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { getStoredUTMs, trackEvent } from '@/lib/tracking';

const PENDING_PLAN_KEY = 'ia-calorias-pending-plan';
const PENDING_PAYMENT_TYPE_KEY = 'ia-calorias-pending-payment-type';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  disableClose?: boolean;
  onShowAuth?: () => void;
  retrospective?: { mealCount: number; daysUsed: number };
  userObjective?: string;
}

const accent = '#0D9F6E';

type FeatureRow = {
  label: string;
  free: string | boolean;
  limited: string | boolean;
  unlimited: string | boolean;
  highlight?: boolean;
};

const FEATURES: FeatureRow[] = [
  // ── Nutrição ──
  { label: 'Análise de refeições por IA',              free: '7 dias ilimit.', limited: '20 por mês',   unlimited: 'Ilimitadas',   highlight: true },
  { label: 'Calorias, proteínas, carbs, gordura e fibra', free: '7 dias teste', limited: true,          unlimited: true },
  { label: 'Pontuação de saúde da refeição',           free: '7 dias teste',   limited: true,           unlimited: true },
  { label: 'Dica de substituição saudável',            free: '7 dias teste',   limited: true,           unlimited: true },
  { label: 'Histórico de refeições',                   free: '7 dias teste',   limited: '30 dias',      unlimited: 'Ilimitado',    highlight: true },
  { label: 'Metas nutricionais personalizadas',        free: '7 dias teste',   limited: true,           unlimited: true },
  { label: 'Painel de progresso diário',               free: '7 dias teste',   limited: true,           unlimited: true },
  { label: 'Analytics semanal e mensal',               free: '7 dias teste',   limited: true,           unlimited: true },
  { label: 'Streak e metas gamificadas',               free: '7 dias teste',   limited: true,           unlimited: true },
  // ── Saúde ──
  { label: 'Evolução de peso com gráfico',             free: '7 dias teste',   limited: true,           unlimited: true },
  { label: 'Contador de água diário',                  free: '7 dias teste',   limited: true,           unlimited: true },
  // ── IA ──
  { label: 'Chat com Sofia IA',                        free: '7 dias teste',   limited: 'Ilimitado',    unlimited: 'Ilimitado',    highlight: true },
  { label: 'Cardápio semanal com Sofia',               free: false,            limited: false,          unlimited: true,           highlight: true },
  { label: 'Relatório semanal inteligente',            free: false,            limited: false,          unlimited: true },
  // ── Treino ──
  { label: 'Treino do Dia gerado por IA',              free: '7 dias teste',   limited: '5/mês',        unlimited: 'Ilimitado',    highlight: true },
  { label: 'Execução guiada com cronômetro',           free: false,            limited: false,          unlimited: true },
  // ── Conta ──
  { label: 'Programa de indicação (ganhe bônus)',      free: false,            limited: true,           unlimited: true },
  { label: 'Suporte prioritário',                      free: false,            limited: false,          unlimited: true },
];

function FeatureCell({ val, isUnlimited }: { val: string | boolean; isUnlimited?: boolean }) {
  if (val === false) {
    return <span style={{ color: 'var(--text-3)', fontSize: 15 }}>—</span>;
  }
  if (val === true) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 20, height: 20, borderRadius: '50%',
        background: isUnlimited ? 'rgba(13,159,110,0.18)' : 'rgba(255,255,255,0.08)',
        color: isUnlimited ? accent : 'var(--text-2)',
        fontSize: 12, fontWeight: 700,
      }}>✓</span>
    );
  }
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      color: isUnlimited ? accent : 'var(--text-2)',
      whiteSpace: 'nowrap',
    }}>{val}</span>
  );
}

type LoadingKey = 'limited' | 'unlimited' | 'limited_pix' | 'unlimited_pix' | 'limited_annual' | 'unlimited_annual';
type BillingCycle = 'monthly' | 'annual';

// Preços anuais (aprox. 50% de desconto vs 12x mensal)
const ANNUAL_UNLIMITED = 179.90;
const ANNUAL_LIMITED = 119.90;

const OBJECTIVE_COPY: Record<string, { title: string; sub: string }> = {
  fat_loss:     { title: 'Não perca seu progresso de emagrecimento', sub: 'Continue monitorando cada refeição para atingir seu peso ideal.' },
  muscle_gain:  { title: 'Seus ganhos dependem de consistência', sub: 'Cada refeição registrada é um passo a mais para o shape que você quer.' },
  maintenance:  { title: 'Continue mantendo sua saúde com IA', sub: 'Monitoramento diário é o que separa quem mantém de quem regride.' },
};

export function PaywallModal({ isOpen, onClose, sessionId, disableClose, onShowAuth, retrospective, userObjective }: PaywallModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<LoadingKey | null>(null);
  const [tab, setTab] = useState<'cards' | 'compare'>('cards');
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleCheckout = (plan: 'limited' | 'unlimited', paymentType: 'subscription' | 'one_time' | 'annual' = 'subscription') => {
    if (loadingPlan) return;
    const key: LoadingKey = paymentType === 'one_time' ? `${plan}_pix` as LoadingKey : paymentType === 'annual' ? `${plan}_annual` as LoadingKey : plan;
    if (!isAuthenticated) {
      localStorage.setItem(PENDING_PLAN_KEY, plan);
      localStorage.setItem(PENDING_PAYMENT_TYPE_KEY, paymentType);
      onClose();
      navigate('/login?tab=register');
      return;
    }
    setLoadingPlan(key);
    const utms = getStoredUTMs();
    const price = plan === 'unlimited' ? (billing === 'annual' ? 179.90 : 29.90) : (billing === 'annual' ? 119.90 : 19.90);
    trackEvent('InitiateCheckout', { value: price, content_name: `${plan}_${paymentType}` });
    fetch('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('ia-calorias-auth-token') ?? ''}` },
      body: JSON.stringify({ sessionId, plan, paymentType, ...utms }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.url) {
          window.location.href = data.url;
        } else {
          setLoadingPlan(null);
          alert(data.message ?? 'Erro ao iniciar pagamento. Tente novamente.');
        }
      })
      .catch(() => {
        setLoadingPlan(null);
        alert('Erro ao conectar. Verifique sua conexão e tente novamente.');
      });
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={(e) => { if (!disableClose && e.target === e.currentTarget) onClose(); }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px',
          background: 'var(--bg)',
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -12px 60px rgba(0,0,0,0.5)',
          maxHeight: '93dvh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Drag handle + close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '14px 20px 0' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: 'var(--border-strong)' }} />
          {!disableClose && (
            <button
              onClick={onClose}
              style={{
                position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)',
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'var(--bg-2)', border: '1px solid var(--border)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-2)', fontSize: '16px', lineHeight: 1,
              }}
            >✕</button>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 20px 32px' }}>

          {/* Retrospectiva — aparece quando o trial expira */}
          {retrospective && retrospective.mealCount > 0 && (
            <div style={{
              borderRadius: 16, padding: '16px', marginBottom: 18,
              background: 'linear-gradient(135deg, rgba(13,159,110,0.08), rgba(59,130,246,0.06))',
              border: '1px solid rgba(13,159,110,0.2)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 10, letterSpacing: '0.4px' }}>
                📊 SEU PROGRESSO EM {retrospective.daysUsed} DIAS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  { emoji: '📸', value: String(retrospective.mealCount), label: 'refeições analisadas' },
                  { emoji: '📅', value: `${retrospective.daysUsed}`, label: 'dias de uso' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-2)', borderRadius: 12, padding: '10px 12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 18 }}>{s.emoji}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2 }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                Não perca esse histórico — continue de onde parou com o plano pago.
              </div>
            </div>
          )}

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 14px', borderRadius: 99,
              background: 'rgba(239,68,68,0.12)', color: '#f87171',
              fontSize: 12, fontWeight: 600, marginBottom: 14,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {disableClose ? 'Teste encerrado — continue seu progresso' : 'Desbloqueie o IA Calorias completo'}
            </div>
            <h2 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.4px', color: 'var(--text-1)', marginBottom: 6, lineHeight: 1.3 }}>
              {userObjective && OBJECTIVE_COPY[userObjective]
                ? OBJECTIVE_COPY[userObjective].title
                : 'Nutrição + Treino com IA,\ntudo no mesmo app'}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55 }}>
              {userObjective && OBJECTIVE_COPY[userObjective]
                ? OBJECTIVE_COPY[userObjective].sub
                : 'Análise de refeições, calorias e nutrientes detalhados, treinos personalizados e acompanhamento inteligente — do jeito que um nutricionista faria.'}
            </p>
          </div>

          {/* Billing cycle toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, marginBottom: 16,
          }}>
            <button
              onClick={() => setBilling('monthly')}
              style={{
                padding: '6px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: billing === 'monthly' ? accent : 'var(--bg-2)',
                color: billing === 'monthly' ? '#fff' : 'var(--text-2)',
                transition: 'all 0.15s',
              }}
            >Mensal</button>
            <button
              onClick={() => setBilling('annual')}
              style={{
                padding: '6px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: billing === 'annual' ? accent : 'var(--bg-2)',
                color: billing === 'annual' ? '#fff' : 'var(--text-2)',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              Anual
              <span style={{
                position: 'absolute', top: -8, right: -8,
                background: '#F59E0B', color: '#000', fontSize: 9, fontWeight: 800,
                padding: '1px 5px', borderRadius: 99, letterSpacing: '0.3px', whiteSpace: 'nowrap',
              }}>-50%</span>
            </button>
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-2)', borderRadius: 12, padding: 4, marginBottom: 18 }}>
            {(['cards', 'compare'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '8px', borderRadius: 9, border: 'none',
                background: tab === t ? 'var(--bg)' : 'transparent',
                color: tab === t ? 'var(--text-1)' : 'var(--text-2)',
                fontWeight: tab === t ? 700 : 500, fontSize: 13,
                cursor: 'pointer',
                boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                transition: 'all 0.15s',
              }}>
                {t === 'cards' ? 'Planos' : 'Comparar tudo'}
              </button>
            ))}
          </div>

          {/* ── CARDS VIEW ── */}
          {tab === 'cards' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* GRÁTIS — trial banner */}
              <div style={{
                borderRadius: 14, padding: '12px 16px',
                background: 'var(--bg-2)', border: '1px dashed var(--border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 3 }}>
                    🎁 Você está no plano grátis
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>
                    7 dias de teste · Análises ilimitadas · Treino incluso
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                  background: 'rgba(13,159,110,0.1)', color: accent, whiteSpace: 'nowrap', flexShrink: 0,
                }}>Ativo</span>
              </div>

              {/* ILIMITADO — destaque */}
              <div style={{
                borderRadius: 20, padding: '2px',
                background: `linear-gradient(135deg, ${accent}, #057A55, #8B5CF6)`,
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                  background: `linear-gradient(135deg, ${accent}, #057A55)`,
                  color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.8px',
                  padding: '3px 14px', borderRadius: 99, whiteSpace: 'nowrap',
                }}>
                  ⭐ MELHOR ESCOLHA
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 18, padding: '20px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)', marginBottom: 3 }}>Ilimitado</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Tudo ilimitado, sem restrições</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {billing === 'annual' ? (
                        <>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', textDecoration: 'line-through', marginBottom: 1 }}>R$ 358,80/ano</div>
                          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                            R$&nbsp;{ANNUAL_UNLIMITED.toFixed(2).replace('.', ',')}
                          </div>
                          <div style={{ fontSize: 11, color: accent, marginTop: 2, fontWeight: 700 }}>≈ R$14,99/mês</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                            R$&nbsp;29,90
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>/mês</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Feature highlights */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
                    {[
                      { icon: '📸', text: 'Análises de refeições ILIMITADAS' },
                      { icon: '💪', text: 'Treino do Dia Personalizado — ilimitado' },
                      { icon: '▶️', text: 'Execução guiada com cronômetro' },
                      { icon: '🩺', text: 'Resumo da nutricionista por IA' },
                      { icon: '📊', text: 'Relatório avançado + progresso semanal' },
                      { icon: '📅', text: 'Plano de treino semanal' },
                      { icon: '♾️', text: 'Histórico ilimitado de refeições' },
                      { icon: '🎯', text: 'Metas de nutrição personalizadas' },
                    ].map(f => (
                      <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 15, flexShrink: 0 }}>{f.icon}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>{f.text}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleCheckout('unlimited', billing === 'annual' ? 'annual' : 'subscription')}
                    disabled={!!loadingPlan}
                    style={{
                      width: '100%', padding: '14px', borderRadius: 13,
                      background: loadingPlan ? 'var(--bg-3)' : `linear-gradient(135deg, ${accent}, #057A55)`,
                      color: '#fff', border: 'none',
                      fontSize: 15, fontWeight: 800, letterSpacing: '-0.2px',
                      cursor: loadingPlan ? 'not-allowed' : 'pointer',
                      opacity: loadingPlan && loadingPlan !== 'unlimited' && loadingPlan !== 'unlimited_annual' ? 0.5 : 1,
                      boxShadow: loadingPlan ? 'none' : '0 4px 20px rgba(13,159,110,0.35)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {(loadingPlan === 'unlimited' || loadingPlan === 'unlimited_annual') ? 'Redirecionando...' : billing === 'annual' ? `💳 Assinar Anual — R$${ANNUAL_UNLIMITED.toFixed(2).replace('.', ',')}` : '💳 Assinar Ilimitado — R$29,90/mês'}
                  </button>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', margin: '8px 0 0' }}>
                    {billing === 'annual' ? 'Cobrado anualmente · Cancele quando quiser' : 'Cancele quando quiser · Sem fidelidade'}
                  </p>
                </div>
              </div>

              {/* LIMITADO */}
              <div style={{
                border: '1.5px solid var(--border-strong)', borderRadius: 18,
                padding: '18px', background: 'var(--bg-2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Limitado</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Para quem está começando</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {billing === 'annual' ? (
                      <>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', textDecoration: 'line-through', marginBottom: 1 }}>R$ 238,80/ano</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                          R$&nbsp;{ANNUAL_LIMITED.toFixed(2).replace('.', ',')}
                        </div>
                        <div style={{ fontSize: 10, color: accent, marginTop: 2, fontWeight: 700 }}>≈ R$9,99/mês</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
                          R$&nbsp;19,90
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>/mês</div>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {[
                    '20 análises/mês',
                    'Nutrientes completos',
                    'Pontuação de saúde',
                    'Metas personalizadas',
                    'Progresso básico',
                    'Histórico 30 dias',
                    '5 Treinos IA/mês',
                  ].map(f => (
                    <span key={f} style={{
                      fontSize: 11.5, color: 'var(--text-2)',
                      background: 'var(--bg-3)', padding: '3px 9px',
                      borderRadius: 99, border: '1px solid var(--border)',
                    }}>✓ {f}</span>
                  ))}
                </div>

                <button
                  onClick={() => handleCheckout('limited', billing === 'annual' ? 'annual' : 'subscription')}
                  disabled={!!loadingPlan}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12,
                    background: 'var(--bg-3)', color: 'var(--text-1)',
                    border: '1.5px solid var(--border-strong)',
                    fontSize: 14, fontWeight: 600,
                    cursor: loadingPlan ? 'not-allowed' : 'pointer',
                    opacity: loadingPlan && loadingPlan !== 'limited' && loadingPlan !== 'limited_annual' ? 0.5 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {(loadingPlan === 'limited' || loadingPlan === 'limited_annual') ? 'Redirecionando...' : billing === 'annual' ? `💳 Começar com Limitado — R$${ANNUAL_LIMITED.toFixed(2).replace('.', ',')}` : '💳 Começar com Limitado — R$19,90/mês'}
                </button>
              </div>
            </div>
          )}

          {/* ── COMPARE VIEW ── */}
          {tab === 'compare' && (
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 56px 72px 80px',
                gap: 0, background: 'var(--bg-2)',
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.4px' }}>FUNÇÃO</div>
                {[
                  { label: 'Grátis', sub: '7 dias teste' },
                  { label: 'Limitado', sub: 'R$19,90' },
                  { label: 'Ilimitado', sub: 'R$29,90' },
                ].map(({ label, sub }, i) => (
                  <div key={label} style={{
                    padding: '8px 4px', textAlign: 'center',
                    borderLeft: '1px solid var(--border)',
                    background: i === 2 ? 'rgba(13,159,110,0.05)' : 'transparent',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3px', color: i === 2 ? accent : 'var(--text-2)' }}>{label}</div>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 1 }}>{sub}</div>
                  </div>
                ))}
              </div>

              {FEATURES.map((row, idx) => (
                <div
                  key={row.label}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 56px 72px 80px',
                    borderBottom: idx < FEATURES.length - 1 ? '1px solid var(--border)' : 'none',
                    background: row.highlight ? 'rgba(13,159,110,0.04)' : 'transparent',
                  }}
                >
                  <div style={{ padding: '9px 12px', fontSize: 12, color: row.highlight ? 'var(--text-1)' : 'var(--text-2)', fontWeight: row.highlight ? 600 : 400, lineHeight: 1.35 }}>
                    {row.label}
                  </div>
                  {(['free', 'limited', 'unlimited'] as const).map((plan, pi) => (
                    <div key={plan} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '9px 4px', borderLeft: '1px solid var(--border)',
                      background: pi === 2 ? 'rgba(13,159,110,0.05)' : 'transparent',
                    }}>
                      <FeatureCell val={row[plan]} isUnlimited={pi === 2} />
                    </div>
                  ))}
                </div>
              ))}

              {/* CTA row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 56px 72px 80px', background: 'var(--bg-2)', borderTop: '1px solid var(--border)' }}>
                <div style={{ padding: '12px' }} />
                <div style={{ padding: '8px 4px', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'center' }}>Atual</span>
                </div>
                <div style={{ padding: '8px 4px', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button onClick={() => handleCheckout('limited')} disabled={!!loadingPlan} style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--text-1)',
                    background: 'var(--bg-3)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '5px 6px', cursor: 'pointer',
                  }}>
                    {loadingPlan === 'limited' ? '...' : 'R$19,90'}
                  </button>
                </div>
                <div style={{ padding: '8px 4px', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button onClick={() => handleCheckout('unlimited')} disabled={!!loadingPlan} style={{
                    fontSize: 10, fontWeight: 800, color: '#fff',
                    background: `linear-gradient(135deg, ${accent}, #057A55)`,
                    border: 'none', borderRadius: 8, padding: '5px 6px', cursor: 'pointer',
                  }}>
                    {loadingPlan === 'unlimited' ? '...' : 'R$29,90'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Auth link */}
          {onShowAuth && (
            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <button
                onClick={() => { onClose(); onShowAuth(); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-2)', fontSize: 13, fontWeight: 500,
                  textDecoration: 'underline', textDecorationStyle: 'dotted',
                }}
              >
                Já tenho conta → Fazer login
              </button>
            </div>
          )}

          {/* Footer trust */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20 }}>
            {[
              { icon: '🔒', label: 'Pagamento seguro' },
              { icon: '↩️', label: 'Cancele quando quiser' },
              { icon: '🇧🇷', label: 'Pix em breve' },
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span style={{ fontSize: 9.5, color: 'var(--text-3)', fontWeight: 500, textAlign: 'center' }}>{t.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
            <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--text-3)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Termos de Uso</a>
            <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--text-3)', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>Política de Privacidade</a>
          </div>
        </div>
      </div>
    </div>
  );
}
