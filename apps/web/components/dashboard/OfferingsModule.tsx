'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { pickLocalized } from '@party/shared';
import { Alert, Badge, Button, Card, Field, Input, PageLoader, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { formatPricing } from '@/lib/format';
import { useI18n } from '@/lib/providers';
import type { Offering, OfferingKind, PricingModel } from '@/lib/types';

const MODELS: PricingModel[] = ['fixed', 'starting_from', 'range', 'hourly', 'per_person', 'package', 'quote_only'];

/** One generic module for services, packages and products — no per-category code. */
export function OfferingsModule({ businessId, kind }: { businessId: string; kind: OfferingKind }) {
  const { t, locale, errorMessage } = useI18n();
  const [items, setItems] = useState<Offering[] | null>(null);
  const [editing, setEditing] = useState<Offering | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ items: Offering[] }>(`/businesses/${businessId}/offerings?kind=${kind}`)
      .then((r) => setItems(r.items))
      .catch((e) => setError(errorMessage(e)));
  }, [businessId, kind, errorMessage]);
  useEffect(load, [load]);

  async function remove(o: Offering) {
    if (!confirm(t.offer.confirmDelete)) return;
    try {
      await api(`/businesses/${businessId}/offerings/${o._id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (!items) return error ? <Alert>{error}</Alert> : <PageLoader label={t.common.loading} />;

  if (editing) {
    return (
      <OfferingForm
        businessId={businessId}
        kind={kind}
        initial={editing === 'new' ? null : editing}
        onDone={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t.offer[kind]}</h2>
        <Button onClick={() => setEditing('new')}>+ {t.offer.add}</Button>
      </div>
      {error && <Alert>{error}</Alert>}
      {items.length === 0 ? (
        <Card className="py-12 text-center text-ink-500">{t.offer.empty}</Card>
      ) : (
        items.map((o) => (
          <Card key={o._id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{pickLocalized(o.title, locale)}</h3>
                {!o.active && <Badge>{t.offer.hidden}</Badge>}
                {o.pricing.negotiable && <Badge tone="brand">{t.price.negotiable}</Badge>}
              </div>
              <p className="text-sm font-semibold text-brand-700">{formatPricing(o.pricing, t, locale)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="h-9" onClick={() => setEditing(o)}>
                {t.offer.edit}
              </Button>
              <Button variant="danger" className="h-9" onClick={() => void remove(o)}>
                {t.offer.delete}
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

function OfferingForm({ businessId, kind, initial, onDone }: { businessId: string; kind: OfferingKind; initial: Offering | null; onDone: () => void }) {
  const { t, errorMessage } = useI18n();
  const [model, setModel] = useState<PricingModel>(initial?.pricing.model ?? (kind === 'package' ? 'package' : 'fixed'));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? '').trim();
    const num = (k: string) => (s(k) === '' ? undefined : Number(s(k)));
    const loc = (prefix: string) =>
      Object.fromEntries((['ar', 'he', 'en'] as const).map((l) => [l, s(`${prefix}_${l}`)]).filter(([, v]) => v));
    const description = loc('desc');
    const includes = s('includes').split('\n').map((x) => x.trim()).filter(Boolean);
    const body: Record<string, unknown> = {
      title: loc('title'),
      pricing: {
        model,
        negotiable: f.get('negotiable') === 'on',
        ...(model === 'range' ? { min: num('min'), max: num('max') } : model !== 'quote_only' ? { amount: num('amount') } : {}),
      },
      active: f.get('active') === 'on',
      ...(Object.keys(description).length ? { description } : {}),
      ...(includes.length ? { includes } : {}),
      ...(kind === 'service' && num('duration') ? { durationMinutes: num('duration') } : {}),
      ...(kind === 'product' && num('stock') !== undefined ? { stock: num('stock') } : {}),
    };
    if (!initial) body.kind = kind;
    setLoading(true);
    setError(null);
    try {
      await api(initial ? `/businesses/${businessId}/offerings/${initial._id}` : `/businesses/${businessId}/offerings`, {
        method: initial ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <h2 className="text-lg font-bold">
          {initial ? t.offer.edit : t.offer.add} · {t.offer[kind]}
        </h2>
        {error && <Alert>{error}</Alert>}
        <div className="grid gap-3 sm:grid-cols-3">
          {(['ar', 'he', 'en'] as const).map((l) => (
            <Field key={l} label={`${t.offer.title} (${l.toUpperCase()})`}>
              <Input name={`title_${l}`} dir={l === 'en' ? 'ltr' : 'rtl'} defaultValue={initial?.title[l]} maxLength={200} />
            </Field>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(['ar', 'he', 'en'] as const).map((l) => (
            <Field key={l} label={`${t.offer.description} (${l.toUpperCase()})`}>
              <Textarea name={`desc_${l}`} dir={l === 'en' ? 'ltr' : 'rtl'} defaultValue={initial?.description?.[l]} maxLength={5000} />
            </Field>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t.offer.pricingModel}>
            <select value={model} onChange={(e) => setModel(e.target.value as PricingModel)} className="h-11 w-full rounded-xl border border-white/70 bg-white/70 backdrop-blur px-3 text-sm">
              {MODELS.map((m) => (
                <option key={m} value={m}>
                  {t.offer.models[m]}
                </option>
              ))}
            </select>
          </Field>
          {model === 'range' ? (
            <>
              <Field label={t.offer.min}>
                <Input name="min" type="number" min={0} required dir="ltr" defaultValue={initial?.pricing.min} />
              </Field>
              <Field label={t.offer.max}>
                <Input name="max" type="number" min={0} required dir="ltr" defaultValue={initial?.pricing.max} />
              </Field>
            </>
          ) : model !== 'quote_only' ? (
            <Field label={t.offer.amount}>
              <Input name="amount" type="number" min={0} required dir="ltr" defaultValue={initial?.pricing.amount} />
            </Field>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {kind === 'service' && (
            <Field label={t.offer.duration}>
              <Input name="duration" type="number" min={15} step={15} dir="ltr" defaultValue={initial?.durationMinutes} />
            </Field>
          )}
          {kind === 'product' && (
            <Field label={t.offer.stock}>
              <Input name="stock" type="number" min={0} dir="ltr" defaultValue={initial?.stock} />
            </Field>
          )}
        </div>
        {kind !== 'product' && (
          <Field label={t.offer.includes}>
            <Textarea name="includes" defaultValue={initial?.includes?.join('\n')} />
          </Field>
        )}
        <div className="flex flex-wrap gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="negotiable" defaultChecked={initial?.pricing.negotiable} className="size-4 accent-brand-600" />
            {t.offer.negotiable}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="size-4 accent-brand-600" />
            {t.offer.active}
          </label>
        </div>
        <div className="flex gap-2">
          <Button type="submit" loading={loading}>
            {t.biz.save}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </Card>
  );
}
