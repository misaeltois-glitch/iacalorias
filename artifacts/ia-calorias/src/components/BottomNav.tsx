import React from 'react';
import { Home, BarChart2, Camera, Target, User } from 'lucide-react';

export type BottomNavTab = 'home' | 'history' | 'analyze' | 'goals' | 'profile';

interface BottomNavProps {
  activeTab: BottomNavTab;
  onTabChange: (tab: BottomNavTab) => void;
  isPremium: boolean;
}

export function BottomNav({ activeTab, onTabChange, isPremium }: BottomNavProps) {
  const tabs = [
    { id: 'home' as const, label: 'Início', Icon: Home },
    { id: 'history' as const, label: 'Histórico', Icon: BarChart2, premiumOnly: true },
    { id: 'analyze' as const, label: 'Analisar', Icon: Camera, isCenter: true },
    { id: 'goals' as const, label: 'Metas', Icon: Target, premiumOnly: true },
    { id: 'profile' as const, label: 'Perfil', Icon: User },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      zIndex: 200,
      display: 'flex',
      justifyContent: 'center',
      padding: '0 0 env(safe-area-inset-bottom)',
      background: 'var(--bg)',
      borderTop: '1px solid var(--border)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div style={{
        width: '100%', maxWidth: '480px',
        display: 'flex', alignItems: 'center',
        padding: '0 8px',
        height: '62px',
      }}>
        {tabs.map(({ id, label, Icon, isCenter, premiumOnly }) => {
          const isActive = activeTab === id;
          const isLocked = premiumOnly && !isPremium;

          if (isCenter) {
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(13,159,110,0.4)',
                  transform: 'translateY(-8px)',
                }}>
                  <Icon size={22} color="#fff" strokeWidth={2} />
                </div>
              </button>
            );
          }

          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '3px',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: '6px 0',
                color: isActive ? '#0D9F6E' : 'var(--text-3)',
                position: 'relative',
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={{
                fontSize: '10px', fontWeight: isActive ? 700 : 500,
                lineHeight: 1,
              }}>
                {label}
              </span>
              {isLocked && (
                <span style={{
                  position: 'absolute', top: '4px', right: '12px',
                  fontSize: '9px', color: '#F59E0B',
                }}>
                  ✦
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
