'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { pickLocalized } from '@party/shared';
import { StarInput } from '@/components/Stars';
import { Alert, Badge, Button, Card, PageLoader, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useI18n } from '@/lib/providers';
import { bookingTone, type CustomerBooking } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function MyBookingsPage() {
  const { t, href, locale, errorMessage } = useI18n();
  const auth = useRequireAuth();
  const [items, setItems] = useState<CustomerBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [thanks, setThanks] = useState(false);

  async function submitReview(bookingId: string, text: string) {
    try {
      await api('/reviews', { method: 'POST', body: JSON.stringify({ bookingId, rating, ...(text ? { text } : {}) }) });
      setReviewing(null);
      setThanks(true);
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const load = useCallback(() => {
    api<{ items: CustomerBooking[] }>('/bookings/mine')
      .then((r) => setItems(r.items))
      .catch((e) => setError(errorMessage(e)));
  }, [errorMessage]);
  useEffect(() => {
    if (auth.status === 'authenticated') load();
  }, [auth.status, load]);

  async function cancel(id: string) {
    if (!confirm(t.bk.confirmCancel)) return;
    try {
      await api(`/bookings/${id}/cancel`, { method: 'POST' });
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (!items) return error ? <Alert>{error}</Alert> : <PageLoader label={t.common.loading} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.bk.title}</h1>
      {error && <Alert>{error}</Alert>}
      {thanks && <Alert tone="success">{t.rv.thanks}</Alert>}
      {items.length === 0 ? (
        <Card className="py-14 text-center text-ink-500">{t.bk.empty}</Card>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <Card key={b._id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {b.business ? (
                    <Link href={href(`/b/${b.business.slug}`)} className="font-bold hover:text-brand-700">
                      {pickLocalized(b.business.name, locale)}
                    </Link>
                  ) : (
                    <span className="font-bold">—</span>
                  )}
                  <Badge tone={bookingTone[b.status]}>{t.bstatus[b.status]}</Badge>
                </div>
                <p className="text-sm text-ink-700">
                  📅 {formatDate(b.date, locale)}
                  {b.offering && ` · ${pickLocalized(b.offering.title, locale)}`}
                  {b.guestCount && ` · ${b.guestCount} ${t.bk.guests}`}
                </p>
              </div>
              {b.status === 'completed' && !b.reviewed && reviewing !== b._id && (
                <Button variant="secondary" className="h-9" onClick={() => { setRating(5); setReviewing(b._id); }}>
                  ★ {t.rv.write}
                </Button>
              )}
              {reviewing === b._id && (
                <form
                  className="w-full space-y-2 sm:w-80"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitReview(b._id, String(new FormData(e.currentTarget).get('text') ?? '').trim());
                  }}
                >
                  <StarInput value={rating} onChange={setRating} />
                  <Textarea name="text" placeholder={t.rv.text} maxLength={2000} />
                  <div className="flex gap-2">
                    <Button type="submit" className="h-9">{t.rv.submit}</Button>
                    <Button type="button" variant="ghost" className="h-9" onClick={() => setReviewing(null)}>{t.common.cancel}</Button>
                  </div>
                </form>
              )}
              {(b.status === 'requested' || b.status === 'confirmed') && (
                <Button variant="danger" className="h-9" onClick={() => void cancel(b._id)}>
                  {t.bk.cancel}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
