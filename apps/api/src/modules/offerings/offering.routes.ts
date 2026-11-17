import { Router } from 'express';
import { createOfferingSchema, OFFERING_KINDS, updateOfferingSchema } from '@party/shared';
import { z } from 'zod';
import { requireBusinessPermission } from '../../middleware/businessAccess.js';
import { parseQuery, validateBody } from '../../middleware/validate.js';
import * as svc from './offering.service.js';

/** Mounted at /businesses/:businessId/offerings (mergeParams). */
export function offeringRouter() {
  const router = Router({ mergeParams: true });

  router.get('/', requireBusinessPermission('business.read'), async (req, res) => {
    const { kind } = parseQuery(z.object({ kind: z.enum(OFFERING_KINDS).optional() }), req.query);
    res.json({ items: await svc.listOfferings(req.tenant!, kind) });
  });

  router.post('/', requireBusinessPermission('offerings.manage'), validateBody(createOfferingSchema), async (req, res) => {
    res.status(201).json({ offering: await svc.createOffering(req.tenant!, req.body) });
  });

  router.patch('/:offeringId', requireBusinessPermission('offerings.manage'), validateBody(updateOfferingSchema), async (req, res) => {
    res.json({ offering: await svc.updateOffering(req.tenant!, req.params.offeringId as string, req.body) });
  });

  router.delete('/:offeringId', requireBusinessPermission('offerings.manage'), async (req, res) => {
    await svc.deleteOffering(req.tenant!, req.params.offeringId as string);
    res.status(204).end();
  });

  return router;
}
