import { Router } from 'express';
import { z } from 'zod';
import { objectIdSchema, createEventSchema, eventCandidateSchema, eventItemSchema, updateEventItemSchema, updateEventSchema } from '@party/shared';
import { requireAuth } from '../../middleware/auth.js';
import { parseQuery, validateBody } from '../../middleware/validate.js';
import * as svc from './event.service.js';

/** Customer event planner, mounted at /events. Always scoped to the caller. */
export function eventRouter() {
  const router = Router();
  router.use(requireAuth);
  const uid = (req: Express.Request) => req.auth!.userId;
  const p = (v: unknown) => v as string;

  router.get('/', async (req, res) => res.json({ items: await svc.listEvents(uid(req)) }));
  router.post('/', validateBody(createEventSchema), async (req, res) => res.status(201).json(await svc.createEvent(uid(req), req.body)));
  router.get('/:eventId', async (req, res) => res.json(await svc.getEvent(uid(req), p(req.params.eventId))));
  router.patch('/:eventId', validateBody(updateEventSchema), async (req, res) => res.json(await svc.updateEvent(uid(req), p(req.params.eventId), req.body)));
  router.delete('/:eventId', async (req, res) => {
    await svc.deleteEvent(uid(req), p(req.params.eventId));
    res.status(204).end();
  });
  router.post('/:eventId/items', validateBody(eventItemSchema), async (req, res) => res.status(201).json(await svc.addItem(uid(req), p(req.params.eventId), req.body)));
  router.patch('/:eventId/items/:itemId', validateBody(updateEventItemSchema), async (req, res) =>
    res.json(await svc.updateItem(uid(req), p(req.params.eventId), p(req.params.itemId), req.body)),
  );
  router.delete('/:eventId/items/:itemId', async (req, res) => res.json(await svc.removeItem(uid(req), p(req.params.eventId), p(req.params.itemId))));
  router.post('/:eventId/items/:itemId/candidates', validateBody(eventCandidateSchema), async (req, res) =>
    res.status(201).json(await svc.addCandidate(uid(req), p(req.params.eventId), p(req.params.itemId), req.body)),
  );
  router.delete('/:eventId/items/:itemId/candidates/:businessId', async (req, res) => {
    const { offeringId } = parseQuery(z.object({ offeringId: objectIdSchema.optional() }), req.query);
    res.json(await svc.removeCandidate(uid(req), p(req.params.eventId), p(req.params.itemId), p(req.params.businessId), offeringId));
  });
  return router;
}
