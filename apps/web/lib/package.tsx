'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EVENT_TYPES, type EventType } from '@party/shared';

import { addPick, normalizePicks, removePick, type PackagePick, type PackagePicks } from './package-selections';
import type { BirthdayAge, PartyPlace } from './party-options';

/**
 * "My package": a planning checklist for the chosen party type.
 * Lives in localStorage so it works before login; can be saved as an event plan.
 * A picked vendor is a *shortlist*, never a booking.
 */
export type { PackagePick } from './package-selections';
export type ManualMark = 'done' | 'skip';

interface PackageState {
  type: EventType | null;
  place: PartyPlace;
  age: BirthdayAge;
  intent: 'host' | 'guest';
  picks: PackagePicks; // host plan
  giftPicks: PackagePicks; // guest shortlist kept separate
  marks: Record<string, ManualMark>; // by category slug
  extra: string[]; // explicitly selected category slugs
}

const EMPTY: PackageState = { type: null, place: 'undecided', age: 'kids', intent: 'host', picks: {}, giftPicks: {}, marks: {}, extra: [] };
const KEY = 'party.package.v1';

function load(): PackageState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as PackageState;
    if (parsed.type && !(EVENT_TYPES as readonly string[]).includes(parsed.type)) return EMPTY;
    return { ...EMPTY, ...parsed, picks: normalizePicks(parsed.picks), giftPicks: normalizePicks(parsed.giftPicks), extra: [...new Set([...(parsed.extra ?? []), ...Object.keys(parsed.picks ?? {}), ...Object.keys(parsed.marks ?? {}).filter((k) => parsed.marks[k] === 'done')])] };
  } catch {
    return EMPTY;
  }
}

interface PackageValue extends PackageState {
  ready: boolean;
  /** Only categories explicitly selected by the customer. */
  checklist: string[];
  doneCount: number;
  setType: (t: EventType) => void;
  setIntent: (intent: 'host' | 'guest') => void;
  setPlace: (place: PartyPlace) => void;
  setAge: (age: BirthdayAge) => void;
  toggleCategory: (slug: string) => void;
  pick: (categorySlug: string, p: PackagePick) => void;
  unpick: (categorySlug: string, businessId?: string, offeringId?: string) => void;
  mark: (categorySlug: string, m: ManualMark | null) => void;
  isPicked: (businessId: string) => boolean;
  clear: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
}

const Ctx = createContext<PackageValue | null>(null);

export function usePackage() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePackage outside provider');
  return v;
}

export function PackageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PackageState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — package stays in memory */
    }
  }, [state, ready]);

  const setIntent = useCallback((intent: 'host' | 'guest') => setState((s) => ({ ...s, intent })), []);
  const setType = useCallback((type: EventType) => setState((s) => ({ ...s, type })), []);
  const setPlace = useCallback((place: PartyPlace) => setState((s) => {
    if (place !== 'home' && place !== 'outdoors') return { ...s, place };
    const { venues: _pick, ...picks } = s.picks;
    const { venues: _mark, ...marks } = s.marks;
    return { ...s, place, picks, marks, extra: s.extra.filter((slug) => slug !== 'venues') };
  }), []);
  const setAge = useCallback((age: BirthdayAge) => setState((s) => ({ ...s, age })), []);
  const toggleCategory = useCallback((slug: string) => setState((s) => {
    if (s.intent === 'guest') return { ...s, giftPicks: removePick(s.giftPicks, slug) };
    if (s.marks[slug] === 'skip') {
      const { [slug]: _skip, ...marks } = s.marks;
      return { ...s, marks, extra: s.extra.includes(slug) ? s.extra : [...s.extra, slug] };
    }
    if (!s.extra.includes(slug)) return { ...s, extra: [...s.extra, slug] };
    const { [slug]: _pick, ...picks } = s.picks;
    const { [slug]: _mark, ...marks } = s.marks;
    return { ...s, extra: s.extra.filter((item) => item !== slug), picks, marks };
  }), []);
  const pick = useCallback((slug: string, p: PackagePick) => setState((s) => {
    if (s.intent === 'guest') return { ...s, giftPicks: addPick(s.giftPicks, slug, p) };
    const { [slug]: _mark, ...marks } = s.marks;
    return { ...s, picks: addPick(s.picks, slug, p), marks, extra: s.extra.includes(slug) ? s.extra : [...s.extra, slug] };
  }), []);
  const unpick = useCallback((slug: string, businessId?: string, offeringId?: string) => setState((s) =>
    s.intent === 'guest' ? { ...s, giftPicks: removePick(s.giftPicks, slug, businessId, offeringId) }
      : { ...s, picks: removePick(s.picks, slug, businessId, offeringId) }), []);
  const mark = useCallback(
    (slug: string, m: ManualMark | null) =>
      setState((s) => {
        const { [slug]: _x, ...marks } = s.marks;
        return { ...s, marks: m ? { ...marks, [slug]: m } : marks };
      }),
    [],
  );
  const clear = useCallback(() => setState((s) => s.intent === 'guest' ? { ...s, giftPicks: {} } : { ...EMPTY, type: s.type, giftPicks: s.giftPicks }), []);

  const value = useMemo<PackageValue>(() => {
    const picks = state.intent === 'guest' ? state.giftPicks : state.picks;
    const checklist = state.intent === 'guest' ? Object.keys(picks) : state.extra.filter((slug) => state.marks[slug] !== 'skip');
    const doneCount = checklist.filter((slug) => picks[slug]?.length || state.marks[slug]).length;
    return {
      ...state,
      picks,
      ready,
      checklist,
      doneCount,
      setType,
      setIntent,
      setPlace,
      setAge,
      toggleCategory,
      pick,
      unpick,
      mark,
      clear,
      isPicked: (id) => Object.values(picks).flat().some((p) => p.businessId === id),
      drawerOpen,
      setDrawerOpen,
    };
  }, [state, ready, setType, setIntent, setPlace, setAge, toggleCategory, pick, unpick, mark, clear, drawerOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
