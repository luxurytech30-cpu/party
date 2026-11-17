'use client';

import { useI18n } from '@/lib/providers';
import type { DayStatus } from '@/lib/types';
import { cx } from './ui';

export const dayStyles: Record<DayStatus, string> = {
  available: 'bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100',
  pending: 'bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100',
  booked: 'bg-brand-100 text-brand-800 ring-brand-200',
  unavailable: 'bg-ink-100 text-ink-500 ring-transparent line-through',
};

/** First day of month as YYYY-MM-01. */
export function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 10);
}
export function monthEnd(month: string) {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

interface Props {
  month: string; // YYYY-MM-01
  onMonthChange: (month: string) => void;
  statuses: Record<string, DayStatus>;
  selected?: string | null;
  onSelect?: (date: string) => void;
  isSelectable?: (date: string, status: DayStatus | undefined) => boolean;
  /** Small marker text per date (e.g. number of bookings). */
  markers?: Record<string, string>;
  minMonth?: string;
}

export function MonthCalendar({ month, onMonthChange, statuses, selected, onSelect, isSelectable, markers, minMonth }: Props) {
  const { t, locale } = useI18n();
  const [y, m] = month.split('-').map(Number) as [number, number];
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = first.getUTCDay(); // Sunday-first week (Israel)
  const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, 1 + i))),
  );

  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month.slice(0, 7)}-${String(i + 1).padStart(2, '0')}`),
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t.cal.prev}
          disabled={!!minMonth && month <= minMonth}
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          className="grid size-9 place-items-center rounded-full ring-1 ring-ink-300 disabled:opacity-30 rtl:rotate-180"
        >
          ‹
        </button>
        <p className="font-semibold">{title}</p>
        <button
          type="button"
          aria-label={t.cal.next}
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          className="grid size-9 place-items-center rounded-full ring-1 ring-ink-300 rtl:rotate-180"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-ink-500">
        {weekdays.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const status = statuses[d];
          const selectable = onSelect && (isSelectable ? isSelectable(d, status) : true);
          return (
            <button
              key={d}
              type="button"
              disabled={!selectable}
              onClick={() => onSelect?.(d)}
              title={status ? t.day[status] : undefined}
              aria-label={`${d}${status ? ` – ${t.day[status]}` : ''}`}
              aria-pressed={selected === d}
              className={cx(
                'relative aspect-square rounded-lg text-sm font-medium ring-1 transition disabled:cursor-default',
                status ? dayStyles[status] : 'bg-white ring-ink-100',
                selected === d && '!bg-ink-900 !text-white !ring-ink-900',
              )}
            >
              {Number(d.slice(8))}
              {markers?.[d] && (
                <span className="absolute inset-x-0 bottom-0.5 text-[9px] leading-none opacity-80">{markers[d]}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DayLegend() {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {(['available', 'pending', 'booked', 'unavailable'] as const).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={cx('size-3 rounded ring-1', dayStyles[s])} />
          {t.day[s]}
        </span>
      ))}
    </div>
  );
}
