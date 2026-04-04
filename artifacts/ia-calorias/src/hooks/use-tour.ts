import { useState, useCallback } from 'react';

const TOUR_DONE_KEY = 'ia-calorias-tour-done';

export function useTour() {
  const [showTour, setShowTour] = useState(false);

  const maybeStartTour = useCallback((delayMs = 600) => {
    if (localStorage.getItem(TOUR_DONE_KEY)) return;
    const t = setTimeout(() => setShowTour(true), delayMs);
    return () => clearTimeout(t);
  }, []);

  const startTour = useCallback(() => setShowTour(true), []);

  const endTour = useCallback(() => {
    setShowTour(false);
    localStorage.setItem(TOUR_DONE_KEY, 'true');
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_DONE_KEY);
    setShowTour(true);
  }, []);

  return { showTour, maybeStartTour, startTour, endTour, resetTour };
}
