'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Stars } from '@/components/Stars';
import { Alert, Button, Card, PageLoader, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/providers';
import type { PublicReview } from '@/lib/types';

export function ReviewsModule({ businessId, canReply }: { businessId: string; canReply: boolean }) {
  const { t, locale, errorMessage } = useI18n();
  const [items, setItems] = useState<PublicReview[] | null>(null);
  const [replying, setReplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ items: PublicReview[] }>(`/businesses/${businessId}/reviews`).then((r) => setItems(r.items)).catch((e) => setError(errorMessage(e)));
  }, [businessId, errorMessage]);
  useEffect(load, [load]);

  async function onReply(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const text = String(new FormData(e.currentTarget).get('text') ?? '').trim();
    try {
      await api(`/businesses/${businessId}/reviews/${id}/reply`, { method: 'POST', body: JSON.stringify({ text }) });
      setReplying(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!items) return error ? <Alert>{error}</Alert> : <PageLoader label={t.common.loading} />;
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">{t.rv.title}</h2>
      {error && <Alert>{error}</Alert>}
      {items.length === 0 ? (
        <Card className="py-12 text-center text-ink-500">{t.rv.none}</Card>
      ) : (
        items.map((r) => (
          <Card key={r._id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <strong>{r.author}</strong>
              <Stars value={r.rating} />
              <span className="ms-auto text-xs text-ink-500">{new Date(r.createdAt).toLocaleDateString(locale)}</span>
            </div>
            {r.text && <p className="whitespace-pre-line text-sm">{r.text}</p>}
            {r.reply && (
              <div className="rounded-xl bg-ink-100 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold text-ink-500">{t.rv.businessReply}</p>
                {r.reply.text}
              </div>
            )}
            {canReply &&
              (replying === r._id ? (
                <form onSubmit={(e) => void onReply(e, r._id)} className="space-y-2">
                  <Textarea name="text" required maxLength={2000} defaultValue={r.reply?.text} />
                  <div className="flex gap-2">
                    <Button type="submit" className="h-9">{t.rv.sendReply}</Button>
                    <Button type="button" variant="ghost" className="h-9" onClick={() => setReplying(null)}>{t.common.cancel}</Button>
                  </div>
                </form>
              ) : (
                <Button variant="secondary" className="h-9" onClick={() => setReplying(r._id)}>
                  {t.rv.reply}
                </Button>
              ))}
          </Card>
        ))
      )}
    </div>
  );
}
