import { beforeEach, describe, expect, it } from 'vitest';
import { Business } from '../src/modules/businesses/business.model.js';
import { api, createBusiness, createCategory, registerUser, type TestUser } from './helpers.js';

describe('offerings', () => {
  let owner: TestUser;
  let other: TestUser;
  let bizId: string;
  let otherBizId: string;

  beforeEach(async () => {
    const cat = await createCategory();
    owner = await registerUser();
    other = await registerUser();
    bizId = (await createBusiness(owner, String(cat._id)))._id;
    otherBizId = (await createBusiness(other, String(cat._id)))._id;
  });

  const service = (amount: number) => ({
    kind: 'service',
    title: { ar: 'تصوير عرس', en: 'Wedding shoot' },
    pricing: { model: 'starting_from', amount },
    durationMinutes: 240,
  });

  it('creates, lists, updates and deletes; keeps startingPrice in sync', async () => {
    const a = await api().post(`/api/v1/businesses/${bizId}/offerings`).set(owner.auth).send(service(3000)).expect(201);
    await api().post(`/api/v1/businesses/${bizId}/offerings`).set(owner.auth).send(service(2500)).expect(201);
    expect((await Business.findById(bizId).lean())!.startingPrice).toBe(2500);

    const list = await api().get(`/api/v1/businesses/${bizId}/offerings`).set(owner.auth).expect(200);
    expect(list.body.items).toHaveLength(2);

    await api().patch(`/api/v1/businesses/${bizId}/offerings/${a.body.offering._id}`).set(owner.auth).send({ pricing: { model: 'fixed', amount: 1000 } }).expect(200);
    expect((await Business.findById(bizId).lean())!.startingPrice).toBe(1000);

    await api().delete(`/api/v1/businesses/${bizId}/offerings/${a.body.offering._id}`).set(owner.auth).expect(204);
    expect((await Business.findById(bizId).lean())!.startingPrice).toBe(2500);
  });

  it('validates pricing and blocks kinds whose capability is disabled', async () => {
    await api().post(`/api/v1/businesses/${bizId}/offerings`).set(owner.auth).send({ ...service(1), pricing: { model: 'fixed' } }).expect(400);
    // Test category does not allow "products".
    const res = await api()
      .post(`/api/v1/businesses/${bizId}/offerings`)
      .set(owner.auth)
      .send({ kind: 'product', title: { en: 'Cake' }, pricing: { model: 'fixed', amount: 100 } })
      .expect(403);
    expect(res.body.error.code).toBe('CAPABILITY_DISABLED');
  });

  it('isolates offerings between businesses (IDOR)', async () => {
    const theirs = await api().post(`/api/v1/businesses/${otherBizId}/offerings`).set(other.auth).send(service(500)).expect(201);
    const id = theirs.body.offering._id;
    await api().patch(`/api/v1/businesses/${bizId}/offerings/${id}`).set(owner.auth).send({ active: false }).expect(404);
    await api().delete(`/api/v1/businesses/${bizId}/offerings/${id}`).set(owner.auth).expect(404);
    await api().get(`/api/v1/businesses/${otherBizId}/offerings`).set(owner.auth).expect(404);
    const list = await api().get(`/api/v1/businesses/${bizId}/offerings`).set(owner.auth).expect(200);
    expect(list.body.items).toHaveLength(0);
  });
});
