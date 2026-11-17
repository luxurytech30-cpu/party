import request from 'supertest';
import type { Capability } from '@party/shared';
import { createApp } from '../src/app.js';
import { User } from '../src/modules/auth/user.model.js';
import { Category } from '../src/modules/categories/category.model.js';

export const app = createApp({ authRateLimit: 10_000, disableGlobalRateLimit: true });
export const api = () => request(app);

let counter = 0;

export interface TestUser {
  id: string;
  email: string;
  token: string;
  auth: { Authorization: string };
}

export async function registerUser(overrides: Partial<{ name: string; email: string }> = {}): Promise<TestUser> {
  counter += 1;
  const email = overrides.email ?? `user${counter}-${Date.now()}@example.com`;
  const res = await api()
    .post('/api/v1/auth/register')
    .send({ name: overrides.name ?? `User ${counter}`, email, password: 'Passw0rd!' })
    .expect(201);
  return {
    id: res.body.user.id,
    email,
    token: res.body.accessToken,
    auth: { Authorization: `Bearer ${res.body.accessToken}` },
  };
}

export async function makeAdmin(user: TestUser) {
  await User.updateOne({ _id: user.id }, { $set: { platformRoles: ['customer', 'admin'] } });
}

export async function createCategory(
  slug = `cat-${++counter}`,
  allowed: Capability[] = ['services', 'packages', 'portfolio', 'booking', 'calendar', 'quotes', 'negotiation', 'team'],
  defaults: Capability[] = ['services', 'portfolio', 'booking', 'calendar'],
) {
  return Category.create({
    slug,
    name: { ar: 'تصوير', he: 'צילום', en: 'Photography' },
    allowedCapabilities: allowed,
    defaultCapabilities: defaults,
  });
}

export async function createBusiness(owner: TestUser, categoryId: string, nameEn = 'Studio') {
  const res = await api()
    .post('/api/v1/businesses')
    .set(owner.auth)
    .send({ name: { ar: 'استوديو', en: nameEn }, categoryIds: [categoryId], cities: ['Nazareth'] })
    .expect(201);
  return res.body.business as { _id: string; slug: string; status: string };
}

export async function activateBusiness(id: string) {
  const { Business } = await import('../src/modules/businesses/business.model.js');
  await Business.updateOne({ _id: id }, { $set: { status: 'active' } });
}

/** A date N days from today (UTC) as YYYY-MM-DD. */
export function futureDate(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}
