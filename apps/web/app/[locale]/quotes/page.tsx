'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { pickLocalized } from '@party/shared';
import { Alert, Badge, Card, PageLoader } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { useI18n } from '@/lib/providers';
import { quoteTone, type QuoteRequest } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function MyQuotesPage() {
  const { t, href, locale, errorMessage } = useI18n();
  const auth = useRequireAuth();
  const [items, setItems] = useState<QuoteRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    api<{ items: QuoteRequest[] }>('/quotes/mine').then((r) => setItems(r.items)).catch((e) => setError(errorMessage(e)));
  }, [auth.status, errorMessage]);

  if (!items) return error ? <Alert>{error}</Alert> : <PageLoader label={t.common.loading} />;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.q.title}</h1>
      {items.length === 0 ? (
        <Card className="py-14 text-center text-ink-500">{t.q.empty}</Card>
      ) : (
        items.map((q) => (
          <Link key={q._id} href={href(`/quotes/${q._id}`)} className="block">
            <Card className="space-y-1 transition hover:ring-brand-200">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{q.business ? pickLocalized(q.business.name, locale) : '—'}</strong>
                <Badge tone={quoteTone[q.status]}>{t.qstatus[q.status]}</Badge>
                {q.agreedPrice !== undefined && <span className="ms-auto font-bold text-brand-700">{formatMoney(q.agreedPrice, locale)}</span>}
              </div>
              <p className="line-clamp-1 text-sm text-ink-700">{q.requirements}</p>
              {q.eventDate && <p className="text-xs text-ink-500">📅 {formatDate(q.eventDate, locale)}</p>}
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
