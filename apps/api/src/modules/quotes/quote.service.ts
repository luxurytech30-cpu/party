import { Types } from 'mongoose';
import type { CreateQuoteRequestInput, QuoteOfferInput } from '@party/shared';
import { AppError } from '../../lib/errors.js';
import { tenantFilter, toObjectId, type TenantContext } from '../../lib/tenant.js';
import { audit } from '../audit/audit.service.js';
import { createBookingRequest } from '../bookings/booking.service.js';
import { Business } from '../businesses/business.model.js';
import { getCapabilities } from '../businesses/business.service.js';
import { notifyBusiness, notifyUser } from '../notifications/notify.js';
import { Offering } from '../offerings/offering.model.js';
import { QuoteOffer, QuoteRequest } from './quote.model.js';

type Side = 'business' | 'customer';
/** Statuses in which negotiation can continue. */
const NEGOTIABLE = ['open', 'offered', 'countered'] as const;

async function capabilities(businessId: Types.ObjectId) {
  return (await getCapabilities({ businessId })).effective;
}

async function withOffers(quoteId: Types.ObjectId) {
  const [quote, offers] = await Promise.all([
    QuoteRequest.findById(quoteId).lean(),
    QuoteOffer.find({ quoteRequestId: quoteId }).sort({ version: 1 }).lean(),
  ]);
  return { quote, offers };
}

/**
 * Create a new offer version from `side`. Previous pending offer is superseded.
 * Uses a compare-and-set on (status, offerCount) so concurrent offers can't both win.
 */
async function addOffer(
  quoteId: Types.ObjectId,
  businessId: Types.ObjectId,
  side: Side,
  userId: Types.ObjectId,
  input: QuoteOfferInput,
) {
  const quote = await QuoteRequest.findById(quoteId).lean();
  if (!quote || !NEGOTIABLE.includes(quote.status as (typeof NEGOTIABLE)[number])) {
    throw AppError.conflict('This quote is no longer open for offers');
  }
  if (side === 'customer' && !quote.currentOfferId) throw AppError.conflict('Wait for the business offer first');

  const version = quote.offerCount + 1;
  const offer = await QuoteOffer.create({ quoteRequestId: quoteId, businessId, version, fromSide: side, price: input.price, terms: input.terms, createdBy: userId });
  const updated = await QuoteRequest.updateOne(
    { _id: quoteId, offerCount: quote.offerCount, status: quote.status },
    { $set: { currentOfferId: offer._id, status: side === 'business' ? 'offered' : 'countered' }, $inc: { offerCount: 1 } },
  );
  if (updated.modifiedCount !== 1) {
    await offer.deleteOne();
    throw AppError.conflict('The quote changed meanwhile, please refresh');
  }
  if (quote.currentOfferId) {
    await QuoteOffer.updateOne({ _id: quote.currentOfferId, status: 'pending' }, { $set: { status: 'superseded' } });
  }
  return offer;
}

/** Accept/reject the current pending offer made by the *other* side. */
async function respond(quoteId: Types.ObjectId, side: Side, userId: Types.ObjectId, rawOfferId: string, action: 'accept' | 'reject') {
  const offerId = new Types.ObjectId(rawOfferId);
  const offer = await QuoteOffer.findOne({ _id: offerId, quoteRequestId: quoteId }).lean();
  if (!offer) throw AppError.notFound('Offer not found');
  if (offer.fromSide === side) throw AppError.conflict('You cannot respond to your own offer');

  const set =
    action === 'accept'
      ? { status: 'agreed', agreedPrice: offer.price, agreedTerms: offer.terms, agreedAt: new Date() }
      : { status: 'rejected' };
  // Only the *current* offer can be answered, and only while negotiation is open.
  const quote = await QuoteRequest.findOneAndUpdate(
    { _id: quoteId, currentOfferId: offerId, status: { $in: NEGOTIABLE } },
    { $set: set },
    { new: true },
  ).lean();
  if (!quote) throw AppError.conflict('This offer is no longer current, please refresh');
  await QuoteOffer.updateOne({ _id: offerId }, { $set: { status: action === 'accept' ? 'accepted' : 'rejected', respondedAt: new Date() } });
  await audit({ actorId: userId, businessId: quote.businessId, action: `quote.${action}`, targetType: 'QuoteRequest', targetId: quoteId, meta: { offerId: rawOfferId, price: offer.price } });
  return quote;
}

// ---------- Customer ----------

export async function createQuoteRequest(customerId: Types.ObjectId, input: CreateQuoteRequestInput) {
  const businessId = new Types.ObjectId(input.businessId);
  const business = await Business.exists({ _id: businessId, status: 'active' });
  if (!business) throw AppError.notFound('Business not found');
  if (!(await capabilities(businessId)).includes('quotes')) {
    throw new AppError(403, 'CAPABILITY_DISABLED', 'This business does not accept quote requests');
  }
  if (input.offeringId && !(await Offering.exists({ _id: input.offeringId, businessId, active: true }))) {
    throw AppError.badRequest('Invalid offering');
  }
  const open = await QuoteRequest.countDocuments({ businessId, customerId, status: { $in: NEGOTIABLE } });
  if (open >= 3) throw AppError.conflict('You already have open quote requests with this business');

  const quote = await QuoteRequest.create({ ...input, businessId, customerId, status: 'open' });
  await notifyBusiness(businessId, 'quotes.manage', { type: 'quote.requested', link: `/dashboard/${businessId}?m=quotes&q=${quote._id}` });
  return quote.toObject();
}

async function ownQuote(customerId: Types.ObjectId, rawId: string) {
  const id = toObjectId(rawId);
  const quote = id ? await QuoteRequest.findOne({ _id: id, customerId }).lean() : null;
  if (!quote) throw AppError.notFound('Quote not found');
  return quote;
}

export async function listCustomerQuotes(customerId: Types.ObjectId) {
  const quotes = await QuoteRequest.find({ customerId }).sort({ updatedAt: -1 }).limit(100).lean();
  const businesses = await Business.find({ _id: { $in: quotes.map((q) => q.businessId) } }).select('name slug').lean();
  const byId = new Map(businesses.map((b) => [String(b._id), b]));
  return quotes.map((q) => ({ ...q, business: byId.get(String(q.businessId)) ?? null }));
}

export async function getCustomerQuote(customerId: Types.ObjectId, rawId: string) {
  const quote = await ownQuote(customerId, rawId);
  const business = await Business.findById(quote.businessId).select('name slug').lean();
  const { offers } = await withOffers(quote._id);
  const negotiation = (await capabilities(quote.businessId)).includes('negotiation');
  return { quote, offers, business, canCounter: negotiation };
}

export async function customerCounter(customerId: Types.ObjectId, rawId: string, input: QuoteOfferInput) {
  const quote = await ownQuote(customerId, rawId);
  if (!(await capabilities(quote.businessId)).includes('negotiation')) {
    throw new AppError(403, 'CAPABILITY_DISABLED', 'This business does not negotiate prices');
  }
  await addOffer(quote._id, quote.businessId, 'customer', customerId, input);
  await notifyBusiness(quote.businessId, 'quotes.manage', { type: 'quote.counter', params: { price: input.price }, link: `/dashboard/${quote.businessId}?m=quotes&q=${quote._id}` });
  return getCustomerQuote(customerId, rawId);
}

export async function customerRespond(customerId: Types.ObjectId, rawId: string, offerId: string, action: 'accept' | 'reject') {
  const quote = await ownQuote(customerId, rawId);
  await respond(quote._id, 'customer', customerId, offerId, action);
  await notifyBusiness(quote.businessId, 'quotes.manage', {
    type: action === 'accept' ? 'quote.agreed' : 'quote.rejected',
    link: `/dashboard/${quote.businessId}?m=quotes&q=${quote._id}`,
  });
  return getCustomerQuote(customerId, rawId);
}

export async function customerCancel(customerId: Types.ObjectId, rawId: string) {
  const quote = await ownQuote(customerId, rawId);
  const res = await QuoteRequest.updateOne({ _id: quote._id, status: { $in: NEGOTIABLE } }, { $set: { status: 'cancelled' } });
  if (res.modifiedCount !== 1) throw AppError.conflict('This quote can no longer be cancelled');
  return getCustomerQuote(customerId, rawId);
}

/**
 * Turn an agreed quote into a booking REQUEST (never a confirmed booking).
 * The business still has to confirm availability.
 */
export async function bookFromQuote(customerId: Types.ObjectId, rawId: string, date?: string) {
  const quote = await ownQuote(customerId, rawId);
  if (quote.status !== 'agreed') throw AppError.conflict('Only an agreed quote can be turned into a booking request');
  const bookingDate = date ?? quote.eventDate;
  if (!bookingDate) throw AppError.badRequest('Please choose a date');

  // Claim the quote first so a double click cannot create two booking requests.
  const claimed = await QuoteRequest.findOneAndUpdate({ _id: quote._id, status: 'agreed' }, { $set: { status: 'booked' } });
  if (!claimed) throw AppError.conflict('A booking request was already created for this quote');
  try {
    const booking = await createBookingRequest(
      customerId,
      {
        businessId: String(quote.businessId),
        date: bookingDate,
        ...(quote.offeringId ? { offeringId: String(quote.offeringId) } : {}),
        ...(quote.guestCount ? { guestCount: quote.guestCount } : {}),
        note: quote.agreedTerms ?? undefined,
      },
      { source: 'quote', quoteId: quote._id, agreedPrice: quote.agreedPrice ?? undefined },
    );
    await QuoteRequest.updateOne({ _id: quote._id }, { $set: { bookingId: booking._id } });
    return booking;
  } catch (err) {
    await QuoteRequest.updateOne({ _id: quote._id, status: 'booked' }, { $set: { status: 'agreed' } });
    throw err;
  }
}

// ---------- Business ----------

export async function listBusinessQuotes(ctx: TenantContext, status?: string) {
  const quotes = await QuoteRequest.find(tenantFilter(ctx, status ? { status } : {}))
    .sort({ updatedAt: -1 })
    .limit(200)
    .populate<{ customerId: { _id: Types.ObjectId; name: string; email: string; phone?: string } }>('customerId', 'name email phone')
    .lean();
  return quotes.map(({ customerId, ...q }) => ({ ...q, customer: { id: String(customerId._id), name: customerId.name, email: customerId.email, phone: customerId.phone ?? null } }));
}

async function tenantQuote(ctx: TenantContext, rawId: string) {
  const id = toObjectId(rawId);
  const quote = id ? await QuoteRequest.findOne(tenantFilter(ctx, { _id: id })).lean() : null;
  if (!quote) throw AppError.notFound('Quote not found');
  return quote;
}

export async function getBusinessQuote(ctx: TenantContext, rawId: string) {
  const quote = await tenantQuote(ctx, rawId);
  const { offers } = await withOffers(quote._id);
  return { quote, offers };
}

export async function businessOffer(ctx: TenantContext, rawId: string, input: QuoteOfferInput) {
  const quote = await tenantQuote(ctx, rawId);
  // A business answering a counter-offer with a new price is a negotiation step.
  if (quote.status === 'countered' && !(await capabilities(ctx.businessId)).includes('negotiation')) {
    throw new AppError(403, 'CAPABILITY_DISABLED', 'Negotiation is not enabled');
  }
  await addOffer(quote._id, ctx.businessId, 'business', ctx.userId, input);
  await notifyUser(quote.customerId, { type: 'quote.offer', params: { price: input.price }, link: `/quotes/${quote._id}`, businessId: ctx.businessId });
  return getBusinessQuote(ctx, rawId);
}

export async function businessRespond(ctx: TenantContext, rawId: string, offerId: string, action: 'accept' | 'reject') {
  const quote = await tenantQuote(ctx, rawId);
  await respond(quote._id, 'business', ctx.userId, offerId, action);
  await notifyUser(quote.customerId, { type: action === 'accept' ? 'quote.agreed' : 'quote.rejected', link: `/quotes/${quote._id}`, businessId: ctx.businessId });
  return getBusinessQuote(ctx, rawId);
}

export async function businessReject(ctx: TenantContext, rawId: string) {
  const quote = await tenantQuote(ctx, rawId);
  const res = await QuoteRequest.updateOne(tenantFilter(ctx, { _id: quote._id, status: { $in: NEGOTIABLE } }), { $set: { status: 'rejected' } });
  if (res.modifiedCount !== 1) throw AppError.conflict('This quote is already closed');
  await notifyUser(quote.customerId, { type: 'quote.rejected', link: `/quotes/${quote._id}`, businessId: ctx.businessId });
  return getBusinessQuote(ctx, rawId);
}
