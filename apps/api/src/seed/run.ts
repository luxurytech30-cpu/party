// Usage: npm run seed -w @party/api   (uses MONGODB_URI from .env; must not be "memory")
import { env } from '../config/env.js';
import { connectDb, disconnectDb } from '../db.js';
import { seedDevData } from './seed.js';

const config = env();
if (config.MONGODB_URI === 'memory') {
  console.log('MONGODB_URI=memory seeds automatically on startup; nothing to do.');
  process.exit(0);
}
await connectDb(config.MONGODB_URI);
await seedDevData(
  config.DEV_ADMIN_EMAIL && config.DEV_ADMIN_PASSWORD
    ? { email: config.DEV_ADMIN_EMAIL, password: config.DEV_ADMIN_PASSWORD }
    : undefined,
);
await disconnectDb();
