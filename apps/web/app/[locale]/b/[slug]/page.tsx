'use client';

import { img } from '@/lib/img';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { pickLocalized } from '@party/shared';
import { AddToEventBox } from '@/components/business/AddToEventBox';
import { AddToPackage, AddOfferingToPackage } from '@/components/business/AddToPackage';
import { QuoteRequestBox } from '@/components/business/QuoteRequestBox';
import { ReviewsSection } from '@/components/business/ReviewsSection';
import { DayLegend, MonthCalendar, monthEnd, monthStart } from '@/components/MonthCalendar';
import { Alert, Badge, Button, Card, Field, Input, PageLoader, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatPricing, todayStr } from '@/lib/format';
import { useAuth, useI18n } from '@/lib/providers';
import type { DayStatus, OfferingKind, PublicBusinessPage } from '@/lib/types';

export default function BusinessPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, href, locale, errorMessage } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState<PublicBusinessPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    api<PublicBusinessPage>(`/public/businesses/${slug}`)
      .then(setData)
      .catch((e) => setError(errorMessage(e)));
  }, [slug, errorMessage]);

  useEffect(() => {
    if (!user || !data) return;
    api<{ items: { _id: string }[] }>('/me/favorites')
      .then((r) => setFav(r.items.some((b) => b._id === data.business._id)))
      .catch(() => undefined);
  }, [user, data]);

  async function toggleFav() {
    if (!data) return;
    const next = !fav;
    setFav(next);
    await api(`/me/favorites/${data.business._id}`, { method: next ? 'PUT' : 'DELETE' }).catch(() => setFav(!next));
  }

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <PageLoader label={t.common.loading} />;
  const { business: b, categories, offerings, media, features } = data;
  const kinds = (['service', 'package', 'product'] as OfferingKind[]).filter((k) => offerings.some((o) => o.kind === k));
  const description = pickLocalized(b.description, locale);

  return (
    <div className="space-y-8">
      <section className="relative -mx-4 overflow-hidden rounded-b-[2.5rem] sm:mx-0 sm:rounded-[2.5rem]">
        {media[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img(media[0].url, 1800, 800)} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-600 to-gold-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/30 to-transparent" />
        <div className="relative flex min-h-72 flex-wrap items-end justify-between gap-4 px-5 pb-6 pt-32 text-white sm:min-h-96 sm:px-10 sm:pb-8">
          <div className="glass-tint space-y-3 rounded-3xl p-5">
            <h1 className="text-3xl font-extrabold sm:text-5xl">{pickLocalized(b.name, locale)}</h1>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Badge key={c._id}>
                  {c.icon} {pickLocalized(c.name, locale)}
                </Badge>
              ))}
              {b.cities.map((c) => (
                <Badge key={c}>📍 {c}</Badge>
              ))}
            </div>
          </div>
          {user && (
            <Button variant={fav ? 'primary' : 'secondary'} onClick={() => void toggleFav()}>
              {fav ? `♥ ${t.fav.remove}` : `♡ ${t.fav.add}`}
            </Button>
          )}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {description && (
            <Card className="space-y-2">
              <h2 className="text-lg font-bold">{t.bpage.about}</h2>
              <p className="whitespace-pre-line text-ink-700">{description}</p>
            </Card>
          )}

          {kinds.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold">{t.bpage.offerings}</h2>
              {kinds.map((k) => (
                <div key={k} className="space-y-3">
                  {kinds.length > 1 && <h3 className="text-sm font-semibold text-ink-500">{t.offer[k]}</h3>}
                  {offerings
                    .filter((o) => o.kind === k)
                    .map((o) => (
                      <Card key={o._id} className="space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h4 className="font-semibold">{pickLocalized(o.title, locale)}</h4>
                          <div className="text-end">
                            <p className="font-bold text-brand-700">{formatPricing(o.pricing, t, locale)}</p>
                            {o.pricing.negotiable && <p className="text-xs text-ink-500">{t.price.negotiable}</p>}
                          </div>
                        </div>
                        {pickLocalized(o.description, locale) && <p className="text-sm text-ink-700">{pickLocalized(o.description, locale)}</p>}
                        {o.includes && o.includes.length > 0 && (
                          <ul className="list-inside list-disc text-sm text-ink-700">
                            {o.includes.map((i) => (
                              <li key={i}>{i}</li>
                            ))}
                          </ul>
                        )}
                        <AddOfferingToPackage business={b} categories={categories} offering={o} />
                      </Card>
                    ))}
                </div>
              ))}
            </section>
          )}

          {media.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold">{t.bpage.portfolio}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {media.map((m) => (
                  <a key={m._id} href={m.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img(m.url, 500, 500)} alt="" loading="lazy" className="aspect-square w-full object-cover transition hover:scale-105" />
                  </a>
                ))}
              </div>
            </section>
          )}
          <ReviewsSection slug={slug} />
        </div>

        <aside className="space-y-4 pb-24 lg:sticky lg:top-24 lg:self-start">
          <AddToPackage business={b} categories={categories} />
          {features.booking ? (
            <BookingBox businessId={b._id} slug={slug} offerings={data.offerings} />
          ) : (
            <Card className="text-sm text-ink-500">{t.bpage.noBooking}</Card>
          )}
          {user && features.quotes && <QuoteRequestBox businessId={b._id} offerings={offerings} />}
          {user && <AddToEventBox businessId={b._id} categoryIds={b.categoryIds} />}
          {(b.contact?.phone || b.contact?.email) && (
            <Card className="space-y-1 text-sm">
              <h2 className="font-bold">{t.bpage.contact}</h2>
              {b.contact.phone && (
                <a href={`tel:${b.contact.phone}`} dir="ltr" className="block text-brand-700">
                  {b.contact.phone}
                </a>
              )}
              {b.contact.email && (
                <a href={`mailto:${b.contact.email}`} dir="ltr" className="block text-brand-700">
                  {b.contact.email}
                </a>
              )}
            </Card>
          )}
          {!user && (
            <p className="text-center text-sm">
              <Link className="font-semibold text-brand-700" href={href('/login')}>
                {t.bpage.loginToBook}
              </Link>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function BookingBox({ businessId, slug, offerings }: { businessId: string; slug: string; offerings: PublicBusinessPage['offerings'] }) {
  const { t, href, locale, errorMessage } = useI18n();
  const { user } = useAuth();
  const minMonth = monthStart(todayStr());
  const [month, setMonth] = useState(minMonth);
  const [days, setDays] = useState<Record<string, DayStatus>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDays = useCallback(() => {
    api<{ days: Record<string, DayStatus> }>(`/public/businesses/${slug}/availability?from=${month}&to=${monthEnd(month)}`)
      .then((r) => setDays((d) => ({ ...d, ...r.days })))
      .catch(() => undefined);
  }, [slug, month]);
  useEffect(loadDays, [loadDays]);
  useEffect(() => {
    const date = new URLSearchParams(window.location.search).get('date');
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= todayStr()) {
      setMonth(monthStart(date));
      setSelected(date);
    }
  }, []);
  useEffect(() => {
    if (selected && days[selected] && days[selected] !== 'available' && days[selected] !== 'pending') setSelected(null);
  }, [days, selected]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const f = new FormData(e.currentTarget);
    const guests = Number(f.get('guestCount'));
    const note = String(f.get('note') ?? '').trim();
    const offeringId = String(f.get('offeringId') ?? '');
    setLoading(true);
    setMsg(null);
    try {
      await api('/bookings', {
        method: 'POST',
        body: JSON.stringify({ businessId, date: selected, ...(guests ? { guestCount: guests } : {}), ...(note ? { note } : {}), ...(offeringId ? { offeringId } : {}) }),
      });
      setMsg({ tone: 'success', text: t.bpage.sent });
      setSelected(null);
      loadDays();
    } catch (err) {
      setMsg({ tone: 'danger', text: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-bold">{t.bpage.availability}</h2>
      <MonthCalendar
        month={month}
        minMonth={minMonth}
        onMonthChange={setMonth}
        statuses={days}
        selected={selected}
        onSelect={setSelected}
        isSelectable={(_, s) => s === 'available' || s === 'pending'}
      />
      <DayLegend />
      <p className="text-xs text-ink-500">{t.bpage.legendNote}</p>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <div className="border-t border-ink-100 pt-4">
        <h3 className="mb-3 font-semibold">{t.bpage.requestTitle}</h3>
        {!user ? (
          <Link href={href('/login')} className="font-semibold text-brand-700">
            {t.bpage.loginToBook}
          </Link>
        ) : !selected ? (
          <p className="text-sm text-ink-500">{t.bpage.pickDate}</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <p className="text-sm">
              {t.bpage.selectedDate}: <strong>{formatDate(selected, locale)}</strong>
            </p>
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
            <Field label={t.bpage.guests}>
              <Input name="guestCount" type="number" min={1} max={10000} dir="ltr" />
            </Field>
            <Field label={t.bpage.note}>
              <Textarea name="note" maxLength={1000} />
            </Field>
            <Button type="submit" loading={loading} className="w-full">
              {t.bpage.send}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}
