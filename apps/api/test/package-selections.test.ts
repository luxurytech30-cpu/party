import { describe, expect, it } from 'vitest';
import { addPick, normalizePicks, removePick, type PackagePick } from '@party/shared';

const first: PackagePick = { businessId: 'one', slug: 'one', name: { en: 'One' }, startingPrice: 100 };
const second: PackagePick = { businessId: 'two', slug: 'two', name: { en: 'Two' }, startingPrice: 200 };

describe('multiple selections per category', () => {
  it('keeps two businesses and removes only the requested one', () => {
    const picks = addPick(addPick({}, 'music', first), 'music', second);
    expect(picks.music).toEqual([first, second]);
    expect(removePick(picks, 'music', first.businessId).music).toEqual([second]);
  });
  it('keeps distinct services from one business without duplicates or a general placeholder', () => {
    const show = { ...first, offeringId: 'show', offeringTitle: { en: 'Show' } };
    const workshop = { ...first, offeringId: 'workshop', offeringTitle: { en: 'Workshop' } };
    let picks = addPick(addPick({}, 'entertainment', first), 'entertainment', show);
    picks = addPick(addPick(picks, 'entertainment', workshop), 'entertainment', show);
    expect(picks.entertainment).toEqual([show, workshop]);
    expect(removePick(picks, 'entertainment', 'one', 'show').entertainment).toEqual([workshop]);
  });
  it('migrates previously saved single-business choices without losing them', () => {
    expect(normalizePicks({ music: first, gifts: [second] })).toEqual({ music: [first], gifts: [second] });
  });
});
