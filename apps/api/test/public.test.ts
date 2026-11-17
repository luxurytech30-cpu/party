import { beforeEach, describe, expect, it } from 'vitest';
import { activateBusiness, api, createBusiness, createCategory, futureDate, registerUser, type TestUser } from './helpers.js';

describe('public discovery & favorites', () => {
  let owner: TestUser;
  let active: { _id: string; slug: string };
  let pending: { _id: string; slug: string };

  beforeEach(async () => {
    await createCategory('photography');
    const cat = await createCategory('venues-test');
    owner = await registerUser();
    active = await createBusiness(owner, String(cat._id), 'Golden Hall');
    pending = await createBusiness(owner, String(cat._id), 'Hidden Hall');
    await activateBusiness(active._id);
    await api()
      .post(`/api/v1/businesses/${active._id}/offerings`)
      .set(owner.auth)
      .send({ kind: 'service', title: { en: 'Hall rental' }, pricing: { model: 'per_person', amount: 150 } })
      .expect(201);
  });

  it('lists only active businesses with filters and no private fields', async () => {
    const all = await api().get('/api/v1/public/businesses').expect(200);
    expect(all.body.total).toBe(1);
    const b = all.body.items[0];
    expect(b.slug).toBe(active.slug);
    expect(b.startingPrice).toBe(150);
    for (const k of ['enabledCapabilities', 'createdBy', 'status', 'contact', 'attributes']) expect(b[k]).toBeUndefined();

    expect((await api().get('/api/v1/public/businesses?q=golden').expect(200)).body.total).toBe(1);
    expect((await api().get('/api/v1/public/businesses?q=hidden').expect(200)).body.total).toBe(0);
    expect((await api().get('/api/v1/public/businesses?city=nazareth').expect(200)).body.total).toBe(1);
    expect((await api().get('/api/v1/public/businesses?city=eilat').expect(200)).body.total).toBe(0);
    expect((await api().get('/api/v1/public/businesses?maxPrice=100').expect(200)).body.total).toBe(0);
    expect((await api().get('/api/v1/public/businesses?category=venues-test').expect(200)).body.total).toBe(1);
    expect((await api().get('/api/v1/public/businesses?category=photography').expect(200)).body.total).toBe(0);
    expect((await api().get('/api/v1/public/businesses?q=.*').expect(200)).body.total).toBe(0); // regex escaped
  });

  it('combines occasion categories with date availability', async () => {
    const { Business } = await import('../src/modules/businesses/business.model.js');
    const venues = await createCategory('venues');
    await Business.updateOne({ _id: active._id }, { $set: { categoryIds: [venues._id] } });
    const date = futureDate(7);
    const result = await api().get(`/api/v1/public/businesses?type=birthday&date=${date}`).expect(200);
    expect(result.body.items.map((b: { slug: string }) => b.slug)).toContain(active.slug);
    await api().post(`/api/v1/businesses/${active._id}/bookings`).set(owner.auth)
      .send({ date, customerName: 'Birthday customer' }).expect(201);
    expect((await api().get(`/api/v1/public/businesses?type=birthday&date=${date}`).expect(200)).body.total).toBe(0);
    await api().get('/api/v1/public/businesses?type=invalid').expect(400);
  });

  it('filters by reported availability on a date', async () => {
    const d = futureDate(5);
    expect((await api().get(`/api/v1/public/businesses?date=${d}`).expect(200)).body.items[0].dateStatus).toBe('available');
    await api().post(`/api/v1/businesses/${active._id}/bookings`).set(owner.auth).send({ date: d, customerName: 'X' }).expect(201);
    expect((await api().get(`/api/v1/public/businesses?date=${d}`).expect(200)).body.total).toBe(0);
  });

  it('shows the public profile only for active businesses', async () => {
    const res = await api().get(`/api/v1/public/businesses/${active.slug}`).expect(200);
    expect(res.body.offerings).toHaveLength(1);
    expect(res.body.features.booking).toBe(true);
    expect(res.body.business.enabledCapabilities).toBeUndefined();
    await api().get(`/api/v1/public/businesses/${pending.slug}`).expect(404);
  });

  it('favorites are per customer', async () => {
    const c1 = await registerUser();
    const c2 = await registerUser();
    await api().put(`/api/v1/me/favorites/${active._id}`).set(c1.auth).expect(204);
    await api().put(`/api/v1/me/favorites/${active._id}`).set(c1.auth).expect(204); // idempotent
    await api().put(`/api/v1/me/favorites/${pending._id}`).set(c1.auth).expect(404);
    expect((await api().get('/api/v1/me/favorites').set(c1.auth).expect(200)).body.items).toHaveLength(1);
    expect((await api().get('/api/v1/me/favorites').set(c2.auth).expect(200)).body.items).toHaveLength(0);
    await api().delete(`/api/v1/me/favorites/${active._id}`).set(c1.auth).expect(204);
    expect((await api().get('/api/v1/me/favorites').set(c1.auth).expect(200)).body.items).toHaveLength(0);
  });

  it('media signing reports missing Cloudinary config instead of faking uploads', async () => {
    const res = await api().post(`/api/v1/businesses/${active._id}/media/sign`).set(owner.auth).expect(503);
    expect(res.body.error.message).toContain('Cloudinary');
    const list = await api().get(`/api/v1/businesses/${active._id}/media`).set(owner.auth).expect(200);
    expect(list.body.uploadsEnabled).toBe(false);
  });
});

describe('home feed', () => {
  it('returns one row per category, party-type categories first, only active businesses', async () => {
    const photo = await createCategory('photography');
    await createCategory('venues');
    await createCategory('gifts');
    const owner = await registerUser();
    const a = await createBusiness(owner, String(photo._id), 'Lens');
    await createBusiness(owner, String(photo._id), 'Pending Lens');
    await activateBusiness(a._id);

    const res = await api().get('/api/v1/public/home?type=wedding').expect(200);
    const slugs = res.body.rows.map((r: { category: { slug: string } }) => r.category.slug);
    expect(slugs.slice(0, 2)).toEqual(['venues', 'photography']); // wedding planning order
    const photoRow = res.body.rows.find((r: { category: { slug: string } }) => r.category.slug === 'photography');
    expect(photoRow.required).toBe(true);
    expect(photoRow.businesses).toHaveLength(1);
    expect(photoRow.businesses[0].enabledCapabilities).toBeUndefined();
    await api().get('/api/v1/public/home?type=nope').expect(400);
  });
});
