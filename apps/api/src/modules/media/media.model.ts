import { Schema, model } from 'mongoose';

/** Portfolio media uploaded to Cloudinary (signed upload, per-business folder). */
const mediaSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    resourceType: { type: String, enum: ['image', 'video'], default: 'image' },
    width: Number,
    height: Number,
    order: { type: Number, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
mediaSchema.index({ businessId: 1, order: 1 });
mediaSchema.index({ publicId: 1 }, { unique: true });

export const Media = model('Media', mediaSchema);
