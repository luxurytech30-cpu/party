import { Router } from 'express';
import { createQuoteRequestSchema, QUOTE_STATUSES, quoteBookSchema, quoteOfferSchema, quoteRespondSchema } from '@party/shared';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireBusinessPermission } from '../../middleware/businessAccess.js';
import { parseQuery, validateBody } from '../../middleware/validate.js';
import * as svc from './quote.service.js';

/** Customer side, mounted at /quotes. */
export function customerQuoteRouter() {
  const router = Router();
  router.use(requireAuth);
  const uid = (req: Express.Request) => req.auth!.userId;

  router.post('/', validateBody(createQuoteRequestSchema), async (req, res) => {
    res.status(201).json({ quote: await svc.createQuoteRequest(uid(req), req.body) });
  });
  router.get('/mine', async (req, res) => {
    res.json({ items: await svc.listCustomerQuotes(uid(req)) });
  });
  router.get('/:quoteId', async (req, res) => {
    res.json(await svc.getCustomerQuote(uid(req), req.params.quoteId as string));
  });
  router.post('/:quoteId/counter', validateBody(quoteOfferSchema), async (req, res) => {
    res.json(await svc.customerCounter(uid(req), req.params.quoteId as string, req.body));
  });
  router.post('/:quoteId/respond', validateBody(quoteRespondSchema), async (req, res) => {
    res.json(await svc.customerRespond(uid(req), req.params.quoteId as string, req.body.offerId, req.body.action));
  });
  router.post('/:quoteId/cancel', async (req, res) => {
    res.json(await svc.customerCancel(uid(req), req.params.quoteId as string));
  });
  router.post('/:quoteId/book', validateBody(quoteBookSchema), async (req, res) => {
    res.status(201).json({ booking: await svc.bookFromQuote(uid(req), req.params.quoteId as string, req.body.date) });
  });
  return router;
}

/** Business side, mounted at /businesses/:businessId/quotes (mergeParams). */
export function businessQuoteRouter() {
  const router = Router({ mergeParams: true });
  router.get('/', requireBusinessPermission('quotes.manage'), async (req, res) => {
    const { status } = parseQuery(z.object({ status: z.enum(QUOTE_STATUSES).optional() }), req.query);
    res.json({ items: await svc.listBusinessQuotes(req.tenant!, status) });
  });
  router.get('/:quoteId', requireBusinessPermission('quotes.manage'), async (req, res) => {
    res.json(await svc.getBusinessQuote(req.tenant!, req.params.quoteId as string));
  });
  router.post('/:quoteId/offers', requireBusinessPermission('quotes.manage'), validateBody(quoteOfferSchema), async (req, res) => {
    res.status(201).json(await svc.businessOffer(req.tenant!, req.params.quoteId as string, req.body));
  });
  router.post('/:quoteId/respond', requireBusinessPermission('quotes.manage'), validateBody(quoteRespondSchema), async (req, res) => {
    res.json(await svc.businessRespond(req.tenant!, req.params.quoteId as string, req.body.offerId, req.body.action));
  });
  router.post('/:quoteId/reject', requireBusinessPermission('quotes.manage'), async (req, res) => {
    res.json(await svc.businessReject(req.tenant!, req.params.quoteId as string));
  });
  return router;
}
