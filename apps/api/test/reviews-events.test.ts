import { beforeEach, describe, expect, it } from 'vitest';
import { Booking } from '../src/modules/bookings/booking.model.js';
import { Business } from '../src/modules/businesses/business.model.js';
import { activateBusiness, api, createBusiness, createCategory, futureDate, makeAdmin, registerUser, type TestUser } from './helpers.js';

describe('reviews', () => {
  let owner: TestUser;
  let customer: TestUser;
  let biz: { _id: string; slug: string };

  beforeEach(async () => {
    const cat = await createCategory();
    owner = await registerUser();
    customer = await registerUser({ name: 'Lina Haddad' });
    biz = await createBusiness(owner, String(cat._id));
    await activateBusiness(biz._id);
  });

  async function completedBooking(u: TestUser) {
    const date = futureDate(Math.floor(Math.random() * 300) + 5);
    const b = (await api().post('/api/v1/bookings').set(u.auth).send({ businessId: biz._id, date }).expect(201)).body.booking;
    await api().post(`/api/v1/businesses/${biz._id}/bookings/${b._id}/confirm`).set(owner.auth).expect(200);
    await Booking.updateOne({ _id: b._id }, { $set: { status: 'completed' } });
    return b._id as string;
  }

  it('only completed bookings can be reviewed, once; rating is recomputed', async () => {
    const pending = (await api().post('/api/v1/bookings').set(customer.auth).send({ businessId: biz._id, date: futureDate(3) }).expect(201)).body.booking;
    await api().post('/api/v1/reviews').set(customer.auth).send({ bookingId: pending._id, rating: 5 }).expect(409);

    const bookingId = await completedBooking(customer);
    const stranger = await registerUser();
    await api().post('/api/v1/reviews').set(stranger.auth).send({ bookingId, rating: 1 }).expect(404);
    await api().post('/api/v1/reviews').set(customer.auth).send({ bookingId, rating: 4, text: 'Great hall' }).expect(201);
    await api().post('/api/v1/reviews').set(customer.auth).send({ bookingId, rating: 5 }).expect(409);

    const pub = await api().get(`/api/v1/public/businesses/${biz.slug}/reviews`).expect(200);
    expect(pub.body.items[0]).toMatchObject({ rating: 4, author: 'Lina' });
    expect(JSON.stringify(pub.body)).not.toContain(customer.email);
    expect((await Business.findById(biz._id).lean())!.rating).toMatchObject({ avg: 4, count: 1 });

    const mine = await api().get('/api/v1/bookings/mine').set(customer.auth).expect(200);
    expect(mine.body.items.find((b: { _id: string }) => b._id === bookingId).reviewed).toBe(true);
  });

  it('business can reply; admin can hide (rating recomputed)', async () => {
    const bookingId = await completedBooking(customer);
    const review = (await api().post('/api/v1/reviews').set(customer.auth).send({ bookingId, rating: 2 }).expect(201)).body.review;
    await api().post(`/api/v1/businesses/${biz._id}/reviews/${review._id}/reply`).set(owner.auth).send({ text: 'Sorry!' }).expect(200);

    await api().patch(`/api/v1/admin/reviews/${review._id}`).set(owner.auth).send({ status: 'hidden' }).expect(403);
    const admin = await registerUser();
    await makeAdmin(admin);
    await api().patch(`/api/v1/admin/reviews/${review._id}`).set(admin.auth).send({ status: 'hidden' }).expect(200);
    expect((await Business.findById(biz._id).lean())!.rating).toMatchObject({ avg: 0, count: 0 });
    expect((await api().get(`/api/v1/public/businesses/${biz.slug}/reviews`).expect(200)).body.items).toHaveLength(0);
  });
});

describe('event planner', () => {
  it('creates from template, shortlists vendors, derives status from real bookings, tracks budget', async () => {
    const venues = await createCategory('venues');
    await createCategory('photography');
    const owner = await registerUser();
    const customer = await registerUser();
    const biz = await createBusiness(owner, String(venues._id));
    await activateBusiness(biz._id);
    await Business.updateOne({ _id: biz._id }, { $set: { startingPrice: 15000 } });
    const date = futureDate(60);

    let r = await api().post('/api/v1/events').set(customer.auth).send({ type: 'wedding', title: 'Our wedding', date, budget: 50000 }).expect(201);
    const ev = r.body.event;
    expect(ev.items.map((i: { label: string }) => i.label)).toEqual(['Photography', 'Photography']); // test categories share a name
    const venueItem = ev.items.find((i: { categoryId: string }) => i.categoryId === String(venues._id));

    r = await api().post(`/api/v1/events/${ev._id}/items/${venueItem._id}/candidates`).set(customer.auth).send({ businessId: biz._id }).expect(201);
    let item = r.body.event.items.find((i: { _id: string }) => i._id === venueItem._id);
    expect(item.status).toBe('shortlisted'); // saved ≠ booked
    expect(r.body.summary).toMatchObject({ estimatedTotal: 15000, remaining: 35000, booked: 0 });

    const b = (await api().post('/api/v1/bookings').set(customer.auth).send({ businessId: biz._id, date }).expect(201)).body.booking;
    r = await api().get(`/api/v1/events/${ev._id}`).set(customer.auth).expect(200);
    expect(r.body.event.items.find((i: { _id: string }) => i._id === venueItem._id).status).toBe('requested');

    await api().post(`/api/v1/businesses/${biz._id}/bookings/${b._id}/confirm`).set(owner.auth).expect(200);
    r = await api().get(`/api/v1/events/${ev._id}`).set(customer.auth).expect(200);
    item = r.body.event.items.find((i: { _id: string }) => i._id === venueItem._id);
    expect(item.status).toBe('booked');
    expect(r.body.summary.booked).toBe(1);

    // Custom item + removal, and ownership isolation.
    r = await api().post(`/api/v1/events/${ev._id}/items`).set(customer.auth).send({ label: 'Henna night dress', estimatedCost: 2000 }).expect(201);
    expect(r.body.summary.estimatedTotal).toBe(17000);
    const stranger = await registerUser();
    await api().get(`/api/v1/events/${ev._id}`).set(stranger.auth).expect(404);
    await api().delete(`/api/v1/events/${ev._id}`).set(stranger.auth).expect(404);
    await api().delete(`/api/v1/events/${ev._id}/items/${venueItem._id}/candidates/${biz._id}`).set(customer.auth).expect(200);
  });
});
