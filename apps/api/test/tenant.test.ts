import { beforeEach, describe, expect, it } from 'vitest';
import { AuditLog } from '../src/modules/audit/auditLog.model.js';
import { BusinessMembership } from '../src/modules/businesses/membership.model.js';
import { api, createBusiness, createCategory, makeAdmin, registerUser, type TestUser } from './helpers.js';

describe('multi-tenant isolation & permissions', () => {
  let ownerA: TestUser;
  let ownerB: TestUser;
  let bizA: { _id: string };
  let bizB: { _id: string };
  let categoryId: string;

  beforeEach(async () => {
    categoryId = String((await createCategory())._id);
    ownerA = await registerUser();
    ownerB = await registerUser();
    bizA = await createBusiness(ownerA, categoryId, 'Studio A');
    bizB = await createBusiness(ownerB, categoryId, 'Studio B');
  });

  it('creates a business pending review with the creator as owner and default capabilities', async () => {
    const res = await api().get(`/api/v1/businesses/${bizA._id}`).set(ownerA.auth).expect(200);
    expect(res.body.business.status).toBe('pending_review');
    expect(res.body.role).toBe('owner');
    expect(res.body.business.enabledCapabilities).toEqual(['services', 'portfolio', 'booking', 'calendar']);
    expect(await AuditLog.countDocuments({ action: 'business.create', businessId: bizA._id })).toBe(1);
  });

  it('rejects unknown categories', async () => {
    await api()
      .post('/api/v1/businesses')
      .set(ownerA.auth)
      .send({ name: { en: 'X' }, categoryIds: ['64b000000000000000000000'] })
      .expect(400);
  });

  it('a business owner cannot read or modify another business (404, no existence leak)', async () => {
    await api().get(`/api/v1/businesses/${bizB._id}`).set(ownerA.auth).expect(404);
    await api().patch(`/api/v1/businesses/${bizB._id}`).set(ownerA.auth).send({ cities: ['Haifa'] }).expect(404);
    await api().get(`/api/v1/businesses/${bizB._id}/members`).set(ownerA.auth).expect(404);
    await api().put(`/api/v1/businesses/${bizB._id}/capabilities`).set(ownerA.auth).send({ enabled: [] }).expect(404);
    await api().get(`/api/v1/businesses/not-an-id`).set(ownerA.auth).expect(404);
  });

  it('lists only the caller own businesses', async () => {
    const res = await api().get('/api/v1/me/businesses').set(ownerA.auth).expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].business._id).toBe(bizA._id);
  });

  it('enforces role permissions inside a business', async () => {
    const staff = await registerUser();
    const viewer = await registerUser();
    await api().post(`/api/v1/businesses/${bizA._id}/members`).set(ownerA.auth).send({ email: staff.email, role: 'staff' }).expect(201);
    await api().post(`/api/v1/businesses/${bizA._id}/members`).set(ownerA.auth).send({ email: viewer.email, role: 'viewer' }).expect(201);

    await api().get(`/api/v1/businesses/${bizA._id}`).set(staff.auth).expect(200);
    await api().patch(`/api/v1/businesses/${bizA._id}`).set(staff.auth).send({ cities: ['Haifa'] }).expect(403);
    await api().post(`/api/v1/businesses/${bizA._id}/members`).set(viewer.auth).send({ email: ownerB.email, role: 'staff' }).expect(403);
    await api().put(`/api/v1/businesses/${bizA._id}/capabilities`).set(staff.auth).send({ enabled: [] }).expect(403);

    // Staff of A still has no access to B.
    await api().get(`/api/v1/businesses/${bizB._id}`).set(staff.auth).expect(404);
  });

  it('supports users who belong to multiple businesses with different roles', async () => {
    const both = await registerUser();
    await api().post(`/api/v1/businesses/${bizA._id}/members`).set(ownerA.auth).send({ email: both.email, role: 'manager' }).expect(201);
    await api().post(`/api/v1/businesses/${bizB._id}/members`).set(ownerB.auth).send({ email: both.email, role: 'viewer' }).expect(201);

    await api().patch(`/api/v1/businesses/${bizA._id}`).set(both.auth).send({ cities: ['Haifa'] }).expect(200);
    await api().patch(`/api/v1/businesses/${bizB._id}`).set(both.auth).send({ cities: ['Haifa'] }).expect(403);
    const res = await api().get('/api/v1/me/businesses').set(both.auth).expect(200);
    expect(res.body.items.map((i: { role: string }) => i.role).sort()).toEqual(['manager', 'viewer']);
  });

  it('prevents IDOR on membership ids from another business', async () => {
    const memberB = await BusinessMembership.findOne({ businessId: bizB._id }).lean();
    await api()
      .patch(`/api/v1/businesses/${bizA._id}/members/${memberB!._id}`)
      .set(ownerA.auth)
      .send({ role: 'viewer' })
      .expect(404);
    await api().delete(`/api/v1/businesses/${bizA._id}/members/${memberB!._id}`).set(ownerA.auth).expect(404);
    const unchanged = await BusinessMembership.findById(memberB!._id).lean();
    expect(unchanged!.role).toBe('owner');
    expect(unchanged!.status).toBe('active');
  });

  it('ignores a businessId smuggled in the body', async () => {
    await api()
      .patch(`/api/v1/businesses/${bizA._id}`)
      .set(ownerA.auth)
      .send({ businessId: bizB._id, cities: ['Haifa'] })
      .expect(400); // strict schema rejects unknown keys
  });

  it('keeps at least one owner', async () => {
    const own = await BusinessMembership.findOne({ businessId: bizA._id, role: 'owner' }).lean();
    await api().patch(`/api/v1/businesses/${bizA._id}/members/${own!._id}`).set(ownerA.auth).send({ role: 'manager' }).expect(409);
    await api().delete(`/api/v1/businesses/${bizA._id}/members/${own!._id}`).set(ownerA.auth).expect(409);
  });

  it('only allows capabilities permitted by the business categories', async () => {
    await api()
      .put(`/api/v1/businesses/${bizA._id}/capabilities`)
      .set(ownerA.auth)
      .send({ enabled: ['products'] })
      .expect(400);
    const res = await api()
      .put(`/api/v1/businesses/${bizA._id}/capabilities`)
      .set(ownerA.auth)
      .send({ enabled: ['services', 'negotiation'] })
      .expect(200);
    // negotiation depends on quotes, which is not enabled → not effective.
    expect(res.body.enabled).toEqual(['services', 'negotiation']);
    expect(res.body.effective).toEqual(['services']);
    expect(await AuditLog.countDocuments({ action: 'business.capabilities.update' })).toBe(1);
  });

  it('admin routes require a platform admin; status changes are audit-logged', async () => {
    await api().get('/api/v1/admin/businesses').set(ownerA.auth).expect(403);
    await api().patch(`/api/v1/admin/businesses/${bizA._id}/status`).set(ownerA.auth).send({ status: 'active' }).expect(403);

    const admin = await registerUser();
    await makeAdmin(admin);
    const list = await api().get('/api/v1/admin/businesses?status=pending_review').set(admin.auth).expect(200);
    expect(list.body.total).toBe(2);

    const res = await api().patch(`/api/v1/admin/businesses/${bizA._id}/status`).set(admin.auth).send({ status: 'active' }).expect(200);
    expect(res.body.business.status).toBe('active');
    expect(await AuditLog.countDocuments({ action: 'admin.business.status', businessId: bizA._id })).toBe(1);

    // Platform admin is not implicitly a business member.
    await api().get(`/api/v1/businesses/${bizA._id}`).set(admin.auth).expect(404);
  });

  it('revoked admin role takes effect immediately (roles read from DB)', async () => {
    const admin = await registerUser();
    await makeAdmin(admin);
    await api().get('/api/v1/admin/businesses').set(admin.auth).expect(200);
    const { User } = await import('../src/modules/auth/user.model.js');
    await User.updateOne({ _id: admin.id }, { $set: { platformRoles: ['customer'] } });
    await api().get('/api/v1/admin/businesses').set(admin.auth).expect(403);
  });
});
