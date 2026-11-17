import type { LocalizedText } from './locales.js';

export interface PackagePick {
  businessId: string;
  slug: string;
  name: LocalizedText;
  startingPrice?: number;
  offeringId?: string;
  offeringTitle?: LocalizedText;
  priceLabel?: string;
}
export type PackagePicks = Record<string, PackagePick[]>;
export const pickKey = (pick: PackagePick) => `${pick.businessId}:${pick.offeringId ?? 'business'}`;

export function normalizePicks(raw: Record<string, PackagePick | PackagePick[]> = {}): PackagePicks {
  return Object.fromEntries(Object.entries(raw).map(([slug, value]) => [slug, Array.isArray(value) ? value : [value]]));
}
export function addPick(picks: PackagePicks, slug: string, pick: PackagePick): PackagePicks {
  let current = picks[slug] ?? [];
  if (current.some((item) => pickKey(item) === pickKey(pick))) return picks;
  // Specific services replace the same business's general placeholder, never another vendor.
  if (pick.offeringId) current = current.filter((item) => item.businessId !== pick.businessId || item.offeringId);
  else if (current.some((item) => item.businessId === pick.businessId)) return picks;
  return { ...picks, [slug]: [...current, pick] };
}
export function removePick(picks: PackagePicks, slug: string, businessId?: string, offeringId?: string): PackagePicks {
  const remaining = (picks[slug] ?? []).filter((item) => businessId && (item.businessId !== businessId || (offeringId !== undefined && item.offeringId !== offeringId)));
  const next = { ...picks };
  if (remaining.length) next[slug] = remaining;
  else delete next[slug];
  return next;
}
