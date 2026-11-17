import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, inject } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = inject('mongoUri');
process.env.JWT_ACCESS_SECRET = 'test-secret-that-is-definitely-longer-than-32-chars';
process.env.CORS_ORIGINS = 'http://localhost:3000';
// Tests must not depend on the developer's local .env (dotenv never overrides set vars).
for (const k of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'DEV_ADMIN_EMAIL', 'DEV_ADMIN_PASSWORD']) process.env[k] = '';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  // Ensure unique indexes exist before tests rely on them.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
