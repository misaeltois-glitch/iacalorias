import { useState, useCallback } from 'react';

const FAVORITES_KEY = 'ia-calorias-favorites';

export interface FavoriteMeal {
  id: string;           // uuid saved at time of favouriting
  dishName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  healthScore?: number | null;
  nutritionTip?: string | null;
  servingSize?: string | null;
  savedAt: string;      // ISO timestamp
}

function load(): FavoriteMeal[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(list: FavoriteMeal[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteMeal[]>(() => load());

  const isFavorited = useCallback((dishName: string) => {
    return favorites.some(f => f.dishName === dishName);
  }, [favorites]);

  const addFavorite = useCallback((meal: Omit<FavoriteMeal, 'id' | 'savedAt'>) => {
    setFavorites(prev => {
      // Avoid duplicates by dishName
      if (prev.some(f => f.dishName === meal.dishName)) return prev;
      const next = [
        { ...meal, id: crypto.randomUUID(), savedAt: new Date().toISOString() },
        ...prev,
      ].slice(0, 20); // max 20 favourites
      save(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = prev.filter(f => f.id !== id);
      save(next);
      return next;
    });
  }, []);

  return { favorites, isFavorited, addFavorite, removeFavorite };
}