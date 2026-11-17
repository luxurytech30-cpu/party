import { Router } from 'express';
import {
  addMemberSchema,
  businessRoleSchema,
  createBusinessSchema,
  updateBusinessSchema,
  updateCapabilitiesSchema,
} from '@party/shared';
import { z } from 'zod';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { requireBusinessPermission } from '../../middleware/businessAccess.js';
import { parseQuery, validateBody } from '../../middleware/validate.js';
import { BUSINESS_STATUSES } from './business.model.js';
import * as svc from './business.service.js';
import { businessBookingRouter } from '../bookings/booking.routes.js';
import { favoriteRouter } from '../favorites/favorite.routes.js';
import { notificationRouter } from '../notifications/notification.routes.js';
import { mediaRouter } from '../media/media.routes.js';
import { offeringRouter } from '../offerings/offering.routes.js';
import { businessQuoteRouter } from '../quotes/quote.routes.js';
import { businessReviewRouter } from '../reviews/review.routes.js';

export function businessRouter() {
  const router = Router();
  router.use(requireAuth);

  router.post('/', validateBody(createBusinessSchema), async (req, res) => {
    const business = await svc.createBusiness(req.auth!.userId, req.body);
    res.status(201).json({ business });
  });

  router.get('/:businessId', requireBusinessPermission('business.read'), async (req, res) => {
    res.json({ business: await svc.getBusinessForMember(req.tenant!), role: req.tenant!.role });
  });

  router.patch(
    '/:businessId',
    requireBusinessPermission('business.update'),
    validateBody(updateBusinessSchema),
    async (req, res) => {
      res.json({ business: await svc.updateBusiness(req.tenant!, req.body) });
    },
  );

  router.get('/:businessId/capabilities', requireBusinessPermission('business.read'), async (req, res) => {
    res.json(await svc.getCapabilities(req.tenant!));
  });

  router.put(
    '/:businessId/capabilities',
    requireBusinessPermission('capabilities.manage'),
    validateBody(updateCapabilitiesSchema),
    async (req, res) => {
      res.json(await svc.updateCapabilities(req.tenant!, req.body.enabled, req.ip));
    },
  );

  router.get('/:businessId/members', requireBusinessPermission('business.read'), async (req, res) => {
    res.json({ members: await svc.listMembers(req.tenant!) });
  });

  router.post(
    '/:businessId/members',
    requireBusinessPermission('team.manage'),
    validateBody(addMemberSchema),
    async (req, res) => {
      res.status(201).json({ member: await svc.addMember(req.tenant!, req.body.email, req.body.role, req.ip) });
    },
  );

  router.patch(
    '/:businessId/members/:membershipId',
    requireBusinessPermission('team.manage'),
    validateBody(z.object({ role: businessRoleSchema }).strict()),
    async (req, res) => {
      const membershipId = req.params.membershipId as string;
      res.json({ member: await svc.changeMemberRole(req.tenant!, membershipId, req.body.role, req.ip) });
    },
  );

  router.use('/:businessId/offerings', offeringRouter());
  router.use('/:businessId/media', mediaRouter());
  router.use('/:businessId/quotes', businessQuoteRouter());
  router.use('/:businessId/reviews', businessReviewRouter());
  router.use('/:businessId', businessBookingRouter());

  router.delete('/:businessId/members/:membershipId', requireBusinessPermission('team.manage'), async (req, res) => {
    await svc.removeMember(req.tenant!, req.params.membershipId as string, req.ip);
    res.status(204).end();
  });

  return router;
}

export function meRouter() {
  const router = Router();
  router.use(requireAuth);
  router.get('/businesses', async (req, res) => {
    res.json({ items: await svc.listMyBusinesses(req.auth!.userId) });
  });
  router.use(favoriteRouter());
  router.use(notificationRouter());
  return router;
}

const adminListQuery = z.object({
  status: z.enum(BUSINESS_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export function adminBusinessRouter() {
  const router = Router();
  router.use(requireAuth, requireAdmin);

  router.get('/', async (req, res) => {
    const q = parseQuery(adminListQuery, req.query);
    res.json(await svc.adminListBusinesses(q.status, q.page, q.limit));
  });

  router.patch(
    '/:businessId/status',
    validateBody(
      z
        .object({
          status: z.enum(BUSINESS_STATUSES),
          reason: z.string().trim().max(1000).optional(),
        })
        .strict(),
    ),
    async (req, res) => {
      const business = await svc.adminSetStatus(
        req.auth!.userId,
        req.params.businessId as string,
        req.body.status,
        req.body.reason,
        req.ip,
      );
      res.json({ business });
    },
  );

  return router;
}
