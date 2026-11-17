import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { isPlatformAdmin, type PlatformRole } from '@party/shared';
import { AppError } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { User } from '../modules/auth/user.model.js';

/**
 * Require a valid access token. Roles are re-read from the DB so a revoked
 * admin or a suspended user loses access immediately, not after token expiry.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw AppError.unauthenticated();

  let sub: string;
  try {
    sub = verifyAccessToken(header.slice(7)).sub;
  } catch {
    throw AppError.unauthenticated('Invalid or expired token');
  }
  if (!Types.ObjectId.isValid(sub)) throw AppError.unauthenticated('Invalid token');

  const user = await User.findById(sub).select('platformRoles status').lean();
  if (!user || user.status !== 'active') throw AppError.unauthenticated('Account unavailable');

  req.auth = { userId: user._id, platformRoles: user.platformRoles as PlatformRole[] };
  next();
};

export function requirePlatformRole(...roles: PlatformRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw AppError.unauthenticated();
    const ok = req.auth.platformRoles.some((r) => roles.includes(r));
    if (!ok) throw AppError.forbidden();
    next();
  };
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.auth) throw AppError.unauthenticated();
  if (!isPlatformAdmin(req.auth.platformRoles)) throw AppError.forbidden();
  next();
};
