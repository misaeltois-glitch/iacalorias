import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WATER_KEY_PREFIX = 'ia-calorias-water-';
const WATER_REMINDER_PREFIX = 'water-hydration-';
const REMINDERS_KEY = 'ia-calorias-reminders';
const GOALS_KEY = 'ia-calorias-goals';

// Meta diária em ml (35ml/kg), default 2000ml
function calcWaterGoalMl(weightKg?: number | null): number {
  if (weightKg && weightKg > 0) {
    return Math.max(1500, Math.min(4000, Math.round(weightKg * 35 / 100) * 100));
  }
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (raw) {
      const goals = JSON.parse(raw);
      const weight = goals?.weight;
      if (weight && weight > 0) {
        return Math.max(1500, Math.min(4000, Math.round(weight * 35 / 100) * 100));
      }
    }
  } catch { /* ignore */ }
  return 2000;
}

function todayKey(): string {
  const d = new Date();
  return `${WATER_KEY_PREFIX}${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Lê o total de ml do dia (com migração de formato antigo de "copos")
function loadTodayMl(): number {
  try {
    const raw = localStorage.getItem(todayKey());
    if (!raw) return 0;
    const val = JSON.parse(raw);
    // Migração: valor antigo era inteiro de copos (≤ 20), novo formato é objeto {ml: number}
    if (typeof val === 'number' && val <= 20) return val * 250; // copos → ml
    if (typeof val === 'object' && val !== null && typeof val.ml === 'number') return val.ml;
    if (typeof val === 'number') return val; // já era ml
  } catch { /* ignore */ }
  return 0;
}

function saveTodayMl(ml: number) {
  localStorage.setItem(todayKey(), JSON.stringify({ ml }));
}

type WaterCustomSlot = { key: string; label: string; emoji: string; time: string; enabled: boolean };
type WaterSettings = { globalEnabled: boolean; slots: unknown[]; customSlots: WaterCustomSlot[] };

// Reminder helpers
function readSettings(): WaterSettings {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<WaterSettings>;
      return {
        globalEnabled: p.globalEnabled ?? false,
        slots: p.slots ?? [],
        customSlots: Array.isArray(p.customSlots) ? (p.customSlots as WaterCustomSlot[]) : [],
      };
    }
  } catch { /* ignore */ }
  return { globalEnabled: false, slots: [], customSlots: [] };
}

function writeSettings(s: WaterSettings) {
  try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function generateWaterSlots(intervalHours: number) {
  const slots: Array<{ key: string; label: string; emoji: string; time: string; enabled: boolean }> = [];
  for (let h = 8; h <= 20; h += intervalHours) {
    const hh = String(h).padStart(2, '0');
    slots.push({ key: `${WATER_REMINDER_PREFIX}${hh}00`, label: `Beber água (${hh}h)`, emoji: '💧', time: `${hh}:00`, enabled: true });
  }
  return slots;
}

function isWaterRemindersEnabled(): boolean {
  return readSettings().customSlots.some(c => c.key.startsWith(WATER_REMINDER_PREFIX));
}

function enableWaterReminders(intervalHours: number) {
  const s = readSettings();
  const filtered = s.customSlots.filter(c => !c.key.startsWith(WATER_REMINDER_PREFIX));
  writeSettings({ ...s, customSlots: [...filtered, ...generateWaterSlots(intervalHours)] });
}

function disableWaterReminders() {
  const s = readSettings();
  writeSettings({ ...s, customSlots: s.customSlots.filter(c => !c.key.startsWith(WATER_REMINDER_PREFIX)) });
}

function fmtMl(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1).replace('.', ',')}L`;
  return `${ml}ml`;
}

// ─── Containers ──────────────────────────────────────────────────────────────
const CONTAINERS = [
  { id: 'shot',    emoji: '🥃', label: 'Shot',     ml: 50  },
  { id: 'copo',   emoji: '🥛', label: 'Copo',     ml: 250 },
  { id: 'caneca', emoji: '🍵', label: 'Caneca',   ml: 350 },
  { id: 'garrafa',emoji: '🍶', label: 'Garrafa',  ml: 500 },
  { id: 'grande', emoji: '💧', label: 'Garrafão', ml: 750 },
] as const;

type ContainerId = typeof CONTAINERS[number]['id'] | 'custom';

interface WaterTrackerProps {
  weightKg?: number | null;
}

export function WaterTracker({ weightKg }: WaterTrackerProps = {}) {
  const [totalMl, setTotalMl] = useState(0);
  const [selectedContainer, setSelectedContainer] = useState<ContainerId>('copo');
  const [customMl, setCustomMl] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [waterReminders, setWaterReminders] = useState(() => isWaterRemindersEnabled());
  const [reminderInterval, setReminderInterval] = useState(2);
  const [showReminderConfig, setShowReminderConfig] = useState(false);
  const [ripple, setRipple] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const customRef = useRef<HTMLInputElement>(null);

  const goalMl = calcWaterGoalMl(weightKg);

  useEffect(() => {
    setTotalMl(loadTodayMl());
  }, []);

  useEffect(() => {
    if (showCustomInput) customRef.current?.focus();
  }, [showCustomInput]);

  const addMl = useCallback((ml: number) => {
    if (ml <= 0) return;
    setTotalMl((prev: number) => {
      const next = Math.max(0, Math.min(prev + ml, goalMl + 2000));
      saveTodayMl(next);
      return next;
    });
    setRipple(true);
    setTimeout(() => setRipple(false), 600);
  }, [goalMl]);

  const removeMl = useCallback((ml: number) => {
    setTotalMl((prev: number) => {
      const next = Math.max(0, prev - ml);
      saveTodayMl(next);
      return next;
    });
  }, []);

  const handleAdd = () => {
    if (selectedContainer === 'custom') {
      const val = parseInt(customMl.replace(/\D/g, ''), 10);
      if (!isNaN(val) && val > 0) {
        addMl(Math.min(val, 2000));
        setCustomMl('');
        setShowCustomInput(false);
      }
      return;
    }
    const container = CONTAINERS.find(c => c.id === selectedContainer);
    if (container) addMl(container.ml);
  };

  const handleContainerSelect = (id: ContainerId) => {
    setSelectedContainer(id);
    setShowCustomInput(id === 'custom');
    if (id !== 'custom') setCustomMl('');
  };

  const toggleWaterReminders = async () => {
    if (!waterReminders) {
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
    if (waterReminders) enableWaterReminders(interval);
  };

  const pct = Math.min(1, totalMl / goalMl);
  const done = totalMl >= goalMl;

  const selectedMl = selectedContainer === 'custom'
    ? (parseInt(customMl.replace(/\D/g, ''), 10) || 0)
    : (CONTAINERS.find(c => c.id === selectedContainer)?.ml ?? 250);

  return (
    <div style={{
      borderRadius: '20px',
      background: 'var(--bg-2)',
      border: `1px solid ${done ? 'rgba(59,130,246,0.35)' : 'var(--border)'}`,
      overflow: 'hidden',
      transition: 'border-color 0.3s',
    }}>
      {/* ── Collapsed header (always visible) ── */}
      <button
        onClick={() => setExpanded((v: boolean) => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '14px 18px',
          background: 'none', border: 'none', cursor: 'pointer',
          gap: '10px',
        }}
      >
        {/* Left: emoji + title + subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <motion.span
            animate={ripple ? { scale: [1, 1.4, 1], rotate: [0, -10, 10, 0] } : {}}
            transition={{ duration: 0.5 }}
            style={{ fontSize: '20px', display: 'inline-block', flexShrink: 0 }}
          >💧</motion.span>
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>
              Hidratação
            </div>
            <div style={{ fontSize: '11px', color: done ? '#3B82F6' : 'var(--text-3)', marginTop: '1px' }}>
              {done ? '🎉 Meta atingida!' : `Faltam ${fmtMl(goalMl - totalMl)}`}
            </div>
          </div>
        </div>

        {/* Right: counter + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '18px', fontWeight: 700,
              color: done ? '#3B82F6' : 'var(--text-1)',
              lineHeight: 1, transition: 'color 0.3s',
            }}>
              <motion.span key={totalMl} initial={{ y: -4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.2 }}>
                {fmtMl(totalMl)}
              </motion.span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: 1 }}>de {fmtMl(goalMl)}</div>
          </div>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: '12px', color: 'var(--text-3)', display: 'inline-block', lineHeight: 1 }}
          >▼</motion.span>
        </div>
      </button>

      {/* Thin progress bar — always visible below header */}
      <div style={{ width: '100%', height: '3px', background: 'var(--bg-3)' }}>
        <motion.div
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: 'spring', stiffness: 180, damping: 22 }}
          style={{
            height: '100%',
            background: done
              ? 'linear-gradient(90deg, #3B82F6, #60A5FA)'
              : 'linear-gradient(90deg, #60A5FA, #93C5FD)',
          }}
        />
      </div>

      {/* ── Expandable body ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="water-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '14px 18px 16px' }}>
              {/* Container selector */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '2px' }}>
                {CONTAINERS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleContainerSelect(c.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '8px 10px', borderRadius: '12px', flexShrink: 0,
                      border: `1.5px solid ${selectedContainer === c.id ? 'rgba(59,130,246,0.6)' : 'var(--border)'}`,
                      background: selectedContainer === c.id ? 'rgba(59,130,246,0.1)' : 'var(--bg-3)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>{c.emoji}</span>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: selectedContainer === c.id ? '#3B82F6' : 'var(--text-3)', marginTop: '3px' }}>
                      {c.ml}ml
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => handleContainerSelect('custom')}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '8px 10px', borderRadius: '12px', flexShrink: 0,
                    border: `1.5px solid ${selectedContainer === 'custom' ? 'rgba(59,130,246,0.6)' : 'var(--border)'}`,
                    background: selectedContainer === 'custom' ? 'rgba(59,130,246,0.1)' : 'var(--bg-3)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>✏️</span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: selectedContainer === 'custom' ? '#3B82F6' : 'var(--text-3)', marginTop: '3px' }}>
                    Custom
                  </span>
                </button>
              </div>

              {/* Custom ml input */}
              <AnimatePresence>
                {showCustomInput && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', marginBottom: '10px' }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '4px' }}>
                      <input
                        ref={customRef}
                        type="number"
                        inputMode="numeric"
                        placeholder="Ex: 330"
                        value={customMl}
                        onChange={e => setCustomMl(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        style={{
                          flex: 1, padding: '10px 12px', borderRadius: '12px',
                          background: 'var(--bg-3)', border: '1.5px solid rgba(59,130,246,0.4)',
                          color: 'var(--text-1)', fontSize: '14px', fontWeight: 600,
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--text-3)', flexShrink: 0 }}>ml</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add / Remove buttons */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  onClick={() => removeMl(selectedContainer === 'custom' ? (parseInt(customMl.replace(/\D/g, ''), 10) || 250) : (CONTAINERS.find(c => c.id === selectedContainer)?.ml ?? 250))}
                  disabled={totalMl === 0}
                  style={{
                    width: '44px', padding: '10px', borderRadius: '12px',
                    background: 'var(--bg-3)', border: '1px solid var(--border)',
                    color: totalMl === 0 ? 'var(--text-3)' : 'var(--text-1)',
                    fontSize: '18px', cursor: totalMl === 0 ? 'not-allowed' : 'pointer',
                    opacity: totalMl === 0 ? 0.4 : 1, flexShrink: 0,
                  }}
                >−</button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAdd}
                  disabled={selectedContainer === 'custom' && !customMl}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '12px',
                    background: (selectedContainer === 'custom' && !customMl)
                      ? 'var(--bg-3)'
                      : 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(96,165,250,0.12))',
                    border: `1.5px solid ${(selectedContainer === 'custom' && !customMl) ? 'var(--border)' : 'rgba(59,130,246,0.35)'}`,
                    color: (selectedContainer === 'custom' && !customMl) ? 'var(--text-3)' : '#3B82F6',
                    fontSize: '13px', fontWeight: 700,
                    cursor: (selectedContainer === 'custom' && !customMl) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {selectedContainer === 'custom' && customMl
                    ? `+ Adicionar ${customMl}ml`
                    : selectedMl > 0
                    ? `+ Adicionar ${fmtMl(selectedMl)}`
                    : '+ Adicionar'}
                </motion.button>
              </div>

              {/* Segment dots */}
              {goalMl > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  {Array.from({ length: Math.min(10, Math.ceil(goalMl / 250)) }).map((_, i) => {
                    const segMl = (i + 1) * (goalMl / Math.min(10, Math.ceil(goalMl / 250)));
                    const filled = totalMl >= segMl;
                    const partial = !filled && totalMl > i * (goalMl / Math.min(10, Math.ceil(goalMl / 250)));
                    return (
                      <div key={i} style={{
                        flex: 1, height: '6px', borderRadius: '99px', minWidth: '16px',
                        background: filled
                          ? 'linear-gradient(90deg, #60A5FA, #3B82F6)'
                          : partial ? 'rgba(96,165,250,0.4)' : 'var(--bg-3)',
                        transition: 'background 0.3s',
                      }} />
                    );
                  })}
                </div>
              )}

              {/* Water reminders */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setShowReminderConfig(v => !v)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span style={{ fontSize: '13px' }}>⏰</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>Lembretes de água</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{showReminderConfig ? '▲' : '▼'}</span>
                  </button>
                  <button
                    onClick={toggleWaterReminders}
                    style={{
                      width: '40px', height: '22px', borderRadius: '99px',
                      background: waterReminders ? '#3B82F6' : 'var(--bg-3)',
                      border: `1px solid ${waterReminders ? '#3B82F6' : 'var(--border)'}`,
                      cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
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

                <AnimatePresence>
                  {showReminderConfig && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ overflow: 'hidden' }}
                    >
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
