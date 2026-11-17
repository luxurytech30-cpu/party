'use client';

import Link from 'next/link';
import { pickLocalized } from '@party/shared';
import { categoryPhoto } from '@/lib/category-photo';
import { formatMoney } from '@/lib/format';
import { img } from '@/lib/img';
import { useI18n } from '@/lib/providers';
import type { Category, PublicBusinessCard } from '@/lib/types';

export function BusinessCard({ b, categories, date }: { b: PublicBusinessCard; categories?: Category[]; date?: string }) {
  const { t, href, locale } = useI18n();
  const cats = categories?.filter((c) => b.categoryIds.includes(c._id)) ?? [];
  return (
    <Link
      href={href(`/b/${b.slug}${date ? `?date=${encodeURIComponent(date)}` : ''}`)}
      className="vendor-editorial-card group block overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/60 shadow-[var(--shadow-card)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-20px_rgb(76_23_56/0.45)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-100 via-brand-50 to-gold-300/40">
        {b.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img(b.coverUrl, 640, 480)} alt="" className="size-full object-cover transition duration-700 group-hover:scale-110" loading="lazy" />
        ) : (
          <div className="size-full bg-cover bg-center" aria-hidden="true" style={{ backgroundImage: `url("${categoryPhoto(cats[0]?.slug ?? 'other')}")` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/75 via-ink-900/10 to-transparent" />
        {b.rating && b.rating.count > 0 && (
          <span className="glass-tint absolute start-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold text-white">
            ★ {b.rating.avg} <span className="font-normal opacity-80">({b.rating.count})</span>
          </span>
        )}
        {b.dateStatus && (
          <span className={`absolute end-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow ${b.dateStatus === 'available' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
            {b.dateStatus === 'available' ? t.search.availableOn : t.search.pendingOn}
          </span>
        )}
        {date && !b.dateStatus && <span className="absolute end-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs text-ink-700">{t.search.onRequest}</span>}
        <div className="absolute inset-x-3 bottom-3 text-white">
          <h3 className="line-clamp-1 text-lg font-extrabold drop-shadow">{pickLocalized(b.name, locale)}</h3>
          <p className="line-clamp-1 text-xs text-white/85">
            {cats.map((c) => pickLocalized(c.name, locale)).join(' · ')}
            {b.cities.length > 0 && ` · 📍 ${b.cities.slice(0, 2).join(' · ')}`}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between p-4">
        {b.startingPrice !== undefined && b.startingPrice !== null ? (
          <p className="text-sm">
            <span className="text-ink-500">{t.search.from} </span>
            <strong className="text-base font-extrabold">{formatMoney(b.startingPrice, locale)}</strong>
          </p>
        ) : (
          <p className="text-sm text-ink-500">{t.search.onRequest}</p>
        )}
        <span className="text-brand-700 transition group-hover:translate-x-[-4px] rtl:group-hover:translate-x-[4px]">←</span>
      </div>
    </Link>
  );
}
