import { useState, useCallback } from 'react';

const VISIT_COUNT_KEY = 'ia-calorias-tour-visits';
const MAX_TOUR_VISITS = 3;

function getVisitCount(): number {
  return parseInt(localStorage.getItem(VISIT_COUNT_KEY) ?? '0', 10);
}

function incrementVisit(): number {
  const next = getVisitCount() + 1;
  localStorage.setItem(VISIT_COUNT_KEY, String(next));
  return next;
}

export function useTour() {
  const [showTour, setShowTour] = useState(false);

  const maybeStartTour = useCallback((delayMs = 600) => {
    const visitNumber = incrementVisit();
    if (visitNumber > MAX_TOUR_VISITS) return;
    const t = setTimeout(() => setShowTour(true), delayMs);
    return () => clearTimeout(t);
  }, []);

  const startTour = useCallback(() => setShowTour(true), []);

  const endTour = useCallback(() => {
    setShowTour(false);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(VISIT_COUNT_KEY);
    setShowTour(true);
  }, []);

  return { showTour, maybeStartTour, startTour, endTour, resetTour };
}
