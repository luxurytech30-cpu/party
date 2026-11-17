'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { EVENT_TYPES, type EventType } from '@party/shared';
import { CategoryBar } from '@/components/home/CategoryBar';
import { CategoryRow } from '@/components/home/CategoryRow';
import { PartyCustomizer } from '@/components/home/PartyCustomizer';
import { plannerCopy } from '@/lib/party-options';
import { VisitIntent } from '@/components/home/VisitIntent';
import { GIFT_CATEGORIES, intentCopy } from '@/lib/intent-copy';
import { PartyPicker } from '@/components/home/PartyPicker';
import { Button, ButtonLink, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { discoveryCopy } from '@/lib/i18n-discovery';
import { todayStr } from '@/lib/format';
import { img } from '@/lib/img';
import { usePackage } from '@/lib/package';
import { useAuth, useI18n } from '@/lib/providers';
import type { Category, PublicBusinessCard } from '@/lib/types';

interface HomeRow {
  category: Category;
  required: boolean;
  businesses: PublicBusinessCard[];
}

/** Hero photo per party type (Unsplash, free license). */
const HERO: Record<EventType | 'default', string> = {
  default: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce',
  wedding: 'https://images.unsplash.com/photo-1519741497674-611481863552',
  engagement: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8',
  henna: 'https://images.unsplash.com/photo-1478146059778-26028b07395a',
  birthday: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d',
  graduation: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30',
  corporate: 'https://images.unsplash.com/photo-1511578314322-379afb476865',
  other: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3',
};

export default function HomePage() {
  const { t, href, locale } = useI18n();
  const copy = discoveryCopy[locale];
  const { user } = useAuth();
  const pkg = usePackage();
  const router = useRouter();
  const guest = pkg.intent === 'guest';
  const giftCopy = intentCopy[locale];
  const [giftCategory, setGiftCategory] = useState('');
  const [rows, setRows] = useState<HomeRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Shareable links: /ar?type=wedding preselects the party type.
  useEffect(() => {
    if (!pkg.ready) return;
    const fromUrl = new URLSearchParams(window.location.search).get('type');
    if (fromUrl && (EVENT_TYPES as readonly string[]).includes(fromUrl) && fromUrl !== pkg.type) pkg.setType(fromUrl as EventType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg.ready]);

  useEffect(() => {
    if (!pkg.ready) return;
    setFailed(false);
    api<{ rows: HomeRow[] }>(`/public/home${pkg.type ? `?type=${pkg.type}` : ''}`)
      .then((r) => setRows(r.rows))
      .catch(() => setFailed(true));
  }, [pkg.ready, pkg.type]);

  function choose(type: EventType) {
    pkg.setType(type);
    setTimeout(() => document.getElementById('party-customizer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  }

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const query = new URLSearchParams();
    for (const key of ['q', 'date', 'city', 'maxPrice']) {
      const value = String(data.get(key) ?? '').trim();
      if (value) query.set(key, value);
    }
    if (guest) {
      query.set('categories', giftCategory || GIFT_CATEGORIES.join(','));
    } else {
      if (pkg.type) query.set('type', pkg.type);
      if (pkg.checklist.length) query.set('categories', pkg.checklist.join(','));
    }
    router.push(`${href('/search')}?${query}`);
  }

  const categories = rows?.map((r) => r.category) ?? [];
  const vendorCount = new Set(rows?.flatMap((r) => r.businesses.map((b) => b._id)) ?? []).size;
  const hero = guest ? 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48' : HERO[pkg.type ?? 'default'];
  const visibleRows = rows?.filter((r) => guest ? (giftCategory ? r.category.slug === giftCategory : GIFT_CATEGORIES.includes(r.category.slug)) : (!pkg.type || pkg.checklist.includes(r.category.slug))) ?? [];

  return (
    <div className="celebration-home space-y-16 pb-16">
      <VisitIntent />
      <section className="editorial-hero">
        <div className="hero-edition" aria-hidden="true"><span>FARAH</span><span>CELEBRATE / YOUR WAY</span><span>EST. 2026</span></div>
        <div className="hero-copy">
          <span className="hero-eyebrow">&#10022; {t.home.kicker}</span>
          <h1>{guest ? giftCopy.title : copy.title}<br /><em>{guest ? giftCopy.accent : copy.accent}</em></h1>
          <p className="hero-description">{guest ? giftCopy.intro : copy.sub}</p>
          <div className="hero-signature"><span /> {copy.edit}</div>
        </div>
        <div className="hero-gallery" aria-hidden="true">
          <img className="hero-photo-main" fetchPriority="high" src={img(hero, 900, 1100)} alt="" />
          <img className="hero-photo-detail" src={img(guest ? 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81' : 'https://images.unsplash.com/photo-1519741497674-611481863552', 500, 650)} alt="" />
          <span className="hero-orbit">&#10023;</span>
          <span className="hero-frame-caption" aria-hidden="true">THE ART OF CELEBRATION</span>
          <div className="hero-photo-label"><span>&#10023;</span><div>{copy.caption}<small>{copy.edit}</small></div></div>
        </div>
        <form onSubmit={onSearch} className="discovery-form">
          <label><span>{t.search.q}</span><input name="q" placeholder={t.search.q} /></label>
          <label><span>{copy.where}</span><input name="city" placeholder={copy.anywhere} /></label>
          {guest ? <label><span>{giftCopy.budget}</span><input name="maxPrice" type="number" min="0" placeholder="?" /></label> : <label><span>{copy.date}</span><input name="date" type="date" min={todayStr()} aria-label={copy.date} /></label>}
          <Button type="submit">{guest ? giftCopy.find : copy.explore} &#8599;</Button>
          <p>{guest ? giftCopy.note : copy.note}</p>
        </form>
      </section>
      {!guest ? <>
      <section className="occasion-section">
        <div className="section-heading"><div><span className="section-eyebrow">01 / {t.home.whatParty}</span><h2>{copy.occasion}</h2></div><p>{t.home.whatPartySub}</p></div>
        <PartyPicker value={pkg.type} onChange={choose} />
      </section>
      <PartyCustomizer categories={categories} />
      </> : <section className="gift-discovery"><div className="section-heading"><div><span className="section-eyebrow">GIFT EDIT</span><h2>{giftCopy.gifts}</h2></div><p>{giftCopy.note}</p></div><div className="flex flex-wrap gap-2">
        {[["", giftCopy.all], ["gifts", giftCopy.personal], ["cakes-sweets", giftCopy.sweet]].map(([value, label]) => <button type="button" key={value} className="planner-pill" aria-pressed={giftCategory === value} onClick={() => setGiftCategory(value)}>{label}</button>)}
      </div></section>}
      <div className="section-heading"><div><span className="section-eyebrow">02 / {t.home.allCategories}</span><h2>{guest ? giftCopy.gifts : copy.curated}</h2></div>{vendorCount > 0 && <span className="vendor-count">{guest ? new Set(visibleRows.flatMap((r) => r.businesses.map((b) => b._id))).size : vendorCount} {copy.vendors}</span>}</div>

      {/* ---------- Categories + rows ---------- */}
      <div id="categories" className="scroll-mt-28 space-y-10">
        {failed ? (
          <p className="text-ink-500">{t.common.error}</p>
        ) : !rows ? (
          <div className="flex justify-center py-16 text-ink-500">
            <Spinner />
          </div>
        ) : (
          <>
            <CategoryBar categories={visibleRows.map((r) => r.category)} />
            {!guest && pkg.type && pkg.checklist.length === 0 && <div className="rounded-2xl border border-dashed border-brand-200 p-8 text-center text-sm text-ink-500">{plannerCopy[locale].empty}</div>}
            {visibleRows.map((r, i) => (
              <div key={r.category._id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
                <CategoryRow category={r.category} businesses={r.businesses} required={false} />
              </div>
            ))}
          </>
        )}
      </div>

      {/* ---------- How it works ---------- */}
      {!guest && <section className="journey-section space-y-5">
        <h2 className="text-2xl font-extrabold sm:text-3xl">
          <span className="text-gradient">{t.home.howTitle}</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {t.home.how.map((step, i) => (
            <div key={i} className="journey-card group space-y-3 p-6">
              <span className="journey-number">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-lg font-bold">{step.t}</h3>
              <p className="text-sm leading-relaxed text-ink-500">{step.d}</p>
            </div>
          ))}
        </div>
      </section>

      }
      {/* ---------- Business CTA ---------- */}
      <section className="business-invitation relative overflow-hidden rounded-[2rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img('https://images.unsplash.com/photo-1511795409834-ef04bbd61622', 1600, 600)} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-l from-ink-900/85 via-ink-900/60 to-brand-900/40" />
        <div className="relative flex flex-col items-start gap-5 p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <div className="max-w-xl space-y-2">
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t.forBusinessTitle}</h2>
            <p className="text-white/80">{t.forBusinessText}</p>
          </div>
          <ButtonLink href={href(user ? '/dashboard/new' : '/register')}>{t.ctaBusiness}</ButtonLink>
        </div>
      </section>
      <footer className="celebration-footer"><span className="footer-wordmark">{t.brand}<span aria-hidden="true">.</span></span><p>{copy.edit}</p><span aria-hidden="true">FARAH / CELEBRATE BEAUTIFULLY</span></footer>
    </div>
  );
}
