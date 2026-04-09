import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { loadReminders, saveReminders } from '@/hooks/use-meal-reminders';

const WATER_KEY_PREFIX = 'ia-calorias-water-';
const DEFAULT_GOAL = 8;
const WATER_REMINDER_PREFIX = 'water-hydration-';

function todayKey(): string {
  const d = new Date();
  return `${WATER_KEY_PREFIX}${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function generateWaterSlots(intervalHours: number): Array<{ key: string; label: string; emoji: string; time: string; enabled: boolean }> {
  const slots: Array<{ key: string; label: string; emoji: string; time: string; enabled: boolean }> = [];
  for (let h = 8; h <= 20; h += intervalHours) {
    const hh = String(h).padStart(2, '0');
    slots.push({
      key: `${WATER_REMINDER_PREFIX}${hh}00`,
      label: `Beber água (${hh}h)`,
      emoji: '💧',
      time: `${hh}:00`,
      enabled: true,
    });
  }
  return slots;
}

function isWaterRemindersEnabled(): boolean {
  const settings = loadReminders();
  return settings.customSlots?.some(s => s.key.startsWith(WATER_REMINDER_PREFIX)) ?? false;
}

function enableWaterReminders(intervalHours: number) {
  const settings = loadReminders();
  const filtered = (settings.customSlots ?? []).filter(s => !s.key.startsWith(WATER_REMINDER_PREFIX));
  const slots = generateWaterSlots(intervalHours);
  saveReminders({ ...settings, customSlots: [...filtered, ...slots] });
}

function disableWaterReminders() {
  const settings = loadReminders();
  saveReminders({ ...settings, customSlots: (settings.customSlots ?? []).filter(s => !s.key.startsWith(WATER_REMINDER_PREFIX)) });
}

export function WaterTracker() {
  const [count, setCount] = useState(0);
  const goal = DEFAULT_GOAL;
  const [waterReminders, setWaterReminders] = useState(() => isWaterRemindersEnabled());
  const [reminderInterval, setReminderInterval] = useState(2);
  const [showReminderConfig, setShowReminderConfig] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(todayKey());
    setCount(saved ? parseInt(saved, 10) : 0);
  }, []);

  const setAndPersist = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(goal + 4, next));
    setCount(clamped);
    localStorage.setItem(todayKey(), String(clamped));
  }, [goal]);

  const toggleWaterReminders = async () => {
    if (!waterReminders) {
      // Request notification permission first
      if ('Notification' in window && Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;
      }
      enableWaterReminders(reminderInterval);
      setWaterReminders(true);
    } else {
      disableWaterReminders();
      setWaterReminders(false);
    }
  };

  const handleIntervalChange = (interval: number) => {
    setReminderInterval(interval);
    if (waterReminders) {
      enableWaterReminders(interval);
    }
  };

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
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
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

      {/* Water reminders */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => setShowReminderConfig(v => !v)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ fontSize: '13px' }}>⏰</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>Lembretes de água</span>
          </button>
          <button
            onClick={toggleWaterReminders}
            style={{
              width: '40px', height: '22px', borderRadius: '99px',
              background: waterReminders ? '#3B82F6' : 'var(--bg-3)',
              border: `1px solid ${waterReminders ? '#3B82F6' : 'var(--border)'}`,
              cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
              position: 'absolute', top: '2px',
              left: waterReminders ? '20px' : '2px',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>

        {showReminderConfig && (
          <div style={{ marginTop: '10px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '8px' }}>
              Intervalo entre lembretes (8h–20h):
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 3].map(h => (
                <button
                  key={h}
                  onClick={() => handleIntervalChange(h)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                    border: `1.5px solid ${reminderInterval === h ? '#3B82F6' : 'var(--border)'}`,
                    background: reminderInterval === h ? 'rgba(59,130,246,0.1)' : 'var(--bg-3)',
                    color: reminderInterval === h ? '#3B82F6' : 'var(--text-2)',
                    cursor: 'pointer',
                  }}
                >
                  {h}h
                </button>
              ))}
            </div>
            {waterReminders && (
              <p style={{ fontSize: '11px', color: '#3B82F6', marginTop: '6px' }}>
                ✓ {generateWaterSlots(reminderInterval).length} lembretes ativos
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
