import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';
const AUTH_USER_KEY = 'ia-calorias-auth-user';

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, sessionId: string) => Promise<void>;
  register: (email: string, password: string, sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BASE = import.meta.env.BASE_URL ?? '/';
function apiUrl(path: string) {
  return `${BASE}api/auth/${path}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));

  const setAuth = useCallback((t: string, u: AuthUser) => {
    localStorage.setItem(AUTH_TOKEN_KEY, t);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const register = useCallback(async (email: string, password: string, sessionId: string) => {
    const res = await fetch(apiUrl('register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, sessionId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erro ao criar conta.');
    setAuth(data.token, data.user);
  }, [setAuth]);

  const login = useCallback(async (email: string, password: string, sessionId: string) => {
    const res = await fetch(apiUrl('login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, sessionId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erro ao fazer login.');
    setAuth(data.token, data.user);
  }, [setAuth]);

  const logout = useCallback(async () => {
    try { await fetch(apiUrl('logout'), { method: 'POST' }); } catch {}
    clearAuth();
  }, [clearAuth]);

  const forgotPassword = useCallback(async (email: string): Promise<string> => {
    const res = await fetch(apiUrl('forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erro ao solicitar redefinição.');
    return data.message as string;
  }, []);

  const resetPassword = useCallback(async (token: string, password: string): Promise<string> => {
    const res = await fetch(apiUrl('reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erro ao redefinir senha.');
    return data.message as string;
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token,
      isAuthenticated: !!user,
      login, register, logout,
      forgotPassword, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}
