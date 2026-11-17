import { Schema, model } from 'mongoose';

/**
 * In-app notifications. Text is rendered client-side from `type` + `params`
 * so every user sees it in their own language. Email/SMS/WhatsApp channels later.
 */
const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business' },
    type: { type: String, required: true },
    params: { type: Schema.Types.Mixed, default: {} },
    link: { type: String, maxlength: 300 },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });
// Keep notifications for 180 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 86_400 });

export const Notification = model('Notification', notificationSchema);
