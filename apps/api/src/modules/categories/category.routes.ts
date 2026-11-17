import { Router } from 'express';
import { Category } from './category.model.js';

export function categoryRouter() {
  const router = Router();
  // Public: active categories for discovery and business onboarding.
  router.get('/', async (_req, res) => {
    const items = await Category.find({ active: true })
      .sort({ order: 1 })
      .select('slug name icon parentId order')
      .lean();
    res.json({ items });
  });
  return router;
}
