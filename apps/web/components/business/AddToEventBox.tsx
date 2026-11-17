'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { pickLocalized } from '@party/shared';
import { Alert, Button, Card, Field } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/providers';
import type { Category, CustomerEvent, EventDetail } from '@/lib/types';

/** Shortlist this vendor for a checklist item. Saving is NOT booking. */
export function AddToEventBox({ businessId, categoryIds }: { businessId: string; categoryIds: string[] }) {
  const { t, href, locale, errorMessage } = useI18n();
  const [events, setEvents] = useState<CustomerEvent[] | null>(null);
  const [eventId, setEventId] = useState('');
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [itemId, setItemId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    api<{ items: CustomerEvent[] }>('/events').then((r) => {
      setEvents(r.items);
      if (r.items[0]) setEventId(r.items[0]._id);
    }).catch(() => setEvents([]));
    api<{ items: Category[] }>('/categories').then((r) => setCategories(r.items)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!eventId) return;
    api<EventDetail>(`/events/${eventId}`).then((d) => {
      setDetail(d);
      const match = d.event.items.find((i) => i.categoryId && categoryIds.includes(i.categoryId)) ?? d.event.items[0];
      setItemId(match?._id ?? '');
    }).catch(() => undefined);
  }, [eventId, categoryIds]);

  async function add() {
    setMsg(null);
    try {
      await api(`/events/${eventId}/items/${itemId}/candidates`, { method: 'POST', body: JSON.stringify({ businessId }) });
      setMsg({ tone: 'success', text: t.ev.added });
    } catch (e) {
      setMsg({ tone: 'danger', text: errorMessage(e) });
    }
  }

  if (!events) return null;
  const label = (i: EventDetail['event']['items'][number]) => {
    const c = categories.find((x) => x._id === i.categoryId);
    return c ? pickLocalized(c.name, locale) : i.label;
  };

  return (
    <Card className="space-y-3">
      <h2 className="font-bold">{t.ev.addToEvent}</h2>
      {events.length === 0 ? (
        <Link className="text-sm font-semibold text-brand-700" href={href('/events')}>
          {t.ev.noEvents} ←
        </Link>
      ) : (
        <>
          <Field label={t.ev.chooseEvent}>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="h-11 w-full rounded-xl border border-white/70 bg-white/70 backdrop-blur px-3 text-sm">
              {events.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title}
                </option>
              ))}
            </select>
          </Field>
          {detail && detail.event.items.length > 0 && (
            <Field label={t.ev.chooseItem}>
              <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="h-11 w-full rounded-xl border border-white/70 bg-white/70 backdrop-blur px-3 text-sm">
                {detail.event.items.map((i) => (
                  <option key={i._id} value={i._id}>
                    {label(i)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
          <Button variant="secondary" className="w-full" disabled={!itemId} onClick={() => void add()}>
            + {t.ev.addToEvent}
          </Button>
        </>
      )}
    </Card>
  );
}
