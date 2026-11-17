import { ROLE_PERMISSIONS, type BusinessPermission, type BusinessRole } from '@party/shared';
import type { Types } from 'mongoose';
import { logger } from '../../lib/logger.js';
import { BusinessMembership } from '../businesses/membership.model.js';
import { Notification } from './notification.model.js';

export type NotificationType =
  | 'quote.requested'
  | 'quote.offer'
  | 'quote.counter'
  | 'quote.agreed'
  | 'quote.rejected'
  | 'booking.requested'
  | 'booking.confirmed'
  | 'booking.declined'
  | 'booking.cancelled_by_customer'
  | 'booking.cancelled_by_business'
  | 'review.created';

interface Payload {
  type: NotificationType;
  params?: Record<string, unknown>;
  link?: string;
  businessId?: Types.ObjectId;
}

/** Notifications must never break the main action: failures are logged, not thrown. */
export async function notifyUser(userId: Types.ObjectId | null | undefined, p: Payload) {
  if (!userId) return;
  try {
    await Notification.create({ userId, ...p });
  } catch (err) {
    logger.error({ err }, 'notifyUser failed');
  }
}

/** Notify every active member of a business whose role has `permission`. */
export async function notifyBusiness(businessId: Types.ObjectId, permission: BusinessPermission, p: Omit<Payload, 'businessId'>) {
  try {
    const members = await BusinessMembership.find({ businessId, status: 'active' }).select('userId role').lean();
    const targets = members.filter((m) => ROLE_PERMISSIONS[m.role as BusinessRole].includes(permission));
    if (targets.length) await Notification.insertMany(targets.map((m) => ({ userId: m.userId, businessId, ...p })));
  } catch (err) {
    logger.error({ err }, 'notifyBusiness failed');
  }
}
