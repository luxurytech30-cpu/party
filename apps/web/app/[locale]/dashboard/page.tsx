'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { pickLocalized, type BusinessRole } from '@party/shared';
import { Alert, Badge, ButtonLink, Card, PageLoader } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/providers';
import { statusTone, type Business } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

interface Item {
  role: BusinessRole;
  business: Pick<Business, '_id' | 'slug' | 'name' | 'status'>;
}

export default function DashboardPage() {
  const { t, href, locale, errorMessage } = useI18n();
  const auth = useRequireAuth();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    api<{ items: Item[] }>('/me/businesses')
      .then((r) => setItems(r.items))
      .catch((e) => setError(errorMessage(e)));
  }, [auth.status, errorMessage]);

  if (error) return <Alert>{error}</Alert>;
  if (!items) return <PageLoader label={t.common.loading} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t.dash.title}</h1>
        <ButtonLink href={href('/dashboard/new')}>+ {t.dash.create}</ButtonLink>
      </div>

      {items.length === 0 ? (
        <Card className="py-14 text-center">
          <p className="mb-5 text-ink-500">{t.dash.empty}</p>
          <ButtonLink href={href('/dashboard/new')}>{t.dash.create}</ButtonLink>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(({ business: b, role }) => (
            <Link key={b._id} href={href(`/dashboard/${b._id}`)} className="block">
              <Card className="transition hover:ring-brand-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold">{pickLocalized(b.name, locale)}</h2>
                    <p className="text-sm text-ink-500">
                      {t.dash.role}: {t.roles[role]}
                    </p>
                  </div>
                  <Badge tone={statusTone[b.status]}>{t.status[b.status]}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
