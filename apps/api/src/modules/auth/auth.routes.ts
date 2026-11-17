import { Router, type CookieOptions, type Request, type Response } from 'express';
import { loginSchema, registerSchema } from '@party/shared';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { createAuthLimiter } from '../../middleware/rateLimit.js';
import { validateBody } from '../../middleware/validate.js';
import * as authService from './auth.service.js';
import type { IssuedTokens } from './auth.service.js';
import { User, serializeUser } from './user.model.js';

export const REFRESH_COOKIE = 'rt';

function cookieOptions(expires?: Date): CookieOptions {
  const prod = env().NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: prod,
    // Web (Vercel) and API (Render) are on different sites in production.
    sameSite: prod ? 'none' : 'lax',
    path: '/api/v1/auth',
    expires,
  };
}

/**
 * Web clients get the refresh token as an httpOnly cookie. Native clients
 * (header `X-Client: mobile`) get it in the body because cookies are awkward there.
 */
function sendSession(req: Request, res: Response, status: number, user: unknown, tokens: IssuedTokens) {
  const isMobile = req.get('x-client') === 'mobile';
  if (!isMobile) {
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(tokens.refreshExpiresAt));
  }
  res.status(status).json({
    user,
    accessToken: tokens.accessToken,
    ...(isMobile ? { refreshToken: tokens.refreshToken } : {}),
  });
}

function readRefreshToken(req: Request): string | undefined {
  const fromCookie = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (fromCookie) return fromCookie;
  const parsed = z.object({ refreshToken: z.string().min(1).max(200) }).safeParse(req.body ?? {});
  return parsed.success ? parsed.data.refreshToken : undefined;
}

export function authRouter(opts: { authRateLimit?: number } = {}) {
  const router = Router();
  const limiter = createAuthLimiter(opts.authRateLimit);

  router.post('/register', limiter, validateBody(registerSchema), async (req, res) => {
    const { user, tokens } = await authService.register(req.body, req.get('user-agent'));
    sendSession(req, res, 201, user, tokens);
  });

  router.post('/login', limiter, validateBody(loginSchema), async (req, res) => {
    const { user, tokens } = await authService.login(req.body, req.get('user-agent'));
    sendSession(req, res, 200, user, tokens);
  });

  router.post('/refresh', async (req, res) => {
    const token = readRefreshToken(req);
    if (!token) throw AppError.unauthenticated('Missing refresh token');
    const { user, tokens } = await authService.refresh(token, req.get('user-agent'));
    sendSession(req, res, 200, user, tokens);
  });

  router.post('/logout', async (req, res) => {
    await authService.logout(readRefreshToken(req));
    res.clearCookie(REFRESH_COOKIE, cookieOptions());
    res.status(204).end();
  });

  router.get('/me', requireAuth, async (req, res) => {
    const user = await User.findById(req.auth!.userId).lean();
    if (!user) throw AppError.unauthenticated();
    res.json({ user: serializeUser(user) });
  });

  return router;
}
