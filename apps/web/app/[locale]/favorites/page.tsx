'use client';

import { useEffect, useState } from 'react';
import { BusinessCard } from '@/components/BusinessCard';
import { Alert, Card, PageLoader } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/providers';
import type { Category, PublicBusinessCard } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

export default function FavoritesPage() {
  const { t, errorMessage } = useI18n();
  const auth = useRequireAuth();
  const [items, setItems] = useState<PublicBusinessCard[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    api<{ items: PublicBusinessCard[] }>('/me/favorites')
      .then((r) => setItems(r.items.map((b) => ({ ...b, categoryIds: b.categoryIds ?? [] }))))
      .catch((e) => setError(errorMessage(e)));
    api<{ items: Category[] }>('/categories').then((r) => setCategories(r.items)).catch(() => undefined);
  }, [auth.status, errorMessage]);

  if (!items) return error ? <Alert>{error}</Alert> : <PageLoader label={t.common.loading} />;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t.fav.title}</h1>
      {items.length === 0 ? (
        <Card className="py-14 text-center text-ink-500">{t.fav.empty}</Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => (
            <BusinessCard key={b._id} b={b} categories={categories} />
          ))}
        </div>
      )}
    </div>
  );
}
