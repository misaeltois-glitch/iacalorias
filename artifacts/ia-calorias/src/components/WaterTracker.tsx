import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

const WATER_KEY_PREFIX = 'ia-calorias-water-';
const DEFAULT_GOAL = 8;

function todayKey(): string {
  const d = new Date();
  return `${WATER_KEY_PREFIX}${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function WaterTracker() {
  const [count, setCount] = useState(0);
  const goal = DEFAULT_GOAL;

  useEffect(() => {
    const saved = localStorage.getItem(todayKey());
    setCount(saved ? parseInt(saved, 10) : 0);
  }, []);

  const setAndPersist = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(goal + 4, next));
    setCount(clamped);
    localStorage.setItem(todayKey(), String(clamped));
  }, [goal]);

  const pct = Math.min(1, count / goal);
  const done = count >= goal;

  return (
    <div style={{
      borderRadius: '20px',
      background: 'var(--bg-2)',
      border: `1px solid ${done ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
      padding: '16px 18px',
      transition: 'border-color 0.3s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>💧</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>
              Hidratação
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>
              {done ? '🎉 Meta atingida!' : `${goal - count} copo${goal - count !== 1 ? 's' : ''} restante${goal - count !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: '22px', fontWeight: 700,
          color: done ? '#3B82F6' : 'var(--text-1)',
          transition: 'color 0.3s',
        }}>
          {count}<span style={{ fontSize: '13px', color: 'var(--text-3)', fontWeight: 500 }}>/{goal}</span>
        </div>
      </div>

      {/* Glass grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        {Array.from({ length: goal }).map((_, i) => {
          const filled = i < count;
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.85 }}
              onClick={() => setAndPersist(filled ? i : i + 1)}
              style={{
                width: '36px', height: '40px', borderRadius: '10px',
                border: `2px solid ${filled ? 'rgba(59,130,246,0.6)' : 'var(--border)'}`,
                background: filled
                  ? 'linear-gradient(180deg, rgba(96,165,250,0.25) 0%, rgba(59,130,246,0.15) 100%)'
                  : 'var(--bg-3)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px',
                transition: 'background 0.2s, border-color 0.2s',
                flexShrink: 0,
              }}
            >
              {filled ? '💧' : <span style={{ fontSize: '16px', opacity: 0.25 }}>○</span>}
            </motion.button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', height: '5px', borderRadius: '99px', background: 'var(--bg-3)', overflow: 'hidden', marginBottom: '12px' }}>
        <motion.div
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          style={{
            height: '100%', borderRadius: '99px',
            background: done
              ? 'linear-gradient(90deg, #3B82F6, #60A5FA)'
              : 'linear-gradient(90deg, #60A5FA, #93C5FD)',
          }}
        />
      </div>

      {/* +/- controls */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setAndPersist(count - 1)}
          disabled={count === 0}
          style={{
            flex: 1, padding: '9px', borderRadius: '12px',
            background: 'var(--bg-3)', border: '1px solid var(--border)',
            color: count === 0 ? 'var(--text-3)' : 'var(--text-1)',
            fontSize: '18px', cursor: count === 0 ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.15s',
            opacity: count === 0 ? 0.4 : 1,
          }}
        >
          −
        </button>
        <button
          onClick={() => setAndPersist(count + 1)}
          style={{
            flex: 2, padding: '9px', borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(96,165,250,0.1))',
            border: '1px solid rgba(59,130,246,0.3)',
            color: '#3B82F6', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + Adicionar copo
        </button>
      </div>
    </div>
  );
}
