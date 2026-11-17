'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import { useAuth, useI18n } from '@/lib/providers';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { t, href, errorMessage } = useI18n();
  const { login, register } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null);
    setLoading(true);
    try {
      const email = String(f.get('email'));
      const password = String(f.get('password'));
      if (mode === 'login') await login(email, password);
      else {
        const phone = String(f.get('phone') ?? '').replace(/[\s-]/g, '');
        await register({ name: String(f.get('name')), email, password, ...(phone ? { phone } : {}) });
      }
      router.push(href('/dashboard'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-6">
        <h1 className="text-2xl font-bold">{mode === 'login' ? t.auth.loginTitle : t.auth.registerTitle}</h1>
        {error && <Alert>{error}</Alert>}
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'register' && (
            <Field label={t.auth.name}>
              <Input name="name" required minLength={2} maxLength={80} autoComplete="name" />
            </Field>
          )}
          <Field label={t.auth.email}>
            <Input name="email" type="email" required autoComplete="email" dir="ltr" />
          </Field>
          {mode === 'register' && (
            <Field label={t.auth.phone}>
              <Input name="phone" type="tel" autoComplete="tel" dir="ltr" placeholder="05X-XXXXXXX" />
            </Field>
          )}
          <Field label={t.auth.password} hint={mode === 'register' ? t.auth.passwordHint : undefined}>
            <Input
              name="password"
              type="password"
              required
              minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              dir="ltr"
            />
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            {mode === 'login' ? t.auth.submitLogin : t.auth.submitRegister}
          </Button>
        </form>
        <p className="text-center text-sm text-ink-500">
          {mode === 'login' ? t.auth.noAccount : t.auth.haveAccount}{' '}
          <Link href={href(mode === 'login' ? '/register' : '/login')} className="font-semibold text-brand-700 hover:underline">
            {mode === 'login' ? t.nav.register : t.nav.login}
          </Link>
        </p>
      </Card>
    </div>
  );
}
