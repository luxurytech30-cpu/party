import { beforeEach, describe, expect, it } from 'vitest';
import { Booking } from '../src/modules/bookings/booking.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import { activateBusiness, api, createBusiness, createCategory, futureDate, registerUser, type TestUser } from './helpers.js';

describe('quotes & negotiation', () => {
  let owner: TestUser;
  let customer: TestUser;
  let biz: { _id: string };
  const date = futureDate(30);

  beforeEach(async () => {
    const cat = await createCategory(undefined, undefined, ['services', 'booking', 'calendar', 'quotes', 'negotiation']);
    owner = await registerUser();
    customer = await registerUser();
    biz = await createBusiness(owner, String(cat._id));
    await activateBusiness(biz._id);
  });

  const requestQuote = (u = customer) =>
    api()
      .post('/api/v1/quotes')
      .set(u.auth)
      .send({ businessId: biz._id, eventDate: date, guestCount: 250, budget: 20000, requirements: 'Wedding for 250 guests, need full day.' });

  it('full flow: request → offer → counter → counter-counter → accept → booking REQUEST (not confirmed)', async () => {
    const q = (await requestQuote().expect(201)).body.quote;
    expect(q.status).toBe('open');
    expect(await Notification.countDocuments({ userId: owner.id, type: 'quote.requested' })).toBe(1);

    // Customer cannot counter before a business offer exists.
    await api().post(`/api/v1/quotes/${q._id}/counter`).set(customer.auth).send({ price: 1 }).expect(409);

    let r = await api().post(`/api/v1/businesses/${biz._id}/quotes/${q._id}/offers`).set(owner.auth).send({ price: 30000, terms: 'Full day' }).expect(201);
    expect(r.body.quote.status).toBe('offered');
    const offer1 = r.body.offers[0]._id;

    r = await api().post(`/api/v1/quotes/${q._id}/counter`).set(customer.auth).send({ price: 24000 }).expect(200);
    expect(r.body.quote.status).toBe('countered');
    expect(r.body.offers.map((o: { status: string }) => o.status)).toEqual(['superseded', 'pending']);

    // The superseded offer can no longer be accepted (race-safe CAS on currentOfferId).
    await api().post(`/api/v1/quotes/${q._id}/respond`).set(customer.auth).send({ offerId: offer1, action: 'accept' }).expect(409);
    // A side cannot accept its own offer.
    await api().post(`/api/v1/quotes/${q._id}/respond`).set(customer.auth).send({ offerId: r.body.offers[1]._id, action: 'accept' }).expect(409);

    r = await api().post(`/api/v1/businesses/${biz._id}/quotes/${q._id}/offers`).set(owner.auth).send({ price: 27000 }).expect(201);
    const offer3 = r.body.offers[2];
    expect(offer3.version).toBe(3);

    r = await api().post(`/api/v1/quotes/${q._id}/respond`).set(customer.auth).send({ offerId: offer3._id, action: 'accept' }).expect(200);
    expect(r.body.quote.status).toBe('agreed');
    expect(r.body.quote.agreedPrice).toBe(27000);

    // No more offers after agreement.
    await api().post(`/api/v1/businesses/${biz._id}/quotes/${q._id}/offers`).set(owner.auth).send({ price: 1 }).expect(409);

    const booking = (await api().post(`/api/v1/quotes/${q._id}/book`).set(customer.auth).send({}).expect(201)).body.booking;
    expect(booking.status).toBe('requested');
    expect(booking.source).toBe('quote');
    expect(booking.agreedPrice).toBe(27000);
    // Double click does not create a second booking request.
    await api().post(`/api/v1/quotes/${q._id}/book`).set(customer.auth).send({}).expect(409);
    expect(await Booking.countDocuments({ quoteId: q._id })).toBe(1);
  });

  it('isolates quotes between customers and businesses', async () => {
    const q = (await requestQuote().expect(201)).body.quote;
    const stranger = await registerUser();
    await api().get(`/api/v1/quotes/${q._id}`).set(stranger.auth).expect(404);
    await api().post(`/api/v1/quotes/${q._id}/cancel`).set(stranger.auth).expect(404);

    const otherOwner = await registerUser();
    const cat = await createCategory(undefined, undefined, ['quotes']);
    const otherBiz = await createBusiness(otherOwner, String(cat._id));
    await api().get(`/api/v1/businesses/${otherBiz._id}/quotes/${q._id}`).set(otherOwner.auth).expect(404);
    await api().post(`/api/v1/businesses/${otherBiz._id}/quotes/${q._id}/offers`).set(otherOwner.auth).send({ price: 1 }).expect(404);
    await api().get(`/api/v1/businesses/${biz._id}/quotes`).set(otherOwner.auth).expect(404);
  });

  it('blocks counter-offers when negotiation is disabled', async () => {
    await api().put(`/api/v1/businesses/${biz._id}/capabilities`).set(owner.auth).send({ enabled: ['services', 'quotes'] }).expect(200);
    const q = (await requestQuote().expect(201)).body.quote;
    await api().post(`/api/v1/businesses/${biz._id}/quotes/${q._id}/offers`).set(owner.auth).send({ price: 100 }).expect(201);
    const res = await api().post(`/api/v1/quotes/${q._id}/counter`).set(customer.auth).send({ price: 50 }).expect(403);
    expect(res.body.error.code).toBe('CAPABILITY_DISABLED');
  });

  it('concurrent accept + new offer: exactly one wins', async () => {
    const q = (await requestQuote().expect(201)).body.quote;
    const r = await api().post(`/api/v1/businesses/${biz._id}/quotes/${q._id}/offers`).set(owner.auth).send({ price: 1000 }).expect(201);
    const offerId = r.body.offers[0]._id;
    const [accept, revise] = await Promise.all([
      api().post(`/api/v1/quotes/${q._id}/respond`).set(customer.auth).send({ offerId, action: 'accept' }),
      api().post(`/api/v1/businesses/${biz._id}/quotes/${q._id}/offers`).set(owner.auth).send({ price: 1200 }),
    ]);
    const ok = [accept.status === 200, revise.status === 201].filter(Boolean);
    expect(ok).toHaveLength(1);
  });

  it('notifications are per user and can be marked read', async () => {
    await requestQuote().expect(201);
    let n = await api().get('/api/v1/me/notifications').set(owner.auth).expect(200);
    expect(n.body.unread).toBe(1);
    expect((await api().get('/api/v1/me/notifications').set(customer.auth).expect(200)).body.unread).toBe(0);
    await api().post('/api/v1/me/notifications/read-all').set(owner.auth).expect(204);
    n = await api().get('/api/v1/me/notifications').set(owner.auth).expect(200);
    expect(n.body.unread).toBe(0);
  });
});
