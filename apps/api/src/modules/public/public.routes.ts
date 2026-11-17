import { Router } from 'express';
import type { FilterQuery } from 'mongoose';
import { dateOnlySchema, EVENT_TEMPLATES, EVENT_TYPES, publicSearchSchema } from '@party/shared';
import { z } from 'zod';
import { AppError } from '../../lib/errors.js';
import { parseQuery } from '../../middleware/validate.js';
import { addDays, dayStatuses, getDefaultResource, todayIn } from '../bookings/availability.js';
import { publicAvailability } from '../bookings/booking.service.js';
import { Business, type BusinessDoc } from '../businesses/business.model.js';
import { getCapabilities } from '../businesses/business.service.js';
import { Category } from '../categories/category.model.js';
import { Media } from '../media/media.model.js';
import { Offering } from '../offerings/offering.model.js';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Explicit allow-list of public business fields. */
const PUBLIC_FIELDS = 'slug name description categoryIds cities startingPrice rating featuredUntil timezone createdAt';

async function coverImages(businessIds: unknown[]) {
  const media = await Media.find({ businessId: { $in: businessIds } }).sort({ order: 1 }).select('businessId url').lean();
  const map = new Map<string, string>();
  for (const m of media) if (!map.has(String(m.businessId))) map.set(String(m.businessId), m.url);
  return map;
}

export function publicRouter() {
  const router = Router();

  router.get('/businesses', async (req, res) => {
    const q = parseQuery(publicSearchSchema, req.query);
    const filter: FilterQuery<BusinessDoc> = { status: 'active' };

    if (q.type && !q.category && !q.categories) {
      const ids = await Category.find({ slug: { $in: EVENT_TEMPLATES[q.type] }, active: true }).select('_id').lean();
      filter.categoryIds = { $in: ids.map((c) => c._id) };
    }
    if (q.categories && !q.category) {
      const slugs = [...new Set(q.categories.split(',').filter(Boolean))];
      if (slugs.length > 40) throw AppError.badRequest('Too many categories');
      const categories = await Category.find({ slug: { $in: slugs }, active: true }).select('_id').lean();
      filter.categoryIds = { $in: categories.map((c) => c._id) };
    }
    if (q.category) {
      const cat = await Category.findOne({ slug: q.category, active: true }).select('_id').lean();
      if (!cat) return res.json({ items: [], total: 0, page: q.page, limit: q.limit });
      filter.categoryIds = cat._id;
    }
    if (q.city) filter.cities = { $regex: `^${escapeRegex(q.city)}$`, $options: 'i' };
    if (q.maxPrice !== undefined) filter.startingPrice = { $lte: q.maxPrice };
    if (q.q) {
      const rx = { $regex: escapeRegex(q.q), $options: 'i' };
      filter.$or = [{ 'name.ar': rx }, { 'name.he': rx }, { 'name.en': rx }, { 'description.ar': rx }, { 'description.he': rx }, { 'description.en': rx }];
    }

    const sort = { featuredUntil: -1, 'rating.avg': -1, createdAt: -1 } as const;
    let items: Record<string, unknown>[];
    let total: number;

    if (q.date) {
      // Availability filter: evaluate reported availability for up to 300 candidates.
      const candidates = await Business.find(filter).sort(sort).limit(300).select(PUBLIC_FIELDS).lean();
      const withStatus = [];
      for (const b of candidates) {
        const { effective } = await getCapabilities({ businessId: b._id });
        if (!effective.includes('booking')) {
          withStatus.push({ ...b, dateStatus: null });
          continue;
        }
        const resource = await getDefaultResource(b._id);
        const status = (await dayStatuses(resource, q.date, q.date, todayIn(b.timezone ?? 'Asia/Jerusalem')))[q.date];
        if (status === 'available' || status === 'pending') withStatus.push({ ...b, dateStatus: status });
      }
      total = withStatus.length;
      items = withStatus.slice((q.page - 1) * q.limit, q.page * q.limit);
    } else {
      [items, total] = await Promise.all([
        Business.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).select(PUBLIC_FIELDS).lean(),
        Business.countDocuments(filter),
      ]);
    }

    const covers = await coverImages(items.map((b) => b._id));
    res.json({
      items: items.map((b) => ({ ...b, coverUrl: covers.get(String(b._id)) ?? null })),
      total,
      page: q.page,
      limit: q.limit,
    });
  });

  /**
   * Home feed: one row per category (Wolt-style). Categories needed for the chosen
   * party type come first, in planning order; the rest follow.
   */
  router.get('/home', async (req, res) => {
    const q = parseQuery(
      z.object({ type: z.enum(EVENT_TYPES).optional(), city: z.string().trim().max(80).optional(), perRow: z.coerce.number().int().min(1).max(20).default(12) }),
      req.query,
    );
    const categories = await Category.find({ active: true }).sort({ order: 1 }).select('slug name icon').lean();
    const template = q.type ? EVENT_TEMPLATES[q.type] : [];
    const rank = (slug: string) => (template.includes(slug) ? template.indexOf(slug) : 1000);
    categories.sort((a, b) => rank(a.slug) - rank(b.slug));

    const base: FilterQuery<BusinessDoc> = { status: 'active' };
    if (q.city) base.cities = { $regex: `^${escapeRegex(q.city)}$`, $options: 'i' };

    const rows = await Promise.all(
      categories.map(async (c) => {
        const businesses = await Business.find({ ...base, categoryIds: c._id })
          .sort({ featuredUntil: -1, 'rating.avg': -1, createdAt: -1 })
          .limit(q.perRow)
          .select(PUBLIC_FIELDS)
          .lean();
        return { category: c, required: template.includes(c.slug), businesses };
      }),
    );
    const covers = await coverImages(rows.flatMap((r) => r.businesses.map((b) => b._id)));
    res.json({
      rows: rows.map((r) => ({ ...r, businesses: r.businesses.map((b) => ({ ...b, coverUrl: covers.get(String(b._id)) ?? null })) })),
      template,
    });
  });

  router.get('/businesses/:slug', async (req, res) => {
    const slug = z.string().max(80).parse(req.params.slug);
    const business = await Business.findOne({ slug, status: 'active' }).select(`${PUBLIC_FIELDS} contact`).lean();
    if (!business) throw AppError.notFound('Business not found');

    const { effective } = await getCapabilities({ businessId: business._id });
    const kinds = [
      ...(effective.includes('services') ? ['service'] : []),
      ...(effective.includes('packages') ? ['package'] : []),
      ...(effective.includes('products') ? ['product'] : []),
    ];
    const [offerings, media, categories] = await Promise.all([
      Offering.find({ businessId: business._id, active: true, kind: { $in: kinds } })
        .sort({ kind: 1, order: 1 })
        .select('kind title description pricing durationMinutes includes')
        .lean(),
      effective.includes('portfolio')
        ? Media.find({ businessId: business._id }).sort({ order: 1 }).select('url width height').lean()
        : Promise.resolve([]),
      Category.find({ _id: { $in: business.categoryIds } }).select('slug name icon').lean(),
    ]);

    res.json({
      business,
      categories,
      offerings,
      media,
      features: {
        booking: effective.includes('booking'),
        quotes: effective.includes('quotes'),
        negotiation: effective.includes('negotiation'),
      },
    });
  });

  router.get('/businesses/:slug/availability', async (req, res) => {
    const slug = z.string().max(80).parse(req.params.slug);
    const { from, to } = parseQuery(z.object({ from: dateOnlySchema, to: dateOnlySchema.optional() }), req.query);
    const business = await Business.findOne({ slug, status: 'active' }).select('_id').lean();
    if (!business) throw AppError.notFound('Business not found');
    res.json({ days: await publicAvailability(business._id, from, to ?? addDays(from, 41)) });
  });

  return router;
}
