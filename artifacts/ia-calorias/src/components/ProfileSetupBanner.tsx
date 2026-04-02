import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SetupItem {
  key: string;
  icon: string;
  label: string;
  sublabel: string;
  done: boolean;
  onAction: () => void;
  actionLabel: string;
}

interface ProfileSetupBannerProps {
  isAuthenticated: boolean;
  hasGoals: boolean;
  hasWorkoutPlan: boolean;
  onLogin: () => void;
  onSetupGoals: () => void;
  onSetupWorkout: () => void;
}

export function ProfileSetupBanner({ isAuthenticated, hasGoals, hasWorkoutPlan, onLogin, onSetupGoals, onSetupWorkout }: ProfileSetupBannerProps) {
  const items: SetupItem[] = [
    {
      key: 'auth',
      icon: '👤',
      label: 'Perfil pessoal',
      sublabel: 'Crie sua conta e salve seu histórico em qualquer dispositivo',
      done: isAuthenticated,
      onAction: onLogin,
      actionLabel: 'Criar conta',
    },
    {
      key: 'goals',
      icon: '🥗',
      label: 'Plano nutricional',
      sublabel: 'Calorias e macros personalizados para o seu objetivo',
      done: hasGoals,
      onAction: onSetupGoals,
      actionLabel: 'Configurar',
    },
    {
      key: 'workout',
      icon: '🏋️',
      label: 'Plano de treino',
      sublabel: 'Treinos gerados por IA conforme seu perfil e objetivo',
      done: hasWorkoutPlan,
      onAction: onSetupWorkout,
      actionLabel: 'Criar plano',
    },
  ];

  const pending = items.filter(i => !i.done);
  if (pending.length === 0) return null;

  return (
    <div style={{
      borderRadius: '16px',
      border: '1px solid var(--border)',
      background: 'var(--bg-2)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        background: 'rgba(245,158,11,0.07)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ fontSize: '13px' }}>⚠️</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B' }}>
          Perfil incompleto — {pending.length} {pending.length === 1 ? 'item pendente' : 'itens pendentes'}
        </span>
        {/* Progress dots */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {items.map(item => (
            <div key={item.key} style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: item.done ? '#22c55e' : 'var(--bg-3)',
              border: `1.5px solid ${item.done ? '#22c55e' : 'var(--border-strong)'}`,
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
      </div>

      {/* Pending items */}
      {pending.map((item, i) => (
        <div key={item.key}>
          {i > 0 && <div style={{ height: '1px', background: 'var(--border)' }} />}
          <button
            onClick={item.onAction}
            style={{
              width: '100%', padding: '12px 14px',
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
            }}
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: 'var(--bg-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}>
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.4 }}>
                {item.sublabel}
              </div>
            </div>
            <div style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 10px', borderRadius: '8px',
              background: 'rgba(13,159,110,0.1)', border: '1px solid rgba(13,159,110,0.2)',
              fontSize: '11px', fontWeight: 700, color: '#0D9F6E',
            }}>
              {item.actionLabel}
              <ChevronRight size={11} />
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}
