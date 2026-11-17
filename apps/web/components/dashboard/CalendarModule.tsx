'use client';

import { useEffect, useMemo, useState } from 'react';
import { DayLegend, MonthCalendar, monthStart } from '@/components/MonthCalendar';
import { Alert, Button, Card, Field, Input, PageLoader, cx } from '@/components/ui';
import { api } from '@/lib/api';
import { todayStr } from '@/lib/format';
import { useI18n } from '@/lib/providers';
import type { BusinessBooking, DayStatus } from '@/lib/types';

interface Settings {
  openWeekdays: number[];
  blockedDates: string[];
  dailyCapacity: number;
}

const weekdayOf = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay();

export function CalendarModule({ businessId }: { businessId: string }) {
  const { t, locale, errorMessage } = useI18n();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [bookings, setBookings] = useState<BusinessBooking[]>([]);
  const [month, setMonth] = useState(monthStart(todayStr()));
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Settings>(`/businesses/${businessId}/availability`),
      api<{ items: BusinessBooking[] }>(`/businesses/${businessId}/bookings`),
    ])
      .then(([s, b]) => {
        setSettings(s);
        setBookings(b.items);
      })
      .catch((e) => setMsg({ tone: 'danger', text: errorMessage(e) }));
  }, [businessId, errorMessage]);

  const { statuses, markers } = useMemo(() => {
    const statuses: Record<string, DayStatus> = {};
    const markers: Record<string, string> = {};
    if (!settings) return { statuses, markers };
    const confirmed = new Map<string, number>();
    const requested = new Map<string, number>();
    for (const b of bookings) {
      if (b.status === 'confirmed') confirmed.set(b.date, (confirmed.get(b.date) ?? 0) + 1);
      if (b.status === 'requested') requested.set(b.date, (requested.get(b.date) ?? 0) + 1);
    }
    const [y, m] = month.split('-').map(Number) as [number, number];
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const today = todayStr();
    for (let i = 1; i <= days; i++) {
      const d = `${month.slice(0, 7)}-${String(i).padStart(2, '0')}`;
      const c = confirmed.get(d) ?? 0;
      const r = requested.get(d) ?? 0;
      if (c + r > 0) markers[d] = `${c}✓ ${r ? `${r}?` : ''}`.trim();
      if (d < today || !settings.openWeekdays.includes(weekdayOf(d)) || settings.blockedDates.includes(d)) statuses[d] = 'unavailable';
      else if (c >= settings.dailyCapacity) statuses[d] = 'booked';
      else if (r > 0) statuses[d] = 'pending';
      else statuses[d] = 'available';
    }
    return { statuses, markers };
  }, [settings, bookings, month]);

  if (!settings) return msg ? <Alert>{msg.text}</Alert> : <PageLoader label={t.common.loading} />;

  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, 1 + i))),
  );

  function toggleBlocked(d: string) {
    setSettings((s) =>
      s && { ...s, blockedDates: s.blockedDates.includes(d) ? s.blockedDates.filter((x) => x !== d) : [...s.blockedDates, d].sort() },
    );
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMsg(null);
    try {
      const today = todayStr();
      const r = await api<Settings>(`/businesses/${businessId}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ ...settings, blockedDates: settings.blockedDates.filter((d) => d >= today) }),
      });
      setSettings(r);
      setMsg({ tone: 'success', text: t.biz.saved });
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card className="space-y-4">
        <h2 className="text-lg font-bold">{t.cal.title}</h2>
        <MonthCalendar
          month={month}
          onMonthChange={setMonth}
          statuses={statuses}
          markers={markers}
          onSelect={toggleBlocked}
          isSelectable={(d) => d >= todayStr()}
        />
        <DayLegend />
        <p className="text-xs text-ink-500">{t.cal.blockHint}</p>
      </Card>
      <Card className="space-y-5">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink-700">{t.cal.openDays}</legend>
          <div className="flex flex-wrap gap-2">
            {weekdays.map((w, i) => {
              const on = settings.openWeekdays.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setSettings({ ...settings, openWeekdays: on ? settings.openWeekdays.filter((x) => x !== i) : [...settings.openWeekdays, i] })
                  }
                  className={cx('rounded-full px-3 py-1.5 text-sm ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white ring-ink-300')}
                >
                  {w}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Field label={t.cal.capacity} hint={t.cal.capacityHint}>
          <Input
            type="number"
            min={1}
            max={100}
            dir="ltr"
            value={settings.dailyCapacity}
            onChange={(e) => setSettings({ ...settings, dailyCapacity: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink-700">{t.cal.blocked}</p>
          <div className="flex flex-wrap gap-1.5">
            {settings.blockedDates.length === 0 && <span className="text-xs text-ink-500">—</span>}
            {settings.blockedDates.map((d) => (
              <button key={d} onClick={() => toggleBlocked(d)} className="rounded-full bg-ink-100 px-2.5 py-1 text-xs" dir="ltr">
                {d} ✕
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => void save()} loading={saving} className="w-full">
          {t.cal.save}
        </Button>
      </Card>
    </div>
  );
}
