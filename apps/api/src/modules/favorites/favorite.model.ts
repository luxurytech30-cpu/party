import { Schema, model } from 'mongoose';

const favoriteSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
favoriteSchema.index({ customerId: 1, businessId: 1 }, { unique: true });

export const Favorite = model('Favorite', favoriteSchema);
