import { Schema, model, type InferSchemaType } from 'mongoose';
import { OFFERING_KINDS, PRICING_MODELS } from '@party/shared';
import { localizedTextDef } from '../businesses/business.model.js';

const pricingSubSchema = new Schema(
  {
    model: { type: String, enum: PRICING_MODELS, required: true },
    currency: { type: String, default: 'ILS' },
    amount: Number,
    min: Number,
    max: Number,
    negotiable: { type: Boolean, default: false },
  },
  { _id: false },
);

/**
 * Services, packages and products share one collection (discriminated by `kind`)
 * so all categories reuse the same code paths. Kind-specific fields are optional.
 */
const offeringSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    kind: { type: String, enum: OFFERING_KINDS, required: true },
    title: { type: localizedTextDef, required: true, _id: false },
    description: { type: localizedTextDef, _id: false },
    pricing: { type: pricingSubSchema, required: true },
    durationMinutes: Number,
    includes: [String],
    stock: Number,
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

offeringSchema.index({ businessId: 1, kind: 1, active: 1, order: 1 });

export type OfferingDoc = InferSchemaType<typeof offeringSchema>;
export const Offering = model('Offering', offeringSchema);

/** Lowest displayable price of an offering (for "starting from" on cards). */
export function offeringMinPrice(o: Pick<OfferingDoc, 'pricing'>): number | null {
  const p = o.pricing;
  if (!p || p.model === 'quote_only') return null;
  if (p.model === 'range') return p.min ?? null;
  return p.amount ?? null;
}
