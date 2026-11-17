import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './db.js';
import { logger } from './lib/logger.js';
import { seedDemoData } from './seed/demo.js';
import { seedDevData } from './seed/seed.js';

/**
 * MONGODB_URI=memory starts an in-memory replica set (development only).
 * Lets the API run before an Atlas cluster exists. Data is lost on restart.
 */
async function resolveMongoUri(uri: string, nodeEnv: string): Promise<{ uri: string; stop?: () => Promise<void> }> {
  if (uri !== 'memory') return { uri };
  if (nodeEnv === 'production') throw new Error('MONGODB_URI=memory is not allowed in production');
  const { MongoMemoryReplSet } = await import('mongodb-memory-server');
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  logger.warn('Using in-memory MongoDB - data will be lost on restart');
  return { uri: replSet.getUri('party_dev'), stop: () => replSet.stop().then(() => undefined) };
}

async function main() {
  const config = env();
  const mongo = await resolveMongoUri(config.MONGODB_URI, config.NODE_ENV);
  await connectDb(mongo.uri);
  if (mongo.stop) {
    // In-memory DB starts empty every time: seed categories + dev admin.
    await seedDevData(
      config.DEV_ADMIN_EMAIL && config.DEV_ADMIN_PASSWORD
        ? { email: config.DEV_ADMIN_EMAIL, password: config.DEV_ADMIN_PASSWORD }
        : undefined,
    );
    if (process.env.SEED_DEMO !== 'false') await seedDemoData();
  }
  const server = createApp().listen(config.PORT, () => {
    logger.info(`API listening on http://localhost:${config.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close();
    await disconnectDb();
    await mongo.stop?.();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
