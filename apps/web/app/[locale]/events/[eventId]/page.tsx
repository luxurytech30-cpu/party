'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { pickLocalized } from '@party/shared';
import { Alert, Badge, Button, Card, Field, Input, PageLoader, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { useI18n } from '@/lib/providers';
import type { Category, EventDetail, EventItemStatus } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

const statusTone: Record<EventItemStatus, 'neutral' | 'brand' | 'warning' | 'success'> = {
  todo: 'neutral',
  shortlisted: 'brand',
  requested: 'warning',
  booked: 'success',
};

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { t, href, locale, errorMessage } = useI18n();
  const auth = useRequireAuth();
  const router = useRouter();
  const [data, setData] = useState<EventDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<EventDetail>(`/events/${eventId}`).then(setData).catch((e) => setError(errorMessage(e)));
  }, [eventId, errorMessage]);
  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    load();
    api<{ items: Category[] }>('/categories').then((r) => setCategories(r.items)).catch(() => undefined);
  }, [auth.status, load]);

  async function call(path: string, method: string, body?: unknown) {
    setError(null);
    try {
      const r = await api<EventDetail>(`/events/${eventId}${path}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
      if (r) setData(r);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function onAddItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const cost = String(f.get('estimatedCost') ?? '');
    void call('/items', 'POST', { label: String(f.get('label')).trim(), ...(cost ? { estimatedCost: Number(cost) } : {}) }).then(() => form.reset());
  }

  async function deleteEvent() {
    if (!confirm(t.ev.confirmDelete)) return;
    await api(`/events/${eventId}`, { method: 'DELETE' });
    router.push(href('/events'));
  }

  if (!data) return error ? <Alert>{error}</Alert> : <PageLoader label={t.common.loading} />;
  const { event: ev, summary } = data;
  const catOf = (id?: string) => categories.find((c) => c._id === id);
  const progress = summary.total ? Math.round((summary.booked / summary.total) * 100) : 0;
  const over = summary.remaining !== null && summary.remaining < 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-700">{t.ev.types[ev.type as keyof typeof t.ev.types]}</p>
          <h1 className="text-2xl font-bold">{ev.title}</h1>
          <p className="text-sm text-ink-500">
            {ev.date && `📅 ${formatDate(ev.date, locale)}`} {ev.city && ` · 📍 ${ev.city}`} {ev.guestCount && ` · 👥 ${ev.guestCount}`}
          </p>
        </div>
        <Button variant="danger" className="h-9" onClick={() => void deleteEvent()}>
          {t.ev.deleteEvent}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-ink-500">{t.ev.estimated}</p>
          <p className="text-2xl font-bold">{formatMoney(summary.estimatedTotal, locale)}</p>
          {summary.budget !== null && (
            <p className="text-xs text-ink-500">
              / {formatMoney(summary.budget, locale)}
            </p>
          )}
        </Card>
        <Card>
          <p className="text-xs text-ink-500">{over ? t.ev.over : t.ev.remaining}</p>
          <p className={cx('text-2xl font-bold', over ? 'text-red-600' : 'text-emerald-700')}>
            {summary.remaining === null ? '—' : formatMoney(Math.abs(summary.remaining), locale)}
          </p>
        </Card>
        <Card className="space-y-2">
          <p className="text-xs text-ink-500">
            {summary.booked}/{summary.total} {t.ev.progress}
          </p>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </Card>
      </div>
      <p className="text-xs text-ink-500">{t.ev.statusNote}</p>
      {error && <Alert>{error}</Alert>}

      <div className="space-y-3">
        {ev.items.map((item) => {
          const cat = catOf(item.categoryId);
          return (
            <Card key={item._id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xl">{cat?.icon ?? '•'}</span>
                <h2 className="font-bold">{cat ? pickLocalized(cat.name, locale) : item.label}</h2>
                <Badge tone={statusTone[item.status]}>{t.ev.status[item.status]}</Badge>
                {item.estimate !== null && <span className="text-sm text-ink-500">≈ {formatMoney(item.estimate, locale)}</span>}
                <div className="ms-auto flex gap-2">
                  <Link
                    href={href(`/search${cat ? `?category=${cat.slug}` : ''}${ev.date ? `${cat ? '&' : '?'}date=${ev.date}` : ''}`)}
                    className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100"
                  >
                    🔍 {t.ev.findVendors}
                  </Link>
                  <button onClick={() => void call(`/items/${item._id}`, 'DELETE')} className="rounded-full px-2 py-1.5 text-xs text-ink-500 hover:bg-ink-100">
                    ✕
                  </button>
                </div>
              </div>
              {item.candidates.length > 0 && (
                <ul className="space-y-1.5">
                  {item.candidates.map((c) => (
                    <li key={`${c.businessId}:${c.offeringId ?? ''}`} className="flex items-center gap-2 rounded-xl bg-ink-100/60 px-3 py-2 text-sm">
                      {c.business ? (
                        <Link href={href(`/b/${c.business.slug}`)} className="font-medium hover:text-brand-700">
                          {pickLocalized(c.business.name, locale)}
                        </Link>
                      ) : (
                        '—'
                      )}
                      {c.note && <span className="text-xs text-ink-500">{c.note}</span>}
                      {(c.estimatedPrice ?? c.business?.startingPrice) !== undefined && (
                        <span className="text-ink-500">{formatMoney((c.estimatedPrice ?? c.business?.startingPrice)!, locale)}</span>
                      )}
                      <button onClick={() => void call(`/items/${item._id}/candidates/${c.businessId}${c.offeringId ? `?offeringId=${c.offeringId}` : ''}`, 'DELETE')} className="ms-auto text-xs text-ink-500 hover:text-red-600">
                        {t.ev.remove}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <form onSubmit={onAddItem} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label={t.ev.itemLabel}>
              <Input name="label" required maxLength={120} />
            </Field>
          </div>
          <Field label={t.ev.estimate}>
            <Input name="estimatedCost" type="number" min={0} dir="ltr" />
          </Field>
          <Button type="submit">+ {t.ev.addItem}</Button>
        </form>
      </Card>
    </div>
  );
}
