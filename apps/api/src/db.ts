import mongoose from 'mongoose';
import { logger } from './lib/logger.js';

mongoose.set('strictQuery', true);
// NoSQL operator injection is prevented at the edge: every input is parsed by a
// strict Zod schema, so request values reaching queries are primitives, never objects.

export async function connectDb(uri: string): Promise<void> {
  await mongoose.connect(uri, { autoIndex: true });
  logger.info('MongoDB connected');
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
