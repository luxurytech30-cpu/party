import { Router } from 'express';
import {
  BOOKING_STATUSES,
  createBookingRequestSchema,
  manualBookingSchema,
  updateAvailabilitySchema,
} from '@party/shared';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireBusinessPermission } from '../../middleware/businessAccess.js';
import { parseQuery, validateBody } from '../../middleware/validate.js';
import * as svc from './booking.service.js';

/** Mounted at /businesses/:businessId (mergeParams). Auth applied by the parent router. */
export function businessBookingRouter() {
  const router = Router({ mergeParams: true });

  router.get('/availability', requireBusinessPermission('business.read'), async (req, res) => {
    res.json(await svc.getAvailabilitySettings(req.tenant!));
  });

  router.put('/availability', requireBusinessPermission('availability.manage'), validateBody(updateAvailabilitySchema), async (req, res) => {
    res.json(await svc.updateAvailabilitySettings(req.tenant!, req.body));
  });

  router.get('/bookings', requireBusinessPermission('bookings.read'), async (req, res) => {
    const { status } = parseQuery(z.object({ status: z.enum(BOOKING_STATUSES).optional() }), req.query);
    res.json({ items: await svc.listBusinessBookings(req.tenant!, status) });
  });

  router.post('/bookings', requireBusinessPermission('bookings.manage'), validateBody(manualBookingSchema), async (req, res) => {
    res.status(201).json({ booking: await svc.createManualBooking(req.tenant!, req.body, req.ip) });
  });

  router.post('/bookings/:bookingId/confirm', requireBusinessPermission('bookings.manage'), async (req, res) => {
    res.json({ booking: await svc.confirmBooking(req.tenant!, req.params.bookingId as string, req.ip) });
  });

  for (const action of ['decline', 'cancel', 'complete'] as const) {
    router.post(`/bookings/:bookingId/${action}`, requireBusinessPermission('bookings.manage'), async (req, res) => {
      res.json({ booking: await svc.transitionBooking(req.tenant!, req.params.bookingId as string, action, req.ip) });
    });
  }

  return router;
}

/** Customer-side booking routes, mounted at /bookings. */
export function customerBookingRouter() {
  const router = Router();
  router.use(requireAuth);

  router.post('/', validateBody(createBookingRequestSchema), async (req, res) => {
    res.status(201).json({ booking: await svc.createBookingRequest(req.auth!.userId, req.body) });
  });

  router.get('/mine', async (req, res) => {
    res.json({ items: await svc.listCustomerBookings(req.auth!.userId) });
  });

  router.post('/:bookingId/cancel', async (req, res) => {
    res.json({ booking: await svc.cancelByCustomer(req.auth!.userId, req.params.bookingId as string) });
  });

  return router;
}
