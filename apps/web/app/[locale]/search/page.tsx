'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { EVENT_TYPES, pickLocalized } from '@party/shared';
import { BusinessCard } from '@/components/BusinessCard';
import { Alert, Button, Card, Field, Input, PageLoader } from '@/components/ui';
import { api } from '@/lib/api';
import { todayStr } from '@/lib/format';
import { useI18n } from '@/lib/providers';
import type { Category, PublicBusinessCard } from '@/lib/types';

const KEYS = ['q', 'category', 'city', 'maxPrice', 'date', 'type', 'categories'] as const;

function SearchInner() {
  const { t, href, locale, errorMessage } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [result, setResult] = useState<{ items: PublicBusinessCard[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const qs = params.toString();

  useEffect(() => {
    api<{ items: Category[] }>('/categories').then((r) => setCategories(r.items)).catch(() => undefined);
  }, []);

  useEffect(() => {
    setResult(null);
    setError(null);
    let current = true;
    api<{ items: PublicBusinessCard[]; total: number }>(`/public/businesses${qs ? `?${qs}` : ''}`)
      .then((value) => { if (current) setResult(value); })
      .catch((e) => { if (current) setError(errorMessage(e)); });
    return () => { current = false; };
  }, [qs, errorMessage]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next = new URLSearchParams();
    for (const k of KEYS) {
      const v = String(f.get(k) ?? '').trim();
      if (v && (k !== 'categories' || f.get('type') === (params.get('type') ?? ''))) next.set(k, v);
    }
    router.push(`${href('/search')}?${next.toString()}`);
  }

  return (
    <div className="celebration-search space-y-6">
      <div className="section-heading"><div><span className="section-eyebrow">&#10022; {t.home.kicker}</span><h1 className="text-3xl font-semibold">{t.search.title}</h1></div>{params.get('date') && <p>{t.search.date}: {params.get('date')}</p>}</div>
      <Card>
        <form key={qs} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <input type="hidden" name="categories" value={params.get('categories') ?? ''} />
          <Field label={t.search.q}>
            <Input name="q" defaultValue={params.get('q') ?? ''} />
          </Field>
          <Field label={t.home.whatParty}>
            <select name="type" defaultValue={params.get('type') ?? ''} className="h-11 w-full rounded-xl border border-ink-100 bg-white px-3 text-sm">
              <option value="">{t.search.any}</option>
              {EVENT_TYPES.map((type) => <option key={type} value={type}>{t.ev.types[type]}</option>)}
            </select>
          </Field>
          <Field label={t.search.category}>
            <select name="category" defaultValue={params.get('category') ?? ''} className="h-11 w-full rounded-xl border border-white/70 bg-white/70 backdrop-blur px-3 text-sm">
              <option value="">{t.search.any}</option>
              {categories.map((c) => (
                <option key={c._id} value={c.slug}>
                  {pickLocalized(c.name, locale)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.search.city}>
            <Input name="city" defaultValue={params.get('city') ?? ''} />
          </Field>
          <Field label={t.search.maxPrice}>
            <Input name="maxPrice" type="number" min={0} defaultValue={params.get('maxPrice') ?? ''} dir="ltr" />
          </Field>
          <Field label={t.search.date}>
            <Input name="date" type="date" min={todayStr()} defaultValue={params.get('date') ?? ''} />
          </Field>
          <Button type="submit">{t.search.submit}</Button>
        </form>
      </Card>

      {params.get('categories') && <div className="flex flex-wrap items-center gap-2">
        {categories.filter((c) => params.get('categories')?.split(',').includes(c.slug)).map((c) => <span key={c._id} className="rounded-full bg-brand-50 px-3 py-2 text-xs text-brand-700">{pickLocalized(c.name, locale)}</span>)}
        <a href={`${href('/')}#party-customizer`} className="text-xs font-semibold text-brand-700 underline">{t.home.change}</a>
      </div>}
      {error ? (
        <Alert>{error}</Alert>
      ) : !result ? (
        <PageLoader label={t.common.loading} />
      ) : result.items.length === 0 ? (
        <Card className="py-14 text-center text-ink-500">{t.search.empty}</Card>
      ) : (
        <>
          <p className="text-sm text-ink-500">
            {result.total} {t.search.results}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((b) => (
              <BusinessCard key={b._id} b={b} categories={categories} date={params.get('date') ?? undefined} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
