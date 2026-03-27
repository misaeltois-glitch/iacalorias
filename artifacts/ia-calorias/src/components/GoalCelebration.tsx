import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GoalCelebrationProps {
  show: boolean;
  goalType: 'calories' | 'meals';
  onClose: () => void;
}

const CONFETTI_COLORS = [
  '#0D9F6E', '#10B981', '#34D399',
  '#F59E0B', '#FBBF24', '#FCD34D',
  '#6366F1', '#818CF8', '#A5B4FC',
  '#EF4444', '#F87171', '#FCA5A5',
  '#8B5CF6', '#A78BFA',
];

const MESSAGES: Record<GoalCelebrationProps['goalType'], { title: string; subtitle: string }> = {
  calories: {
    title: 'Meta de calorias atingida!',
    subtitle: 'Você bateu sua meta calórica de hoje. Equilíbrio perfeito — continue assim!',
  },
  meals: {
    title: 'Refeições do dia completas!',
    subtitle: 'Você registrou todas as refeições planejadas. Consistência é a chave do progresso!',
  },
};

function ConfettiPiece({ index }: { index: number }) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const left = 5 + (index * 4.5) % 90;
  const delay = (index * 0.07) % 0.9;
  const duration = 1.8 + (index * 0.13) % 1.2;
  const isRect = index % 3 !== 0;
  const size = isRect ? { w: 8, h: 5 } : { w: 7, h: 7 };

  return (
    <motion.div
      initial={{ y: -20, x: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{
        y: typeof window !== 'undefined' ? window.innerHeight + 60 : 900,
        x: (index % 2 === 0 ? 1 : -1) * (20 + (index * 17) % 60),
        opacity: [1, 1, 0.8, 0],
        rotate: (index % 2 === 0 ? 360 : -360) * 2,
        scale: [1, 1, 0.8],
      }}
      transition={{ duration, delay, ease: 'easeIn' }}
      style={{
        position: 'fixed',
        top: 0,
        left: `${left}%`,
        width: size.w,
        height: size.h,
        background: color,
        borderRadius: isRect ? '2px' : '50%',
        zIndex: 10000,
        pointerEvents: 'none',
      }}
    />
  );
}

export function GoalCelebration({ show, goalType, onClose }: GoalCelebrationProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (show) {
      timerRef.current = setTimeout(onClose, 4000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [show, onClose]);

  const msg = MESSAGES[goalType];

  return (
    <AnimatePresence>
      {show && (
        <>
          {Array.from({ length: 22 }).map((_, i) => (
            <ConfettiPiece key={i} index={i} />
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'all',
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.7, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-2)',
                border: '2px solid var(--accent)',
                borderRadius: '24px',
                padding: '32px 28px',
                maxWidth: '320px',
                width: '90%',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(13,159,110,0.25)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 50% 0%, rgba(13,159,110,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.7, delay: 0.15 }}
                style={{ fontSize: '56px', lineHeight: 1, marginBottom: '8px' }}
              >
                🏆
              </motion.div>

              <div style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.5px' }}>
                META ATINGIDA
              </div>

              <div style={{
                fontSize: '18px', fontWeight: 800,
                color: 'var(--text-1)', marginBottom: '8px',
                letterSpacing: '-0.3px',
              }}>
                {msg.title}
              </div>

              <p style={{
                fontSize: '14px', color: 'var(--text-2)',
                lineHeight: 1.55, marginBottom: '20px',
              }}>
                {msg.subtitle}
              </p>

              <button
                onClick={onClose}
                style={{
                  padding: '10px 28px', borderRadius: '12px',
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer', width: '100%',
                }}
              >
                Continuar assim! 🎯
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const CELEBRATION_KEY_PREFIX = 'ia-calorias-celebration-';

function getLocalDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function hasCelebratedToday(type: GoalCelebrationProps['goalType']): boolean {
  return !!localStorage.getItem(`${CELEBRATION_KEY_PREFIX}${type}-${getLocalDateString()}`);
}

export function markCelebratedToday(type: GoalCelebrationProps['goalType']): void {
  localStorage.setItem(`${CELEBRATION_KEY_PREFIX}${type}-${getLocalDateString()}`, '1');
}
