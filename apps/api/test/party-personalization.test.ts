import { describe, expect, it } from 'vitest';
import { suggestCategories } from '@party/shared';
import { activateBusiness, api, createBusiness, createCategory, futureDate, registerUser } from './helpers.js';

describe('personal celebration planning', () => {
  it('keeps multiple services from one vendor and validates their ownership', async () => {
    const owner = await registerUser();
    const category = await createCategory('entertainment');
    const business = await createBusiness(owner, String(category._id));
    const other = await createBusiness(owner, String(category._id), 'Other vendor');
    await activateBusiness(business._id);
    await activateBusiness(other._id);
    const { Offering } = await import('../src/modules/offerings/offering.model.js');
    const services = await Offering.create([
      { businessId: business._id, kind: 'service', title: { en: 'Magic show' }, pricing: { model: 'fixed', amount: 600 } },
      { businessId: business._id, kind: 'service', title: { en: 'Face painting' }, pricing: { model: 'fixed', amount: 300 } },
    ]);
    const plan = await api().post('/api/v1/events').set(owner.auth).send({ type: 'birthday', title: 'Two services', categorySlugs: ['entertainment'] }).expect(201);
    const eventId = plan.body.event._id;
    const itemId = plan.body.event.items[0]._id;
    const path = `/api/v1/events/${eventId}/items/${itemId}/candidates`;
    await api().post(path).set(owner.auth).send({ businessId: business._id, offeringId: String(services[0]!._id) }).expect(201);
    const saved = await api().post(path).set(owner.auth).send({ businessId: business._id, offeringId: String(services[1]!._id) }).expect(201);
    expect(saved.body.event.items[0].candidates.map((c: { offeringId: string }) => c.offeringId)).toEqual(services.map((s) => String(s._id)));
    await api().post(path).set(owner.auth).send({ businessId: business._id, offeringId: String(services[0]!._id) }).expect(409);
    await api().post(path).set(owner.auth).send({ businessId: other._id, offeringId: String(services[0]!._id) }).expect(404);
    const remaining = await api().delete(`${path}/${business._id}?offeringId=${services[0]!._id}`).set(owner.auth).expect(200);
    expect(remaining.body.event.items[0].candidates).toHaveLength(1);
    expect(remaining.body.event.items[0].candidates[0].offeringId).toBe(String(services[1]!._id));
  });
  it('suggests child-friendly extras and respects an existing place', () => {
    const children = suggestCategories('birthday', 'home', 'little');
    expect(children).toEqual(expect.arrayContaining(['entertainment', 'party-favors', 'workshops', 'attractions', 'equipment']));
    expect(children).not.toContain('venues');
    expect(suggestCategories('birthday', 'venue', 'adults')).toContain('venues');
    expect(suggestCategories('birthday', 'outdoors', 'adults')).not.toContain('attractions');
  });

  it('saves only selected categories, with no compulsory venue or other default items', async () => {
    const user = await registerUser();
    const favors = await createCategory('party-favors');
    await createCategory('venues');
    await createCategory('cakes-sweets');
    const result = await api().post('/api/v1/events').set(user.auth).send({
      type: 'birthday', title: 'Birthday at home', categorySlugs: ['party-favors', 'party-favors'],
    }).expect(201);
    expect(result.body.event.items).toHaveLength(1);
    expect(result.body.event.items[0].categoryId).toBe(String(favors._id));
    const empty = await api().post('/api/v1/events').set(user.auth).send({
      type: 'birthday', title: 'Still deciding', categorySlugs: [],
    }).expect(201);
    expect(empty.body.event.items).toEqual([]);
  });

  it('searches selected extras with availability, without adding venue results', async () => {
    const user = await registerUser();
    const entertainment = await createCategory('entertainment');
    const venue = await createCategory('venues');
    const show = await createBusiness(user, String(entertainment._id), 'Bubble show');
    const hall = await createBusiness(user, String(venue._id), 'Birthday hall');
    await activateBusiness(show._id);
    await activateBusiness(hall._id);
    const date = futureDate(10);
    const result = await api().get(`/api/v1/public/businesses?type=birthday&categories=entertainment&date=${date}`).expect(200);
    expect(result.body.items.map((b: { slug: string }) => b.slug)).toEqual([show.slug]);
    expect(result.body.items[0].dateStatus).toBe('available');
  });
});
