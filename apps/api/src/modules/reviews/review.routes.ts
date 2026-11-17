import { Router } from 'express';
import { createReviewSchema, reviewReplySchema } from '@party/shared';
import { z } from 'zod';
import { AppError } from '../../lib/errors.js';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { requireBusinessPermission } from '../../middleware/businessAccess.js';
import { parseQuery, validateBody } from '../../middleware/validate.js';
import { Business } from '../businesses/business.model.js';
import * as svc from './review.service.js';

export function customerReviewRouter() {
  const router = Router();
  router.post('/', requireAuth, validateBody(createReviewSchema), async (req, res) => {
    res.status(201).json({ review: await svc.createReview(req.auth!.userId, req.body) });
  });
  return router;
}

/** Public: /public/businesses/:slug/reviews */
export function publicReviewRouter() {
  const router = Router();
  router.get('/businesses/:slug/reviews', async (req, res) => {
    const slug = z.string().max(80).parse(req.params.slug);
    const business = await Business.findOne({ slug, status: 'active' }).select('_id rating').lean();
    if (!business) throw AppError.notFound('Business not found');
    res.json({ items: await svc.publicReviews(business._id), rating: business.rating });
  });
  return router;
}

/** Mounted at /businesses/:businessId/reviews (mergeParams). */
export function businessReviewRouter() {
  const router = Router({ mergeParams: true });
  router.get('/', requireBusinessPermission('business.read'), async (req, res) => {
    res.json({ items: await svc.businessReviews(req.tenant!) });
  });
  router.post('/:reviewId/reply', requireBusinessPermission('reviews.reply'), validateBody(reviewReplySchema), async (req, res) => {
    res.json({ review: await svc.replyToReview(req.tenant!, req.params.reviewId as string, req.body.text) });
  });
  return router;
}

export function adminReviewRouter() {
  const router = Router();
  router.use(requireAuth, requireAdmin);
  router.get('/', async (req, res) => {
    const { status } = parseQuery(z.object({ status: z.enum(['published', 'hidden']).optional() }), req.query);
    res.json({ items: await svc.adminListReviews(status) });
  });
  router.patch('/:reviewId', validateBody(z.object({ status: z.enum(['published', 'hidden']) }).strict()), async (req, res) => {
    res.json({ review: await svc.adminSetReviewStatus(req.auth!.userId, req.params.reviewId as string, req.body.status, req.ip) });
  });
  return router;
}
