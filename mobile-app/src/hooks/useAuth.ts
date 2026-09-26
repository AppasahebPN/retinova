import { useState, useEffect, createContext, useContext } from 'react';
import { authService } from '../services/authService';
import { loadApiBaseUrl } from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

import React from 'react';

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthProvider(): AuthContextValue {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      if (__DEV__) console.log('[BOOT API] useAuthProvider: restoring session from storage...');
      try {
        await loadApiBaseUrl();
        const t = await authService.getStoredToken();
        const u = await authService.getStoredUser();
        if (t && u && t.length > 10) {
          if (__DEV__) console.log('[BOOT API] Session restored for role:', u.role);
          setToken(t);
          setUser(u);
        } else if (t || u) {
          // Partial / corrupt state — clear it
          if (__DEV__) console.warn('[BOOT API] Partial auth state found – clearing to force re-login.');
          await authService.logout();
        } else {
          if (__DEV__) console.log('[BOOT API] No stored session – showing Login.');
        }
      } catch (err: any) {
        if (__DEV__) console.warn('[BOOT API] Note during session restore:', err?.message || err);
      } finally {
        setIsLoading(false);
      }
    }
    restore();
  }, []);

  const login = async (email: string, password: string) => {
    if (__DEV__) console.log('[BOOT API]', { method: 'POST', url: '(authService.login)' });
    const data = await authService.login(email, password);
    if (__DEV__) console.log('[BOOT API] Login OK, role:', data.user?.role);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await authService.logout();
    setToken(null);
    setUser(null);
  };

  return { user, token, isLoading, login, logout };
}
