'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { pickLocalized } from '@party/shared';
import { Alert, Button, Card, Field, Input, PageLoader, Textarea, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/providers';
import type { Business, Category } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

const clean = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  return s || undefined;
};

export default function NewBusinessPage() {
  const { t, href, locale, errorMessage } = useI18n();
  const auth = useRequireAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ items: Category[] }>('/categories').then((r) => setCategories(r.items)).catch((e) => setError(errorMessage(e)));
  }, [errorMessage]);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 5 ? [...s, id] : s));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = { ar: clean(f.get('nameAr')), he: clean(f.get('nameHe')), en: clean(f.get('nameEn')) };
    const desc = clean(f.get('description'));
    const body = {
      name: Object.fromEntries(Object.entries(name).filter(([, v]) => v)),
      ...(desc ? { description: { [locale]: desc } } : {}),
      categoryIds: selected,
      cities: String(f.get('cities') ?? '')
        .split(/[,،]/)
        .map((c) => c.trim())
        .filter(Boolean),
      ...(clean(f.get('phone')) ? { phone: clean(f.get('phone'))!.replace(/[\s-]/g, '') } : {}),
      ...(clean(f.get('email')) ? { email: clean(f.get('email')) } : {}),
    };
    setError(null);
    if (!Object.keys(body.name).length) return setError(t.dash.nameHint);
    if (!selected.length) return setError(`${t.dash.categories}: ${t.dash.categoriesHint}`);
    setLoading(true);
    try {
      const r = await api<{ business: Business }>('/businesses', { method: 'POST', body: JSON.stringify(body) });
      router.push(href(`/dashboard/${r.business._id}`));
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  if (!categories) return error ? <Alert>{error}</Alert> : <PageLoader label={t.common.loading} />;
  if (auth.status !== 'authenticated') return <PageLoader label={t.common.loading} />;

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t.dash.createTitle}</h1>
          <p className="text-sm text-ink-500">{t.dash.pendingNote}</p>
        </div>
        {error && <Alert>{error}</Alert>}
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t.dash.nameAr}>
              <Input name="nameAr" dir="rtl" maxLength={120} />
            </Field>
            <Field label={t.dash.nameHe}>
              <Input name="nameHe" dir="rtl" maxLength={120} />
            </Field>
            <Field label={t.dash.nameEn}>
              <Input name="nameEn" dir="ltr" maxLength={120} />
            </Field>
          </div>
          <p className="-mt-2 text-xs text-ink-500">{t.dash.nameHint}</p>

          <Field label={t.dash.description}>
            <Textarea name="description" maxLength={2000} />
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink-700">
              {t.dash.categories} <span className="text-xs text-ink-500">({t.dash.categoriesHint})</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const on = selected.includes(c._id);
                return (
                  <button
                    type="button"
                    key={c._id}
                    aria-pressed={on}
                    onClick={() => toggle(c._id)}
                    className={cx(
                      'rounded-full px-3.5 py-2 text-sm ring-1 transition',
                      on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink-700 ring-ink-300 hover:ring-brand-300',
                    )}
                  >
                    {c.icon} {pickLocalized(c.name, locale)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Field label={t.dash.cities} hint={t.dash.citiesHint}>
            <Input name="cities" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.dash.businessPhone}>
              <Input name="phone" type="tel" dir="ltr" />
            </Field>
            <Field label={t.dash.businessEmail}>
              <Input name="email" type="email" dir="ltr" />
            </Field>
          </div>
          <Button type="submit" loading={loading} className="w-full sm:w-auto">
            {t.dash.submit}
          </Button>
        </form>
      </Card>
    </div>
  );
}
