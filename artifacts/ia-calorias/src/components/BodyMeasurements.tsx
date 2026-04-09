import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react';

const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface MeasurementLog {
  id: string;
  logDate: string;
  waist?: number | null;
  hip?: number | null;
  arm?: number | null;
  chest?: number | null;
  thigh?: number | null;
}

interface BodyMeasurementsProps {
  sessionId: string;
}

function fmt(date: string) {
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

const METRICS = [
  { key: 'waist', label: 'Cintura', color: '#EF4444' },
  { key: 'hip',   label: 'Quadril',  color: '#F59E0B' },
  { key: 'chest', label: 'Peito',    color: '#3B82F6' },
  { key: 'arm',   label: 'Braço',    color: '#8B5CF6' },
  { key: 'thigh', label: 'Coxa',     color: '#0D9F6E' },
] as const;

type MetricKey = typeof METRICS[number]['key'];

export function BodyMeasurements({ sessionId }: BodyMeasurementsProps) {
  const [logs, setLogs] = useState<MeasurementLog[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inputs, setInputs] = useState<Record<MetricKey, string>>({
    waist: '', hip: '', chest: '', arm: '', thigh: '',
  });
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(new Set(['waist', 'hip']));

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}api/measurements?sessionId=${sessionId}`, { headers: authHeaders() });
      if (!r.ok) return;
      const data = await r.json();
      setLogs(data.logs ?? []);
    } catch {}
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const toNum = (v: string) => { const n = parseFloat(v.replace(',', '.')); return isNaN(n) || n <= 0 ? null : n; };
    const payload: Record<string, number | null> = {};
    let hasAny = false;
    for (const m of METRICS) {
      const v = toNum(inputs[m.key]);
      payload[m.key] = v;
      if (v !== null) hasAny = true;
    }
    if (!hasAny) return;

    setSaving(true);
    try {
      await fetch(`${BASE}api/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ sessionId, ...payload }),
      });
      setInputs({ waist: '', hip: '', chest: '', arm: '', thigh: '' });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const chartData = logs.map(l => ({
    date: fmt(l.logDate),
    waist: l.waist ?? undefined,
    hip: l.hip ?? undefined,
    arm: l.arm ?? undefined,
    chest: l.chest ?? undefined,
    thigh: l.thigh ?? undefined,
  }));

  const latest = logs[logs.length - 1];
  const prev = logs[logs.length - 2];

  const toggleMetric = (k: MetricKey) => {
    setActiveMetrics(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  return (
    <div style={{
      borderRadius: '20px',
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      marginBottom: '16px',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>📏</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>Medidas corporais</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>
              {logs.length > 0 ? `${logs.length} registro${logs.length > 1 ? 's' : ''} · último em ${fmt(logs[logs.length - 1].logDate)}` : 'Registre suas medidas'}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-3)' }} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }}>
          {/* Input grid */}
          <div style={{ marginTop: '14px', marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '8px' }}>
              Registrar medidas de hoje (cm)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {METRICS.map(m => (
                <div key={m.key} style={{ position: 'relative' }}>
                  <label style={{ fontSize: '10px', fontWeight: 600, color: m.color, display: 'block', marginBottom: '3px' }}>
                    {m.label}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="cm"
                    value={inputs[m.key]}
                    onChange={e => setInputs(prev => ({ ...prev, [m.key]: e.target.value }))}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: '10px',
                      background: 'var(--bg-3)', border: '1px solid var(--border)',
                      color: 'var(--text-1)', fontSize: '13px',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleSave}
              disabled={saving || Object.values(inputs).every(v => !v.trim())}
              style={{
                marginTop: '10px', width: '100%', padding: '10px',
                borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #0D9F6E, #057A55)',
                color: '#fff', fontWeight: 700, fontSize: '13px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              Salvar medidas
            </button>
          </div>

          {/* Quick summary of latest */}
          {latest && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
              {METRICS.map(m => {
                const cur = latest[m.key];
                const old = prev?.[m.key];
                if (!cur) return null;
                const diff = old != null ? cur - old : null;
                return (
                  <div key={m.key} style={{
                    padding: '5px 10px', borderRadius: '10px',
                    background: 'var(--bg-3)', border: `1px solid ${m.color}30`,
                  }}>
                    <div style={{ fontSize: '10px', color: m.color, fontWeight: 700 }}>{m.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-1)' }}>{cur}cm</div>
                    {diff !== null && (
                      <div style={{ fontSize: '10px', color: diff < 0 ? '#0D9F6E' : diff > 0 ? '#EF4444' : 'var(--text-3)' }}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Chart */}
          {chartData.length >= 2 && (
            <div>
              {/* Metric toggles */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {METRICS.map(m => (
                  chartData.some(d => d[m.key] != null) && (
                    <button
                      key={m.key}
                      onClick={() => toggleMetric(m.key)}
                      style={{
                        padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700,
                        cursor: 'pointer', border: `1.5px solid ${m.color}`,
                        background: activeMetrics.has(m.key) ? `${m.color}20` : 'transparent',
                        color: activeMetrics.has(m.key) ? m.color : 'var(--text-3)',
                      }}
                    >
                      {m.label}
                    </button>
                  )
                ))}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px' }}
                    formatter={(val: any, name: string) => [`${val}cm`, METRICS.find(m => m.key === name)?.label ?? name]}
                  />
                  {METRICS.map(m => activeMetrics.has(m.key) && (
                    <Line
                      key={m.key}
                      type="monotone"
                      dataKey={m.key}
                      stroke={m.color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: m.color }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartData.length < 2 && logs.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', padding: '12px 0' }}>
              Registre suas medidas acima para acompanhar a evolução
            </p>
          )}
        </div>
      )}
    </div>
  );
}
