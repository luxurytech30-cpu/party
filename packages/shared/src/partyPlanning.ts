import type { EventType } from './schemas.js';

export type PartyPlace = 'undecided' | 'venue' | 'home' | 'outdoors';
export type BirthdayAge = 'little' | 'kids' | 'teens' | 'adults';

/** Suggestions only: nothing is added to a customer's plan automatically. */
export function suggestCategories(type: EventType, place: PartyPlace, age: BirthdayAge): string[] {
  const birthday = age === 'little' || age === 'kids'
    ? ['entertainment', 'workshops', 'party-favors', 'attractions', 'cakes-sweets', 'decoration', 'catering', 'photography']
    : age === 'teens'
      ? ['music', 'workshops', 'cakes-sweets', 'decoration', 'catering', 'photography', 'party-favors']
      : ['cakes-sweets', 'catering', 'music', 'decoration', 'photography', 'gifts'];
  const ideas: Record<EventType, string[]> = {
    birthday,
    wedding: ['photography', 'music', 'catering', 'decoration', 'fashion', 'makeup', 'gifts'],
    engagement: ['decoration', 'photography', 'cakes-sweets', 'catering', 'music'],
    henna: ['decoration', 'music', 'fashion', 'catering', 'makeup'],
    graduation: ['photography', 'music', 'catering', 'decoration', 'cakes-sweets'],
    corporate: ['catering', 'lighting-sound', 'photography', 'workshops', 'equipment'],
    other: ['decoration', 'catering', 'photography', 'music', 'workshops'],
  };
  return [...new Set([
    ...(place === 'venue' ? ['venues'] : []),
    ...ideas[type],
    ...(place === 'home' || place === 'outdoors' ? ['equipment'] : []),
  ])];
}

