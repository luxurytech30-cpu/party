'use client';
import { categoryPhoto } from '@/lib/category-photo';
import { intentCopy } from '@/lib/intent-copy';
import { usePackage } from '@/lib/package';
import { useI18n } from '@/lib/providers';

export function VisitIntent() {
  const pkg = usePackage();
  const { locale } = useI18n();
  const copy = intentCopy[locale];
  return <section className="visit-intent" aria-label={copy.question}>
    <p className="section-eyebrow">{copy.question}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      {(['host', 'guest'] as const).map((intent) => <button key={intent} type="button" aria-pressed={pkg.intent === intent} onClick={() => pkg.setIntent(intent)} style={{ backgroundImage: `linear-gradient(90deg, #201529df, #201529b5), url("${categoryPhoto(intent === 'host' ? 'venues' : 'gifts')}")` }}>
        <span><strong>{copy[intent]}</strong><small>{intent === 'host' ? copy.hostSub : copy.guestSub}</small></span><span aria-hidden="true">{pkg.intent === intent ? '✓' : '↗'}</span>
      </button>)}
    </div>
  </section>;
}
