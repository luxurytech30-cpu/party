import { beforeEach, describe, expect, it } from 'vitest';
import { Booking } from '../src/modules/bookings/booking.model.js';
import { activateBusiness, api, createBusiness, createCategory, futureDate, registerUser, type TestUser } from './helpers.js';

describe('availability & bookings', () => {
  let owner: TestUser;
  let customer: TestUser;
  let biz: { _id: string; slug: string };
  const day = futureDate(10);

  beforeEach(async () => {
    const cat = await createCategory();
    owner = await registerUser();
    customer = await registerUser();
    biz = await createBusiness(owner, String(cat._id));
    await activateBusiness(biz._id);
  });

  const request = (u: TestUser, date = day) =>
    api().post('/api/v1/bookings').set(u.auth).send({ businessId: biz._id, date, guestCount: 200 });

  it('does not accept requests for inactive (pending) businesses', async () => {
    const owner2 = await registerUser();
    const cat = await createCategory();
    const pending = await createBusiness(owner2, String(cat._id));
    await api().post('/api/v1/bookings').set(customer.auth).send({ businessId: pending._id, date: day }).expect(404);
  });

  it('request → pending day → confirm → booked day; a request is never auto-confirmed', async () => {
    const r = await request(customer).expect(201);
    expect(r.body.booking.status).toBe('requested');

    let av = await api().get(`/api/v1/public/businesses/${biz.slug}/availability?from=${day}&to=${day}`).expect(200);
    expect(av.body.days[day]).toBe('pending');

    await api().post(`/api/v1/businesses/${biz._id}/bookings/${r.body.booking._id}/confirm`).set(owner.auth).expect(200);
    av = await api().get(`/api/v1/public/businesses/${biz.slug}/availability?from=${day}&to=${day}`).expect(200);
    expect(av.body.days[day]).toBe('booked');

    // Fully booked day rejects new requests.
    const late = await registerUser();
    const res = await request(late).expect(409);
    expect(res.body.error.code).toBe('BOOKING_CONFLICT');

    const mine = await api().get('/api/v1/bookings/mine').set(customer.auth).expect(200);
    expect(mine.body.items[0].status).toBe('confirmed');
  });

  it('prevents double confirmation under concurrency (exactly one wins)', async () => {
    const customers = await Promise.all([1, 2, 3, 4, 5].map(() => registerUser()));
    const ids: string[] = [];
    for (const c of customers) ids.push((await request(c).expect(201)).body.booking._id);

    const results = await Promise.all(
      ids.map((id) => api().post(`/api/v1/businesses/${biz._id}/bookings/${id}/confirm`).set(owner.auth)),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect(await Booking.countDocuments({ businessId: biz._id, date: day, status: 'confirmed' })).toBe(1);
  });

  it('respects daily capacity under concurrency (manual + confirmations)', async () => {
    await api()
      .put(`/api/v1/businesses/${biz._id}/availability`)
      .set(owner.auth)
      .send({ openWeekdays: [0, 1, 2, 3, 4, 5, 6], blockedDates: [], dailyCapacity: 2 })
      .expect(200);
    const customers = await Promise.all([1, 2, 3].map(() => registerUser()));
    const ids: string[] = [];
    for (const c of customers) ids.push((await request(c).expect(201)).body.booking._id);

    const results = await Promise.all([
      ...ids.map((id) => api().post(`/api/v1/businesses/${biz._id}/bookings/${id}/confirm`).set(owner.auth)),
      api().post(`/api/v1/businesses/${biz._id}/bookings`).set(owner.auth).send({ date: day, customerName: 'Walk-in' }),
    ]);
    expect(results.filter((r) => r.status === 200 || r.status === 201)).toHaveLength(2);
    expect(await Booking.countDocuments({ businessId: biz._id, date: day, status: 'confirmed' })).toBe(2);
  });

  it('blocked dates and closed weekdays are unavailable', async () => {
    const blocked = futureDate(12);
    await api()
      .put(`/api/v1/businesses/${biz._id}/availability`)
      .set(owner.auth)
      .send({ openWeekdays: [0, 1, 2, 3, 4, 5, 6], blockedDates: [blocked], dailyCapacity: 1 })
      .expect(200);
    await request(customer, blocked).expect(409);
    await request(customer, '2020-01-01').expect(409); // past
    await api().post(`/api/v1/businesses/${biz._id}/bookings`).set(owner.auth).send({ date: blocked, customerName: 'X' }).expect(409);
  });

  it('enforces tenant isolation and customer ownership', async () => {
    const r = await request(customer).expect(201);
    const id = r.body.booking._id;

    const otherOwner = await registerUser();
    const cat = await createCategory();
    const otherBiz = await createBusiness(otherOwner, String(cat._id));
    // Other business cannot see or act on this booking, even via its own URL.
    await api().post(`/api/v1/businesses/${otherBiz._id}/bookings/${id}/confirm`).set(otherOwner.auth).expect(404);
    await api().get(`/api/v1/businesses/${biz._id}/bookings`).set(otherOwner.auth).expect(404);
    const theirList = await api().get(`/api/v1/businesses/${otherBiz._id}/bookings`).set(otherOwner.auth).expect(200);
    expect(theirList.body.items).toHaveLength(0);

    // Another customer cannot cancel it.
    const stranger = await registerUser();
    await api().post(`/api/v1/bookings/${id}/cancel`).set(stranger.auth).expect(404);
    await api().post(`/api/v1/bookings/${id}/cancel`).set(customer.auth).expect(200);
    // Cancelled → cannot be confirmed.
    await api().post(`/api/v1/businesses/${biz._id}/bookings/${id}/confirm`).set(owner.auth).expect(409);
  });

  it('business sees customer contact details for its own bookings', async () => {
    await request(customer).expect(201);
    const list = await api().get(`/api/v1/businesses/${biz._id}/bookings`).set(owner.auth).expect(200);
    expect(list.body.items[0].customer.email).toBe(customer.email);
  });
});
