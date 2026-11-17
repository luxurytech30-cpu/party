'use client';

import { useEffect, useState } from 'react';
import { Stars } from '@/components/Stars';
import { Card } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/providers';
import type { PublicReview } from '@/lib/types';

export function ReviewsSection({ slug }: { slug: string }) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<{ items: PublicReview[]; rating: { avg: number; count: number } } | null>(null);

  useEffect(() => {
    api<{ items: PublicReview[]; rating: { avg: number; count: number } }>(`/public/businesses/${slug}/reviews`)
      .then(setData)
      .catch(() => undefined);
  }, [slug]);

  if (!data) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">{t.rv.title}</h2>
        {data.rating.count > 0 && (
          <span className="flex items-center gap-1.5 text-sm">
            <Stars value={data.rating.avg} /> <strong>{data.rating.avg}</strong> <span className="text-ink-500">({data.rating.count})</span>
          </span>
        )}
      </div>
      {data.items.length === 0 ? (
        <p className="text-sm text-ink-500">{t.rv.none}</p>
      ) : (
        data.items.map((r) => (
          <Card key={r._id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <strong>{r.author}</strong>
              <Stars value={r.rating} />
              <span className="text-xs text-emerald-700">✓ {t.rv.verified}</span>
              <span className="ms-auto text-xs text-ink-500">{new Date(r.createdAt).toLocaleDateString(locale)}</span>
            </div>
            {r.text && <p className="whitespace-pre-line text-sm text-ink-700">{r.text}</p>}
            {r.reply && (
              <div className="rounded-xl bg-ink-100 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold text-ink-500">{t.rv.businessReply}</p>
                <p className="whitespace-pre-line">{r.reply.text}</p>
              </div>
            )}
          </Card>
        ))
      )}
    </section>
  );
}
