'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { pickLocalized } from '@party/shared';
import { Alert, Badge, Button, Card, Field, Input, PageLoader, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatMoney, todayStr } from '@/lib/format';
import { useI18n } from '@/lib/providers';
import { bookingTone, type BookingStatus, type BusinessBooking } from '@/lib/types';

const FILTERS: (BookingStatus | 'all')[] = ['requested', 'confirmed', 'all'];

export function BookingsModule({ businessId, canManage }: { businessId: string; canManage: boolean }) {
  const { t, locale, errorMessage } = useI18n();
  const [filter, setFilter] = useState<BookingStatus | 'all'>('requested');
  const [items, setItems] = useState<BusinessBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  const load = useCallback(() => {
    api<{ items: BusinessBooking[] }>(`/businesses/${businessId}/bookings${filter === 'all' ? '' : `?status=${filter}`}`)
      .then((r) => setItems(r.items))
      .catch((e) => setError(errorMessage(e)));
  }, [businessId, filter, errorMessage]);
  useEffect(load, [load]);

  async function act(id: string, action: 'confirm' | 'decline' | 'cancel' | 'complete') {
    setBusy(id);
    setError(null);
    try {
      await api(`/businesses/${businessId}/bookings/${id}/${action}`, { method: 'POST' });
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function onManual(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? '').trim();
    setError(null);
    try {
      await api(`/businesses/${businessId}/bookings`, {
        method: 'POST',
        body: JSON.stringify({
          date: s('date'),
          customerName: s('customerName'),
          ...(s('customerPhone') ? { customerPhone: s('customerPhone') } : {}),
          ...(s('agreedPrice') ? { agreedPrice: Number(s('agreedPrice')) } : {}),
        }),
      });
      setShowManual(false);
      setFilter('confirmed');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{t.bk.incoming}</h2>
        {canManage && (
          <Button variant="secondary" onClick={() => setShowManual((v) => !v)}>
            + {t.bk.manualTitle}
          </Button>
        )}
      </div>

      {showManual && (
        <Card>
          <form onSubmit={onManual} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            <Field label={t.search.date}>
              <Input name="date" type="date" required min={todayStr()} />
            </Field>
            <Field label={t.bk.customerName}>
              <Input name="customerName" required maxLength={120} />
            </Field>
            <Field label={t.bk.customerPhone}>
              <Input name="customerPhone" type="tel" dir="ltr" maxLength={20} />
            </Field>
            <Field label={t.bk.agreedPrice}>
              <Input name="agreedPrice" type="number" min={0} dir="ltr" />
            </Field>
            <Button type="submit">{t.bk.add}</Button>
          </form>
        </Card>
      )}

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setItems(null);
              setFilter(f);
            }}
            className={cx('rounded-full px-4 py-2 text-sm font-medium ring-1', filter === f ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white ring-ink-300')}
          >
            {f === 'all' ? t.bk.all : t.bstatus[f]}
          </button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      {!items ? (
        <PageLoader label={t.common.loading} />
      ) : items.length === 0 ? (
        <Card className="py-12 text-center text-ink-500">{t.bk.bizEmpty}</Card>
      ) : (
        items.map((b) => (
          <Card key={b._id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">📅 {formatDate(b.date, locale)}</span>
              <Badge tone={bookingTone[b.status]}>{t.bstatus[b.status]}</Badge>
              {b.source === 'manual' && <Badge>{t.bk.manual}</Badge>}
            </div>
            <div className="grid gap-1 text-sm text-ink-700 sm:grid-cols-2">
              <p>
                👤 {b.customer.name}
                {b.customer.phone && (
                  <a href={`tel:${b.customer.phone}`} dir="ltr" className="ms-2 text-brand-700">
                    {b.customer.phone}
                  </a>
                )}
                {b.customer.email && (
                  <a href={`mailto:${b.customer.email}`} dir="ltr" className="ms-2 text-brand-700">
                    {b.customer.email}
                  </a>
                )}
              </p>
              <p>
                {b.offering && pickLocalized(b.offering.title, locale)}
                {b.guestCount && ` · ${b.guestCount} ${t.bk.guests}`}
                {b.agreedPrice !== undefined && ` · ${formatMoney(b.agreedPrice, locale)}`}
              </p>
              {b.note && <p className="sm:col-span-2 rounded-lg bg-ink-100 px-3 py-2">💬 {b.note}</p>}
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-2">
                {b.status === 'requested' && (
                  <>
                    <Button className="h-9" loading={busy === b._id} onClick={() => void act(b._id, 'confirm')}>
                      {t.bk.confirm}
                    </Button>
                    <Button variant="danger" className="h-9" disabled={busy === b._id} onClick={() => void act(b._id, 'decline')}>
                      {t.bk.decline}
                    </Button>
                  </>
                )}
                {b.status === 'confirmed' && (
                  <>
                    {b.date < todayStr() && (
                      <Button variant="secondary" className="h-9" disabled={busy === b._id} onClick={() => void act(b._id, 'complete')}>
                        {t.bk.complete}
                      </Button>
                    )}
                    <Button variant="danger" className="h-9" disabled={busy === b._id} onClick={() => void act(b._id, 'cancel')}>
                      {t.bk.cancelBiz}
                    </Button>
                  </>
                )}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
