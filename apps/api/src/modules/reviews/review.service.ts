import { Types } from 'mongoose';
import { AppError } from '../../lib/errors.js';
import { tenantFilter, toObjectId, type TenantContext } from '../../lib/tenant.js';
import { audit } from '../audit/audit.service.js';
import { User } from '../auth/user.model.js';
import { Booking } from '../bookings/booking.model.js';
import { Business } from '../businesses/business.model.js';
import { notifyBusiness } from '../notifications/notify.js';
import { Review } from './review.model.js';

export async function recomputeRating(businessId: Types.ObjectId) {
  const [agg] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { businessId, status: 'published' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Business.updateOne(
    { _id: businessId },
    { $set: { 'rating.avg': agg ? Math.round(agg.avg * 10) / 10 : 0, 'rating.count': agg?.count ?? 0 } },
  );
}

export async function createReview(customerId: Types.ObjectId, input: { bookingId: string; rating: number; text?: string }) {
  const booking = await Booking.findOne({ _id: new Types.ObjectId(input.bookingId), customerId }).lean();
  if (!booking) throw AppError.notFound('Booking not found');
  if (booking.status !== 'completed') throw AppError.conflict('You can review only after the event is completed');
  const review = await Review.create({ businessId: booking.businessId, customerId, bookingId: booking._id, rating: input.rating, text: input.text });
  await recomputeRating(booking.businessId);
  await notifyBusiness(booking.businessId, 'business.read', { type: 'review.created', params: { rating: input.rating }, link: `/dashboard/${booking.businessId}?m=reviews` });
  return review.toObject();
}

/** Public: first name only — never the reviewer's email/phone. */
export async function publicReviews(businessId: Types.ObjectId) {
  const reviews = await Review.find({ businessId, status: 'published' }).sort({ createdAt: -1 }).limit(100).lean();
  const users = await User.find({ _id: { $in: reviews.map((r) => r.customerId) } }).select('name').lean();
  const names = new Map(users.map((u) => [String(u._id), u.name.split(' ')[0] ?? '']));
  return reviews.map((r) => ({
    _id: r._id,
    rating: r.rating,
    text: r.text,
    reply: r.reply?.text ? { text: r.reply.text, at: r.reply.at } : null,
    author: names.get(String(r.customerId)) ?? '',
    createdAt: r.createdAt,
  }));
}

export async function businessReviews(ctx: TenantContext) {
  return publicReviews(ctx.businessId);
}

export async function replyToReview(ctx: TenantContext, rawId: string, text: string) {
  const id = toObjectId(rawId);
  const review = id
    ? await Review.findOneAndUpdate(tenantFilter(ctx, { _id: id }), { $set: { reply: { text, at: new Date(), by: ctx.userId } } }, { new: true }).lean()
    : null;
  if (!review) throw AppError.notFound('Review not found');
  return review;
}

export async function adminListReviews(status?: 'published' | 'hidden') {
  const reviews = await Review.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(200).lean();
  const businesses = await Business.find({ _id: { $in: reviews.map((r) => r.businessId) } }).select('name slug').lean();
  const byId = new Map(businesses.map((b) => [String(b._id), b]));
  return reviews.map((r) => ({ ...r, business: byId.get(String(r.businessId)) ?? null }));
}

export async function adminSetReviewStatus(actorId: Types.ObjectId, rawId: string, status: 'published' | 'hidden', ip?: string) {
  const id = toObjectId(rawId);
  const review = id ? await Review.findOneAndUpdate({ _id: id }, { $set: { status } }, { new: true }).lean() : null;
  if (!review) throw AppError.notFound('Review not found');
  await recomputeRating(review.businessId);
  await audit({ actorId, businessId: review.businessId, action: 'admin.review.status', targetType: 'Review', targetId: review._id, meta: { status }, ip });
  return review;
}
