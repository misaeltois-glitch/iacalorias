import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, Calculator } from 'lucide-react';

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface GoalsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onOpenBiometrics: () => void;
}

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber';
type ViewMode = 'day' | 'meal';

interface MacroConfig {
  key: MacroKey;
  label: string;
  emoji: string;
  unit: string;
  color: string;
  bgColor: string;
  min: number;
  max: number;
  step: number;
}

const MACROS: MacroConfig[] = [
  { key: 'calories', label: 'Calorias', emoji: '🔥', unit: 'kcal', color: '#f97316', bgColor: 'rgba(249,115,22,0.1)', min: 800, max: 6000, step: 50 },
  { key: 'protein',  label: 'Proteína',     emoji: '🥩', unit: 'g',    color: '#22c55e', bgColor: 'rgba(34,197,94,0.1)',  min: 20,  max: 500,  step: 5  },
  { key: 'carbs',    label: 'Carboidratos', emoji: '🌾', unit: 'g',    color: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)', min: 20,  max: 800,  step: 5  },
  { key: 'fat',      label: 'Gorduras',     emoji: '🫒', unit: 'g',    color: '#ef4444', bgColor: 'rgba(239,68,68,0.1)',  min: 10,  max: 300,  step: 5  },
  { key: 'fiber',    label: 'Fibras',       emoji: '🥦', unit: 'g',    color: '#06b6d4', bgColor: 'rgba(6,182,212,0.1)',  min: 5,   max: 100,  step: 1  },
];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface MacroCardProps {
  config: MacroConfig;
  valuePerDay: number | null;
  mealsPerDay: number;
  liveMealsPerDay: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSave: (key: MacroKey, valuePerDay: number) => Promise<void>;
}

function MacroCard({ config, valuePerDay, mealsPerDay, liveMealsPerDay, viewMode, onViewModeChange, onSave }: MacroCardProps) {
  const mpd = Math.max(1, mealsPerDay);
  const perMeal = valuePerDay ? Math.round((valuePerDay / mpd) * 10) / 10 : null;

  const displayValue = viewMode === 'day' ? (valuePerDay ?? '') : (perMeal ?? '');
  const [localValue, setLocalValue] = useState<string>(displayValue !== '' ? String(displayValue) : '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const v = viewMode === 'day' ? (valuePerDay ?? '') : (perMeal ?? '');
    setLocalValue(v !== '' ? String(v) : '');
  }, [valuePerDay, mealsPerDay, viewMode]);

  // Live equivalences — computed from what the user is currently typing
  const liveMpd = Math.max(1, liveMealsPerDay);
  const liveNum = parseFloat(localValue);
  const livePerDay = !isNaN(liveNum) && liveNum > 0
    ? (viewMode === 'day' ? liveNum : Math.round(liveNum * liveMpd))
    : null;
  const livePerMeal = !isNaN(liveNum) && liveNum > 0
    ? (viewMode === 'meal' ? liveNum : Math.round((liveNum / liveMpd) * 10) / 10)
    : null;
  const handleBlur = useCallback(async () => {
    const num = parseFloat(localValue);
    if (!localValue || isNaN(num) || num <= 0) return;

    const finalPerDay = viewMode === 'day' ? Math.round(num) : Math.round(num * mpd);
    const prevPerDay = valuePerDay;
    if (finalPerDay === prevPerDay) return;

    setSaveState('saving');
    try {
      await onSave(config.key, finalPerDay);
      setSaveState('saved');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaveState('idle'), 2000);
    }
  }, [localValue, viewMode, mpd, valuePerDay, config.key, onSave]);

  return (
    <div style={{
      borderRadius: '16px',
      background: 'var(--bg-2)',
      border: '1.5px solid var(--border)',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: config.bgColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px',
          }}>
            {config.emoji}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>
            {config.label}
          </span>
        </div>

        {/* Toggle per dia / por refeição */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-3)',
          borderRadius: '8px',
          padding: '2px',
          gap: '2px',
        }}>
          {(['day', 'meal'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: viewMode === mode ? config.color : 'transparent',
                color: viewMode === mode ? '#fff' : 'var(--text-2)',
              }}
            >
              {mode === 'day' ? 'por dia' : 'por refeição'}
            </button>
          ))}
        </div>
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="number"
            value={localValue}
            onChange={e => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            min={config.min}
            max={config.max}
            step={config.step}
            placeholder="—"
            style={{
              width: '100%',
              padding: '10px 14px',
              paddingRight: '48px',
              borderRadius: '10px',
              border: `1.5px solid ${saveState === 'error' ? '#ef4444' : saveState === 'saved' ? '#22c55e' : config.color + '60'}`,
              background: 'var(--bg-3)',
              color: config.color,
              fontWeight: 700,
              fontSize: '18px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
          <div style={{
            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '12px', color: 'var(--text-2)', fontWeight: 600,
          }}>
            {config.unit}
          </div>
        </div>

        {/* Save state indicator */}
        <div style={{ width: '28px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AnimatePresence mode="wait">
            {saveState === 'saving' && (
              <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 style={{ width: '18px', height: '18px', color: 'var(--text-2)', animation: 'spin 0.8s linear infinite' }} />
              </motion.div>
            )}
            {saveState === 'saved' && (
              <motion.div key="saved" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check style={{ width: '12px', height: '12px', color: '#fff', strokeWidth: 3 }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Equivalences — live, computed from current input */}
      {livePerDay ? (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {viewMode === 'day' ? (
            <span style={{ fontSize: '11px', color: 'var(--text-2)', background: 'var(--bg-3)', padding: '3px 8px', borderRadius: '6px' }}>
              = {livePerMeal}{config.unit}/refeição
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-2)', background: 'var(--bg-3)', padding: '3px 8px', borderRadius: '6px' }}>
              = {livePerDay}{config.unit}/dia
            </span>
          )}
          <span style={{ fontSize: '11px', color: 'var(--text-2)', background: 'var(--bg-3)', padding: '3px 8px', borderRadius: '6px' }}>
            {Math.round(livePerDay * 7)}{config.unit}/semana
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-2)', background: 'var(--bg-3)', padding: '3px 8px', borderRadius: '6px' }}>
            {Math.round(livePerDay * 30)}{config.unit}/mês
          </span>
        </div>
      ) : (
        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Insira um valor e saia do campo para salvar</span>
      )}
    </div>
  );
}

export function GoalsPanel({ isOpen, onClose, sessionId, onOpenBiometrics }: GoalsPanelProps) {
  const [goals, setGoals] = useState<Record<MacroKey, number | null> & { mealsPerDay: number }>({
    calories: null, protein: null, carbs: null, fat: null, fiber: null, mealsPerDay: 3,
  });
  const [viewModes, setViewModes] = useState<Record<MacroKey, ViewMode>>({
    calories: 'day', protein: 'day', carbs: 'day', fat: 'day', fiber: 'day',
  });
  const [mealsPerDayLocal, setMealsPerDayLocal] = useState<string>('3');
  const [mpdSaveState, setMpdSaveState] = useState<SaveState>('idle');
  const mpdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${BASE}api/goals?sessionId=${sessionId}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setGoals({
            calories: data.calories ?? null,
            protein: data.protein ?? null,
            carbs: data.carbs ?? null,
            fat: data.fat ?? null,
            fiber: data.fiber ?? null,
            mealsPerDay: data.mealsPerDay ?? 3,
          });
          setMealsPerDayLocal(String(data.mealsPerDay ?? 3));
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, sessionId]);

  const handleSaveMacro = useCallback(async (key: MacroKey, valuePerDay: number) => {
    await fetch(`${BASE}api/goals`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ sessionId, [key]: valuePerDay }),
    }).then(r => {
      if (!r.ok) throw new Error('save failed');
      return r.json();
    });
    setGoals(prev => ({ ...prev, [key]: valuePerDay }));
  }, [sessionId]);

  const handleMpdBlur = useCallback(async () => {
    const num = parseInt(mealsPerDayLocal);
    if (isNaN(num) || num < 2 || num > 6) return;
    if (num === goals.mealsPerDay) return;

    setMpdSaveState('saving');
    try {
      await fetch(`${BASE}api/goals`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ sessionId, mealsPerDay: num }),
      }).then(r => { if (!r.ok) throw new Error('save failed'); });
      setGoals(prev => ({ ...prev, mealsPerDay: num }));
      setMpdSaveState('saved');
      if (mpdTimer.current) clearTimeout(mpdTimer.current);
      mpdTimer.current = setTimeout(() => setMpdSaveState('idle'), 2000);
    } catch {
      setMpdSaveState('error');
      if (mpdTimer.current) clearTimeout(mpdTimer.current);
      mpdTimer.current = setTimeout(() => setMpdSaveState('idle'), 2000);
    }
  }, [mealsPerDayLocal, goals.mealsPerDay, sessionId]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        style={{
          width: '100%', maxWidth: '720px',
          maxHeight: '92dvh',
          background: 'var(--bg-surface)',
          borderRadius: '24px 24px 0 0',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Configurar metas</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '3px', marginBottom: 0 }}>
              Edite um valor e saia do campo para salvar automaticamente
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
            <X style={{ width: '16px', height: '16px', color: 'var(--text-2)' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
              <Loader2 style={{ width: '28px', height: '28px', color: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Refeições por dia (global) */}
              <div style={{
                borderRadius: '16px',
                background: 'var(--accent-glow)',
                border: '1.5px solid var(--accent)40',
                padding: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '3px' }}>
                    🍽️ Refeições por dia
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                    Divisor automático para equivalências por refeição (2–6)
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <input
                    type="number"
                    value={mealsPerDayLocal}
                    onChange={e => setMealsPerDayLocal(e.target.value)}
                    onBlur={handleMpdBlur}
                    min={2} max={6} step={1}
                    style={{
                      width: '64px', padding: '8px 10px', textAlign: 'center',
                      borderRadius: '10px',
                      border: `1.5px solid ${mpdSaveState === 'saved' ? '#22c55e' : 'var(--accent)60'}`,
                      background: 'var(--bg-2)',
                      color: 'var(--accent)', fontWeight: 700, fontSize: '18px',
                      outline: 'none',
                    }}
                  />
                  <AnimatePresence mode="wait">
                    {mpdSaveState === 'saving' && (
                      <motion.div key="saving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Loader2 style={{ width: '16px', height: '16px', color: 'var(--text-2)', animation: 'spin 0.8s linear infinite' }} />
                      </motion.div>
                    )}
                    {mpdSaveState === 'saved' && (
                      <motion.div key="saved" initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check style={{ width: '11px', height: '11px', color: '#fff', strokeWidth: 3 }} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Macro cards */}
              {MACROS.map(cfg => (
                <MacroCard
                  key={cfg.key}
                  config={cfg}
                  valuePerDay={goals[cfg.key]}
                  mealsPerDay={goals.mealsPerDay}
                  liveMealsPerDay={parseInt(mealsPerDayLocal) || goals.mealsPerDay}
                  viewMode={viewModes[cfg.key]}
                  onViewModeChange={(mode) => setViewModes(prev => ({ ...prev, [cfg.key]: mode }))}
                  onSave={handleSaveMacro}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer — biometrics */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => { onClose(); onOpenBiometrics(); }}
            style={{
              width: '100%', padding: '12px',
              borderRadius: '12px',
              border: '1.5px solid var(--border-strong)',
              background: 'var(--bg-2)',
              color: 'var(--text-1)',
              fontWeight: 600, fontSize: '14px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <Calculator style={{ width: '16px', height: '16px', color: 'var(--accent)' }} />
            Calcular pela minha biometria
          </button>
        </div>
      </motion.div>
    </div>
  );
}
