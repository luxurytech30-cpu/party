import { describe, expect, it } from 'vitest';
import { localeDirection, pickLocalized, pricingSchema, resolveCapabilities, roleHasPermission } from '@party/shared';

describe('resolveCapabilities', () => {
  it('intersects category, plan and enabled sets', () => {
    expect(
      resolveCapabilities({
        categoryAllowed: ['services', 'booking', 'products'],
        planAllowed: ['services', 'booking'],
        enabled: ['services', 'booking', 'products', 'rentals'],
      }),
    ).toEqual(['services', 'booking']);
  });

  it('drops capabilities whose dependencies are not effective (transitively)', () => {
    expect(
      resolveCapabilities({
        categoryAllowed: ['rentals', 'multiDay', 'calendar'],
        planAllowed: null,
        enabled: ['rentals', 'multiDay', 'calendar'],
      }),
    ).toEqual([]);
  });
});

describe('permissions', () => {
  it('maps roles to permissions', () => {
    expect(roleHasPermission('owner', 'team.manage')).toBe(true);
    expect(roleHasPermission('manager', 'team.manage')).toBe(false);
    expect(roleHasPermission('staff', 'bookings.manage')).toBe(true);
    expect(roleHasPermission('viewer', 'bookings.manage')).toBe(false);
  });
});

describe('locales', () => {
  it('direction and fallback', () => {
    expect(localeDirection('ar')).toBe('rtl');
    expect(localeDirection('he')).toBe('rtl');
    expect(localeDirection('en')).toBe('ltr');
    expect(pickLocalized({ en: 'Hall' }, 'he')).toBe('Hall');
    expect(pickLocalized({ ar: 'قاعة', en: 'Hall' }, 'he')).toBe('قاعة');
  });
});

describe('pricingSchema', () => {
  it('validates per model', () => {
    expect(pricingSchema.safeParse({ model: 'fixed', amount: 100 }).success).toBe(true);
    expect(pricingSchema.safeParse({ model: 'fixed' }).success).toBe(false);
    expect(pricingSchema.safeParse({ model: 'range', min: 500, max: 100 }).success).toBe(false);
    expect(pricingSchema.safeParse({ model: 'quote_only' }).success).toBe(true);
  });
});
