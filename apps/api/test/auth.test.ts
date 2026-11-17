import { describe, expect, it } from 'vitest';
import { api, registerUser } from './helpers.js';

const getCookie = (res: { headers: Record<string, unknown> }) => {
  const raw = res.headers['set-cookie'] as string[] | undefined;
  return raw?.find((c) => c.startsWith('rt='))?.split(';')[0];
};

describe('auth', () => {
  it('registers, never returns the password hash, sets an httpOnly refresh cookie', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Lina', email: 'Lina@Example.com', password: 'Passw0rd!' })
      .expect(201);
    expect(res.body.user.email).toBe('lina@example.com');
    expect(res.body.user.platformRoles).toEqual(['customer']);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(res.body.accessToken).toBeTypeOf('string');
    const raw = (res.headers['set-cookie'] as unknown as string[]).join(';');
    expect(raw).toContain('HttpOnly');
    expect(raw).toContain('Path=/api/v1/auth');
  });

  it('rejects duplicate emails, weak passwords and unknown fields', async () => {
    await registerUser({ email: 'dup@example.com' });
    await api().post('/api/v1/auth/register').send({ name: 'X Y', email: 'dup@example.com', password: 'Passw0rd!' }).expect(409);
    await api().post('/api/v1/auth/register').send({ name: 'X Y', email: 'a@b.com', password: 'short' }).expect(400);
    await api()
      .post('/api/v1/auth/register')
      .send({ name: 'X Y', email: 'c@d.com', password: 'Passw0rd!', platformRoles: ['admin'] })
      .expect(400);
  });

  it('logs in and rejects wrong credentials with the same message', async () => {
    await registerUser({ email: 'login@example.com' });
    await api().post('/api/v1/auth/login').send({ email: 'login@example.com', password: 'Passw0rd!' }).expect(200);
    const wrongPw = await api().post('/api/v1/auth/login').send({ email: 'login@example.com', password: 'nope1234' }).expect(401);
    const noUser = await api().post('/api/v1/auth/login').send({ email: 'ghost@example.com', password: 'nope1234' }).expect(401);
    expect(wrongPw.body.error.message).toBe(noUser.body.error.message);
  });

  it('rejects NoSQL operator injection in login', async () => {
    await api().post('/api/v1/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } }).expect(400);
  });

  it('protects /me', async () => {
    await api().get('/api/v1/auth/me').expect(401);
    await api().get('/api/v1/auth/me').set('Authorization', 'Bearer garbage').expect(401);
    const user = await registerUser();
    const res = await api().get('/api/v1/auth/me').set(user.auth).expect(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const reg = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Rot', email: 'rot@example.com', password: 'Passw0rd!' })
      .expect(201);
    const first = getCookie(reg)!;

    const r1 = await api().post('/api/v1/auth/refresh').set('Cookie', first).expect(200);
    const second = getCookie(r1)!;
    expect(second).not.toBe(first);

    // Reusing the rotated token = theft → 401 and the whole family is revoked.
    await api().post('/api/v1/auth/refresh').set('Cookie', first).expect(401);
    await api().post('/api/v1/auth/refresh').set('Cookie', second).expect(401);
  });

  it('supports body refresh tokens for mobile clients', async () => {
    const reg = await api()
      .post('/api/v1/auth/register')
      .set('X-Client', 'mobile')
      .send({ name: 'Mob', email: 'mob@example.com', password: 'Passw0rd!' })
      .expect(201);
    expect(reg.body.refreshToken).toBeTypeOf('string');
    expect(reg.headers['set-cookie']).toBeUndefined();
    const r = await api()
      .post('/api/v1/auth/refresh')
      .set('X-Client', 'mobile')
      .send({ refreshToken: reg.body.refreshToken })
      .expect(200);
    expect(r.body.refreshToken).not.toBe(reg.body.refreshToken);
  });

  it('logout revokes the refresh token', async () => {
    const reg = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Out', email: 'out@example.com', password: 'Passw0rd!' })
      .expect(201);
    const cookie = getCookie(reg)!;
    await api().post('/api/v1/auth/logout').set('Cookie', cookie).expect(204);
    await api().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(401);
  });
});
