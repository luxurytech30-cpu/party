'use client';

import { pickLocalized } from '@party/shared';
import { formatPricing } from '@/lib/format';
import { intentCopy } from '@/lib/intent-copy';
import { Card, cx } from '@/components/ui';
import { usePackage } from '@/lib/package';
import { useI18n } from '@/lib/providers';
import type { Category, PublicBusinessPage, Offering } from '@/lib/types';

/** Add this vendor to "My package" for one of its categories. */
export function AddToPackage({ business, categories }: { business: PublicBusinessPage['business']; categories: Category[] }) {
  const { t, locale } = useI18n();
  const pkg = usePackage();
  if (!pkg.ready || categories.length === 0) return null;

  return (
    <Card className="space-y-2">
      <h2 className="font-bold">{pkg.intent === 'guest' ? intentCopy[locale].shortlist : t.pkg.title}</h2>
      <p className="text-xs text-ink-500">{intentCopy[locale].multi}</p>
      {categories.map((c) => {
        const picked = pkg.picks[c.slug]?.some((p) => p.businessId === business._id) ?? false;
        return (
          <button
            key={c._id}
            onClick={() =>
              picked
                ? pkg.unpick(c.slug, business._id)
                : pkg.pick(c.slug, { businessId: business._id, slug: business.slug, name: business.name, startingPrice: business.startingPrice })
            }
            className={cx(
              'flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition',
              picked ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-brand-600 text-white hover:bg-brand-700',
            )}
          >
            {picked ? `✓ ${pkg.intent === 'guest' ? intentCopy[locale].added : t.pkg.added}` : `+ ${pkg.intent === 'guest' ? intentCopy[locale].add : t.pkg.add}`}
            {categories.length > 1 && <span className="font-normal opacity-80">· {c.icon} {pickLocalized(c.name, locale)}</span>}
          </button>
        );
      })}
      {!pkg.type && pkg.intent !== 'guest' && <p className="text-xs text-ink-500">{t.pkg.pickParty}</p>}
    </Card>
  );
}

export function AddOfferingToPackage({ business, categories, offering }: { business: PublicBusinessPage['business']; categories: Category[]; offering: Offering }) {
  const pkg = usePackage();
  const { t, locale } = useI18n();
  if (!pkg.ready || !categories.length) return null;
  return <div className="flex flex-wrap gap-2 pt-2">{categories.map((category) => {
    const selected = pkg.picks[category.slug]?.some((p) => p.businessId === business._id && p.offeringId === offering._id);
    const price = ['fixed', 'starting_from', 'package'].includes(offering.pricing.model) ? offering.pricing.amount : offering.pricing.model === 'range' ? offering.pricing.min : undefined;
    return <button key={category._id} type="button" aria-pressed={!!selected} className={`rounded-full px-4 py-2 text-xs font-semibold ${selected ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-600 text-white'}`} onClick={() => selected ? pkg.unpick(category.slug, business._id, offering._id) : pkg.pick(category.slug, { businessId: business._id, slug: business.slug, name: business.name, offeringId: offering._id, offeringTitle: offering.title, startingPrice: price, priceLabel: formatPricing(offering.pricing, t, locale) })}>
      {pkg.intent === 'guest' ? (selected ? intentCopy[locale].added : intentCopy[locale].add) : (selected ? t.pkg.added : t.pkg.add)}{categories.length > 1 ? `: ${pickLocalized(category.name, locale)}` : ''}
    </button>;
  })}</div>;
}
