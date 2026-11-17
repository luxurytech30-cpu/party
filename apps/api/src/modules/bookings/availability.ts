import type { ClientSession, Types } from 'mongoose';
import type { DayStatus } from '@party/shared';
import { Booking } from './booking.model.js';
import { BookingResource } from './resource.model.js';

export async function getDefaultResource(businessId: Types.ObjectId, session?: ClientSession) {
  return BookingResource.findOneAndUpdate(
    { businessId, kind: 'default' },
    { $setOnInsert: { businessId, kind: 'default', name: 'default' } },
    { upsert: true, new: true, session },
  );
}

/** Today's date (YYYY-MM-DD) in the given IANA timezone. */
export function todayIn(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isValidDate(date: string): boolean {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

interface ResourceLike {
  _id: Types.ObjectId;
  openWeekdays: number[];
  blockedDates: string[];
  dailyCapacity: number;
}

/**
 * Reported availability per day. `pending` = has unconfirmed requests but is still
 * requestable. Only `confirmed` bookings consume capacity.
 */
export async function dayStatuses(
  resource: ResourceLike,
  from: string,
  to: string,
  today: string,
  session?: ClientSession,
): Promise<Record<string, DayStatus>> {
  const bookings = await Booking.find(
    { resourceId: resource._id, date: { $gte: from, $lte: to }, status: { $in: ['requested', 'confirmed'] } },
    { date: 1, status: 1 },
    { session },
  ).lean();

  const confirmed = new Map<string, number>();
  const requested = new Set<string>();
  for (const b of bookings) {
    if (b.status === 'confirmed') confirmed.set(b.date, (confirmed.get(b.date) ?? 0) + 1);
    else requested.add(b.date);
  }

  const out: Record<string, DayStatus> = {};
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (d < today || !resource.openWeekdays.includes(weekdayOf(d)) || resource.blockedDates.includes(d)) {
      out[d] = 'unavailable';
    } else if ((confirmed.get(d) ?? 0) >= resource.dailyCapacity) {
      out[d] = 'booked';
    } else if (requested.has(d)) {
      out[d] = 'pending';
    } else {
      out[d] = 'available';
    }
  }
  return out;
}
