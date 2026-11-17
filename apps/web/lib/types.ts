import type { BusinessRole, Capability, LocalizedText } from '@party/shared';

export type BusinessStatus = 'pending_review' | 'active' | 'rejected' | 'suspended';

export interface Category {
  _id: string;
  slug: string;
  name: LocalizedText;
  icon?: string;
}

export interface Business {
  _id: string;
  slug: string;
  name: LocalizedText;
  description?: LocalizedText;
  status: BusinessStatus;
  statusReason?: string;
  categoryIds: string[];
  cities: string[];
  contact?: { phone?: string; email?: string };
  enabledCapabilities: Capability[];
  createdAt: string;
}

export interface CapabilitiesResponse {
  available: Capability[];
  enabled: Capability[];
  effective: Capability[];
}

export interface Member {
  id: string;
  role: BusinessRole;
  user: { id: string; name: string; email: string };
}

export const statusTone = {
  pending_review: 'warning',
  active: 'success',
  rejected: 'danger',
  suspended: 'danger',
} as const;

export type PricingModel = 'fixed' | 'starting_from' | 'range' | 'hourly' | 'per_person' | 'package' | 'quote_only';
export interface Pricing {
  model: PricingModel;
  currency?: 'ILS';
  amount?: number;
  min?: number;
  max?: number;
  negotiable?: boolean;
}

export type OfferingKind = 'service' | 'package' | 'product';
export interface Offering {
  _id: string;
  kind: OfferingKind;
  title: LocalizedText;
  description?: LocalizedText;
  pricing: Pricing;
  durationMinutes?: number;
  includes?: string[];
  stock?: number;
  active: boolean;
}

export interface PublicBusinessCard {
  _id: string;
  slug: string;
  name: LocalizedText;
  description?: LocalizedText;
  categoryIds: string[];
  cities: string[];
  startingPrice?: number;
  rating?: { avg: number; count: number };
  coverUrl?: string | null;
  dateStatus?: DayStatus | null;
}

export interface MediaItem {
  _id: string;
  url: string;
  width?: number;
  height?: number;
}

export interface PublicBusinessPage {
  business: PublicBusinessCard & { contact?: { phone?: string; email?: string } };
  categories: Category[];
  offerings: Offering[];
  media: MediaItem[];
  features: { booking: boolean; quotes: boolean; negotiation: boolean };
}

export type DayStatus = 'available' | 'pending' | 'booked' | 'unavailable';
export type BookingStatus = 'requested' | 'confirmed' | 'declined' | 'cancelled_by_customer' | 'cancelled_by_business' | 'completed';

export interface CustomerBooking {
  reviewed?: boolean;
  _id: string;
  date: string;
  status: BookingStatus;
  guestCount?: number;
  note?: string;
  business: { _id: string; slug: string; name: LocalizedText } | null;
  offering: { title: LocalizedText } | null;
}

export interface BusinessBooking {
  _id: string;
  date: string;
  status: BookingStatus;
  source: 'customer' | 'manual' | 'quote';
  guestCount?: number;
  note?: string;
  agreedPrice?: number;
  customer: { id: string | null; name: string; email: string | null; phone: string | null };
  offering: { title: LocalizedText } | null;
}

export const bookingTone: Record<BookingStatus, 'warning' | 'success' | 'danger' | 'neutral' | 'brand'> = {
  requested: 'warning',
  confirmed: 'success',
  declined: 'danger',
  cancelled_by_customer: 'neutral',
  cancelled_by_business: 'danger',
  completed: 'brand',
};

export type QuoteStatus = 'open' | 'offered' | 'countered' | 'agreed' | 'rejected' | 'cancelled' | 'booked';
export interface QuoteRequest {
  _id: string;
  businessId: string;
  eventDate?: string;
  guestCount?: number;
  budget?: number;
  requirements: string;
  status: QuoteStatus;
  currentOfferId?: string;
  agreedPrice?: number;
  agreedTerms?: string;
  bookingId?: string;
  updatedAt: string;
  createdAt: string;
  business?: { _id: string; slug: string; name: LocalizedText } | null;
  customer?: { id: string; name: string; email: string; phone: string | null };
}
export interface QuoteOffer {
  _id: string;
  version: number;
  fromSide: 'business' | 'customer';
  price: number;
  terms?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'superseded';
  createdAt: string;
}
export const quoteTone: Record<QuoteStatus, 'warning' | 'success' | 'danger' | 'neutral' | 'brand'> = {
  open: 'warning',
  offered: 'brand',
  countered: 'warning',
  agreed: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
  booked: 'success',
};

export interface PublicReview {
  _id: string;
  rating: number;
  text?: string;
  reply: { text: string; at: string } | null;
  author: string;
  createdAt: string;
}

export type EventItemStatus = 'todo' | 'shortlisted' | 'requested' | 'booked';
export interface EventItem {
  _id: string;
  categoryId?: string;
  label: string;
  estimatedCost?: number;
  status: EventItemStatus;
  estimate: number | null;
  candidates: { businessId: string; offeringId?: string; estimatedPrice?: number; note?: string; business: { _id: string; slug: string; name: LocalizedText; startingPrice?: number } | null }[];
}
export interface CustomerEvent {
  _id: string;
  type: string;
  title: string;
  date?: string;
  city?: string;
  guestCount?: number;
  budget?: number;
  itemCount?: number;
  items: EventItem[];
}
export interface EventDetail {
  event: CustomerEvent;
  summary: { estimatedTotal: number; budget: number | null; remaining: number | null; booked: number; total: number };
}

export interface AppNotification {
  _id: string;
  type: string;
  params: Record<string, unknown>;
  link?: string;
  readAt?: string;
  createdAt: string;
}
