'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { EVENT_TYPES } from '@party/shared';
import { Alert, Button, Card, Field, Input, PageLoader } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatMoney, todayStr } from '@/lib/format';
import { useI18n } from '@/lib/providers';
import type { CustomerEvent, EventDetail } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function EventsPage() {
  const { t, href, locale, errorMessage } = useI18n();
  const auth = useRequireAuth();
  const router = useRouter();
  const [items, setItems] = useState<CustomerEvent[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    api<{ items: CustomerEvent[] }>('/events')
      .then((r) => {
        setItems(r.items);
        if (r.items.length === 0) setShowForm(true);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [auth.status, errorMessage]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? '').trim();
    setLoading(true);
    setError(null);
    try {
      const r = await api<EventDetail>('/events', {
        method: 'POST',
        body: JSON.stringify({
          type: s('type'),
          title: s('title'),
          ...(s('date') ? { date: s('date') } : {}),
          ...(s('city') ? { city: s('city') } : {}),
          ...(s('guestCount') ? { guestCount: Number(s('guestCount')) } : {}),
          ...(s('budget') ? { budget: Number(s('budget')) } : {}),
        }),
      });
      router.push(href(`/events/${r.event._id}`));
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  if (!items) return error ? <Alert>{error}</Alert> : <PageLoader label={t.common.loading} />;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t.ev.title}</h1>
        {!showForm && <Button onClick={() => setShowForm(true)}>+ {t.ev.create}</Button>}
      </div>
      {error && <Alert>{error}</Alert>}
      {showForm && (
        <Card className="space-y-4">
          {items.length === 0 && <p className="text-ink-500">{t.ev.empty}</p>}
          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t.ev.type}>
              <select name="type" defaultValue="wedding" className="h-11 w-full rounded-xl border border-white/70 bg-white/70 backdrop-blur px-3 text-sm">
                {EVENT_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {t.ev.types[ty]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.ev.name}>
              <Input name="title" required maxLength={120} />
            </Field>
            <Field label={t.ev.date}>
              <Input name="date" type="date" min={todayStr()} />
            </Field>
            <Field label={t.ev.city}>
              <Input name="city" maxLength={80} />
            </Field>
            <Field label={t.ev.guests}>
              <Input name="guestCount" type="number" min={1} dir="ltr" />
            </Field>
            <Field label={t.ev.budget}>
              <Input name="budget" type="number" min={0} dir="ltr" />
            </Field>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <Button type="submit" loading={loading}>
                {t.ev.create}
              </Button>
              {items.length > 0 && (
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  {t.common.cancel}
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((e) => (
          <Link key={e._id} href={href(`/events/${e._id}`)}>
            <Card className="space-y-1 transition hover:ring-brand-200">
              <p className="text-xs font-semibold text-brand-700">{t.ev.types[e.type as keyof typeof t.ev.types]}</p>
              <h2 className="text-lg font-bold">{e.title}</h2>
              <p className="text-sm text-ink-500">
                {e.date && `📅 ${formatDate(e.date, locale)}`} {e.city && ` · 📍 ${e.city}`}
                {e.budget !== undefined && ` · ${formatMoney(e.budget, locale)}`}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
