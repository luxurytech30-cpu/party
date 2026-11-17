import { Schema, model } from 'mongoose';
import { CAPABILITIES } from '@party/shared';
import { localizedTextDef } from '../businesses/business.model.js';

/** Categories are data, not code: new categories need no deployment. */
const categorySchema = new Schema(
  {
    slug: { type: String, required: true, lowercase: true, trim: true },
    name: { type: localizedTextDef, required: true, _id: false },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    icon: { type: String, trim: true },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    allowedCapabilities: [{ type: String, enum: CAPABILITIES }],
    defaultCapabilities: [{ type: String, enum: CAPABILITIES }],
  },
  { timestamps: true },
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parentId: 1, order: 1 });

export const Category = model('Category', categorySchema);
