import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';

export function cloudinaryConfig() {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = env();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new AppError(503, 'INTERNAL_ERROR', 'Media uploads are not configured (Cloudinary keys missing)');
  }
  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured() {
  const e = env();
  return Boolean(e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET);
}

/** Cloudinary signature: SHA-1 of alphabetically sorted params + API secret. */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1').update(toSign + apiSecret).digest('hex');
}

export const businessFolder = (businessId: string) => `party/businesses/${businessId}`;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_FORMATS = 'jpg,jpeg,png,webp,heic';
