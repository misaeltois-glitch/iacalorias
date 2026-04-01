import React from 'react';
import { motion } from 'framer-motion';

interface StreakBadgeProps {
  streak: number;
}

const MILESTONE_COLORS: Array<[number, string, string, string]> = [
  // [threshold, border, bg, text]
  [60, 'rgba(234,179,8,0.5)',  'rgba(234,179,8,0.12)',  '#CA8A04'],
  [30, 'rgba(139,92,246,0.5)', 'rgba(139,92,246,0.12)', '#7C3AED'],
  [14, 'rgba(239,68,68,0.45)', 'rgba(239,68,68,0.10)',  '#DC2626'],
  [7,  'rgba(249,115,22,0.45)','rgba(249,115,22,0.10)', '#EA580C'],
  [3,  'rgba(249,115,22,0.35)','rgba(249,115,22,0.08)', '#F97316'],
  [1,  'rgba(255,255,255,0.15)','rgba(255,255,255,0.04)','var(--text-2)'],
];

function getColors(streak: number) {
  for (const [min, border, bg, text] of MILESTONE_COLORS) {
    if (streak >= min) return { border, bg, text };
  }
  return { border: 'rgba(255,255,255,0.1)', bg: 'transparent', text: 'var(--text-3)' };
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak < 1) return null;

  const { border, bg, text } = getColors(streak);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '5px 12px', borderRadius: '99px',
        background: bg, border: `1px solid ${border}`,
        color: text, fontSize: '12px', fontWeight: 700,
        flexShrink: 0,
      }}
    >
      <motion.span
        animate={streak >= 3 ? { scale: [1, 1.3, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.8, repeatDelay: 2 }}
        style={{ fontSize: '14px' }}
      >
        🔥
      </motion.span>
      {streak} dia{streak !== 1 ? 's' : ''}
    </motion.div>
  );
}
