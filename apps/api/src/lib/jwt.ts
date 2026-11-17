import jwt from 'jsonwebtoken';
import type { PlatformRole } from '@party/shared';
import { env } from '../config/env.js';

export interface AccessTokenPayload {
  sub: string;
  roles: PlatformRole[];
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env().JWT_ACCESS_SECRET, {
    expiresIn: env().ACCESS_TOKEN_TTL_SECONDS,
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env().JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded !== 'object' || typeof decoded.sub !== 'string') {
    throw new Error('Invalid token payload');
  }
  return { sub: decoded.sub, roles: (decoded.roles ?? []) as PlatformRole[] };
}
