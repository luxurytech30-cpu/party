'use client';

import { img } from '@/lib/img';
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { Alert, Button, Card, PageLoader, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/providers';
import type { MediaItem } from '@/lib/types';

interface SignResponse {
  uploadUrl: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  allowed_formats: string;
  signature: string;
}

const MAX_BYTES = 10 * 1024 * 1024;

export function PortfolioModule({ businessId }: { businessId: string }) {
  const { t, errorMessage } = useI18n();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ items: MediaItem[]; uploadsEnabled: boolean }>(`/businesses/${businessId}/media`)
      .then((r) => {
        setItems(r.items);
        setEnabled(r.uploadsEnabled);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [businessId, errorMessage]);
  useEffect(load, [load]);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    setError(null);
    setUploading(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/') || file.size > MAX_BYTES) {
          setError(`${file.name}: ${t.portfolio.hint}`);
          continue;
        }
        // 1. Server signs params scoped to this business's folder.
        const sig = await api<SignResponse>(`/businesses/${businessId}/media/sign`, { method: 'POST' });
        // 2. Browser uploads directly to Cloudinary.
        const form = new FormData();
        form.append('file', file);
        form.append('api_key', sig.apiKey);
        form.append('timestamp', String(sig.timestamp));
        form.append('folder', sig.folder);
        form.append('allowed_formats', sig.allowed_formats);
        form.append('signature', sig.signature);
        const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
        const up = await res.json();
        if (!res.ok) throw new Error(up?.error?.message ?? 'Upload failed');
        // 3. Server verifies the asset belongs to this business, then records it.
        await api(`/businesses/${businessId}/media`, {
          method: 'POST',
          body: JSON.stringify({ publicId: up.public_id, url: up.secure_url, width: up.width, height: up.height }),
        });
      }
      load();
    } catch (err) {
      setError(err instanceof Error && !('code' in err) ? err.message : errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/businesses/${businessId}/media/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (!items) return error ? <Alert>{error}</Alert> : <PageLoader label={t.common.loading} />;

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{t.modules.portfolio}</h2>
          <p className="text-xs text-ink-500">{t.portfolio.hint}</p>
        </div>
        {enabled && (
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">
            {uploading ? <Spinner /> : '⬆'} {uploading ? t.portfolio.uploading : t.portfolio.upload}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple hidden disabled={uploading} onChange={(e) => void onFiles(e)} />
          </label>
        )}
      </div>
      {!enabled && <Alert tone="info">{t.portfolio.notConfigured}</Alert>}
      {error && <Alert>{error}</Alert>}
      {items.length === 0 ? (
        <p className="py-8 text-center text-ink-500">{t.portfolio.empty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((m) => (
            <div key={m._id} className="group relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img(m.url, 400, 400)} alt="" className="aspect-square w-full object-cover" />
              <Button variant="danger" className="absolute end-2 top-2 h-8 px-3 text-xs opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => void remove(m._id)}>
                {t.offer.delete}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
