import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Plus, X } from 'lucide-react';
import { loadReminders, saveReminders, type ReminderSettings } from '@/hooks/use-meal-reminders';

const PRESET_TIMES = ['07:00', '08:00', '10:00', '12:00', '15:00', '19:00', '20:00', '21:00'];

export function MealReminders() {
  const [settings, setSettings] = useState<ReminderSettings>(() => loadReminders());
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showAdd, setShowAdd] = useState(false);
  const [customTime, setCustomTime] = useState('');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const persist = (next: ReminderSettings) => {
    setSettings(next);
    saveReminders(next);
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      persist({ ...settings, enabled: true });
    }
  };

  const toggleEnabled = async () => {
    if (!settings.enabled && permission !== 'granted') {
      await requestPermission();
      return;
    }
    persist({ ...settings, enabled: !settings.enabled });
  };

  const addTime = (time: string) => {
    if (!time || settings.times.includes(time) || settings.times.length >= 6) return;
    const sorted = [...settings.times, time].sort();
    persist({ ...settings, times: sorted });
    setShowAdd(false);
    setCustomTime('');
  };

  const removeTime = (time: string) => {
    persist({ ...settings, times: settings.times.filter(t => t !== time) });
  };

  if (!('Notification' in window)) return null;

  return (
    <div style={{
      borderRadius: '18px',
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: settings.enabled ? 'rgba(13,159,110,0.12)' : 'var(--bg-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {settings.enabled
              ? <Bell size={18} style={{ color: '#0D9F6E' }} />
              : <BellOff size={18} style={{ color: 'var(--text-3)' }} />}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>
              Lembretes de refeição
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
              {settings.enabled
                ? `${settings.times.length} lembrete${settings.times.length !== 1 ? 's' : ''} ativo${settings.times.length !== 1 ? 's' : ''}`
                : 'Notificações desativadas'}
            </div>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={toggleEnabled}
          style={{
            width: '44px', height: '24px', borderRadius: '99px', border: 'none',
            background: settings.enabled ? '#0D9F6E' : 'var(--bg-3)',
            cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <div style={{
            width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
            position: 'absolute', top: '3px',
            left: settings.enabled ? '23px' : '3px',
            transition: 'left 0.2s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }} />
        </button>
      </div>

      {/* Permission denied warning */}
      {permission === 'denied' && (
        <div style={{
          padding: '8px 10px', borderRadius: '10px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          fontSize: '11px', color: '#ef4444',
        }}>
          Notificações bloqueadas. Habilite nas configurações do navegador para usar lembretes.
        </div>
      )}

      {/* Times list */}
      {settings.enabled && permission === 'granted' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {settings.times.map(time => (
            <div key={time} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 10px', borderRadius: '99px',
              background: 'rgba(13,159,110,0.1)', border: '1px solid rgba(13,159,110,0.2)',
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0D9F6E', fontVariantNumeric: 'tabular-nums' }}>
                {time}
              </span>
              <button
                onClick={() => removeTime(time)}
                style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: 'rgba(13,159,110,0.2)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
              >
                <X size={8} style={{ color: '#0D9F6E' }} />
              </button>
            </div>
          ))}

          {settings.times.length < 6 && (
            <button
              onClick={() => setShowAdd(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                padding: '5px 10px', borderRadius: '99px',
                background: 'var(--bg-3)', border: '1px dashed var(--border)',
                cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--text-2)',
              }}
            >
              <Plus size={11} /> Adicionar
            </button>
          )}
        </div>
      )}

      {/* Add time panel */}
      {showAdd && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {PRESET_TIMES.filter(t => !settings.times.includes(t)).map(t => (
              <button key={t} onClick={() => addTime(t)} style={{
                padding: '4px 10px', borderRadius: '99px',
                background: 'var(--bg-3)', border: '1px solid var(--border)',
                fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', cursor: 'pointer',
              }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="time"
              value={customTime}
              onChange={e => setCustomTime(e.target.value)}
              style={{
                flex: 1, padding: '6px 10px', borderRadius: '8px',
                border: '1px solid var(--border)', background: 'var(--bg-3)',
                color: 'var(--text-1)', fontSize: '13px', outline: 'none',
              }}
            />
            <button
              onClick={() => addTime(customTime)}
              disabled={!customTime}
              style={{
                padding: '6px 14px', borderRadius: '8px',
                background: customTime ? '#0D9F6E' : 'var(--bg-3)',
                color: customTime ? '#fff' : 'var(--text-3)',
                border: 'none', fontWeight: 700, fontSize: '12px',
                cursor: customTime ? 'pointer' : 'default',
              }}
            >
              Adicionar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
