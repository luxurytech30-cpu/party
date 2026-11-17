import bcrypt from 'bcryptjs';
import { logger } from '../lib/logger.js';
import { User } from '../modules/auth/user.model.js';
import { Category } from '../modules/categories/category.model.js';
import { SEED_CATEGORIES } from './categories.data.js';

/** Idempotent: upserts categories by slug, never overwrites admin edits to existing ones. */
export async function seedCategories(): Promise<number> {
  const ops = SEED_CATEGORIES.map((c, i) => ({
    updateOne: {
      filter: { slug: c.slug },
      update: {
        $setOnInsert: {
          slug: c.slug,
          name: c.name,
          icon: c.icon,
          order: i,
          active: true,
          allowedCapabilities: c.allowed,
          defaultCapabilities: c.defaults,
        },
      },
      upsert: true,
    },
  }));
  const res = await Category.bulkWrite(ops);
  return res.upsertedCount;
}

/** Creates (or promotes) a platform admin. Used for local development / first deploy. */
export async function seedAdmin(email: string, password: string): Promise<void> {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    if (!existing.platformRoles.includes('admin')) {
      existing.platformRoles.push('admin');
      await existing.save();
    }
    return;
  }
  await User.create({
    name: 'Admin',
    email: email.toLowerCase(),
    passwordHash: await bcrypt.hash(password, 12),
    platformRoles: ['customer', 'admin'],
  });
}

export async function seedDevData(admin?: { email: string; password: string }) {
  const inserted = await seedCategories();
  if (admin) await seedAdmin(admin.email, admin.password);
  logger.info(`Seed complete: ${inserted} new categories${admin ? `, admin ${admin.email}` : ''}`);
}
