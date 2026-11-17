import type { BusinessPermission, BusinessRole } from '@party/shared';
import { Types } from 'mongoose';

export interface TenantContext {
  businessId: Types.ObjectId;
  userId: Types.ObjectId;
  role: BusinessRole;
  permissions: readonly BusinessPermission[];
}

/**
 * Build a query filter that is always scoped to the caller's business.
 * Any `businessId` in `extra` is overwritten — callers cannot widen the scope.
 */
export function tenantFilter<T extends Record<string, unknown>>(
  ctx: Pick<TenantContext, 'businessId'>,
  extra: T = {} as T,
): T & { businessId: Types.ObjectId } {
  return { ...extra, businessId: ctx.businessId };
}

/** Remove fields clients must never set on tenant-owned documents. */
export function stripTenantFields<T extends Record<string, unknown>>(payload: T) {
  const { businessId: _b, _id: _i, createdAt: _c, updatedAt: _u, ...rest } = payload;
  return rest;
}

export function toObjectId(id: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(id) && /^[a-f\d]{24}$/i.test(id) ? new Types.ObjectId(id) : null;
}
