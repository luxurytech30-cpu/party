import { Schema, model } from 'mongoose';

/** Verified reviews: only a customer with a `completed` booking can review, once per booking. */
const reviewSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, maxlength: 2000 },
    status: { type: String, enum: ['published', 'hidden'], default: 'published' },
    reply: { text: String, at: Date, by: { type: Schema.Types.ObjectId, ref: 'User' } },
  },
  { timestamps: true },
);
reviewSchema.index({ bookingId: 1 }, { unique: true });
reviewSchema.index({ businessId: 1, status: 1, createdAt: -1 });

export const Review = model('Review', reviewSchema);
