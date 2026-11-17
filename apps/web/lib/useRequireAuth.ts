'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth, useI18n } from './providers';

/** Client-side redirect for UX only — the API enforces authorization. */
export function useRequireAuth() {
  const { state } = useAuth();
  const { href } = useI18n();
  const router = useRouter();
  useEffect(() => {
    if (state.status === 'anonymous') router.replace(href('/login'));
  }, [state.status, router, href]);
  return state;
}
