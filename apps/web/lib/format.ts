import type { Locale } from '@party/shared';
import type { FullDictionary } from './i18n';
import type { Pricing } from './types';

export function formatMoney(n: number, locale: Locale) {
  // Western digits for Arabic too — standard usage in Israel.
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-IL-u-nu-latn' : locale === 'he' ? 'he-IL' : 'en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPricing(p: Pricing, t: FullDictionary, locale: Locale): string {
  const m = (n?: number) => (n === undefined ? '' : formatMoney(n, locale));
  return t.price[p.model].replace('{a}', m(p.amount)).replace('{min}', m(p.min)).replace('{max}', m(p.max));
}

export function formatDate(date: string, locale: Locale) {
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, mo - 1, d)),
  );
}

export const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

export function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
