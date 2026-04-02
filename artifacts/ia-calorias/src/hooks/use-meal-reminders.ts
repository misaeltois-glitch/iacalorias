import { useEffect, useRef } from 'react';

export const REMINDERS_KEY = 'ia-calorias-reminders';
const NOTIFIED_KEY = 'ia-calorias-reminder-last-notified';

export interface ReminderSettings {
  enabled: boolean;
  times: string[]; // e.g. ["08:00", "12:30", "19:00"]
}

export function loadReminders(): ReminderSettings {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { enabled: false, times: ['08:00', '12:00', '19:00'] };
}

export function saveReminders(s: ReminderSettings) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(s));
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

function showNotification(time: string) {
  const mealNames: Record<string, string> = {
    '06:00': 'café da manhã', '07:00': 'café da manhã', '08:00': 'café da manhã',
    '09:00': 'lanche da manhã', '10:00': 'lanche da manhã',
    '11:00': 'almoço', '12:00': 'almoço', '13:00': 'almoço',
    '14:00': 'lanche da tarde', '15:00': 'lanche da tarde', '16:00': 'lanche da tarde',
    '18:00': 'jantar', '19:00': 'jantar', '20:00': 'jantar',
    '21:00': 'ceia',
  };
  const mealName = mealNames[time] ?? 'refeição';
  const body = `Hora de registrar seu ${mealName}! 📸`;

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title: 'IA Calorias',
      body,
      tag: `meal-${time}`,
    });
  } else {
    new Notification('IA Calorias', { body, icon: '/icon-512.png', tag: `meal-${time}` });
  }
}

/**
 * Verifica se algum lembrete foi perdido enquanto o tab estava em background.
 * windowMinutes = janela de tempo para trás (ex: 30 = checar últimos 30 min).
 */
function checkReminders(windowMinutes = 1) {
  const settings = loadReminders();
  if (!settings.enabled) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const now = new Date();
  const today = todayDateStr();

  for (const time of settings.times) {
    const [h, m] = time.split(':').map(Number);
    const reminderDate = new Date(now);
    reminderDate.setHours(h, m, 0, 0);

    const diffMs = now.getTime() - reminderDate.getTime();
    const diffMin = diffMs / 60000;

    // Dentro da janela: entre 0 e windowMinutes minutos atrás
    if (diffMin < 0 || diffMin >= windowMinutes) continue;

    const notifiedKey = `${today}-${time}`;
    if (alreadyNotified(notifiedKey)) continue;

    markNotified(notifiedKey);
    showNotification(time);
  }
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        // Periodic Background Sync (Chrome Android — funciona mesmo com tab fechada)
        if ('periodicSync' in reg) {
          (reg as any).periodicSync.register('meal-reminder', { minInterval: 60 * 1000 })
            .catch(() => {}); // Pode falhar se permissão não concedida
        }
      })
      .catch(() => {});
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
