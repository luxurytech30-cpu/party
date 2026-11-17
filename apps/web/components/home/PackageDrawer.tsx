'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { pickLocalized } from '@party/shared';
import { Alert, Button, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { categoryPhoto, eventPhoto } from '@/lib/category-photo';
import { intentCopy } from '@/lib/intent-copy';
import { pickKey } from '@/lib/package-selections';
import { plannerCopy } from '@/lib/party-options';
import { formatMoney } from '@/lib/format';
import { usePackage } from '@/lib/package';
import { useAuth, useI18n } from '@/lib/providers';
import type { Category, EventDetail } from '@/lib/types';

/** Floating "My package" bar + checklist drawer, available on every customer page. */
export function PackageDock() {
  const { t, locale } = useI18n();
  const pkg = usePackage();
  const pathname = usePathname();
  const hidden = /\/(dashboard|admin)/.test(pathname);
  if (!pkg.ready || (!pkg.type && pkg.intent !== 'guest') || hidden) return null;

  const total = pkg.checklist.length;
  const pct = total ? Math.round((pkg.doneCount / total) * 100) : 0;

  return (
    <>
      <button
        onClick={() => pkg.setDrawerOpen(true)}
        className="glass-dark fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md items-center gap-3 rounded-[1.5rem] px-4 py-3 text-start text-white transition duration-300 hover:-translate-y-0.5"
      >
        <span className="package-photo" aria-hidden="true" style={{ backgroundImage: `url("${eventPhoto(pkg.type ?? 'other')}")` }} />
        <span className="flex-1">
          <span className="block text-sm font-semibold">
            {pkg.intent === 'guest' ? intentCopy[locale].shortlist : `${t.pkg.title} \u00b7 ${pkg.type ? t.ev.types[pkg.type] : ''}`}
          </span>
          <span className="mt-1 flex items-center gap-2 text-xs text-white/70">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
              <span className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-gold-400 transition-all duration-500" style={{ width: `${pct}%` }} />
            </span>
            {pkg.intent === 'guest' ? `${Object.values(pkg.picks).flat().length} ${intentCopy[locale].count}` : t.pkg.progress.replace('{done}', String(pkg.doneCount)).replace('{total}', String(total))}
          </span>
        </span>
        <span className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-[var(--shadow-glow)]">{t.pkg.open}</span>
      </button>
      {pkg.drawerOpen && <PackageDrawer />}
    </>
  );
}

function PackageDrawer() {
  const { t, href, locale, errorMessage } = useI18n();
  const { user } = useAuth();
  const pkg = usePackage();
  const router = useRouter();
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: Category[] }>('/categories').then((r) => setCategories(r.items)).catch(() => undefined);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && pkg.setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pkg]);

  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const items = pkg.checklist.filter((slug) => bySlug.has(slug) || pkg.picks[slug]?.length);
  const missing = items.filter((s) => !pkg.picks[s]?.length && !pkg.marks[s]);
  const estimated = Object.values(pkg.picks).flat().reduce((sum, p) => sum + (p.startingPrice ?? 0), 0);
  const isHome = /^\/(ar|he|en)\/?$/.test(pathname);

  function choose(slug: string) {
    pkg.setDrawerOpen(false);
    const target = document.getElementById(`cat-${slug}`);
    if (isHome && target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else router.push(href(`/search?category=${slug}`));
  }

  /** Persist as an event plan: picks become shortlisted candidates, skipped items are dropped. */
  async function save() {
    if (!pkg.type) return;
    setSaving(true);
    setError(null);
    try {
      const selectedCount = items.reduce((sum, slug) => sum + Math.max(1, pkg.picks[slug]?.length ?? 0), 0);
      if (selectedCount > 40) throw new Error('A plan can contain up to 40 selections.');
      const created = await api<EventDetail>('/events', { method: 'POST', body: JSON.stringify({ type: pkg.type, title: t.ev.types[pkg.type], categorySlugs: [] }) });
      const eventId = created.event._id;
      for (const slug of items) {
        const cat = bySlug.get(slug);
        if (!cat || pkg.marks[slug] === 'skip') continue;
        const picks = pkg.picks[slug] ?? [];
        for (const p of picks.length ? picks : [null]) {
          const label = p ? `${pickLocalized(cat.name, locale)}: ${pickLocalized(p.offeringTitle ?? p.name, locale)}` : pickLocalized(cat.name, locale);
          const r = await api<EventDetail>(`/events/${eventId}/items`, { method: 'POST', body: JSON.stringify({ categoryId: cat._id, label: label.slice(0, 120) }) });
          const itemId = r.event.items.at(-1)?._id;
          if (p && itemId) await api(`/events/${eventId}/items/${itemId}/candidates`, { method: 'POST', body: JSON.stringify({ businessId: p.businessId, offeringId: p.offeringId, estimatedPrice: p.startingPrice, note: p.offeringTitle ? pickLocalized(p.offeringTitle, locale).slice(0, 500) : undefined }) });
        }
      }
      pkg.setDrawerOpen(false);
      router.push(href(`/events/${eventId}`));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t.pkg.title}>
      <button aria-label={t.pkg.close} className="absolute inset-0 bg-ink-900/30 backdrop-blur-md" onClick={() => pkg.setDrawerOpen(false)} />
      <aside className="package-drawer absolute inset-y-0 end-0 flex w-full max-w-md animate-[fade-up_0.35s_ease_both] flex-col border-s border-white/60 bg-white/65 shadow-2xl backdrop-blur-2xl backdrop-saturate-150">
        <header className="flex items-center gap-3 border-b border-white/60 px-5 py-4">
          <span className="package-photo" aria-hidden="true" style={{ backgroundImage: `url("${eventPhoto(pkg.type ?? 'other')}")` }} />
          <div className="flex-1">
            <h2 className="text-lg font-bold">{pkg.intent === 'guest' ? intentCopy[locale].shortlist : t.pkg.title}</h2>
            <p className="text-xs text-ink-500">
              {pkg.intent === 'guest' ? intentCopy[locale].shortlist : t.pkg.for} {pkg.intent !== 'guest' && pkg.type && t.ev.types[pkg.type]} · {t.pkg.progress.replace('{done}', String(pkg.doneCount)).replace('{total}', String(pkg.checklist.length))}
            </p>
          </div>
          <button onClick={() => pkg.setDrawerOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-ink-100" aria-label={t.pkg.close}>
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {pkg.intent === 'guest' ? <p className="text-xs leading-relaxed text-ink-500">{intentCopy[locale].saved}</p> : missing.length === 0 && items.length > 0 ? (
            <Alert tone="success">{t.pkg.allSet}</Alert>
          ) : (
            missing.length > 0 && (
              <Alert tone="info">
                {t.pkg.missingHint} {missing.map((s) => pickLocalized(bySlug.get(s)?.name, locale)).join('، ')}
              </Alert>
            )
          )}

          <Link href={`${href('/')}#${pkg.intent === 'guest' ? 'categories' : 'party-customizer'}`} onClick={() => pkg.setDrawerOpen(false)} className="mb-3 block rounded-xl bg-brand-50 p-3 text-center text-sm font-semibold text-brand-700">{plannerCopy[locale].change}</Link>
          {items.length === 0 && <p className="p-3 text-sm text-ink-500">{plannerCopy[locale].empty}</p>}
          {items.map((slug) => {
            const cat = bySlug.get(slug);
            const picks = pkg.picks[slug] ?? [];
            const m = pkg.marks[slug];
            const state = picks.length ? 'picked' : m;
            return (
              <div
                key={slug}
                className={cx(
                  'rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm ring-1 backdrop-blur',
                  state === 'picked' || state === 'done' ? 'ring-emerald-200' : state === 'skip' ? 'opacity-60 ring-ink-100' : 'ring-amber-200',
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cx(
                      'grid size-7 shrink-0 place-items-center rounded-full text-sm',
                      state === 'picked' || state === 'done' ? 'bg-emerald-500 text-white' : state === 'skip' ? 'bg-ink-300 text-white' : 'bg-amber-100',
                    )}
                    style={!state ? { backgroundImage: `url("${categoryPhoto(slug, 100)}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  >
                    {state === 'picked' || state === 'done' ? '✓' : state === 'skip' ? '–' : null}
                  </span>
                  <p className={cx('flex-1 font-semibold', state === 'skip' && 'line-through')}>{cat ? pickLocalized(cat.name, locale) : slug}</p>
                  <button type="button" onClick={() => pkg.toggleCategory(slug)} aria-label={`${plannerCopy[locale].remove}: ${cat ? pickLocalized(cat.name, locale) : slug}`} className="px-2 text-ink-500">&times;</button>
                  {!state && (
                    <button onClick={() => choose(slug)} className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                      {t.pkg.choose}
                    </button>
                  )}
                </div>

                {picks.map((p) => (
                  <div key={pickKey(p)} className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-ink-900">
                    <Link href={href(`/b/${p.slug}`)} onClick={() => pkg.setDrawerOpen(false)} className="flex-1 font-medium hover:underline">
                      {pickLocalized(p.name, locale)}{p.offeringTitle && <small className="block text-xs">{pickLocalized(p.offeringTitle, locale)}</small>}
                    </Link>
                    {(p.priceLabel || p.startingPrice !== undefined) && <span className="text-xs text-ink-500">{p.priceLabel ?? formatMoney(p.startingPrice ?? 0, locale)}</span>}
                    <button onClick={() => pkg.unpick(slug, p.businessId, p.offeringId)} className="text-xs text-ink-500 hover:text-red-600">
                      {t.pkg.remove}
                    </button>
                  </div>
                ))}
                {picks.length > 0 && <button type="button" onClick={() => choose(slug)} className="mt-2 text-xs font-semibold text-brand-700">+ {intentCopy[locale].more}</button>}

                {!picks.length && (
                  <div className="mt-2 flex gap-3 ps-9 text-xs">
                    {m ? (
                      <button onClick={() => pkg.mark(slug, null)} className="font-semibold text-brand-700">
                        ↺ {t.pkg.undo}
                      </button>
                    ) : (
                      <>
                        <button onClick={() => pkg.mark(slug, 'done')} className="text-ink-500 hover:text-emerald-700">
                          ✓ {t.pkg.markDone}
                        </button>
                        <button onClick={() => pkg.mark(slug, 'skip')} className="text-ink-500 hover:text-ink-900">
                          – {t.pkg.markSkip}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <p className="px-1 pt-2 text-xs text-ink-500">{t.pkg.note}</p>
        </div>

        <footer className="space-y-3 border-t border-white/60 bg-white/50 p-4">
          {estimated > 0 && (
            <p className="flex items-center justify-between text-sm">
              <span className="text-ink-500">{t.pkg.estimated}</span>
              <strong className="text-lg">{formatMoney(estimated, locale)}</strong>
            </p>
          )}
          {error && <Alert>{error}</Alert>}
          {pkg.intent === 'guest' ? <p className="text-xs leading-relaxed text-ink-500">{intentCopy[locale].note}</p> : user ? (
            <Button className="w-full" loading={saving} onClick={() => void save()}>
              {saving ? t.pkg.saving : t.pkg.save}
            </Button>
          ) : (
            <Link href={href('/login')} onClick={() => pkg.setDrawerOpen(false)} className="block text-center text-sm font-semibold text-brand-700">
              {t.pkg.loginToSave}
            </Link>
          )}
          <button
            onClick={() => confirm(t.pkg.confirmClear) && pkg.clear()}
            className="w-full text-center text-xs text-ink-500 hover:text-red-600"
          >
            {t.pkg.clear}
          </button>
        </footer>
      </aside>
    </div>
  );
}
