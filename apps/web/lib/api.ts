/** Typed fetch wrapper for the REST API (proxied same-origin via next.config rewrites). */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let onSessionChange: ((user: SessionUser | null) => void) | null = null;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  locale: string;
  platformRoles: string[];
}

export function setSessionListener(fn: (user: SessionUser | null) => void) {
  onSessionChange = fn;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function raw<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (auth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const res = await fetch(`/api/v1${path}`, { ...init, headers, credentials: 'same-origin' });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = body?.error ?? {};
    throw new ApiError(res.status, e.code ?? 'INTERNAL_ERROR', e.message ?? res.statusText, e.details);
  }
  return body as T;
}

/** Exchange the httpOnly refresh cookie for a new access token. Single-flight. */
export function refreshSession(): Promise<boolean> {
  refreshing ??= raw<{ user: SessionUser; accessToken: string }>('/auth/refresh', { method: 'POST' }, false)
    .then((r) => {
      accessToken = r.accessToken;
      onSessionChange?.(r.user);
      return true;
    })
    .catch(() => {
      accessToken = null;
      onSessionChange?.(null);
      return false;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await raw<T>(path, init);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && (await refreshSession())) {
      return raw<T>(path, init);
    }
    throw err;
  }
}

export const authApi = {
  async login(email: string, password: string) {
    const r = await raw<{ user: SessionUser; accessToken: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      false,
    );
    accessToken = r.accessToken;
    return r.user;
  },
  async register(input: { name: string; email: string; password: string; phone?: string; locale?: string }) {
    const r = await raw<{ user: SessionUser; accessToken: string }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(input) },
      false,
    );
    accessToken = r.accessToken;
    return r.user;
  },
  async logout() {
    await raw('/auth/logout', { method: 'POST' }, false).catch(() => undefined);
    accessToken = null;
  },
};
