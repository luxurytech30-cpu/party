import { Schema, model } from 'mongoose';
import { BUSINESS_ROLES } from '@party/shared';

const membershipSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: BUSINESS_ROLES, required: true },
    status: { type: String, enum: ['active', 'invited', 'removed'], default: 'active' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

membershipSchema.index({ businessId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ userId: 1, status: 1 });

export const BusinessMembership = model('BusinessMembership', membershipSchema);
