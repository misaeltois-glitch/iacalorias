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

function currentHHMM() {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }
}

export function useMealReminders() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    registerServiceWorker();

    function check() {
      const settings = loadReminders();
      if (!settings.enabled) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const now = currentHHMM();
      const today = todayDateStr();

      for (const time of settings.times) {
        if (time !== now) continue;
        const notifiedKey = `${today}-${time}`;
        try {
          const last = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]') as string[];
          if (last.includes(notifiedKey)) continue;
          last.push(notifiedKey);
          // Keep only last 20 entries
          const trimmed = last.slice(-20);
          localStorage.setItem(NOTIFIED_KEY, JSON.stringify(trimmed));
        } catch {}

        const mealNames: Record<string, string> = {
          '06:00': 'café da manhã',
          '07:00': 'café da manhã',
          '08:00': 'café da manhã',
          '09:00': 'lanche da manhã',
          '10:00': 'lanche da manhã',
          '11:00': 'almoço',
          '12:00': 'almoço',
          '13:00': 'almoço',
          '14:00': 'lanche da tarde',
          '15:00': 'lanche da tarde',
          '16:00': 'lanche da tarde',
          '18:00': 'jantar',
          '19:00': 'jantar',
          '20:00': 'jantar',
          '21:00': 'ceia',
        };
        const mealName = mealNames[time] ?? 'refeição';
        const body = `Hora de registrar seu ${mealName}! 📸`;

        // Try via SW (so it works even if tab is in background)
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: 'IA Calorias',
            body,
            tag: `meal-${time}`,
          });
        } else {
          new Notification('IA Calorias', { body, icon: '/favicon.svg', tag: `meal-${time}` });
        }
      }
    }

    // Check every minute, aligned to the minute boundary
    const msToNextMinute = 60000 - (Date.now() % 60000);
    const timeout = setTimeout(() => {
      check();
      intervalRef.current = setInterval(check, 60000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
