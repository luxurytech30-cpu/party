import { createHash, randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Types } from 'mongoose';
import type { LoginInput, PlatformRole, RegisterInput } from '@party/shared';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { signAccessToken } from '../../lib/jwt.js';
import { RefreshToken } from './refreshToken.model.js';
import { User, serializeUser } from './user.model.js';

const BCRYPT_COST = 12;
// Pre-computed hash used to equalize timing when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_COST);

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

async function issueTokens(
  userId: Types.ObjectId,
  roles: PlatformRole[],
  family: string = randomUUID(),
  userAgent?: string,
): Promise<IssuedTokens> {
  const refreshToken = randomBytes(48).toString('base64url');
  const refreshExpiresAt = new Date(Date.now() + env().REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  await RefreshToken.create({
    userId,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: refreshExpiresAt,
    userAgent: userAgent?.slice(0, 300),
  });
  return {
    accessToken: signAccessToken({ sub: String(userId), roles }),
    refreshToken,
    refreshExpiresAt,
  };
}

export async function register(input: RegisterInput, userAgent?: string) {
  const exists = await User.exists({ email: input.email });
  if (exists) throw AppError.conflict('An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const user = await User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    locale: input.locale ?? 'ar',
    passwordHash,
    platformRoles: ['customer'],
  });
  const tokens = await issueTokens(user._id, user.platformRoles as PlatformRole[], undefined, userAgent);
  return { user: serializeUser(user), tokens };
}

export async function login(input: LoginInput, userAgent?: string) {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw AppError.unauthenticated('Invalid email or password');
  if (user.status !== 'active') throw AppError.unauthenticated('Account unavailable');

  user.lastLoginAt = new Date();
  await user.save();
  const tokens = await issueTokens(user._id, user.platformRoles as PlatformRole[], undefined, userAgent);
  return { user: serializeUser(user), tokens };
}

/**
 * Rotate a refresh token. Presenting an already-rotated/revoked token is treated
 * as theft: every token in that family is revoked.
 */
export async function refresh(rawToken: string, userAgent?: string) {
  const record = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) });
  if (!record) throw AppError.unauthenticated('Invalid refresh token');

  if (record.revokedAt) {
    await RefreshToken.updateMany(
      { family: record.family, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    throw AppError.unauthenticated('Refresh token reuse detected');
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    throw AppError.unauthenticated('Refresh token expired');
  }

  // Atomic compare-and-set so two parallel refreshes cannot both succeed.
  const claimed = await RefreshToken.findOneAndUpdate(
    { _id: record._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
  if (!claimed) throw AppError.unauthenticated('Invalid refresh token');

  const user = await User.findById(record.userId);
  if (!user || user.status !== 'active') throw AppError.unauthenticated('Account unavailable');

  const tokens = await issueTokens(
    user._id,
    user.platformRoles as PlatformRole[],
    record.family,
    userAgent,
  );
  await RefreshToken.updateOne({ _id: record._id }, { $set: { replacedBy: hashToken(tokens.refreshToken) } });
  return { user: serializeUser(user), tokens };
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  const record = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) });
  if (!record) return;
  await RefreshToken.updateMany(
    { family: record.family, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}
