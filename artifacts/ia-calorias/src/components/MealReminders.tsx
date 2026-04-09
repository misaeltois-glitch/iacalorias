import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Plus, X } from 'lucide-react';
import { loadReminders, saveReminders, emojiFromName, type ReminderSettings, type MealSlot, type CustomSlot } from '@/hooks/use-meal-reminders';
import { FOOD_PREFS_KEY, type MealFoodPrefs } from '@/components/MealFoodPrefsModal';

function loadFoodPrefs(): MealFoodPrefs | null {
  try {
    const raw = localStorage.getItem(FOOD_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function MealReminders() {
  const [settings, setSettings] = useState<ReminderSettings>(() => loadReminders());
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [foodPrefs, setFoodPrefs] = useState<MealFoodPrefs | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newTime, setNewTime] = useState('08:00');

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
    setFoodPrefs(loadFoodPrefs());
  }, []);

  const persist = (next: ReminderSettings) => { setSettings(next); saveReminders(next); };

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  };

  const toggleGlobal = async () => {
    if (!settings.globalEnabled && permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }
    persist({ ...settings, globalEnabled: !settings.globalEnabled });
  };

  const toggleSlot = (key: string) => {
    persist({
      ...settings,
      slots: settings.slots.map(s => s.key === key ? { ...s, enabled: !s.enabled } : s),
    });
  };

  const updateTime = (key: string, time: string) => {
    persist({
      ...settings,
      slots: settings.slots.map(s => s.key === key ? { ...s, time } : s),
    });
  };

  const toggleCustomSlot = (key: string) => {
    persist({
      ...settings,
      customSlots: (settings.customSlots ?? []).map(s => s.key === key ? { ...s, enabled: !s.enabled } : s),
    });
  };

  const updateCustomTime = (key: string, time: string) => {
    persist({
      ...settings,
      customSlots: (settings.customSlots ?? []).map(s => s.key === key ? { ...s, time } : s),
    });
  };

  const removeCustomSlot = (key: string) => {
    persist({
      ...settings,
      customSlots: (settings.customSlots ?? []).filter(s => s.key !== key),
    });
  };

  const addCustomSlot = () => {
    if (!newLabel.trim()) return;
    const key = `custom-${Date.now()}`;
    const emoji = emojiFromName(newLabel);
    const newSlot: CustomSlot = { key, label: newLabel.trim(), emoji, time: newTime, enabled: true };
    persist({
      ...settings,
      customSlots: [...(settings.customSlots ?? []), newSlot],
    });
    setNewLabel('');
    setNewTime('08:00');
    setShowAddForm(false);
  };

  if (!('Notification' in window)) return null;

  const enabledCount = settings.slots.filter(s => s.enabled).length;

  return (
    <div style={{
      borderRadius: '18px',
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: settings.globalEnabled ? 'rgba(13,159,110,0.12)' : 'var(--bg-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {settings.globalEnabled
              ? <Bell size={18} style={{ color: '#0D9F6E' }} />
              : <BellOff size={18} style={{ color: 'var(--text-3)' }} />}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)' }}>
              Lembretes de refeição
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>
              {settings.globalEnabled
                ? `${enabledCount} refeição${enabledCount !== 1 ? 'ões' : ''} ativa${enabledCount !== 1 ? 's' : ''}`
                : 'Notificações desativadas'}
            </div>
          </div>
        </div>
        <button
          onClick={toggleGlobal}
          style={{
            width: '44px', height: '24px', borderRadius: '99px', border: 'none',
            background: settings.globalEnabled ? '#0D9F6E' : 'var(--bg-3)',
            cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <div style={{
            width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
            position: 'absolute', top: '3px',
            left: settings.globalEnabled ? '23px' : '3px',
            transition: 'left 0.2s',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }} />
        </button>
      </div>

      {permission === 'denied' && (
        <div style={{
          padding: '8px 10px', borderRadius: '10px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          fontSize: '11px', color: '#ef4444',
        }}>
          Notificações bloqueadas. Habilite nas configurações do navegador.
        </div>
      )}

      {/* Meal slots */}
      {settings.globalEnabled && permission === 'granted' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {settings.slots.map((slot: MealSlot) => {
            const prefs = foodPrefs?.[slot.key as keyof MealFoodPrefs] ?? [];
            return (
              <div
                key={slot.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '12px',
                  background: slot.enabled ? 'rgba(13,159,110,0.06)' : 'var(--bg-3)',
                  border: `1px solid ${slot.enabled ? 'rgba(13,159,110,0.18)' : 'var(--border)'}`,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{slot.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: slot.enabled ? 'var(--text-1)' : 'var(--text-3)' }}>
                    {slot.label}
                  </div>
                  {prefs.length > 0 && slot.enabled && (
                    <div style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {prefs.slice(0, 2).join(' · ')}
                      {prefs.length > 2 && ` +${prefs.length - 2}`}
                    </div>
                  )}
                  {prefs.length === 0 && slot.enabled && (
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                      Sem preferências — configure em "Cardápio Semanal"
                    </div>
                  )}
                </div>
                <input
                  type="time"
                  value={slot.time}
                  disabled={!slot.enabled}
                  onChange={e => updateTime(slot.key, e.target.value)}
                  style={{
                    padding: '4px 8px', borderRadius: '8px', flexShrink: 0,
                    border: `1px solid ${slot.enabled ? 'rgba(13,159,110,0.25)' : 'var(--border)'}`,
                    background: slot.enabled ? 'var(--bg)' : 'var(--bg-2)',
                    color: slot.enabled ? 'var(--text-1)' : 'var(--text-3)',
                    fontSize: '13px', fontWeight: 700, outline: 'none',
                    fontVariantNumeric: 'tabular-nums',
                    opacity: slot.enabled ? 1 : 0.5,
                  }}
                />
                <button
                  onClick={() => toggleSlot(slot.key)}
                  style={{
                    width: '36px', height: '20px', borderRadius: '99px', border: 'none', flexShrink: 0,
                    background: slot.enabled ? '#0D9F6E' : 'var(--bg-2)',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                    border: `1px solid ${slot.enabled ? 'transparent' : 'var(--border)'}` as any,
                  }}
                >
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: '2px',
                    left: slot.enabled ? '19px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            );
          })}

          {/* Custom slots */}
          {(settings.customSlots ?? []).map((slot: CustomSlot) => (
            <div
              key={slot.key}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '12px',
                background: slot.enabled ? 'rgba(59,130,246,0.06)' : 'var(--bg-3)',
                border: `1px solid ${slot.enabled ? 'rgba(59,130,246,0.2)' : 'var(--border)'}`,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{slot.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: slot.enabled ? 'var(--text-1)' : 'var(--text-3)' }}>
                  {slot.label}
                </div>
              </div>
              <input
                type="time"
                value={slot.time}
                disabled={!slot.enabled}
                onChange={e => updateCustomTime(slot.key, e.target.value)}
                style={{
                  padding: '4px 8px', borderRadius: '8px', flexShrink: 0,
                  border: `1px solid ${slot.enabled ? 'rgba(59,130,246,0.25)' : 'var(--border)'}`,
                  background: slot.enabled ? 'var(--bg)' : 'var(--bg-2)',
                  color: slot.enabled ? 'var(--text-1)' : 'var(--text-3)',
                  fontSize: '13px', fontWeight: 700, outline: 'none',
                  fontVariantNumeric: 'tabular-nums',
                  opacity: slot.enabled ? 1 : 0.5,
                }}
              />
              <button
                onClick={() => toggleCustomSlot(slot.key)}
                style={{
                  width: '36px', height: '20px', borderRadius: '99px', border: 'none', flexShrink: 0,
                  background: slot.enabled ? '#3B82F6' : 'var(--bg-2)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                  border: `1px solid ${slot.enabled ? 'transparent' : 'var(--border)'}` as any,
                }}
              >
                <div style={{
                  width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: '2px',
                  left: slot.enabled ? '19px' : '2px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
              <button
                onClick={() => removeCustomSlot(slot.key)}
                style={{
                  width: '24px', height: '24px', borderRadius: '50%', border: 'none', flexShrink: 0,
                  background: 'rgba(239,68,68,0.1)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={12} style={{ color: '#ef4444' }} />
              </button>
            </div>
          ))}

          {/* Add custom slot form */}
          {showAddForm ? (
            <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-3)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                autoFocus
                placeholder="Nome do lembrete (ex: Suplemento)"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomSlot(); if (e.key === 'Escape') setShowAddForm(false); }}
                style={{
                  padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: '13px',
                  outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="time"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: '13px',
                    outline: 'none', fontVariantNumeric: 'tabular-nums',
                  }}
                />
                <button
                  onClick={() => setShowAddForm(false)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={addCustomSlot}
                  disabled={!newLabel.trim()}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#3B82F6', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: newLabel.trim() ? 'pointer' : 'not-allowed', opacity: newLabel.trim() ? 1 : 0.5, fontFamily: 'inherit' }}
                >
                  Salvar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px', borderRadius: '12px',
                border: '1.5px dashed var(--border)', background: 'none',
                color: 'var(--text-3)', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', width: '100%',
              }}
            >
              <Plus size={15} />
              Adicionar lembrete personalizado
            </button>
          )}
        </div>
      )}
    </div>
  );
}
