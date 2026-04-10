/**
 * Shared API utilities — base URL, auth token key, auth headers.
 * Import from here instead of duplicating in every component.
 */

export const BASE = import.meta.env.BASE_URL ?? '/';
export const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';

export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Convenience: fetch with auth headers pre-attached */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path.replace(/^\//, '')}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers as Record<string, string> | undefined) },
  });
}
