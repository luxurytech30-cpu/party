import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { logger } from '../lib/logger.js';
import { User } from '../modules/auth/user.model.js';
import { BookingResource } from '../modules/bookings/resource.model.js';
import { Business } from '../modules/businesses/business.model.js';
import { BusinessMembership } from '../modules/businesses/membership.model.js';
import { Category } from '../modules/categories/category.model.js';
import { Media } from '../modules/media/media.model.js';
import { Offering } from '../modules/offerings/offering.model.js';
import { refreshStartingPrice } from '../modules/offerings/offering.service.js';
import { GUEST_GIFT_DEMOS } from './demo-gifts.data.js';
import { KIDS_DEMO_BUSINESSES } from './demo-kids.data.js';
import { DEMO_BUSINESSES, unsplash } from './demo.data.js';

export const DEMO_OWNER = { email: 'demo-owner@party.local', password: 'Demo12345', name: 'Demo Owner' };

/** Remove every demo business and everything attached to it. */
export async function removeDemoData() {
  const ids = (await Business.find({ demo: true }).select('_id').lean()).map((b) => b._id);
  await Promise.all([
    Offering.deleteMany({ businessId: { $in: ids } }),
    Media.deleteMany({ businessId: { $in: ids } }),
    BusinessMembership.deleteMany({ businessId: { $in: ids } }),
    BookingResource.deleteMany({ businessId: { $in: ids } }),
  ]);
  await Business.deleteMany({ _id: { $in: ids } });
  await User.deleteOne({ email: DEMO_OWNER.email });
  return ids.length;
}

/**
 * Idempotent: adds missing fictional vendors without replacing existing demo data. All demo businesses are
 * owned by one demo account so their dashboards can be explored.
 */
export async function seedDemoData(): Promise<number> {
  const categories = new Map((await Category.find().select('slug').lean()).map((c) => [c.slug, c]));
  const owner =
    (await User.findOne({ email: DEMO_OWNER.email })) ??
    (await User.create({
      name: DEMO_OWNER.name,
      email: DEMO_OWNER.email,
      passwordHash: await bcrypt.hash(DEMO_OWNER.password, 12),
      platformRoles: ['customer'],
    }));

  const featuredUntil = new Date(Date.now() + 365 * 86_400_000);
  let created = 0;
  for (const d of [...DEMO_BUSINESSES, ...KIDS_DEMO_BUSINESSES, ...GUEST_GIFT_DEMOS]) {
    if (await Business.exists({ demo: true, 'name.en': d.name.en })) continue;
    const cat = categories.get(d.category);
    if (!cat) continue;
    const slug = `${d.name.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${randomBytes(2).toString('hex')}`;
    const cap = await Category.findById(cat._id).select('defaultCapabilities').lean();
    const business = await Business.create({
      slug,
      name: d.name,
      description: d.description,
      categoryIds: [cat._id],
      cities: d.cities,
      contact: { phone: d.phone },
      enabledCapabilities: cap?.defaultCapabilities ?? [],
      status: 'active',
      demo: true,
      featuredUntil: d.featured ? featuredUntil : undefined,
      createdBy: owner._id,
    });
    await BusinessMembership.create({ businessId: business._id, userId: owner._id, role: 'owner' });
    await Offering.insertMany(
      d.offerings.map((o, i) => ({
        businessId: business._id,
        kind: o.kind,
        title: o.title,
        pricing: {
          model: o.model,
          negotiable: o.negotiable ?? false,
          ...(o.model === 'range' ? { min: o.min, max: o.max } : o.model === 'quote_only' ? {} : { amount: o.amount }),
        },
        includes: o.includes,
        order: i,
      })),
    );
    await Media.insertMany(
      d.images.map((id, i) => ({ businessId: business._id, publicId: `demo/${business._id}/${id}`, url: unsplash(id), order: i, uploadedBy: owner._id })),
    );
    await refreshStartingPrice(business._id);
    created += 1;
  }
  logger.info(`Demo data: ${created} businesses (owner ${DEMO_OWNER.email})`);
  return created;
}
