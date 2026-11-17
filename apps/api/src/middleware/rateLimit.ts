import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

const handler = (_req: Request, res: Response) => {
  res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
};

export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler,
});

/** Stricter limiter for credential endpoints. */
export function createAuthLimiter(limit = 10) {
  return rateLimit({
    windowMs: 15 * 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler,
  });
}
