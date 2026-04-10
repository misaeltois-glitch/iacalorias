import { useEffect, useRef } from 'react';

// Duplicado aqui para evitar dependência circular hook → componente UI
const FOOD_PREFS_KEY = 'ia-calorias-food-prefs';
type MealFoodPrefs = {
  breakfast?: string[];
  morningSnack?: string[];
  lunch?: string[];
  afternoonSnack?: string[];
  dinner?: string[];
};

export const REMINDERS_KEY = 'ia-calorias-reminders';
const NOTIFIED_KEY = 'ia-calorias-reminder-last-notified';

export type MealSlotKey = 'breakfast' | 'morningSnack' | 'lunch' | 'afternoonSnack' | 'dinner';

export interface MealSlot {
  key: MealSlotKey;
  label: string;
  emoji: string;
  defaultTime: string;
  time: string;
  enabled: boolean;
}

export interface CustomSlot {
  key: string; // unique uuid-like key
  label: string;
  emoji: string;
  time: string;
  enabled: boolean;
}

export interface ReminderSettings {
  globalEnabled: boolean;
  slots: MealSlot[];
  customSlots: CustomSlot[];
}

export function emojiFromName(name: string): string {
  const n = name.toLowerCase();
  if (/treino|academia|exerc/.test(n)) return '🏋️';
  if (/água|agua|hidrat/.test(n)) return '💧';
  if (/suple|vitamina|omega|prote/.test(n)) return '💊';
  if (/café|coffee/.test(n)) return '☕';
  if (/fruta|lanche/.test(n)) return '🍎';
  if (/med|remedio|remédio/.test(n)) return '💉';
  if (/sono|dormir|descanso/.test(n)) return '😴';
  if (/peso|balança/.test(n)) return '⚖️';
  return '⏰';
}

export const DEFAULT_SLOTS: MealSlot[] = [
  { key: 'breakfast',     label: 'Café da manhã',    emoji: '☀️',  defaultTime: '07:30', time: '07:30', enabled: true  },
  { key: 'morningSnack',  label: 'Lanche da manhã',  emoji: '🍎',  defaultTime: '10:00', time: '10:00', enabled: false },
  { key: 'lunch',         label: 'Almoço',            emoji: '🍽️', defaultTime: '12:30', time: '12:30', enabled: true  },
  { key: 'afternoonSnack',label: 'Lanche da tarde',  emoji: '🥤',  defaultTime: '15:30', time: '15:30', enabled: false },
  { key: 'dinner',        label: 'Jantar',            emoji: '🌙',  defaultTime: '19:30', time: '19:30', enabled: true  },
];

export function loadReminders(): ReminderSettings {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // migrate old format — ensure customSlots exists
      if (parsed.slots) {
        return { customSlots: [], ...parsed } as ReminderSettings;
      }
    }
  } catch {}
  return { globalEnabled: false, slots: DEFAULT_SLOTS.map(s => ({ ...s })), customSlots: [] };
}

export function saveReminders(s: ReminderSettings) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(s));
}

function loadFoodPrefs(): MealFoodPrefs | null {
  try {
    const raw = localStorage.getItem(FOOD_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function pad(n: number) { return n.toString().padStart(2, '0'); }

function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function alreadyNotified(key: string): boolean {
  try {
    const list = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]') as string[];
    return list.includes(key);
  } catch { return false; }
}

function markNotified(key: string) {
  try {
    const list = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]') as string[];
    list.push(key);
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(list.slice(-30)));
  } catch {}
}

function showNotification(slot: MealSlot) {
  const prefs = loadFoodPrefs();
  const foods: string[] = prefs?.[slot.key as keyof MealFoodPrefs] ?? [];
  const foodHint = foods.length > 0
    ? `Sugestão: ${foods.slice(0, 2).join(', ')} 😋`
    : `Hora de registrar seu ${slot.label.toLowerCase()}! 📸`;

  const body = foodHint;

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title: `${slot.emoji} ${slot.label} — IA Calorias`,
      body,
      tag: `meal-${slot.key}`,
    });
  } else {
    new Notification(`${slot.emoji} ${slot.label} — IA Calorias`, {
      body, icon: '/icon-512.png', tag: `meal-${slot.key}`,
    });
  }
}

const DAILY_ANALYSES_KEY = 'ia-calorias-daily-analyses-count';

/** Salvar contagem de análises do dia (chamado após cada análise registrada) */
export function incrementDailyAnalysesCount() {
  try {
    const today = todayDateStr();
    const raw = localStorage.getItem(DAILY_ANALYSES_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[today] = (data[today] ?? 0) + 1;
    // Manter só os últimos 7 dias
    const keys = Object.keys(data).sort().slice(-7);
    const trimmed: Record<string, number> = {};
    keys.forEach(k => { trimmed[k] = data[k]; });
    localStorage.setItem(DAILY_ANALYSES_KEY, JSON.stringify(trimmed));
  } catch {}
}

function getTodayAnalysesCount(): number {
  try {
    const raw = localStorage.getItem(DAILY_ANALYSES_KEY);
    if (!raw) return 0;
    return JSON.parse(raw)[todayDateStr()] ?? 0;
  } catch { return 0; }
}

/** Notificação de streak em risco: dispara às 20h se nenhuma análise foi feita no dia */
function checkStreakRisk(windowMinutes: number) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const today = todayDateStr();
  const notifiedKey = `${today}-streak-risk-20:00`;
  if (alreadyNotified(notifiedKey)) return;

  const target = new Date(now);
  target.setHours(20, 0, 0, 0);
  const diffMs = now.getTime() - target.getTime();
  const diffMin = diffMs / 60000;
  if (diffMin < 0 || diffMin >= windowMinutes) return;

  if (getTodayAnalysesCount() > 0) return; // já registrou algo hoje

  markNotified(notifiedKey);

  const title = '🔥 Seu streak está em risco!';
  const body = 'Você ainda não registrou nenhuma refeição hoje. Fotografe agora e mantenha sua sequência! 📸';

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION', title, body, tag: 'streak-risk',
    });
  } else {
    new Notification(title, { body, icon: '/icon-512.png', tag: 'streak-risk' });
  }
}

/**
 * Verifica se algum lembrete foi perdido enquanto o tab estava em background.
 * windowMinutes = janela de tempo para trás (ex: 30 = checar últimos 30 min).
 */
function checkReminders(windowMinutes = 1) {
  const settings = loadReminders();
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const today = todayDateStr();

  // Streak risk check — independente de globalEnabled (é uma notificação separada)
  checkStreakRisk(windowMinutes);

  if (!settings.globalEnabled) return;

  const allSlots: Array<{ key: string; label: string; emoji: string; time: string; enabled: boolean }> = [
    ...settings.slots,
    ...(settings.customSlots ?? []),
  ];

  for (const slot of allSlots) {
    if (!slot.enabled) continue;
    const [h, m] = slot.time.split(':').map(Number);
    const reminderDate = new Date(now);
    reminderDate.setHours(h, m, 0, 0);

    const diffMs = now.getTime() - reminderDate.getTime();
    const diffMin = diffMs / 60000;

    if (diffMin < 0 || diffMin >= windowMinutes) continue;

    const notifiedKey = `${today}-${slot.key}-${slot.time}`;
    if (alreadyNotified(notifiedKey)) continue;

    markNotified(notifiedKey);
    showNotification(slot as MealSlot);
  }
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        // Periodic Background Sync (Chrome Android — funciona mesmo com tab fechada)
        if ('periodicSync' in reg) {
          (reg as any).periodicSync.register('meal-reminder', { minInterval: 60 * 1000 })
            .catch(() => {});
        }

        // Força o browser a checar por novo SW ao recuperar foco (garante atualização do PWA instalado)
        const forceUpdate = () => reg.update().catch(() => {});
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') forceUpdate();
        });
        window.addEventListener('focus', forceUpdate);
      })
      .catch(() => {});

    // Recarrega apenas quando um NOVO SW assume o controle (atualização real, não primeiro install).
    // controllerchange dispara ao trocar de SW ativo — nunca na primeira instalação.
    let firstController = !navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (firstController) {
        // Primeiro controller assumindo — não recarregar, só marcar como conhecido
        firstController = false;
        return;
      }
      // SW diferente tomou o controle → atualização real → recarregar para servir novo bundle
      window.location.reload();
    });
  }
}

export function useMealReminders() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    registerServiceWorker();

    // Verifica a cada minuto (alinhado ao início do minuto)
    function scheduleNext() {
      const msToNextMinute = 60000 - (Date.now() % 60000);
      timeoutRef.current = setTimeout(() => {
        checkReminders(1); // janela de 1 minuto para cheques regulares
        intervalRef.current = setInterval(() => checkReminders(1), 60000);
      }, msToNextMinute);
    }

    scheduleNext();

    // Listener para mensagem do SW (periodicSync sem tab aberta)
    const handleSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CHECK_REMINDERS') checkReminders(30);
    };
    navigator.serviceWorker?.addEventListener('message', handleSwMessage);

    // Quando o tab volta do background, checa lembretes perdidos (últimos 30 min)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkReminders(30);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Quando o app volta do background (mobile)
    const handleFocus = () => checkReminders(30);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
    };
  }, []);
}
