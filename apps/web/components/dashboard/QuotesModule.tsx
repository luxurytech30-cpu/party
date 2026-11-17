'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { OfferTimeline } from '@/components/OfferTimeline';
import { Alert, Badge, Button, Card, Field, Input, PageLoader, Textarea, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { useI18n } from '@/lib/providers';
import { quoteTone, type QuoteOffer, type QuoteRequest, type QuoteStatus } from '@/lib/types';

const FILTERS: (QuoteStatus | 'all')[] = ['open', 'countered', 'offered', 'agreed', 'all'];

export function QuotesModule({ businessId, initialQuoteId }: { businessId: string; initialQuoteId?: string | null }) {
  const { t, locale, errorMessage } = useI18n();
  const [filter, setFilter] = useState<QuoteStatus | 'all'>('all');
  const [items, setItems] = useState<QuoteRequest[] | null>(null);
  const [selected, setSelected] = useState<string | null>(initialQuoteId ?? null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ items: QuoteRequest[] }>(`/businesses/${businessId}/quotes${filter === 'all' ? '' : `?status=${filter}`}`)
      .then((r) => setItems(r.items))
      .catch((e) => setError(errorMessage(e)));
  }, [businessId, filter, errorMessage]);
  useEffect(load, [load]);

  if (selected) return <QuoteDetail businessId={businessId} quoteId={selected} onBack={() => { setSelected(null); load(); }} />;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">{t.q.incoming}</h2>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setItems(null); setFilter(f); }}
            className={cx('shrink-0 rounded-full px-4 py-2 text-sm font-medium ring-1', filter === f ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white ring-ink-300')}
          >
            {f === 'all' ? t.bk.all : t.qstatus[f]}
          </button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      {!items ? (
        <PageLoader label={t.common.loading} />
      ) : items.length === 0 ? (
        <Card className="py-12 text-center text-ink-500">{t.bk.bizEmpty}</Card>
      ) : (
        items.map((q) => (
          <button key={q._id} className="block w-full text-start" onClick={() => setSelected(q._id)}>
            <Card className="space-y-1 transition hover:ring-brand-200">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{q.customer?.name}</strong>
                <Badge tone={quoteTone[q.status]}>{t.qstatus[q.status]}</Badge>
                {q.eventDate && <span className="text-xs text-ink-500">📅 {formatDate(q.eventDate, locale)}</span>}
                {q.agreedPrice !== undefined && <span className="ms-auto font-bold text-brand-700">{formatMoney(q.agreedPrice, locale)}</span>}
              </div>
              <p className="line-clamp-2 text-sm text-ink-700">{q.requirements}</p>
            </Card>
          </button>
        ))
      )}
    </div>
  );
}

function QuoteDetail({ businessId, quoteId, onBack }: { businessId: string; quoteId: string; onBack: () => void }) {
  const { t, locale, errorMessage } = useI18n();
  const [data, setData] = useState<{ quote: QuoteRequest; offers: QuoteOffer[] } | null>(null);
  const [customer, setCustomer] = useState<QuoteRequest['customer'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const base = `/businesses/${businessId}/quotes/${quoteId}`;

  useEffect(() => {
    api<{ quote: QuoteRequest; offers: QuoteOffer[] }>(base).then(setData).catch((e) => setError(errorMessage(e)));
    api<{ items: QuoteRequest[] }>(`/businesses/${businessId}/quotes`)
      .then((r) => setCustomer(r.items.find((q) => q._id === quoteId)?.customer ?? null))
      .catch(() => undefined);
  }, [base, businessId, quoteId, errorMessage]);

  async function run(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      setData(await api(`${base}/${path}`, { method: 'POST', body: JSON.stringify(body ?? {}) }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function onOffer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const terms = String(f.get('terms') ?? '').trim();
    void run('offers', { price: Number(f.get('price')), ...(terms ? { terms } : {}) }).then(() => form.reset());
  }

  if (!data) return error ? <Alert>{error}</Alert> : <PageLoader label={t.common.loading} />;
  const q = data.quote;
  const open = ['open', 'offered', 'countered'].includes(q.status);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-semibold text-brand-700">
        → {t.common.back}
      </button>
      <Card className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-base">{customer?.name}</strong>
          <Badge tone={quoteTone[q.status]}>{t.qstatus[q.status]}</Badge>
        </div>
        {customer && (
          <p dir="ltr" className="text-start text-brand-700">
            {customer.phone && <a href={`tel:${customer.phone}`} className="me-3">{customer.phone}</a>}
            <a href={`mailto:${customer.email}`}>{customer.email}</a>
          </p>
        )}
        <p className="whitespace-pre-line">{q.requirements}</p>
        <p className="text-ink-500">
          {q.eventDate && `📅 ${formatDate(q.eventDate, locale)} · `}
          {q.guestCount && `${t.q.guests}: ${q.guestCount} · `}
          {q.budget !== undefined && `${t.q.budgetLabel}: ${formatMoney(q.budget, locale)}`}
        </p>
      </Card>
      {error && <Alert>{error}</Alert>}
      <OfferTimeline offers={data.offers} viewer="business" currentOfferId={q.currentOfferId} canRespond={open} busy={busy} onRespond={(offerId, action) => void run('respond', { offerId, action })} />
      {open && (
        <Card>
          <form onSubmit={onOffer} className="space-y-3">
            <h3 className="font-semibold">{data.offers.length ? t.q.newOffer : t.q.sendOffer}</h3>
            <Field label={t.q.price}>
              <Input name="price" type="number" min={0} required dir="ltr" />
            </Field>
            <Field label={t.q.terms}>
              <Textarea name="terms" maxLength={3000} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={busy}>
                {t.q.sendOffer}
              </Button>
              <Button type="button" variant="danger" disabled={busy} onClick={() => void run('reject')}>
                {t.q.declineRequest}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
