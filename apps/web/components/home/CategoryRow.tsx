'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { pickLocalized } from '@party/shared';
import { Badge, cx } from '@/components/ui';
import { categoryPhoto } from '@/lib/category-photo';
import { usePackage } from '@/lib/package';
import { useI18n } from '@/lib/providers';
import type { Category, PublicBusinessCard } from '@/lib/types';
import { RowCard } from './RowCard';

/** One horizontally scrolling row per category, with arrow buttons (Wolt-style). */
export function CategoryRow({ category, businesses, required }: { category: Category; businesses: PublicBusinessCard[]; required: boolean }) {
  const { t, href, locale } = useI18n();
  const pkg = usePackage();
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  // Track which arrows are useful. In RTL, scrollLeft is 0 at the start and negative going left.
  function updateEdges() {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    const rtl = getComputedStyle(el).direction === 'rtl';
    const atStart = pos < 20;
    const atEnd = pos > max - 20;
    setEdges(rtl ? { right: !atStart, left: !atEnd } : { left: !atStart, right: !atEnd });
  }
  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [businesses.length]);

  const scrollBy = (dir: -1 | 1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: 'smooth' });
  const status = pkg.picks[category.slug]?.length ? 'picked' : pkg.marks[category.slug];

  return (
    <section id={`cat-${category.slug}`} className="scroll-mt-44 space-y-3 lg:scroll-mt-32">
      <div className="flex items-center gap-2">
        <span className="category-photo-heading" aria-hidden="true" style={{ backgroundImage: `url("${categoryPhoto(category.slug, 160)}")` }} />
        <h2 className="text-xl font-extrabold sm:text-2xl">{pickLocalized(category.name, locale)}</h2>
        {required && pkg.type && !status && <Badge tone="warning">{t.pkg.statusMissing}</Badge>}
        {status === 'picked' && <Badge tone="success">✓ {t.pkg.statusPicked}</Badge>}
        {status === 'done' && <Badge tone="success">✓ {t.pkg.statusDone}</Badge>}
        {status === 'skip' && <Badge>{t.pkg.statusSkip}</Badge>}
        <Link href={href(`/search?category=${category.slug}`)} className="glass ms-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-white">
          {t.home.seeAll}
        </Link>
      </div>

      {businesses.length === 0 ? (
        <p className="glass rounded-2xl px-4 py-6 text-center text-sm text-ink-500">{t.home.noVendors}</p>
      ) : (
        <div className="group/row relative">
          <div ref={scroller} onScroll={updateEdges} className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-3 [scrollbar-width:none]">
            {businesses.map((b) => (
              <RowCard key={b._id} b={b} category={category} />
            ))}
          </div>
          {/* Physical left/right arrows work the same in RTL and LTR. */}
          {(['left', 'right'] as const).map((side) => (
            <button
              key={side}
              type="button"
              aria-label={side === 'left' ? '←' : '→'}
              onClick={() => scrollBy(side === 'left' ? -1 : 1)}
              className={cx(
                'glass-strong absolute top-[38%] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full text-2xl text-ink-900 transition hover:scale-110 sm:grid',
                side === 'left' ? 'left-1' : 'right-1',
                edges[side] ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              {side === 'left' ? '‹' : '›'}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
