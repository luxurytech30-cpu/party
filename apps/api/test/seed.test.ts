import { describe, expect, it } from 'vitest';
import { User } from '../src/modules/auth/user.model.js';
import { Category } from '../src/modules/categories/category.model.js';
import { seedDevData } from '../src/seed/seed.js';
import { SEED_CATEGORIES } from '../src/seed/categories.data.js';
import { api } from './helpers.js';

describe('seed & public categories', () => {
  it('seeds idempotently and exposes active categories publicly', async () => {
    await seedDevData({ email: 'admin@party.local', password: 'Admin12345' });
    await seedDevData({ email: 'admin@party.local', password: 'Admin12345' });
    expect(await Category.countDocuments()).toBe(SEED_CATEGORIES.length);
    expect(await User.countDocuments({ platformRoles: 'admin' })).toBe(1);

    await Category.updateOne({ slug: 'gifts' }, { $set: { active: false } });
    const res = await api().get('/api/v1/categories').expect(200);
    expect(res.body.items).toHaveLength(SEED_CATEGORIES.length - 1);
    expect(res.body.items[0]).toMatchObject({ slug: 'venues', name: { ar: 'قاعات وحدائق' } });
    expect(res.body.items[0].allowedCapabilities).toBeUndefined();

    const login = await api().post('/api/v1/auth/login').send({ email: 'admin@party.local', password: 'Admin12345' }).expect(200);
    expect(login.body.user.platformRoles).toContain('admin');
  });
});

describe('demo data', () => {
  it('seeds demo businesses with photos and offerings, idempotently, and removes them cleanly', async () => {
    const { seedDemoData, removeDemoData } = await import('../src/seed/demo.js');
    const { Business } = await import('../src/modules/businesses/business.model.js');
    const { Media } = await import('../src/modules/media/media.model.js');
    await seedDevData();
    const n = await seedDemoData();
    expect(n).toBeGreaterThan(20);
    expect(await seedDemoData()).toBe(0);
    const home = await api().get('/api/v1/public/home?type=wedding').expect(200);
    const venues = home.body.rows.find((r: { category: { slug: string } }) => r.category.slug === 'venues');
    expect(venues.businesses.length).toBeGreaterThan(2);
    expect(venues.businesses[0].coverUrl).toMatch(/^https:\/\/images\.unsplash\.com\//);
    expect(venues.businesses[0].startingPrice).toBeGreaterThan(0);
    expect(await removeDemoData()).toBe(n);
    expect(await Business.countDocuments({ demo: true })).toBe(0);
    expect(await Media.countDocuments()).toBe(0);
  });
});
