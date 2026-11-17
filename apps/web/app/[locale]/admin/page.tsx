'use client';

import { useCallback, useEffect, useState } from 'react';
import { pickLocalized } from '@party/shared';
import { AdminReviews } from '@/components/AdminReviews';
import { Alert, Badge, Button, Card, PageLoader, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth, useI18n } from '@/lib/providers';
import { statusTone, type Business, type BusinessStatus } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

const FILTERS: (BusinessStatus | 'all')[] = ['pending_review', 'active', 'rejected', 'suspended', 'all'];

export default function AdminPage() {
  const { t, locale, errorMessage } = useI18n();
  const auth = useRequireAuth();
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState<BusinessStatus | 'all'>('pending_review');
  const [items, setItems] = useState<Business[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<'businesses' | 'reviews'>('businesses');

  const load = useCallback(() => {
    setItems(null);
    const q = filter === 'all' ? '' : `?status=${filter}`;
    api<{ items: Business[] }>(`/admin/businesses${q}`)
      .then((r) => setItems(r.items))
      .catch((e) => setError(errorMessage(e)));
  }, [filter, errorMessage]);

  useEffect(() => {
    if (auth.status === 'authenticated' && isAdmin) load();
  }, [auth.status, isAdmin, load]);

  async function setStatus(id: string, status: BusinessStatus) {
    setBusy(id);
    setError(null);
    try {
      await api(`/admin/businesses/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (auth.status !== 'authenticated') return <PageLoader label={t.common.loading} />;
  if (!isAdmin) return <Alert>{t.admin.forbidden}</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {(['businesses', 'reviews'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cx('rounded-xl px-4 py-2 text-lg font-bold', tab === k ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-ink-100')}
          >
            {k === 'businesses' ? t.admin.title : t.rv.moderation}
          </button>
        ))}
      </div>
      {tab === 'reviews' ? (
        <AdminReviews />
      ) : (
      <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cx(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium ring-1 transition',
              filter === f ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-ink-700 ring-ink-300',
            )}
          >
            {f === 'all' ? t.admin.all : t.status[f]}
          </button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      {!items ? (
        <PageLoader label={t.common.loading} />
      ) : items.length === 0 ? (
        <Card className="py-12 text-center text-ink-500">{t.admin.empty}</Card>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <Card key={b._id} className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{pickLocalized(b.name, locale)}</h2>
                  <Badge tone={statusTone[b.status]}>{t.status[b.status]}</Badge>
                </div>
                <p className="text-xs text-ink-500">
                  {b.cities.join('، ')} · {t.admin.created}: {new Date(b.createdAt).toLocaleDateString(locale)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {b.status !== 'active' && (
                  <Button className="h-9" loading={busy === b._id} onClick={() => void setStatus(b._id, 'active')}>
                    {b.status === 'suspended' ? t.admin.reactivate : t.admin.approve}
                  </Button>
                )}
                {b.status === 'pending_review' && (
                  <Button variant="danger" className="h-9" disabled={busy === b._id} onClick={() => void setStatus(b._id, 'rejected')}>
                    {t.admin.reject}
                  </Button>
                )}
                {b.status === 'active' && (
                  <Button variant="danger" className="h-9" disabled={busy === b._id} onClick={() => void setStatus(b._id, 'suspended')}>
                    {t.admin.suspend}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}
