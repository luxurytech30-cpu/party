import { Schema, model } from 'mongoose';
import { EVENT_TYPES } from '@party/shared';

/**
 * A customer's event plan. Items (checklist) and candidate vendors are embedded
 * and bounded (≤ 40 items, ≤ 10 candidates each). Saving a vendor is NOT a booking:
 * "booked" status is derived from real confirmed bookings, never stored.
 */
const candidateSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    offeringId: { type: Schema.Types.ObjectId, ref: 'Offering' },
    estimatedPrice: Number,
    note: { type: String, maxlength: 500 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const itemSchema = new Schema({
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
  label: { type: String, required: true, maxlength: 120 },
  estimatedCost: Number,
  candidates: { type: [candidateSchema], default: [] },
});

const eventSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    title: { type: String, required: true, maxlength: 120 },
    date: String,
    city: String,
    guestCount: Number,
    budget: Number,
    items: { type: [itemSchema], default: [] },
  },
  { timestamps: true },
);
eventSchema.index({ customerId: 1, updatedAt: -1 });

export const CustomerEvent = model('CustomerEvent', eventSchema);


export { EVENT_TEMPLATES } from '@party/shared';
