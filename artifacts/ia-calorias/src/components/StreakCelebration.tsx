import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const STREAK_MILESTONES = [3, 7, 14, 30, 60] as const;
const CELEBRATION_KEY = 'ia-calorias-streak-celebrated';

function getStoredCelebrated(): Set<number> {
  try {
    const raw = localStorage.getItem(CELEBRATION_KEY);
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
  } catch {
    return new Set();
  }
}

function markCelebrated(milestone: number) {
  const s = getStoredCelebrated();
  s.add(milestone);
  localStorage.setItem(CELEBRATION_KEY, JSON.stringify([...s]));
}

export function shouldCelebrateStreak(streak: number): number | null {
  if (streak < 1) return null;
  const celebrated = getStoredCelebrated();
  // Find highest milestone achieved that hasn't been celebrated yet
  for (let i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
    const m = STREAK_MILESTONES[i];
    if (streak >= m && !celebrated.has(m)) return m;
  }
  return null;
}

interface StreakCelebrationProps {
  milestone: number;
  onClose: () => void;
}

const MILESTONE_INFO: Record<number, { emoji: string; title: string; subtitle: string }> = {
  3:  { emoji: '🔥', title: '3 dias seguidos!',  subtitle: 'Você está construindo um hábito poderoso. Continue registrando suas refeições!' },
  7:  { emoji: '🔥', title: 'Uma semana inteira!', subtitle: 'Uma semana de consistência! Seu corpo e mente agradecem cada registro.' },
  14: { emoji: '🏆', title: '14 dias de sequência!', subtitle: 'Duas semanas sem falhar! Você já está no modo hábito — parabéns!' },
  30: { emoji: '👑', title: '30 dias consecutivos!', subtitle: 'Um mês completo de dedicação nutricional. Você é incrível!' },
  60: { emoji: '🌟', title: '60 dias seguidos!',  subtitle: 'Dois meses de consistência absoluta. Você é um exemplo de compromisso com a saúde!' },
};

const FIRE_COLORS = ['#F97316', '#FB923C', '#FDBA74', '#F59E0B', '#FCD34D', '#EF4444', '#DC2626'];

function Spark({ index }: { index: number }) {
  const color = FIRE_COLORS[index % FIRE_COLORS.length];
  const left = 5 + (index * 4.7) % 90;
  const delay = (index * 0.06) % 0.8;
  const duration = 1.4 + (index * 0.11) % 1.1;
  return (
    <motion.div
      initial={{ y: -10, x: 0, opacity: 1, scale: 1 }}
      animate={{
        y: typeof window !== 'undefined' ? window.innerHeight + 40 : 900,
        x: (index % 2 === 0 ? 1 : -1) * (15 + (index * 19) % 55),
        opacity: [1, 1, 0.6, 0],
        scale: [1, 0.9, 0.6],
        rotate: (index % 2 === 0 ? 180 : -180),
      }}
      transition={{ duration, delay, ease: 'easeIn' }}
      style={{
        position: 'fixed', top: 0, left: `${left}%`,
        fontSize: index % 4 === 0 ? '18px' : '13px',
        zIndex: 10000, pointerEvents: 'none',
        textShadow: `0 0 8px ${color}`,
      }}
    >
      {index % 3 === 0 ? '🔥' : index % 3 === 1 ? '✨' : '⚡'}
    </motion.div>
  );
}

export function StreakCelebration({ milestone, onClose }: StreakCelebrationProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const info = MILESTONE_INFO[milestone] ?? MILESTONE_INFO[3];

  useEffect(() => {
    markCelebrated(milestone);
    timerRef.current = setTimeout(onClose, 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [milestone, onClose]);

  return (
    <AnimatePresence>
      <>
        {Array.from({ length: 24 }).map((_, i) => <Spark key={i} index={i} />)}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.6, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 30 }}
            transition={{ type: 'spring', damping: 18, stiffness: 280 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-2)',
              border: '2px solid rgba(249,115,22,0.5)',
              borderRadius: '28px',
              padding: '36px 28px',
              maxWidth: '320px', width: '90%',
              textAlign: 'center',
              boxShadow: '0 24px 64px rgba(249,115,22,0.25)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* glow background */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.14) 0%, transparent 65%)',
              pointerEvents: 'none',
            }} />

            <motion.div
              animate={{ scale: [1, 1.25, 1], rotate: [0, -8, 8, -4, 0] }}
              transition={{ duration: 0.8, delay: 0.1 }}
              style={{ fontSize: '68px', lineHeight: 1, marginBottom: '10px' }}
            >
              {info.emoji}
            </motion.div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 14px', borderRadius: '99px',
              background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.35)',
              color: '#F97316', fontSize: '12px', fontWeight: 700,
              letterSpacing: '0.4px', marginBottom: '14px',
            }}>
              🔥 SEQUÊNCIA DE {milestone} DIAS
            </div>

            <div style={{
              fontSize: '20px', fontWeight: 800,
              color: 'var(--text-1)', marginBottom: '10px',
              letterSpacing: '-0.3px',
            }}>
              {info.title}
            </div>

            <p style={{
              fontSize: '14px', color: 'var(--text-2)',
              lineHeight: 1.6, marginBottom: '24px',
            }}>
              {info.subtitle}
            </p>

            <button
              onClick={onClose}
              style={{
                padding: '12px 28px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #F97316, #EF4444)',
                color: '#fff', border: 'none',
                fontWeight: 700, fontSize: '14px',
                cursor: 'pointer', width: '100%',
                boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
              }}
            >
              Manter a sequência! 🔥
            </button>
          </motion.div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
