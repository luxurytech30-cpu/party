import { Schema, model } from 'mongoose';

/**
 * A bookable resource (hall, photographer, car…). Every business gets a `default`
 * resource; multi-resource businesses come in Phase 4. `lockVersion` is bumped inside
 * the confirmation transaction to serialize concurrent confirmations.
 *
 * MVP availability lives on the resource (weekly open days, blocked dates, daily
 * capacity). Time slots / seasonal rules move to dedicated collections in Phase 4.
 */
const resourceSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    kind: { type: String, enum: ['default', 'venue_space', 'staff', 'equipment', 'vehicle'], default: 'default' },
    name: { type: String, default: 'default' },
    openWeekdays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    blockedDates: { type: [String], default: [] },
    dailyCapacity: { type: Number, default: 1, min: 1 },
    lockVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

resourceSchema.index({ businessId: 1, kind: 1 }, { unique: true, partialFilterExpression: { kind: 'default' } });

export const BookingResource = model('BookingResource', resourceSchema);
