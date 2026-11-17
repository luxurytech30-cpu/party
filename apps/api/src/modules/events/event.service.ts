import { Types } from 'mongoose';
import { AppError } from '../../lib/errors.js';
import { toObjectId } from '../../lib/tenant.js';
import { Booking } from '../bookings/booking.model.js';
import { Business } from '../businesses/business.model.js';
import { Category } from '../categories/category.model.js';
import { Offering } from '../offerings/offering.model.js';
import { CustomerEvent, EVENT_TEMPLATES } from './event.model.js';

const MAX_ITEMS = 40;
const MAX_CANDIDATES = 10;

type ItemStatus = 'todo' | 'shortlisted' | 'requested' | 'booked';

async function ownEvent(customerId: Types.ObjectId, rawId: string) {
  const id = toObjectId(rawId);
  const event = id ? await CustomerEvent.findOne({ _id: id, customerId }) : null;
  if (!event) throw AppError.notFound('Event not found');
  return event;
}

function findItem(event: InstanceType<typeof CustomerEvent>, rawItemId: string) {
  const item = event.items.id(rawItemId);
  if (!item) throw AppError.notFound('Item not found');
  return item;
}

export async function createEvent(customerId: Types.ObjectId, input: { type: string; title: string; date?: string; city?: string; guestCount?: number; budget?: number; categorySlugs?: string[] }) {
  const count = await CustomerEvent.countDocuments({ customerId });
  if (count >= 20) throw AppError.conflict('Event limit reached');
  const slugs = [...new Set(input.categorySlugs ?? EVENT_TEMPLATES[input.type as keyof typeof EVENT_TEMPLATES] ?? [])];
  const categories = await Category.find({ slug: { $in: slugs }, active: true }).select('slug name').lean();
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const items = slugs
    .map((s) => bySlug.get(s))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => ({ categoryId: c._id, label: c.name.en ?? c.name.ar ?? c.slug }));
  const event = await CustomerEvent.create({ ...input, customerId, items });
  return getEvent(customerId, String(event._id));
}

export async function listEvents(customerId: Types.ObjectId) {
  const events = await CustomerEvent.find({ customerId }).sort({ date: 1, updatedAt: -1 }).lean();
  return events.map(({ items, ...e }) => ({ ...e, itemCount: items.length }));
}

/**
 * Event with derived per-item status and budget summary.
 * Status comes from the customer's REAL bookings with shortlisted vendors.
 */
export async function getEvent(customerId: Types.ObjectId, rawId: string) {
  const event = (await ownEvent(customerId, rawId)).toObject();
  const businessIds = [...new Set(event.items.flatMap((i) => i.candidates.map((c) => String(c.businessId))))].map((id) => new Types.ObjectId(id));

  const [businesses, bookings] = await Promise.all([
    Business.find({ _id: { $in: businessIds } }).select('name slug startingPrice status').lean(),
    Booking.find({
      customerId,
      businessId: { $in: businessIds },
      status: { $in: ['requested', 'confirmed', 'completed'] },
      ...(event.date ? { date: event.date } : {}),
    })
      .select('businessId offeringId status agreedPrice date')
      .lean(),
  ]);
  const bizById = new Map(businesses.map((b) => [String(b._id), b]));

  let estimatedTotal = 0;
  const items = event.items.map((item) => {
    const candidateIds = new Set(item.candidates.map((c) => String(c.businessId)));
    const related = bookings.filter((b) => candidateIds.has(String(b.businessId)) && item.candidates.some((c) => String(c.businessId) === String(b.businessId) && (!c.offeringId || String(c.offeringId) === String(b.offeringId))));
    const booked = related.find((b) => b.status === 'confirmed' || b.status === 'completed');
    const requested = related.find((b) => b.status === 'requested');
    const status: ItemStatus = booked ? 'booked' : requested ? 'requested' : item.candidates.length ? 'shortlisted' : 'todo';

    const candidatePrices = item.candidates.map((c) => c.estimatedPrice ?? bizById.get(String(c.businessId))?.startingPrice).filter((p): p is number => typeof p === 'number');
    const estimate = booked?.agreedPrice ?? item.estimatedCost ?? (candidatePrices.length ? Math.min(...candidatePrices) : undefined);
    if (estimate) estimatedTotal += estimate;

    return {
      ...item,
      status,
      estimate: estimate ?? null,
      bookedBusinessId: booked ? String(booked.businessId) : null,
      candidates: item.candidates.map((c) => ({ ...c, business: bizById.get(String(c.businessId)) ?? null })),
    };
  });

  return {
    event: { ...event, items },
    summary: {
      estimatedTotal,
      budget: event.budget ?? null,
      remaining: event.budget !== undefined && event.budget !== null ? event.budget - estimatedTotal : null,
      booked: items.filter((i) => i.status === 'booked').length,
      total: items.length,
    },
  };
}

export async function updateEvent(customerId: Types.ObjectId, rawId: string, input: Record<string, unknown>) {
  const event = await ownEvent(customerId, rawId);
  event.set(input);
  await event.save();
  return getEvent(customerId, rawId);
}

export async function deleteEvent(customerId: Types.ObjectId, rawId: string) {
  const event = await ownEvent(customerId, rawId);
  await event.deleteOne();
}

export async function addItem(customerId: Types.ObjectId, rawId: string, input: { categoryId?: string; label: string; estimatedCost?: number }) {
  const event = await ownEvent(customerId, rawId);
  if (event.items.length >= MAX_ITEMS) throw AppError.conflict('Checklist limit reached');
  if (input.categoryId && !(await Category.exists({ _id: input.categoryId }))) throw AppError.badRequest('Invalid category');
  event.items.push(input);
  await event.save();
  return getEvent(customerId, rawId);
}

export async function updateItem(customerId: Types.ObjectId, rawId: string, itemId: string, input: Record<string, unknown>) {
  const event = await ownEvent(customerId, rawId);
  findItem(event, itemId).set(input);
  await event.save();
  return getEvent(customerId, rawId);
}

export async function removeItem(customerId: Types.ObjectId, rawId: string, itemId: string) {
  const event = await ownEvent(customerId, rawId);
  findItem(event, itemId).deleteOne();
  await event.save();
  return getEvent(customerId, rawId);
}

export async function addCandidate(customerId: Types.ObjectId, rawId: string, itemId: string, input: { businessId: string; offeringId?: string; estimatedPrice?: number; note?: string }) {
  const event = await ownEvent(customerId, rawId);
  const item = findItem(event, itemId);
  const businessId = new Types.ObjectId(input.businessId);
  if (!(await Business.exists({ _id: businessId, status: 'active' }))) throw AppError.notFound('Business not found');
  if (input.offeringId && !(await Offering.exists({ _id: input.offeringId, businessId, active: true }))) throw AppError.notFound('Offering not found');
  if (item.candidates.some((c) => String(c.businessId) === input.businessId && String(c.offeringId ?? '') === (input.offeringId ?? ''))) throw AppError.conflict('Already saved for this item');
  if (item.candidates.length >= MAX_CANDIDATES) throw AppError.conflict('Candidate limit reached');
  item.candidates.push({ businessId, offeringId: input.offeringId ? new Types.ObjectId(input.offeringId) : undefined, estimatedPrice: input.estimatedPrice, note: input.note });
  await event.save();
  return getEvent(customerId, rawId);
}

export async function removeCandidate(customerId: Types.ObjectId, rawId: string, itemId: string, businessId: string, offeringId?: string) {
  const event = await ownEvent(customerId, rawId);
  const item = findItem(event, itemId);
  item.set('candidates', item.candidates.filter((c) => String(c.businessId) !== businessId || (offeringId !== undefined && String(c.offeringId) !== offeringId)));
  await event.save();
  return getEvent(customerId, rawId);
}
