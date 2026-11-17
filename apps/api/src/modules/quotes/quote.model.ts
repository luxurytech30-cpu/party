import { Schema, model } from 'mongoose';
import { QUOTE_STATUSES } from '@party/shared';

const quoteRequestSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    offeringId: { type: Schema.Types.ObjectId, ref: 'Offering' },
    eventDate: String,
    guestCount: Number,
    budget: Number,
    requirements: { type: String, required: true, maxlength: 3000 },
    status: { type: String, enum: QUOTE_STATUSES, default: 'open' },
    /** Latest pending offer — the only one that can be accepted (compare-and-set). */
    currentOfferId: { type: Schema.Types.ObjectId, ref: 'QuoteOffer' },
    offerCount: { type: Number, default: 0 },
    agreedPrice: Number,
    agreedTerms: String,
    agreedAt: Date,
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
  },
  { timestamps: true },
);
quoteRequestSchema.index({ businessId: 1, status: 1, updatedAt: -1 });
quoteRequestSchema.index({ customerId: 1, updatedAt: -1 });

export const QuoteRequest = model('QuoteRequest', quoteRequestSchema);

/** Every offer / counter-offer is an immutable version record. */
const quoteOfferSchema = new Schema(
  {
    quoteRequestId: { type: Schema.Types.ObjectId, ref: 'QuoteRequest', required: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    version: { type: Number, required: true },
    fromSide: { type: String, enum: ['business', 'customer'], required: true },
    price: { type: Number, required: true },
    terms: { type: String, maxlength: 3000 },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'superseded'], default: 'pending' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    respondedAt: Date,
  },
  { timestamps: true },
);
quoteOfferSchema.index({ quoteRequestId: 1, version: 1 }, { unique: true });

export const QuoteOffer = model('QuoteOffer', quoteOfferSchema);
