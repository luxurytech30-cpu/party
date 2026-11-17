'use client';

import Link from 'next/link';
import { pickLocalized } from '@party/shared';
import { intentCopy } from '@/lib/intent-copy';
import { categoryPhoto } from '@/lib/category-photo';
import { cx } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { img } from '@/lib/img';
import { usePackage } from '@/lib/package';
import { useI18n } from '@/lib/providers';
import type { Category, PublicBusinessCard } from '@/lib/types';

/** Premium vendor card: photo with gradient, glass chips on the image, glass footer. */
export function RowCard({ b, category }: { b: PublicBusinessCard; category: Category }) {
  const { t, href, locale } = useI18n();
  const pkg = usePackage();
  const picked = pkg.picks[category.slug]?.some((p) => p.businessId === b._id) ?? false;

  function toggle() {
    if (picked) pkg.unpick(category.slug, b._id);
    else pkg.pick(category.slug, { businessId: b._id, slug: b.slug, name: b.name, startingPrice: b.startingPrice });
  }

  return (
    <article
      className={cx(
        'vendor-editorial-card group w-64 shrink-0 snap-start overflow-hidden rounded-[1.75rem] border bg-white/60 shadow-[var(--shadow-card)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-20px_rgb(76_23_56/0.45)] sm:w-72',
        picked ? 'border-emerald-400 ring-2 ring-emerald-400/60' : 'border-white/70',
      )}
    >
      <Link href={href(`/b/${b.slug}`)} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-brand-100 via-brand-50 to-gold-300/40">
          {b.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img(b.coverUrl, 640, 480)} alt="" loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-110" />
          ) : (
            <div className="size-full bg-cover bg-center" aria-hidden="true" style={{ backgroundImage: `url("${categoryPhoto(category.slug)}")` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/75 via-ink-900/10 to-transparent" />

          {b.rating && b.rating.count > 0 && (
            <span className="glass-tint absolute start-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold text-white">
              ★ {b.rating.avg} <span className="font-normal opacity-80">({b.rating.count})</span>
            </span>
          )}
          {picked && (
            <span className="absolute end-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">✓ {t.pkg.added}</span>
          )}

          <div className="absolute inset-x-3 bottom-3 text-white">
            <h3 className="line-clamp-1 text-lg font-extrabold drop-shadow">{pickLocalized(b.name, locale)}</h3>
            <p className="line-clamp-1 text-xs text-white/85">📍 {b.cities.slice(0, 2).join(' · ') || '—'}</p>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-2 p-3">
        <div className="min-w-0 flex-1 leading-tight">
          {b.startingPrice !== undefined && b.startingPrice !== null ? (
            <>
              <p className="text-[11px] text-ink-500">{t.search.from}</p>
              <p className="text-base font-extrabold text-ink-900">{formatMoney(b.startingPrice, locale)}</p>
            </>
          ) : (
            <p className="text-xs text-ink-500">{t.search.onRequest}</p>
          )}
        </div>
        <button
          onClick={toggle}
          className={cx(
            'h-10 shrink-0 rounded-full px-4 text-xs font-bold transition duration-200 active:scale-95',
            picked
              ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-400/50'
              : 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[var(--shadow-glow)] hover:brightness-110',
          )}
        >
          {picked ? `\u2713 ${pkg.intent === 'guest' ? intentCopy[locale].added : t.pkg.added}` : `+ ${pkg.intent === 'guest' ? intentCopy[locale].add : t.pkg.add}`}
        </button>
      </div>
    </article>
  );
}
