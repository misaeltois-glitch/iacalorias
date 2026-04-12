import React from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, ChefHat, ShoppingBag } from 'lucide-react';

interface CardapioChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPremium: boolean;
  onSelectAI: () => void;
  onSelectPantry: () => void;
  onSelectRecipe: () => void;
  onUpgrade: () => void;
}

export function CardapioChoiceModal({
  isOpen,
  onClose,
  isPremium,
  onSelectAI,
  onSelectPantry,
  onSelectRecipe,
  onUpgrade,
}: CardapioChoiceModalProps) {
  if (!isOpen) return null;

  const handleSelectAI = () => {
    onClose();
    if (!isPremium) { setTimeout(onUpgrade, 50); return; }
    setTimeout(onSelectAI, 50);
  };

  const handleSelectPantry = () => {
    onClose();
    setTimeout(onSelectPantry, 50);
  };

  const handleSelectRecipe = () => {
    onClose();
    setTimeout(onSelectRecipe, 50);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 32, stiffness: 300 }}
        style={{
          width: '100%', maxWidth: '720px',
          background: 'var(--bg-surface)',
          borderRadius: '24px 24px 0 0',
          padding: '24px 20px 32px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>
              🥗 Planejar Refeições
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-2)', margin: '3px 0 0' }}>
              Como você quer montar seu plano?
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--bg-3)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} style={{ color: 'var(--text-2)' }} />
          </button>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* 1. Gerar com IA (premium) */}
          <button
            onClick={handleSelectAI}
            style={{
              width: '100%', padding: '18px',
              borderRadius: '18px', border: 'none', cursor: 'pointer', textAlign: 'left',
              background: isPremium
                ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.08))'
                : 'var(--bg-2)',
              border: `1.5px solid ${isPremium ? 'rgba(245,158,11,0.3)' : 'var(--border)'}` as any,
              display: 'flex', alignItems: 'center', gap: '14px',
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
              background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(245,158,11,0.3)',
            }}>
              <Sparkles size={22} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-1)', marginBottom: '2px' }}>
                Cardápio personalizado IA
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                Baseado nas suas <strong style={{ color: 'var(--text-1)' }}>metas nutricionais e progresso de peso</strong> — a Evellyn escolhe os ingredientes
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                {['🎯 Metas', '⚖️ Progresso peso', '🍽️ Preferências'].map(tag => (
                  <span key={tag} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 99, background: 'rgba(245,158,11,0.1)', color: '#D97706', border: '1px solid rgba(245,158,11,0.2)', fontWeight: 600 }}>{tag}</span>
                ))}
              </div>
            </div>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: 99, flexShrink: 0,
              background: isPremium ? 'rgba(245,158,11,0.15)' : 'rgba(139,92,246,0.12)',
              color: isPremium ? '#F59E0B' : '#8B5CF6',
              border: `1px solid ${isPremium ? 'rgba(245,158,11,0.3)' : 'rgba(139,92,246,0.25)'}`,
            }}>
              {isPremium ? 'Gerar →' : '👑 Premium'}
            </span>
          </button>

          {/* 2. Plano semanal da despensa (free) */}
          <button
            onClick={handleSelectPantry}
            style={{
              width: '100%', padding: '18px',
              borderRadius: '18px', cursor: 'pointer', textAlign: 'left',
              background: 'linear-gradient(135deg, rgba(13,159,110,0.1), rgba(59,130,246,0.07))',
              border: '1.5px solid rgba(13,159,110,0.25)' as any,
              display: 'flex', alignItems: 'center', gap: '14px',
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
              background: 'linear-gradient(135deg, #0D9F6E, #3B82F6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(13,159,110,0.3)',
            }}>
              <ShoppingBag size={22} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-1)', marginBottom: '2px' }}>
                Plano semanal da despensa
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                Você informa o que tem em casa — a IA monta seg. a dom. usando <strong style={{ color: 'var(--text-1)' }}>somente esses ingredientes</strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                {['🛒 Sua despensa', '♻️ Sem desperdício', '🏠 O que tem em casa'].map(tag => (
                  <span key={tag} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 99, background: 'rgba(13,159,110,0.1)', color: '#0D9F6E', border: '1px solid rgba(13,159,110,0.2)', fontWeight: 600 }}>{tag}</span>
                ))}
              </div>
            </div>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: 99, flexShrink: 0,
              background: 'rgba(13,159,110,0.12)', color: '#0D9F6E',
              border: '1px solid rgba(13,159,110,0.25)',
            }}>
              Grátis →
            </span>
          </button>

          {/* 3. Receita rápida (free) */}
          <button
            onClick={handleSelectRecipe}
            style={{
              width: '100%', padding: '18px',
              borderRadius: '18px', cursor: 'pointer', textAlign: 'left',
              background: 'var(--bg-2)',
              border: '1.5px solid var(--border)' as any,
              display: 'flex', alignItems: 'center', gap: '14px',
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(139,92,246,0.25)',
            }}>
              <ChefHat size={22} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-1)', marginBottom: '2px' }}>
                Receita rápida
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5 }}>
                Informe alguns ingredientes e receba uma receita saudável na hora
              </div>
            </div>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: 99, flexShrink: 0,
              background: 'rgba(139,92,246,0.1)', color: '#8B5CF6',
              border: '1px solid rgba(139,92,246,0.2)',
            }}>
              Grátis →
            </span>
          </button>

        </div>
      </motion.div>
    </div>
  );
}
