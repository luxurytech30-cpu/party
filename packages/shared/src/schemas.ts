import { z } from 'zod';
import { CAPABILITIES } from './capabilities.js';
import { BUSINESS_ROLES } from './permissions.js';
import { LOCALES } from './locales.js';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const localizedTextSchema = z
  .object({
    ar: z.string().trim().min(1).max(5000).optional(),
    he: z.string().trim().min(1).max(5000).optional(),
    en: z.string().trim().min(1).max(5000).optional(),
  })
  .strict()
  .refine((v) => Object.values(v).some(Boolean), { message: 'At least one language is required' });

export const localeSchema = z.enum(LOCALES);

// ---------- Auth ----------
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a digit');

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email().max(254),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9]{9,15}$/, 'Invalid phone number')
      .optional(),
    password: passwordSchema,
    locale: localeSchema.optional(),
  })
  .strict();
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(128),
  })
  .strict();
export type LoginInput = z.infer<typeof loginSchema>;

// ---------- Pricing ----------
export const PRICING_MODELS = [
  'fixed',
  'starting_from',
  'range',
  'hourly',
  'per_person',
  'package',
  'quote_only',
] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

export const pricingSchema = z
  .object({
    model: z.enum(PRICING_MODELS),
    currency: z.literal('ILS').default('ILS'),
    amount: z.number().nonnegative().max(10_000_000).optional(),
    min: z.number().nonnegative().max(10_000_000).optional(),
    max: z.number().nonnegative().max(10_000_000).optional(),
    negotiable: z.boolean().default(false),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.model === 'range') {
      if (p.min === undefined || p.max === undefined) {
        ctx.addIssue({ code: 'custom', message: 'Range pricing needs min and max' });
      } else if (p.min > p.max) {
        ctx.addIssue({ code: 'custom', message: 'min must be <= max' });
      }
    } else if (p.model !== 'quote_only' && p.amount === undefined) {
      ctx.addIssue({ code: 'custom', message: `${p.model} pricing needs an amount` });
    }
  });
export type PricingInput = z.infer<typeof pricingSchema>;

// ---------- Business ----------
export const createBusinessSchema = z
  .object({
    name: localizedTextSchema,
    description: localizedTextSchema.optional(),
    categoryIds: z.array(objectIdSchema).min(1).max(5),
    cities: z.array(z.string().trim().min(1).max(80)).max(50).default([]),
    phone: z.string().trim().regex(/^\+?[0-9]{9,15}$/).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
  })
  .strict();
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const updateBusinessSchema = createBusinessSchema
  .omit({ categoryIds: true })
  .partial()
  .strict();
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export const updateCapabilitiesSchema = z
  .object({ enabled: z.array(z.enum(CAPABILITIES)).max(CAPABILITIES.length) })
  .strict();

export const businessRoleSchema = z.enum(BUSINESS_ROLES);

export const addMemberSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(['manager', 'staff', 'viewer']),
  })
  .strict();

// ---------- Offerings (services / packages / products) ----------
export const OFFERING_KINDS = ['service', 'package', 'product'] as const;
export type OfferingKind = (typeof OFFERING_KINDS)[number];

/** Capability required to manage each offering kind. */
export const OFFERING_KIND_CAPABILITY = {
  service: 'services',
  package: 'packages',
  product: 'products',
} as const;

export const createOfferingSchema = z
  .object({
    kind: z.enum(OFFERING_KINDS),
    title: localizedTextSchema,
    description: localizedTextSchema.optional(),
    pricing: pricingSchema,
    durationMinutes: z.number().int().min(15).max(60 * 24 * 7).optional(),
    includes: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
    stock: z.number().int().min(0).max(1_000_000).optional(),
    active: z.boolean().default(true),
  })
  .strict();
export type CreateOfferingInput = z.infer<typeof createOfferingSchema>;

export const updateOfferingSchema = createOfferingSchema.omit({ kind: true }).partial().strict();
export type UpdateOfferingInput = z.infer<typeof updateOfferingSchema>;

// ---------- Availability & bookings ----------
export const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const updateAvailabilitySchema = z
  .object({
    /** 0 = Sunday … 6 = Saturday */
    openWeekdays: z.array(z.number().int().min(0).max(6)).max(7),
    blockedDates: z.array(dateOnlySchema).max(366),
    /** How many bookings can be confirmed on the same day (1 = exclusive). */
    dailyCapacity: z.number().int().min(1).max(100).default(1),
  })
  .strict();
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;

export const createBookingRequestSchema = z
  .object({
    businessId: objectIdSchema,
    date: dateOnlySchema,
    offeringId: objectIdSchema.optional(),
    guestCount: z.number().int().min(1).max(10_000).optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();
export type CreateBookingRequestInput = z.infer<typeof createBookingRequestSchema>;

export const manualBookingSchema = z
  .object({
    date: dateOnlySchema,
    customerName: z.string().trim().min(1).max(120),
    customerPhone: z.string().trim().max(20).optional(),
    offeringId: objectIdSchema.optional(),
    agreedPrice: z.number().nonnegative().max(10_000_000).optional(),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();
export type ManualBookingInput = z.infer<typeof manualBookingSchema>;

export const BOOKING_STATUSES = [
  'requested',
  'confirmed',
  'declined',
  'cancelled_by_customer',
  'cancelled_by_business',
  'completed',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const DAY_STATUSES = ['available', 'pending', 'booked', 'unavailable'] as const;
export type DayStatus = (typeof DAY_STATUSES)[number];

export const EVENT_TYPES = ['wedding', 'engagement', 'henna', 'birthday', 'graduation', 'corporate', 'other'] as const;

export const publicSearchSchema = z.object({
  categories: z.string().trim().max(2500).optional(),
  type: z.enum(EVENT_TYPES).optional(),
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  city: z.string().trim().max(80).optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  date: dateOnlySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ---------- Quotes & negotiation ----------
export const QUOTE_STATUSES = ['open', 'offered', 'countered', 'agreed', 'rejected', 'cancelled', 'booked'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const createQuoteRequestSchema = z
  .object({
    businessId: objectIdSchema,
    offeringId: objectIdSchema.optional(),
    eventDate: dateOnlySchema.optional(),
    guestCount: z.number().int().min(1).max(10_000).optional(),
    budget: z.number().nonnegative().max(10_000_000).optional(),
    requirements: z.string().trim().min(5).max(3000),
  })
  .strict();
export type CreateQuoteRequestInput = z.infer<typeof createQuoteRequestSchema>;

export const quoteOfferSchema = z
  .object({
    price: z.number().nonnegative().max(10_000_000),
    terms: z.string().trim().max(3000).optional(),
  })
  .strict();
export type QuoteOfferInput = z.infer<typeof quoteOfferSchema>;

export const quoteRespondSchema = z
  .object({
    offerId: objectIdSchema,
    action: z.enum(['accept', 'reject']),
  })
  .strict();

export const quoteBookSchema = z.object({ date: dateOnlySchema.optional() }).strict();

// ---------- Reviews ----------
export const createReviewSchema = z
  .object({
    bookingId: objectIdSchema,
    rating: z.number().int().min(1).max(5),
    text: z.string().trim().max(2000).optional(),
  })
  .strict();
export const reviewReplySchema = z.object({ text: z.string().trim().min(1).max(2000) }).strict();

// ---------- Event planner ----------
export type EventType = (typeof EVENT_TYPES)[number];

export const createEventSchema = z
  .object({
    type: z.enum(EVENT_TYPES),
    categorySlugs: z.array(z.string().trim().min(1).max(60)).max(40).optional(),
    title: z.string().trim().min(1).max(120),
    date: dateOnlySchema.optional(),
    city: z.string().trim().max(80).optional(),
    guestCount: z.number().int().min(1).max(10_000).optional(),
    budget: z.number().nonnegative().max(10_000_000).optional(),
  })
  .strict();
export const updateEventSchema = createEventSchema.omit({ type: true, categorySlugs: true }).partial().strict();

export const eventItemSchema = z
  .object({
    categoryId: objectIdSchema.optional(),
    label: z.string().trim().min(1).max(120),
    estimatedCost: z.number().nonnegative().max(10_000_000).optional(),
  })
  .strict();
export const updateEventItemSchema = eventItemSchema.partial().strict();

export const eventCandidateSchema = z
  .object({
    businessId: objectIdSchema,
    offeringId: objectIdSchema.optional(),
    estimatedPrice: z.number().nonnegative().max(10_000_000).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();
