'use client';

import { pickLocalized } from '@party/shared';
import { cx } from '@/components/ui';
import { categoryPhoto } from '@/lib/category-photo';
import { usePackage } from '@/lib/package';
import { useI18n } from '@/lib/providers';
import type { Category } from '@/lib/types';

/** Sticky bar with ALL categories; tapping one scrolls to its row. Done categories get a ✓. */
export function CategoryBar({ categories, active }: { categories: Category[]; active?: string | null }) {
  const { locale } = useI18n();
  const pkg = usePackage();
  if (!categories.length) return null;
  return (
    <nav className="sticky top-[6.5rem] z-20 -mx-4 px-4 py-2 lg:top-[4.25rem]">
      <div className="glass-strong rounded-2xl p-1.5">
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {categories.map((c) => {
          const done = !!pkg.picks[c.slug]?.length || !!pkg.marks[c.slug];
          return (
            <a
              key={c._id}
              href={`#cat-${c.slug}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(`cat-${c.slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={cx(
                'flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition',
                active === c.slug ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-white',
              )}
            >
              <span className="category-photo-chip" aria-hidden="true" style={{ backgroundImage: `url("${categoryPhoto(c.slug, 100)}")` }} />
              {pickLocalized(c.name, locale)}
              {done && <span className="text-emerald-600">✓</span>}
            </a>
          );
        })}
      </div>
      </div>
    </nav>
  );
}
