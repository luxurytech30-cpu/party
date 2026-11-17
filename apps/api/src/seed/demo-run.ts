// Usage: npm run seed:demo            → add demo businesses (with photos)
//        npm run seed:demo -- --remove → delete all demo businesses
import { env } from '../config/env.js';
import { connectDb, disconnectDb } from '../db.js';
import { removeDemoData, seedDemoData } from './demo.js';
import { seedCategories } from './seed.js';

const config = env();
if (config.MONGODB_URI === 'memory') {
  console.log('MONGODB_URI=memory seeds demo data automatically on startup.');
  process.exit(0);
}
await connectDb(config.MONGODB_URI);
if (process.argv.includes('--remove')) {
  console.log(`Removed ${await removeDemoData()} demo businesses`);
} else {
  await seedCategories();
  console.log(`Created ${await seedDemoData()} demo businesses`);
}
await disconnectDb();
