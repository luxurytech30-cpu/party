import { randomBytes } from 'node:crypto';
import mongoose, { Types } from 'mongoose';
import {
  CAPABILITIES,
  resolveCapabilities,
  type BusinessRole,
  type Capability,
  type CreateBusinessInput,
  type UpdateBusinessInput,
} from '@party/shared';
import { AppError } from '../../lib/errors.js';
import { tenantFilter, toObjectId, type TenantContext } from '../../lib/tenant.js';
import { audit } from '../audit/audit.service.js';
import { User } from '../auth/user.model.js';
import { Category } from '../categories/category.model.js';
import { BUSINESS_STATUSES, Business } from './business.model.js';
import { BusinessMembership } from './membership.model.js';

function makeSlug(name: CreateBusinessInput['name']): string {
  const base = (name.en ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = randomBytes(3).toString('hex');
  return base ? `${base}-${suffix}` : `biz-${suffix}`;
}

async function loadActiveCategories(ids: string[]) {
  const objectIds = ids.map((id) => new Types.ObjectId(id));
  const categories = await Category.find({ _id: { $in: objectIds }, active: true }).lean();
  if (categories.length !== new Set(ids).size) {
    throw AppError.badRequest('One or more categories are invalid');
  }
  return categories;
}

function unionCapabilities(lists: (readonly string[] | undefined)[]): Capability[] {
  const set = new Set(lists.flatMap((l) => l ?? []));
  return CAPABILITIES.filter((c) => set.has(c));
}

export async function createBusiness(userId: Types.ObjectId, input: CreateBusinessInput) {
  const categories = await loadActiveCategories(input.categoryIds);
  const enabled = unionCapabilities(categories.map((c) => c.defaultCapabilities));

  const session = await mongoose.startSession();
  try {
    let businessId!: Types.ObjectId;
    await session.withTransaction(async () => {
      const [business] = await Business.create(
        [
          {
            slug: makeSlug(input.name),
            name: input.name,
            description: input.description,
            categoryIds: categories.map((c) => c._id),
            cities: input.cities,
            contact: { phone: input.phone, email: input.email },
            enabledCapabilities: enabled,
            status: 'pending_review',
            createdBy: userId,
          },
        ],
        { session },
      );
      businessId = business!._id;
      await BusinessMembership.create([{ businessId, userId, role: 'owner', status: 'active' }], {
        session,
      });
      await audit(
        { actorId: userId, businessId, action: 'business.create', targetType: 'Business', targetId: businessId },
        session,
      );
    });
    return getBusinessForMember({ businessId });
  } finally {
    await session.endSession();
  }
}

export async function getBusinessForMember(ctx: Pick<TenantContext, 'businessId'>) {
  const business = await Business.findOne({ _id: ctx.businessId }).lean();
  if (!business) throw AppError.notFound('Business not found');
  return business;
}

export async function updateBusiness(ctx: TenantContext, input: UpdateBusinessInput) {
  const set: Record<string, unknown> = {};
  if (input.name) set.name = input.name;
  if (input.description) set.description = input.description;
  if (input.cities) set.cities = input.cities;
  if (input.phone !== undefined) set['contact.phone'] = input.phone;
  if (input.email !== undefined) set['contact.email'] = input.email;

  const business = await Business.findOneAndUpdate({ _id: ctx.businessId }, { $set: set }, { new: true }).lean();
  if (!business) throw AppError.notFound('Business not found');
  return business;
}

export async function listMyBusinesses(userId: Types.ObjectId) {
  const memberships = await BusinessMembership.find({ userId, status: 'active' }).lean();
  const businesses = await Business.find({ _id: { $in: memberships.map((m) => m.businessId) } })
    .select('slug name status categoryIds')
    .lean();
  const byId = new Map(businesses.map((b) => [String(b._id), b]));
  return memberships
    .map((m) => ({ role: m.role, business: byId.get(String(m.businessId)) }))
    .filter((x) => x.business);
}

// ---------- Capabilities ----------

export async function getCapabilities(ctx: Pick<TenantContext, 'businessId'>) {
  const business = await getBusinessForMember(ctx);
  const categories = await Category.find({ _id: { $in: business.categoryIds } })
    .select('allowedCapabilities')
    .lean();
  const categoryAllowed = unionCapabilities(categories.map((c) => c.allowedCapabilities));
  const enabled = (business.enabledCapabilities ?? []) as Capability[];
  // Subscription plans arrive in Phase 4; until then the plan does not restrict.
  const effective = resolveCapabilities({ categoryAllowed, planAllowed: null, enabled });
  return { available: categoryAllowed, enabled, effective };
}

export async function updateCapabilities(ctx: TenantContext, enabled: Capability[], ip?: string) {
  const { available } = await getCapabilities(ctx);
  const notAllowed = enabled.filter((c) => !available.includes(c));
  if (notAllowed.length) {
    throw AppError.badRequest(`Capabilities not available for this business: ${notAllowed.join(', ')}`);
  }
  await Business.updateOne({ _id: ctx.businessId }, { $set: { enabledCapabilities: enabled } });
  await audit({
    actorId: ctx.userId,
    businessId: ctx.businessId,
    action: 'business.capabilities.update',
    targetType: 'Business',
    targetId: ctx.businessId,
    meta: { enabled },
    ip,
  });
  return getCapabilities(ctx);
}

// ---------- Team ----------

export async function listMembers(ctx: TenantContext) {
  const members = await BusinessMembership.find(tenantFilter(ctx, { status: 'active' }))
    .populate<{ userId: { _id: Types.ObjectId; name: string; email: string } }>('userId', 'name email')
    .lean();
  return members.map((m) => ({
    id: String(m._id),
    role: m.role,
    user: { id: String(m.userId._id), name: m.userId.name, email: m.userId.email },
  }));
}

export async function addMember(ctx: TenantContext, email: string, role: BusinessRole, ip?: string) {
  const user = await User.findOne({ email, status: 'active' }).select('_id').lean();
  // Invitations for unregistered emails come with the email service.
  if (!user) throw AppError.notFound('No registered user with this email');

  const existing = await BusinessMembership.findOne(tenantFilter(ctx, { userId: user._id }));
  if (existing?.status === 'active') throw AppError.conflict('User is already a team member');

  const membership = existing
    ? Object.assign(existing, { role, status: 'active', invitedBy: ctx.userId })
    : new BusinessMembership({ businessId: ctx.businessId, userId: user._id, role, invitedBy: ctx.userId });
  await membership.save();
  await audit({
    actorId: ctx.userId,
    businessId: ctx.businessId,
    action: 'business.member.add',
    targetType: 'BusinessMembership',
    targetId: membership._id,
    meta: { role },
    ip,
  });
  return { id: String(membership._id), role: membership.role };
}

async function assertNotLastOwner(ctx: TenantContext, membershipId: Types.ObjectId) {
  const owners = await BusinessMembership.countDocuments(
    tenantFilter(ctx, { role: 'owner', status: 'active', _id: { $ne: membershipId } }),
  );
  if (owners === 0) throw AppError.conflict('A business must keep at least one owner');
}

export async function changeMemberRole(
  ctx: TenantContext,
  rawMembershipId: string,
  role: BusinessRole,
  ip?: string,
) {
  const membershipId = toObjectId(rawMembershipId);
  if (!membershipId) throw AppError.notFound('Member not found');
  // Tenant-scoped lookup: a membership id from another business returns 404.
  const membership = await BusinessMembership.findOne(tenantFilter(ctx, { _id: membershipId, status: 'active' }));
  if (!membership) throw AppError.notFound('Member not found');
  if (membership.role === 'owner' && role !== 'owner') await assertNotLastOwner(ctx, membershipId);

  membership.role = role;
  await membership.save();
  await audit({
    actorId: ctx.userId,
    businessId: ctx.businessId,
    action: 'business.member.role_change',
    targetType: 'BusinessMembership',
    targetId: membershipId,
    meta: { role },
    ip,
  });
  return { id: String(membership._id), role: membership.role };
}

export async function removeMember(ctx: TenantContext, rawMembershipId: string, ip?: string) {
  const membershipId = toObjectId(rawMembershipId);
  if (!membershipId) throw AppError.notFound('Member not found');
  const membership = await BusinessMembership.findOne(tenantFilter(ctx, { _id: membershipId, status: 'active' }));
  if (!membership) throw AppError.notFound('Member not found');
  if (membership.role === 'owner') await assertNotLastOwner(ctx, membershipId);

  membership.status = 'removed';
  await membership.save();
  await audit({
    actorId: ctx.userId,
    businessId: ctx.businessId,
    action: 'business.member.remove',
    targetType: 'BusinessMembership',
    targetId: membershipId,
    ip,
  });
}

// ---------- Admin ----------

export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

export async function adminListBusinesses(status?: BusinessStatus, page = 1, limit = 20) {
  const filter = status ? { status } : {};
  const [items, total] = await Promise.all([
    Business.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('slug name status categoryIds cities createdAt')
      .lean(),
    Business.countDocuments(filter),
  ]);
  return { items, total, page, limit };
}

export async function adminSetStatus(
  actorId: Types.ObjectId,
  rawBusinessId: string,
  status: BusinessStatus,
  reason: string | undefined,
  ip?: string,
) {
  const businessId = toObjectId(rawBusinessId);
  if (!businessId) throw AppError.notFound('Business not found');
  const business = await Business.findOneAndUpdate(
    { _id: businessId },
    { $set: { status, statusReason: reason } },
    { new: true },
  ).lean();
  if (!business) throw AppError.notFound('Business not found');
  await audit({
    actorId,
    businessId,
    action: 'admin.business.status',
    targetType: 'Business',
    targetId: businessId,
    meta: { status, reason },
    ip,
  });
  return business;
}
