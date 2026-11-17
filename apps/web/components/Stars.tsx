'use client';

import { cx } from './ui';

export function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  return (
    <span aria-label={`${value} / 5`} className={cx('inline-flex text-gold-500', size === 'lg' ? 'text-2xl' : 'text-sm')} dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(value) ? '' : 'opacity-25'}>
          ★
        </span>
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="inline-flex gap-1 text-3xl text-gold-500" dir="ltr" role="radiogroup">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={String(i)} onClick={() => onChange(i)} className={i <= value ? '' : 'opacity-25'}>
          ★
        </button>
      ))}
    </span>
  );
}
