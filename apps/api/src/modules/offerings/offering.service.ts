import {
  OFFERING_KIND_CAPABILITY,
  type CreateOfferingInput,
  type OfferingKind,
  type UpdateOfferingInput,
} from '@party/shared';
import type { Types } from 'mongoose';
import { AppError } from '../../lib/errors.js';
import { tenantFilter, toObjectId, type TenantContext } from '../../lib/tenant.js';
import { Business } from '../businesses/business.model.js';
import { getCapabilities } from '../businesses/business.service.js';
import { Offering, offeringMinPrice } from './offering.model.js';

async function assertKindEnabled(ctx: Pick<TenantContext, 'businessId'>, kind: OfferingKind) {
  const { effective } = await getCapabilities(ctx);
  if (!effective.includes(OFFERING_KIND_CAPABILITY[kind])) {
    throw new AppError(403, 'CAPABILITY_DISABLED', `The "${OFFERING_KIND_CAPABILITY[kind]}" feature is not enabled`);
  }
}

/** Keep the denormalized `startingPrice` on the business in sync (used by search & cards). */
export async function refreshStartingPrice(businessId: Types.ObjectId) {
  const offerings = await Offering.find({ businessId, active: true }).select('pricing').lean();
  const prices = offerings.map(offeringMinPrice).filter((p): p is number => p !== null);
  await Business.updateOne(
    { _id: businessId },
    prices.length ? { $set: { startingPrice: Math.min(...prices) } } : { $unset: { startingPrice: 1 } },
  );
}

export async function listOfferings(ctx: TenantContext, kind?: OfferingKind) {
  return Offering.find(tenantFilter(ctx, kind ? { kind } : {}))
    .sort({ kind: 1, order: 1, createdAt: 1 })
    .lean();
}

export async function createOffering(ctx: TenantContext, input: CreateOfferingInput) {
  await assertKindEnabled(ctx, input.kind);
  const count = await Offering.countDocuments(tenantFilter(ctx));
  if (count >= 500) throw AppError.conflict('Offering limit reached');
  const offering = await Offering.create({ ...input, businessId: ctx.businessId, order: count });
  await refreshStartingPrice(ctx.businessId);
  return offering.toObject();
}

async function findOwned(ctx: TenantContext, rawId: string) {
  const id = toObjectId(rawId);
  if (!id) throw AppError.notFound('Offering not found');
  const offering = await Offering.findOne(tenantFilter(ctx, { _id: id }));
  if (!offering) throw AppError.notFound('Offering not found');
  return offering;
}

export async function updateOffering(ctx: TenantContext, rawId: string, input: UpdateOfferingInput) {
  const offering = await findOwned(ctx, rawId);
  await assertKindEnabled(ctx, offering.kind as OfferingKind);
  offering.set(input);
  await offering.save();
  await refreshStartingPrice(ctx.businessId);
  return offering.toObject();
}

export async function deleteOffering(ctx: TenantContext, rawId: string) {
  const offering = await findOwned(ctx, rawId);
  await offering.deleteOne();
  await refreshStartingPrice(ctx.businessId);
}
