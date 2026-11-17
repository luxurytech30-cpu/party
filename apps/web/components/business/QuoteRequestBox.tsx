'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { pickLocalized } from '@party/shared';
import { Alert, Button, Card, Field, Input, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { todayStr } from '@/lib/format';
import { useI18n } from '@/lib/providers';
import type { Offering } from '@/lib/types';

export function QuoteRequestBox({ businessId, offerings }: { businessId: string; offerings: Offering[] }) {
  const { t, href, locale, errorMessage } = useI18n();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string; quoteId?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? '').trim();
    setLoading(true);
    setMsg(null);
    try {
      const r = await api<{ quote: { _id: string } }>('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          businessId,
          requirements: s('requirements'),
          ...(s('eventDate') ? { eventDate: s('eventDate') } : {}),
          ...(s('guestCount') ? { guestCount: Number(s('guestCount')) } : {}),
          ...(s('budget') ? { budget: Number(s('budget')) } : {}),
          ...(s('offeringId') ? { offeringId: s('offeringId') } : {}),
        }),
      });
      setMsg({ tone: 'success', text: t.q.sent, quoteId: r.quote._id });
      setOpen(false);
    } catch (err) {
      setMsg({ tone: 'danger', text: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{t.q.requestTitle}</h2>
        {!open && (
          <Button variant="secondary" className="h-9" onClick={() => setOpen(true)}>
            {t.q.requestTitle}
          </Button>
        )}
      </div>
      {msg && (
        <Alert tone={msg.tone}>
          {msg.text}{' '}
          {msg.quoteId && (
            <Link className="font-semibold underline" href={href(`/quotes/${msg.quoteId}`)}>
              {t.q.detail} ←
            </Link>
          )}
        </Alert>
      )}
      {open && (
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label={t.q.requirements} hint={t.q.requirementsHint}>
            <Textarea name="requirements" required minLength={5} maxLength={3000} />
          </Field>
          {offerings.length > 0 && (
            <Field label={t.bpage.offering}>
              <select name="offeringId" className="h-11 w-full rounded-xl border border-white/70 bg-white/70 backdrop-blur px-3 text-sm">
                <option value="">{t.bpage.none}</option>
                {offerings.map((o) => (
                  <option key={o._id} value={o._id}>
                    {pickLocalized(o.title, locale)}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.q.eventDate}>
              <Input name="eventDate" type="date" min={todayStr()} />
            </Field>
            <Field label={t.bpage.guests}>
              <Input name="guestCount" type="number" min={1} dir="ltr" />
            </Field>
          </div>
          <Field label={t.q.budget}>
            <Input name="budget" type="number" min={0} dir="ltr" />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" loading={loading}>
              {t.q.send}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
