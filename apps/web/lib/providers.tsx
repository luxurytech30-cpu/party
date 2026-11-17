'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Locale } from '@party/shared';
import { ApiError, authApi, refreshSession, setSessionListener, type SessionUser } from './api';
import { PackageProvider } from './package';
import { dictionaries, type Dictionary, type FullDictionary } from './i18n';

// ---------- i18n ----------
interface I18nValue {
  locale: Locale;
  t: FullDictionary;
  /** Build a locale-prefixed href. */
  href: (path: string) => string;
  errorMessage: (err: unknown) => string;
}
const I18nContext = createContext<I18nValue | null>(null);

export function useI18n() {
  const v = useContext(I18nContext);
  if (!v) throw new Error('useI18n outside provider');
  return v;
}

// ---------- auth ----------
type AuthState = { status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; user: SessionUser };
interface AuthValue {
  state: AuthState;
  user: SessionUser | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth outside provider');
  return v;
}

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = dictionaries[locale];
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    setSessionListener((user) => setState(user ? { status: 'authenticated', user } : { status: 'anonymous' }));
    void refreshSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const user = await authApi.login(email, password);
    setState({ status: 'authenticated', user });
  }, []);

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string }) => {
      const user = await authApi.register({ ...input, locale });
      setState({ status: 'authenticated', user });
    },
    [locale],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ status: 'anonymous' });
  }, []);

  const i18n = useMemo<I18nValue>(
    () => ({
      locale,
      t,
      href: (path) => `/${locale}${path === '/' ? '' : path}`,
      errorMessage: (err) => {
        if (err instanceof ApiError) {
          if (err.code === 'UNAUTHENTICATED' && err.message === 'Invalid email or password') return t.errors.INVALID_LOGIN;
          if (err.code === 'VALIDATION_ERROR' && err.details?.length) {
            return err.details.map((d) => (d.path ? `${d.path}: ${d.message}` : d.message)).join(' · ');
          }
          return t.errors[err.code as keyof Dictionary['errors']] ?? err.message;
        }
        return t.common.error;
      },
    }),
    [locale, t],
  );

  const user = state.status === 'authenticated' ? state.user : null;
  const auth = useMemo<AuthValue>(
    () => ({
      state,
      user,
      isAdmin: !!user && (user.platformRoles.includes('admin') || user.platformRoles.includes('super_admin')),
      login,
      register,
      logout,
    }),
    [state, user, login, register, logout],
  );

  return (
    <I18nContext.Provider value={i18n}>
      <AuthContext.Provider value={auth}>
        <PackageProvider>{children}</PackageProvider>
      </AuthContext.Provider>
    </I18nContext.Provider>
  );
}
