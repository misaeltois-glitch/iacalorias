import { useState, useCallback } from 'react';

const CHEAT_DAYS_KEY = 'ia-calorias-cheat-days';

function pad(n: number) { return n.toString().padStart(2, '0'); }

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function loadCheatDays(): string[] {
  try {
    const raw = localStorage.getItem(CHEAT_DAYS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCheatDays(days: string[]) {
  localStorage.setItem(CHEAT_DAYS_KEY, JSON.stringify(days));
}

export function useCheatDays() {
  const today = todayStr();
  const [days, setDays] = useState<string[]>(() => loadCheatDays());
  const isCheatDay = days.includes(today);

  const toggleCheatDay = useCallback(() => {
    setDays(prev => {
      const next = prev.includes(today)
        ? prev.filter(d => d !== today)
        : [...prev, today];
      saveCheatDays(next);
      return next;
    });
  }, [today]);

  return { isCheatDay, toggleCheatDay };
}

export function isDateCheatDay(dateStr: string): boolean {
  return loadCheatDays().includes(dateStr);
}
