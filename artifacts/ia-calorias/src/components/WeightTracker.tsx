import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface WeightLog { id: string; weightKg: number; logDate: string }

interface WeightTrackerProps {
  sessionId: string;
}

function fmt(date: string) {
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

export function WeightTracker({ sessionId }: WeightTrackerProps) {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [inputWeight, setInputWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}api/weight?sessionId=${sessionId}`, { headers: authHeaders() });
      if (!r.ok) return;
      const data = await r.json();
      setLogs(data.logs ?? []);
      setGoalWeight(data.goalWeight ?? null);
    } catch {}
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const logWeight = async () => {
    const kg = parseFloat(inputWeight.replace(',', '.'));
    if (isNaN(kg) || kg < 20 || kg > 500) return;
    setSaving(true);
    try {
      await fetch(`${BASE}api/weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ sessionId, weightKg: kg }),
      });
      setInputWeight('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const latest = logs.length > 0 ? logs[logs.length - 1] : null;
  const previous = logs.length > 1 ? logs[logs.length - 2] : null;
  const diff = latest && previous ? latest.weightKg - previous.weightKg : null;
  const chartLogs = logs.slice(-30);

  const minY = chartLogs.length > 0 ? Math.floor(Math.min(...chartLogs.map(l => l.weightKg)) - 1) : 50;
  const maxY = chartLogs.length > 0 ? Math.ceil(Math.max(...chartLogs.map(l => l.weightKg)) + 1) : 100;

  return (
    <div style={{
      borderRadius: '20px',
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⚖️</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>
              Evolução de peso
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>
              {latest
                ? `Último: ${latest.weightKg.toFixed(1)} kg${diff !== null ? (diff > 0 ? ` (+${diff.toFixed(1)})` : ` (${diff.toFixed(1)})`) : ''}`
                : 'Nenhum registro ainda'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {latest && (
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '18px', fontWeight: 700,
              color: diff === null ? 'var(--text-1)' : diff < 0 ? '#10B981' : diff > 0 ? '#EF4444' : 'var(--text-1)',
            }}>
              {latest.weightKg.toFixed(1)}<span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 400 }}> kg</span>
            </span>
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
        </div>
      </button>

      {/* Expandable body */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }}
        >
          {/* Chart */}
          {chartLogs.length >= 2 ? (
            <div style={{ marginTop: '14px', marginBottom: '14px' }}>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartLogs} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="logDate"
                    tickFormatter={fmt}
                    tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                    axisLine={false} tickLine={false}
                    interval={Math.max(0, Math.floor(chartLogs.length / 5) - 1)}
                  />
                  <YAxis
                    domain={[minY, maxY]}
                    tick={{ fontSize: 10, fill: 'var(--text-3)' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number) => [`${v.toFixed(1)} kg`, 'Peso']}
                    labelFormatter={(l: string) => fmt(l)}
                  />
                  {goalWeight && (
                    <ReferenceLine y={goalWeight} stroke="#0D9F6E" strokeDasharray="4 3" label={{ value: `Meta: ${goalWeight}kg`, fontSize: 10, fill: '#0D9F6E', position: 'insideTopRight' }} />
                  )}
                  <Line
                    type="monotone" dataKey="weightKg"
                    stroke="#3B82F6" strokeWidth={2.5}
                    dot={{ fill: '#3B82F6', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', padding: '16px 0', margin: 0 }}>
              Registre pelo menos 2 pesos para ver o gráfico
            </p>
          )}

          {/* Input row */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              step="0.1"
              min={20}
              max={500}
              value={inputWeight}
              onChange={e => setInputWeight(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && logWeight()}
              placeholder="Ex: 73.5"
              style={{
                flex: 1, padding: '10px 12px', borderRadius: '12px',
                border: '1px solid var(--border)', background: 'var(--bg-3)',
                color: 'var(--text-1)', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
              }}
            />
            <span style={{ fontSize: '13px', color: 'var(--text-3)', flexShrink: 0 }}>kg</span>
            <button
              onClick={logWeight}
              disabled={!inputWeight || saving}
              style={{
                padding: '10px 18px', borderRadius: '12px',
                background: inputWeight ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : 'var(--bg-3)',
                border: 'none', color: inputWeight ? '#fff' : 'var(--text-3)',
                fontSize: '13px', fontWeight: 700, cursor: inputWeight ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s', flexShrink: 0,
              }}
            >
              {saving ? '…' : 'Registrar'}
            </button>
          </div>

          {goalWeight && latest && (
            <p style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>
              {latest.weightKg > goalWeight
                ? `${(latest.weightKg - goalWeight).toFixed(1)} kg acima da meta`
                : latest.weightKg < goalWeight
                ? `${(goalWeight - latest.weightKg).toFixed(1)} kg abaixo da meta`
                : '🎉 Meta de peso atingida!'}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
