import type { RequestHandler } from 'express';
import { ROLE_PERMISSIONS, type BusinessPermission, type BusinessRole } from '@party/shared';
import { AppError } from '../lib/errors.js';
import { toObjectId } from '../lib/tenant.js';
import { BusinessMembership } from '../modules/businesses/membership.model.js';

/**
 * Resolve the caller's membership in `:businessId` (URL param only — never the body)
 * and require a permission. Sets `req.tenant`.
 *
 * - no membership / invalid id → 404 (do not reveal that the business exists)
 * - membership without permission → 403
 */
export function requireBusinessPermission(permission: BusinessPermission): RequestHandler {
  return async (req, _res, next) => {
    if (!req.auth) throw AppError.unauthenticated();
    const rawId = req.params.businessId;
    const businessId = typeof rawId === 'string' ? toObjectId(rawId) : null;
    if (!businessId) throw AppError.notFound('Business not found');

    const membership = await BusinessMembership.findOne({
      businessId,
      userId: req.auth.userId,
      status: 'active',
    }).lean();
    if (!membership) throw AppError.notFound('Business not found');

    const role = membership.role as BusinessRole;
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions.includes(permission)) throw AppError.forbidden();

    req.tenant = { businessId, userId: req.auth.userId, role, permissions };
    next();
  };
}
