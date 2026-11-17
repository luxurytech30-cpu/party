/**
 * Business capability keys. A capability turns a dashboard module and its
 * API routes on/off. Effective capabilities for a business are:
 *   union(category.allowedCapabilities) ∩ plan.capabilities ∩ business.enabledCapabilities
 */
export const CAPABILITIES = [
  'services',
  'packages',
  'products',
  'inventory',
  'portfolio',
  'booking',
  'calendar',
  'timeSlots',
  'multiDay',
  'capacity',
  'rentals',
  'quotes',
  'negotiation',
  'discounts',
  'reviews',
  'team',
  'analytics',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export type CapabilityMap = Record<Capability, boolean>;

/** Capability dependencies: enabling a key requires the listed keys. */
export const CAPABILITY_DEPENDENCIES: Partial<Record<Capability, Capability[]>> = {
  inventory: ['products'],
  calendar: ['booking'],
  timeSlots: ['booking'],
  multiDay: ['booking'],
  capacity: ['booking'],
  rentals: ['booking', 'multiDay'],
  negotiation: ['quotes'],
};

export function isCapability(value: string): value is Capability {
  return (CAPABILITIES as readonly string[]).includes(value);
}

export interface CapabilityInputs {
  /** Union of allowed capabilities across the business's categories. */
  categoryAllowed: readonly Capability[];
  /** Capabilities included in the business's subscription plan (null = no plan restriction). */
  planAllowed: readonly Capability[] | null;
  /** Capabilities the business owner enabled. */
  enabled: readonly Capability[];
}

/**
 * Resolve effective capabilities. A capability whose dependencies are not
 * effective is also turned off.
 */
export function resolveCapabilities(input: CapabilityInputs): Capability[] {
  const allowed = new Set(input.categoryAllowed);
  const plan = input.planAllowed ? new Set(input.planAllowed) : null;
  let effective = new Set(
    input.enabled.filter((c) => allowed.has(c) && (plan === null || plan.has(c))),
  );

  // Iterate until stable so transitive dependencies are honoured.
  let changed = true;
  while (changed) {
    changed = false;
    for (const cap of effective) {
      const deps = CAPABILITY_DEPENDENCIES[cap] ?? [];
      if (deps.some((d) => !effective.has(d))) {
        effective.delete(cap);
        changed = true;
      }
    }
  }
  return CAPABILITIES.filter((c) => effective.has(c));
}
