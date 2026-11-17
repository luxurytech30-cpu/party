import { Router } from 'express';
import { AppError } from '../../lib/errors.js';
import { toObjectId } from '../../lib/tenant.js';
import { Business } from '../businesses/business.model.js';
import { Favorite } from './favorite.model.js';

/** Mounted under /me (auth applied by parent). Always scoped to the caller. */
export function favoriteRouter() {
  const router = Router();

  router.get('/favorites', async (req, res) => {
    const favs = await Favorite.find({ customerId: req.auth!.userId }).sort({ createdAt: -1 }).lean();
    const businesses = await Business.find({ _id: { $in: favs.map((f) => f.businessId) }, status: 'active' })
      .select('slug name cities categoryIds startingPrice rating')
      .lean();
    res.json({ items: businesses });
  });

  router.put('/favorites/:businessId', async (req, res) => {
    const businessId = toObjectId(req.params.businessId as string);
    if (!businessId || !(await Business.exists({ _id: businessId, status: 'active' }))) throw AppError.notFound('Business not found');
    await Favorite.updateOne(
      { customerId: req.auth!.userId, businessId },
      { $setOnInsert: { customerId: req.auth!.userId, businessId } },
      { upsert: true },
    );
    res.status(204).end();
  });

  router.delete('/favorites/:businessId', async (req, res) => {
    const businessId = toObjectId(req.params.businessId as string);
    if (businessId) await Favorite.deleteOne({ customerId: req.auth!.userId, businessId });
    res.status(204).end();
  });

  return router;
}
