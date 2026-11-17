import { Schema, model, type InferSchemaType } from 'mongoose';
import { BOOKING_STATUSES } from '@party/shared';

const bookingSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    resourceId: { type: Schema.Types.ObjectId, ref: 'BookingResource', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User' },
    /** For manual bookings entered by the business (customer may not be a platform user). */
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    offeringId: { type: Schema.Types.ObjectId, ref: 'Offering' },
    quoteId: { type: Schema.Types.ObjectId, ref: 'QuoteRequest' },
    /** Calendar date in the business timezone, YYYY-MM-DD (full-day booking). */
    date: { type: String, required: true },
    status: { type: String, enum: BOOKING_STATUSES, required: true },
    source: { type: String, enum: ['customer', 'manual', 'quote'], required: true },
    guestCount: Number,
    note: { type: String, maxlength: 1000 },
    agreedPrice: Number,
    history: [
      {
        _id: false,
        status: { type: String, enum: BOOKING_STATUSES },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

bookingSchema.index({ businessId: 1, status: 1, date: 1 });
bookingSchema.index({ resourceId: 1, date: 1, status: 1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });

export type BookingDoc = InferSchemaType<typeof bookingSchema>;
export const Booking = model('Booking', bookingSchema);
