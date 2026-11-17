import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { customerBookingRouter } from './modules/bookings/booking.routes.js';
import { customerQuoteRouter } from './modules/quotes/quote.routes.js';
import { eventRouter } from './modules/events/event.routes.js';
import { adminReviewRouter, customerReviewRouter, publicReviewRouter } from './modules/reviews/review.routes.js';
import { publicRouter } from './modules/public/public.routes.js';
import { categoryRouter } from './modules/categories/category.routes.js';
import { adminBusinessRouter, businessRouter, meRouter } from './modules/businesses/business.routes.js';

export interface AppOptions {
  /** Override auth limiter (tests use a high value). */
  authRateLimit?: number;
  disableGlobalRateLimit?: boolean;
}

export function createApp(opts: AppOptions = {}) {
  const app = express();
  const config = env();

  app.set('trust proxy', 1); // Render / Vercel sit behind one proxy hop.
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.CORS_ORIGINS.includes(origin)),
      credentials: true,
    }),
  );
  if (!opts.disableGlobalRateLimit) app.use(globalLimiter);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'up' : 'down' });
  });

  const api = express.Router();
  api.use('/auth', authRouter({ authRateLimit: opts.authRateLimit }));
  api.use('/categories', categoryRouter());
  api.use('/public', publicRouter());
  api.use('/public', publicReviewRouter());
  api.use('/bookings', customerBookingRouter());
  api.use('/quotes', customerQuoteRouter());
  api.use('/reviews', customerReviewRouter());
  api.use('/events', eventRouter());
  api.use('/me', meRouter());
  api.use('/businesses', businessRouter());
  api.use('/admin/businesses', adminBusinessRouter());
  api.use('/admin/reviews', adminReviewRouter());
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
