import { Schema, model, type InferSchemaType } from 'mongoose';
import { CAPABILITIES } from '@party/shared';

export const localizedTextDef = {
  ar: { type: String, trim: true },
  he: { type: String, trim: true },
  en: { type: String, trim: true },
};

export const BUSINESS_STATUSES = ['pending_review', 'active', 'rejected', 'suspended'] as const;

const businessSchema = new Schema(
  {
    slug: { type: String, required: true, lowercase: true, trim: true },
    name: { type: localizedTextDef, required: true, _id: false },
    description: { type: localizedTextDef, _id: false },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category', required: true }],
    status: { type: String, enum: BUSINESS_STATUSES, default: 'pending_review' },
    statusReason: { type: String, maxlength: 1000 },
    cities: [{ type: String, trim: true }],
    contact: {
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    enabledCapabilities: [{ type: String, enum: CAPABILITIES }],
    /** Category-specific custom field values (validated against CategorySchema). */
    attributes: { type: Schema.Types.Mixed, default: {} },
    /** Attribute pattern for indexed filtering on filterable custom fields. */
    attributesIndex: [{ _id: false, k: String, v: Schema.Types.Mixed }],
    rating: {
      avg: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    startingPrice: { type: Number },
    featuredUntil: { type: Date },
    timezone: { type: String, default: 'Asia/Jerusalem' },
    /** Fictional demo data (removable with `npm run seed:demo -- --remove`). */
    demo: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, minimize: false },
);

businessSchema.index({ slug: 1 }, { unique: true });
businessSchema.index({ status: 1, categoryIds: 1 });
businessSchema.index({ status: 1, cities: 1 });
businessSchema.index({ 'attributesIndex.k': 1, 'attributesIndex.v': 1 });

export type BusinessDoc = InferSchemaType<typeof businessSchema>;
export const Business = model('Business', businessSchema);
