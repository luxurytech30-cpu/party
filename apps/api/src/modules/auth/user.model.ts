import { Schema, model, type InferSchemaType } from 'mongoose';
import { LOCALES, PLATFORM_ROLES } from '@party/shared';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    locale: { type: String, enum: LOCALES, default: 'ar' },
    platformRoles: {
      type: [{ type: String, enum: PLATFORM_ROLES }],
      default: ['customer'],
    },
    status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
    emailVerifiedAt: { type: Date },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = model('User', userSchema);

/** Public-safe user representation. */
export function serializeUser(u: {
  _id: unknown;
  name: string;
  email: string;
  phone?: string | null;
  locale?: string | null;
  platformRoles: string[];
}) {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    phone: u.phone ?? null,
    locale: u.locale ?? 'ar',
    platformRoles: u.platformRoles,
  };
}
