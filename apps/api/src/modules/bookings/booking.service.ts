import mongoose, { Types } from 'mongoose';
import type {
  BookingStatus,
  CreateBookingRequestInput,
  ManualBookingInput,
  UpdateAvailabilityInput,
} from '@party/shared';
import { AppError } from '../../lib/errors.js';
import { tenantFilter, toObjectId, type TenantContext } from '../../lib/tenant.js';
import { audit } from '../audit/audit.service.js';
import { Business } from '../businesses/business.model.js';
import { getCapabilities } from '../businesses/business.service.js';
import { Offering } from '../offerings/offering.model.js';
import { addDays, dayStatuses, getDefaultResource, isValidDate, todayIn } from './availability.js';
import { Booking } from './booking.model.js';
import { Review } from '../reviews/review.model.js';
import { notifyBusiness, notifyUser } from '../notifications/notify.js';
import { BookingResource } from './resource.model.js';

const MAX_RANGE_DAYS = 120;

async function assertBookingEnabled(businessId: Types.ObjectId) {
  const { effective } = await getCapabilities({ businessId });
  if (!effective.includes('booking')) {
    throw new AppError(403, 'CAPABILITY_DISABLED', 'This business does not accept bookings');
  }
}

function assertRange(from: string, to: string) {
  if (!isValidDate(from) || !isValidDate(to) || from > to) throw AppError.badRequest('Invalid date range');
  if (addDays(from, MAX_RANGE_DAYS) < to) throw AppError.badRequest(`Range must be at most ${MAX_RANGE_DAYS} days`);
}

// ---------- Availability settings (business side) ----------

export async function getAvailabilitySettings(ctx: TenantContext) {
  const r = await getDefaultResource(ctx.businessId);
  return { openWeekdays: r.openWeekdays, blockedDates: r.blockedDates, dailyCapacity: r.dailyCapacity };
}

export async function updateAvailabilitySettings(ctx: TenantContext, input: UpdateAvailabilityInput) {
  await getDefaultResource(ctx.businessId);
  await BookingResource.updateOne(
    tenantFilter(ctx, { kind: 'default' }),
    {
      $set: {
        openWeekdays: [...new Set(input.openWeekdays)].sort(),
        blockedDates: [...new Set(input.blockedDates.filter(isValidDate))].sort(),
        dailyCapacity: input.dailyCapacity,
      },
    },
  );
  return getAvailabilitySettings(ctx);
}

// ---------- Public availability ----------

export async function publicAvailability(businessId: Types.ObjectId, from: string, to: string) {
  assertRange(from, to);
  const business = await Business.findOne({ _id: businessId, status: 'active' }).select('timezone').lean();
  if (!business) throw AppError.notFound('Business not found');
  await assertBookingEnabled(businessId);
  const resource = await getDefaultResource(businessId);
  return dayStatuses(resource, from, to, todayIn(business.timezone ?? 'Asia/Jerusalem'));
}

// ---------- Customer ----------

export interface BookingRequestOptions {
  source?: 'customer' | 'quote';
  quoteId?: Types.ObjectId;
  agreedPrice?: number;
}

export async function createBookingRequest(
  customerId: Types.ObjectId,
  input: CreateBookingRequestInput,
  opts: BookingRequestOptions = {},
) {
  if (!isValidDate(input.date)) throw AppError.badRequest('Invalid date');
  const businessId = new Types.ObjectId(input.businessId);
  const business = await Business.findOne({ _id: businessId, status: 'active' }).select('timezone').lean();
  if (!business) throw AppError.notFound('Business not found');
  await assertBookingEnabled(businessId);

  if (input.offeringId) {
    const ok = await Offering.exists({ _id: input.offeringId, businessId, active: true });
    if (!ok) throw AppError.badRequest('Invalid offering');
  }

  const resource = await getDefaultResource(businessId);
  const status = (await dayStatuses(resource, input.date, input.date, todayIn(business.timezone ?? 'Asia/Jerusalem')))[input.date];
  if (status === 'unavailable') throw AppError.conflict('This date is not available', 'BOOKING_CONFLICT');
  if (status === 'booked') throw AppError.conflict('This date is already booked', 'BOOKING_CONFLICT');

  const duplicate = await Booking.exists({ businessId, customerId, date: input.date, status: { $in: ['requested', 'confirmed'] } });
  if (duplicate) throw AppError.conflict('You already have a request for this date');

  const booking = await Booking.create({
    businessId,
    resourceId: resource._id,
    customerId,
    offeringId: input.offeringId,
    date: input.date,
    guestCount: input.guestCount,
    note: input.note,
    status: 'requested',
    source: opts.source ?? 'customer',
    quoteId: opts.quoteId,
    agreedPrice: opts.agreedPrice,
    history: [{ status: 'requested', by: customerId }],
  });
  await notifyBusiness(businessId, 'bookings.read', {
    type: 'booking.requested',
    params: { date: input.date },
    link: `/dashboard/${businessId}?m=bookings`,
  });
  return booking.toObject();
}

export async function listCustomerBookings(customerId: Types.ObjectId) {
  const items = await Booking.find({ customerId }).sort({ date: -1 }).limit(200).lean();
  const businesses = await Business.find({ _id: { $in: items.map((b) => b.businessId) } }).select('name slug').lean();
  const offerings = await Offering.find({ _id: { $in: items.map((b) => b.offeringId).filter(Boolean) } }).select('title').lean();
  const bizById = new Map(businesses.map((b) => [String(b._id), b]));
  const offById = new Map(offerings.map((o) => [String(o._id), o]));
  const reviewed = new Set(
    (await Review.find({ bookingId: { $in: items.map((b) => b._id) } }).select('bookingId').lean()).map((r) => String(r.bookingId)),
  );
  return items.map((b) => ({
    ...b,
    reviewed: reviewed.has(String(b._id)),
    business: bizById.get(String(b.businessId)) ?? null,
    offering: b.offeringId ? (offById.get(String(b.offeringId)) ?? null) : null,
  }));
}

export async function cancelByCustomer(customerId: Types.ObjectId, rawId: string) {
  const id = toObjectId(rawId);
  if (!id) throw AppError.notFound('Booking not found');
  const booking = await Booking.findOneAndUpdate(
    { _id: id, customerId, status: { $in: ['requested', 'confirmed'] } },
    { $set: { status: 'cancelled_by_customer' }, $push: { history: { status: 'cancelled_by_customer', by: customerId } } },
    { new: true },
  ).lean();
  if (!booking) throw AppError.notFound('Booking not found');
  await notifyBusiness(booking.businessId, 'bookings.read', {
    type: 'booking.cancelled_by_customer',
    params: { date: booking.date },
    link: `/dashboard/${booking.businessId}?m=bookings`,
  });
  return booking;
}

// ---------- Business ----------

export async function listBusinessBookings(ctx: TenantContext, status?: BookingStatus) {
  const items = await Booking.find(tenantFilter(ctx, status ? { status } : {}))
    .sort({ date: 1 })
    .limit(500)
    .populate<{ customerId: { _id: Types.ObjectId; name: string; email: string; phone?: string } | null }>(
      'customerId',
      'name email phone',
    )
    .lean();
  const offerings = await Offering.find(tenantFilter(ctx, { _id: { $in: items.map((b) => b.offeringId).filter(Boolean) } }))
    .select('title')
    .lean();
  const offById = new Map(offerings.map((o) => [String(o._id), o]));
  return items.map(({ customerId, ...b }) => ({
    ...b,
    customer: customerId
      ? { id: String(customerId._id), name: customerId.name, email: customerId.email, phone: customerId.phone ?? null }
      : { id: null, name: b.customerName ?? '', email: null, phone: b.customerPhone ?? null },
    offering: b.offeringId ? (offById.get(String(b.offeringId)) ?? null) : null,
  }));
}

/**
 * Confirm a booking (or insert a manual confirmed booking) safely under concurrency.
 * The resource's lockVersion is incremented inside the transaction: concurrent
 * transactions on the same resource hit a write conflict and are retried by
 * `withTransaction`, so the capacity re-check always sees committed state.
 */
async function confirmUnderLock(
  ctx: TenantContext,
  resourceId: Types.ObjectId,
  date: string,
  apply: (session: mongoose.ClientSession) => Promise<Types.ObjectId>,
): Promise<Types.ObjectId> {
  const session = await mongoose.startSession();
  try {
    let resultId!: Types.ObjectId;
    await session.withTransaction(async () => {
      const resource = await BookingResource.findOneAndUpdate(tenantFilter(ctx, { _id: resourceId }), { $inc: { lockVersion: 1 } }, { new: true, session });
      if (!resource) throw AppError.notFound('Resource not found');

      const business = await Business.findById(ctx.businessId).select('timezone').session(session).lean();
      const status = (await dayStatuses(resource, date, date, todayIn(business?.timezone ?? 'Asia/Jerusalem'), session))[date];
      if (status === 'unavailable') throw AppError.conflict('This date is not available', 'BOOKING_CONFLICT');
      if (status === 'booked') throw AppError.conflict('This date is already fully booked', 'BOOKING_CONFLICT');

      resultId = await apply(session);
    });
    return resultId;
  } finally {
    await session.endSession();
  }
}

async function findTenantBooking(ctx: TenantContext, rawId: string) {
  const id = toObjectId(rawId);
  if (!id) throw AppError.notFound('Booking not found');
  const booking = await Booking.findOne(tenantFilter(ctx, { _id: id })).lean();
  if (!booking) throw AppError.notFound('Booking not found');
  return booking;
}

export async function confirmBooking(ctx: TenantContext, rawId: string, ip?: string) {
  const booking = await findTenantBooking(ctx, rawId);
  if (booking.status !== 'requested') throw AppError.conflict(`Cannot confirm a booking in status "${booking.status}"`);

  await confirmUnderLock(ctx, booking.resourceId, booking.date, async (session) => {
    // Compare-and-set on status so a concurrent cancel/decline is not overwritten.
    const res = await Booking.updateOne(
      tenantFilter(ctx, { _id: booking._id, status: 'requested' }),
      { $set: { status: 'confirmed' }, $push: { history: { status: 'confirmed', by: ctx.userId } } },
      { session },
    );
    if (res.modifiedCount !== 1) throw AppError.conflict('Booking status changed, please refresh');
    return booking._id;
  });
  await audit({ actorId: ctx.userId, businessId: ctx.businessId, action: 'booking.confirm', targetType: 'Booking', targetId: booking._id, ip });
  await notifyUser(booking.customerId, { type: 'booking.confirmed', params: { date: booking.date, businessId: String(ctx.businessId) }, link: '/bookings', businessId: ctx.businessId });
  return Booking.findById(booking._id).lean();
}

const BUSINESS_TRANSITIONS: Record<'decline' | 'cancel' | 'complete', { from: BookingStatus[]; to: BookingStatus }> = {
  decline: { from: ['requested'], to: 'declined' },
  cancel: { from: ['confirmed'], to: 'cancelled_by_business' },
  complete: { from: ['confirmed'], to: 'completed' },
};

export async function transitionBooking(ctx: TenantContext, rawId: string, action: keyof typeof BUSINESS_TRANSITIONS, ip?: string) {
  const booking = await findTenantBooking(ctx, rawId);
  const t = BUSINESS_TRANSITIONS[action];
  const updated = await Booking.findOneAndUpdate(
    tenantFilter(ctx, { _id: booking._id, status: { $in: t.from } }),
    { $set: { status: t.to }, $push: { history: { status: t.to, by: ctx.userId } } },
    { new: true },
  ).lean();
  if (!updated) throw AppError.conflict(`Cannot ${action} a booking in status "${booking.status}"`);
  await audit({ actorId: ctx.userId, businessId: ctx.businessId, action: `booking.${action}`, targetType: 'Booking', targetId: booking._id, ip });
  if (action !== 'complete') {
    await notifyUser(booking.customerId, { type: action === 'decline' ? 'booking.declined' : 'booking.cancelled_by_business', params: { date: booking.date }, link: '/bookings', businessId: ctx.businessId });
  }
  return updated;
}

export async function createManualBooking(ctx: TenantContext, input: ManualBookingInput, ip?: string) {
  if (!isValidDate(input.date)) throw AppError.badRequest('Invalid date');
  if (input.offeringId && !(await Offering.exists(tenantFilter(ctx, { _id: new Types.ObjectId(input.offeringId) })))) {
    throw AppError.badRequest('Invalid offering');
  }
  const resource = await getDefaultResource(ctx.businessId);
  const id = await confirmUnderLock(ctx, resource._id, input.date, async (session) => {
    const [b] = await Booking.create(
      [
        {
          businessId: ctx.businessId,
          resourceId: resource._id,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          offeringId: input.offeringId,
          agreedPrice: input.agreedPrice,
          note: input.note,
          date: input.date,
          status: 'confirmed',
          source: 'manual',
          history: [{ status: 'confirmed', by: ctx.userId }],
        },
      ],
      { session },
    );
    return b!._id;
  });
  await audit({ actorId: ctx.userId, businessId: ctx.businessId, action: 'booking.manual_create', targetType: 'Booking', targetId: id, ip });
  return Booking.findById(id).lean();
}

export { assertRange };
