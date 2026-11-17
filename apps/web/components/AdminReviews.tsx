'use client';

import { useCallback, useEffect, useState } from 'react';
import { pickLocalized, type LocalizedText } from '@party/shared';
import { Stars } from './Stars';
import { Alert, Badge, Button, Card, PageLoader } from './ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/providers';

interface AdminReview {
  _id: string;
  rating: number;
  text?: string;
  status: 'published' | 'hidden';
  createdAt: string;
  business: { slug: string; name: LocalizedText } | null;
}

export function AdminReviews() {
  const { t, locale, errorMessage } = useI18n();
  const [items, setItems] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ items: AdminReview[] }>('/admin/reviews').then((r) => setItems(r.items)).catch((e) => setError(errorMessage(e)));
  }, [errorMessage]);
  useEffect(load, [load]);

  async function setStatus(id: string, status: 'published' | 'hidden') {
    try {
      await api(`/admin/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (!items) return error ? <Alert>{error}</Alert> : <PageLoader label={t.common.loading} />;
  return (
    <div className="space-y-3">
      {error && <Alert>{error}</Alert>}
      {items.length === 0 && <Card className="py-12 text-center text-ink-500">{t.rv.none}</Card>}
      {items.map((r) => (
        <Card key={r._id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <strong>{r.business ? pickLocalized(r.business.name, locale) : '—'}</strong>
              <Stars value={r.rating} />
              <Badge tone={r.status === 'published' ? 'success' : 'neutral'}>{r.status === 'published' ? t.rv.show : t.rv.hide}</Badge>
            </div>
            {r.text && <p className="text-sm text-ink-700">{r.text}</p>}
          </div>
          {r.status === 'published' ? (
            <Button variant="danger" className="h-9" onClick={() => void setStatus(r._id, 'hidden')}>{t.rv.hide}</Button>
          ) : (
            <Button variant="secondary" className="h-9" onClick={() => void setStatus(r._id, 'published')}>{t.rv.show}</Button>
          )}
        </Card>
      ))}
    </div>
  );
}
