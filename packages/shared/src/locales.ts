export const LOCALES = ['ar', 'he', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ar';

export const RTL_LOCALES: readonly Locale[] = ['ar', 'he'];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function localeDirection(locale: Locale): 'rtl' | 'ltr' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
}

/** Multilingual text. At least one locale must be present (validated by schema). */
export type LocalizedText = Partial<Record<Locale, string>>;

/** Pick the best available translation, falling back through DEFAULT_LOCALE then any value. */
export function pickLocalized(text: LocalizedText | undefined, locale: Locale): string {
  if (!text) return '';
  return text[locale] ?? text[DEFAULT_LOCALE] ?? Object.values(text).find(Boolean) ?? '';
}
