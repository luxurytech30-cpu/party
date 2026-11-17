import type { ClientSession, Types } from 'mongoose';
import { AuditLog } from './auditLog.model.js';

export interface AuditEntry {
  actorId?: Types.ObjectId;
  businessId?: Types.ObjectId;
  action: string;
  targetType: string;
  targetId?: Types.ObjectId;
  meta?: Record<string, unknown>;
  ip?: string;
}

export async function audit(entry: AuditEntry, session?: ClientSession): Promise<void> {
  await AuditLog.create([entry], { session });
}
