'use client';

import { useState } from 'react';
import { pickLocalized } from '@party/shared';
import { categoryPhoto } from '@/lib/category-photo';
import { usePackage } from '@/lib/package';
import { plannerCopy, suggestCategories, type BirthdayAge, type PartyPlace } from '@/lib/party-options';
import { useI18n } from '@/lib/providers';
import type { Category } from '@/lib/types';

export function PartyCustomizer({ categories }: { categories: Category[] }) {
  const pkg = usePackage();
  const { locale } = useI18n();
  const copy = plannerCopy[locale];
  const [showAll, setShowAll] = useState(false);
  if (!pkg.type) return null;
  const suggestions = suggestCategories(pkg.type, pkg.place, pkg.age);
  const visible = categories.filter((c) => showAll || suggestions.includes(c.slug) || pkg.checklist.includes(c.slug))
    .filter((c) => c.slug !== 'venues' || (pkg.place !== 'home' && pkg.place !== 'outdoors'))
    .sort((a, b) => {
      const rank = (slug: string) => suggestions.includes(slug) ? suggestions.indexOf(slug) : 100;
      return rank(a.slug) - rank(b.slug);
    });
  return (
    <section id="party-customizer" className="party-customizer scroll-mt-28" aria-labelledby="customizer-title">
      <div className="section-heading"><div><span className="section-eyebrow">✦ {copy.optional}</span><h2 id="customizer-title">{copy.title}</h2></div><p>{copy.intro}</p></div>
      <div className="grid gap-6 sm:grid-cols-2">
        <fieldset><legend className="mb-3 text-sm font-semibold">{copy.place}</legend><div className="flex flex-wrap gap-2">
          {(Object.keys(copy.places) as PartyPlace[]).map((place) => <button key={place} type="button" aria-pressed={pkg.place === place} className="planner-pill" onClick={() => pkg.setPlace(place)}>{copy.places[place]}</button>)}
        </div></fieldset>
        {pkg.type === 'birthday' && <fieldset><legend className="mb-3 text-sm font-semibold">{copy.age}</legend><div className="flex flex-wrap gap-2">
          {(Object.keys(copy.ages) as BirthdayAge[]).map((age) => <button key={age} type="button" aria-pressed={pkg.age === age} className="planner-pill" onClick={() => pkg.setAge(age)}>{copy.ages[age]}</button>)}
        </div></fieldset>}
      </div>
      <div className="mb-4 mt-7 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">{copy.suggested}</h3><span className="text-xs text-ink-500" aria-live="polite">{pkg.checklist.length} {copy.selected}</span></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((c) => {
          const selected = pkg.checklist.includes(c.slug);
          const idea = copy.ideas[c.slug as keyof typeof copy.ideas];
          return <label key={c.slug} className={`planner-option planner-option-${c.slug} ${selected ? 'is-selected' : ''}`}>
            <span className="planner-option-photo" aria-hidden="true" style={{ backgroundImage: `url("${categoryPhoto(c.slug)}")` }} />
            <span className="planner-option-copy flex-1"><strong className="block text-sm">{pickLocalized(c.name, locale)}</strong>{idea && <span className="mt-1 block text-xs leading-relaxed text-ink-500">{idea}</span>}</span>
            <input type="checkbox" checked={selected} onChange={() => pkg.toggleCategory(c.slug)} className="size-5 shrink-0 accent-brand-700" />
          </label>;
        })}
      </div>
      <button type="button" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll} className="mt-5 text-sm font-semibold text-brand-700 underline underline-offset-4">{showAll ? copy.less : copy.all}</button>
    </section>
  );
}
