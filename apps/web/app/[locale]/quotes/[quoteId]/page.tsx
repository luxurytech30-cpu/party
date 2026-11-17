'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { pickLocalized } from '@party/shared';
import { OfferTimeline } from '@/components/OfferTimeline';
import { Alert, Badge, Button, Card, Field, Input, PageLoader, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatMoney, todayStr } from '@/lib/format';
import { useI18n } from '@/lib/providers';
import { quoteTone, type QuoteOffer, type QuoteRequest } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

interface Detail {
  quote: QuoteRequest;
  offers: QuoteOffer[];
  business: { _id: string; slug: string; name: Record<string, string> } | null;
  canCounter: boolean;
}

export default function QuoteDetailPage() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const { t, href, locale, errorMessage } = useI18n();
  const auth = useRequireAuth();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCounter, setShowCounter] = useState(false);
  const [bookedMsg, setBookedMsg] = useState(false);

  const load = useCallback(() => {
    api<Detail>(`/quotes/${quoteId}`).then(setData).catch((e) => setError(errorMessage(e)));
  }, [quoteId, errorMessage]);
  useEffect(() => {
    if (auth.status === 'authenticated') load();
  }, [auth.status, load]);

  async function run(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const r = await api<Detail | { booking: unknown }>(`/quotes/${quoteId}/${path}`, { method: 'POST', body: JSON.stringify(body ?? {}) });
      if ('quote' in r) setData((d) => (d ? { ...d, ...r } : d));
      else {
        setBookedMsg(true);
        load();
      }
      setShowCounter(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function onCounter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const terms = String(f.get('terms') ?? '').trim();
    void run('counter', { price: Number(f.get('price')), ...(terms ? { terms } : {}) });
  }

  function onBook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const date = String(new FormData(e.currentTarget).get('date') ?? '');
    void run('book', date ? { date } : {});
  }

  if (!data) return error ? <Alert>{error}</Alert> : <PageLoader label={t.common.loading} />;
  const { quote: q, offers, business } = data;
  const open = ['open', 'offered', 'countered'].includes(q.status);
  const current = offers.find((o) => o._id === q.currentOfferId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">
          {business ? (
            <Link href={href(`/b/${business.slug}`)} className="hover:text-brand-700">
              {pickLocalized(business.name, locale)}
            </Link>
          ) : (
            t.q.title
          )}
        </h1>
        <Badge tone={quoteTone[q.status]}>{t.qstatus[q.status]}</Badge>
      </div>

      <Card className="space-y-2 text-sm">
        <p className="whitespace-pre-line">{q.requirements}</p>
        <p className="text-ink-500">
          {q.eventDate && `📅 ${formatDate(q.eventDate, locale)} · `}
          {q.guestCount && `👥 ${q.guestCount} · `}
          {q.budget !== undefined && `${t.q.budgetLabel}: ${formatMoney(q.budget, locale)}`}
        </p>
      </Card>

      {error && <Alert>{error}</Alert>}
      {bookedMsg && (
        <Alert tone="success">
          {t.q.booked}{' '}
          <Link className="font-semibold underline" href={href('/bookings')}>
            {t.links.bookings}
          </Link>
        </Alert>
      )}

      <section className="space-y-3">
        <h2 className="font-bold">{t.q.offers}</h2>
        <OfferTimeline offers={offers} viewer="customer" currentOfferId={q.currentOfferId} canRespond={open} busy={busy} onRespond={(offerId, action) => void run('respond', { offerId, action })} />
      </section>

      {open && current?.fromSide === 'business' && (
        <Card className="space-y-3">
          {!data.canCounter ? (
            <p className="text-sm text-ink-500">{t.q.noNegotiation}</p>
          ) : !showCounter ? (
            <Button variant="secondary" onClick={() => setShowCounter(true)}>
              {t.q.counter}
            </Button>
          ) : (
            <form onSubmit={onCounter} className="space-y-3">
              <Field label={t.q.yourPrice}>
                <Input name="price" type="number" min={0} required dir="ltr" />
              </Field>
              <Field label={t.q.terms}>
                <Textarea name="terms" maxLength={3000} />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" loading={busy}>
                  {t.q.sendCounter}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowCounter(false)}>
                  {t.common.cancel}
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {q.status === 'agreed' && q.agreedPrice !== undefined && (
        <Card className="space-y-3">
          <Alert tone="info">{t.q.agreedNote.replace('{price}', formatMoney(q.agreedPrice, locale))}</Alert>
          <form onSubmit={onBook} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label={t.q.bookDate}>
                <Input name="date" type="date" required min={todayStr()} defaultValue={q.eventDate} />
              </Field>
            </div>
            <Button type="submit" loading={busy}>
              {t.q.bookNow}
            </Button>
          </form>
        </Card>
      )}

      {open && (
        <Button variant="danger" disabled={busy} onClick={() => void run('cancel')}>
          {t.q.cancel}
        </Button>
      )}
    </div>
  );
}
