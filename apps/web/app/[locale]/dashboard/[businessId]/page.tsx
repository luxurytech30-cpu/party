'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  CAPABILITY_DEPENDENCIES,
  pickLocalized,
  roleHasPermission,
  type BusinessPermission,
  type BusinessRole,
  type Capability,
} from '@party/shared';
import { Alert, Badge, Button, Card, Field, Input, PageLoader, Textarea, cx } from '@/components/ui';
import { api } from '@/lib/api';
import type { Dictionary } from '@/lib/i18n';
import { useI18n } from '@/lib/providers';
import { BookingsModule } from '@/components/dashboard/BookingsModule';
import { CalendarModule } from '@/components/dashboard/CalendarModule';
import { OfferingsModule } from '@/components/dashboard/OfferingsModule';
import { PortfolioModule } from '@/components/dashboard/PortfolioModule';
import { QuotesModule } from '@/components/dashboard/QuotesModule';
import { ReviewsModule } from '@/components/dashboard/ReviewsModule';
import { statusTone, type Business, type CapabilitiesResponse, type Member } from '@/lib/types';
import { useRequireAuth } from '@/lib/useRequireAuth';

/**
 * Module registry — the ONLY place dashboard modules are declared.
 * A module is shown when the member's role has `permission` and the business
 * has `capability` effective. No per-category dashboard code.
 * (UX only: the API enforces the same rules.)
 */
type ModuleKey = keyof Omit<Dictionary['modules'], 'soon'>;
interface ModuleDef {
  key: ModuleKey;
  icon: string;
  permission?: BusinessPermission;
  capability?: Capability;
  ready: boolean;
}
const MODULES: ModuleDef[] = [
  { key: 'overview', icon: '🏠', ready: true },
  { key: 'profile', icon: '📝', permission: 'business.update', ready: true },
  { key: 'features', icon: '🧩', permission: 'capabilities.manage', ready: true },
  { key: 'team', icon: '👥', permission: 'business.read', ready: true },
  { key: 'services', icon: '🛎️', capability: 'services', permission: 'offerings.manage', ready: true },
  { key: 'packages', icon: '📦', capability: 'packages', permission: 'offerings.manage', ready: true },
  { key: 'products', icon: '🛍️', capability: 'products', permission: 'offerings.manage', ready: true },
  { key: 'portfolio', icon: '🖼️', capability: 'portfolio', permission: 'media.manage', ready: true },
  { key: 'calendar', icon: '📅', capability: 'calendar', permission: 'availability.manage', ready: true },
  { key: 'bookings', icon: '✅', capability: 'booking', permission: 'bookings.read', ready: true },
  { key: 'quotes', icon: '💬', capability: 'quotes', permission: 'quotes.manage', ready: true },
  { key: 'discounts', icon: '🏷️', capability: 'discounts', permission: 'offerings.manage', ready: false },
  { key: 'reviews', icon: '⭐', capability: 'reviews', permission: 'business.read', ready: true },
  { key: 'analytics', icon: '📊', capability: 'analytics', permission: 'analytics.read', ready: false },
];

export default function BusinessDashboardPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const { t, locale, href, errorMessage } = useI18n();
  const auth = useRequireAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [role, setRole] = useState<BusinessRole | null>(null);
  const [caps, setCaps] = useState<CapabilitiesResponse | null>(null);
  const [active, setActive] = useState<ModuleKey>('overview');
  const [error, setError] = useState<string | null>(null);
  const [initialQuote, setInitialQuote] = useState<string | null>(null);

  // Deep links from notifications: ?m=<module>&q=<quoteId>
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const m = p.get('m');
    if (m && MODULES.some((x) => x.key === m)) setActive(m as ModuleKey);
    setInitialQuote(p.get('q'));
  }, []);

  const load = useCallback(async () => {
    try {
      const [b, c] = await Promise.all([
        api<{ business: Business; role: BusinessRole }>(`/businesses/${businessId}`),
        api<CapabilitiesResponse>(`/businesses/${businessId}/capabilities`),
      ]);
      setBusiness(b.business);
      setRole(b.role);
      setCaps(c);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [businessId, errorMessage]);

  useEffect(() => {
    if (auth.status === 'authenticated') void load();
  }, [auth.status, load]);

  if (error) return <Alert>{error}</Alert>;
  if (!business || !role || !caps) return <PageLoader label={t.common.loading} />;

  const modules = MODULES.filter(
    (m) => (!m.permission || roleHasPermission(role, m.permission)) && (!m.capability || caps.effective.includes(m.capability)),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{pickLocalized(business.name, locale)}</h1>
        <Badge tone={statusTone[business.status]}>{t.status[business.status]}</Badge>
        <Badge tone="brand">{t.roles[role]}</Badge>
        {business.status === 'active' && (
          <Link href={href(`/b/${business.slug}`)} target="_blank" className="ms-auto text-sm font-semibold text-brand-700 hover:underline">
            {t.bpage.publicPage} ↗
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav aria-label="modules" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {modules.map((m) => (
            <button
              key={m.key}
              onClick={() => setActive(m.key)}
              aria-current={active === m.key ? 'page' : undefined}
              className={cx(
                'flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                active === m.key ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-ink-700 ring-1 ring-ink-100 hover:ring-brand-200 lg:bg-transparent lg:ring-0 lg:hover:bg-white',
              )}
            >
              <span aria-hidden>{m.icon}</span>
              {t.modules[m.key]}
              {!m.ready && (
                <span className={cx('ms-auto rounded-full px-2 text-[10px]', active === m.key ? 'bg-white/20' : 'bg-ink-100 text-ink-500')}>
                  {t.modules.soon}
                </span>
              )}
            </button>
          ))}
        </nav>

        <section>
          {active === 'overview' && <Overview business={business} caps={caps} />}
          {active === 'profile' && <Profile business={business} onSaved={setBusiness} />}
          {active === 'features' && <Features businessId={business._id} caps={caps} onSaved={setCaps} />}
          {active === 'services' && <OfferingsModule key="service" businessId={business._id} kind="service" />}
          {active === 'packages' && <OfferingsModule key="package" businessId={business._id} kind="package" />}
          {active === 'products' && <OfferingsModule key="product" businessId={business._id} kind="product" />}
          {active === 'portfolio' && <PortfolioModule businessId={business._id} />}
          {active === 'calendar' && <CalendarModule businessId={business._id} />}
          {active === 'bookings' && <BookingsModule businessId={business._id} canManage={roleHasPermission(role, 'bookings.manage')} />}
          {active === 'quotes' && <QuotesModule businessId={business._id} initialQuoteId={initialQuote} />}
          {active === 'reviews' && <ReviewsModule businessId={business._id} canReply={roleHasPermission(role, 'reviews.reply')} />}
          {active === 'team' && <Team businessId={business._id} canManage={roleHasPermission(role, 'team.manage')} />}
          {!MODULES.find((m) => m.key === active)?.ready && (
            <Card className="py-16 text-center text-ink-500">
              <p className="text-4xl">{MODULES.find((m) => m.key === active)?.icon}</p>
              <p className="mt-3 font-semibold text-ink-900">{t.modules[active]}</p>
              <p className="mt-1 text-sm">{t.biz.moduleSoon}</p>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function Overview({ business, caps }: { business: Business; caps: CapabilitiesResponse }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      {business.status === 'pending_review' && <Alert tone="info">{t.dash.pendingNote}</Alert>}
      {business.statusReason && business.status !== 'active' && <Alert>{business.statusReason}</Alert>}
      <Card className="space-y-3">
        <h2 className="font-bold">{t.biz.effective}</h2>
        <div className="flex flex-wrap gap-2">
          {caps.effective.map((c) => (
            <Badge key={c} tone="brand">
              {t.caps[c]}
            </Badge>
          ))}
        </div>
      </Card>
      <Card className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <span className="text-ink-500">{t.dash.cities}: </span>
          {business.cities.join('، ') || '—'}
        </div>
        <div dir="ltr" className="text-start">
          {business.contact?.phone ?? ''} {business.contact?.email ?? ''}
        </div>
      </Card>
    </div>
  );
}

function Profile({ business, onSaved }: { business: Business; onSaved: (b: Business) => void }) {
  const { t, errorMessage } = useI18n();
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? '').trim();
    const name = Object.fromEntries((['ar', 'he', 'en'] as const).map((l) => [l, str(`name_${l}`)]).filter(([, v]) => v));
    const description = Object.fromEntries((['ar', 'he', 'en'] as const).map((l) => [l, str(`desc_${l}`)]).filter(([, v]) => v));
    const body: Record<string, unknown> = {
      name,
      cities: str('cities').split(/[,،]/).map((c) => c.trim()).filter(Boolean),
    };
    if (Object.keys(description).length) body.description = description;
    if (str('phone')) body.phone = str('phone').replace(/[\s-]/g, '');
    if (str('email')) body.email = str('email');
    setLoading(true);
    setMsg(null);
    try {
      const r = await api<{ business: Business }>(`/businesses/${business._id}`, { method: 'PATCH', body: JSON.stringify(body) });
      onSaved(r.business);
      setMsg({ tone: 'success', text: t.biz.saved });
    } catch (err) {
      setMsg({ tone: 'danger', text: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t.dash.nameAr}><Input name="name_ar" dir="rtl" defaultValue={business.name.ar} /></Field>
          <Field label={t.dash.nameHe}><Input name="name_he" dir="rtl" defaultValue={business.name.he} /></Field>
          <Field label={t.dash.nameEn}><Input name="name_en" dir="ltr" defaultValue={business.name.en} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={`${t.dash.description} (AR)`}><Textarea name="desc_ar" dir="rtl" defaultValue={business.description?.ar} /></Field>
          <Field label={`${t.dash.description} (HE)`}><Textarea name="desc_he" dir="rtl" defaultValue={business.description?.he} /></Field>
          <Field label={`${t.dash.description} (EN)`}><Textarea name="desc_en" dir="ltr" defaultValue={business.description?.en} /></Field>
        </div>
        <Field label={t.dash.cities} hint={t.dash.citiesHint}>
          <Input name="cities" defaultValue={business.cities.join(', ')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.dash.businessPhone}><Input name="phone" dir="ltr" defaultValue={business.contact?.phone} /></Field>
          <Field label={t.dash.businessEmail}><Input name="email" type="email" dir="ltr" defaultValue={business.contact?.email} /></Field>
        </div>
        <Button type="submit" loading={loading}>{t.biz.save}</Button>
      </form>
    </Card>
  );
}

function Features({ businessId, caps, onSaved }: { businessId: string; caps: CapabilitiesResponse; onSaved: (c: CapabilitiesResponse) => void }) {
  const { t, errorMessage } = useI18n();
  const [enabled, setEnabled] = useState<Capability[]>(caps.enabled);
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await api<CapabilitiesResponse>(`/businesses/${businessId}/capabilities`, {
        method: 'PUT',
        body: JSON.stringify({ enabled: enabled.filter((c) => caps.available.includes(c)) }),
      });
      onSaved(r);
      setMsg({ tone: 'success', text: t.biz.saved });
    } catch (err) {
      setMsg({ tone: 'danger', text: errorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="font-bold">{t.biz.featuresTitle}</h2>
        <p className="text-sm text-ink-500">{t.biz.featuresText}</p>
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <ul className="divide-y divide-ink-100">
        {caps.available.map((c) => {
          const on = enabled.includes(c);
          const deps = CAPABILITY_DEPENDENCIES[c] ?? [];
          const missing = on && deps.some((d) => !enabled.includes(d));
          return (
            <li key={c} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium">{t.caps[c]}</p>
                {deps.length > 0 && (
                  <p className={cx('text-xs', missing ? 'text-amber-700' : 'text-ink-500')}>
                    {missing ? t.biz.inactiveDep : `${t.biz.needs}: ${deps.map((d) => t.caps[d]).join(', ')}`}
                  </p>
                )}
              </div>
              <button
                role="switch"
                aria-checked={on}
                aria-label={t.caps[c]}
                onClick={() => setEnabled((s) => (on ? s.filter((x) => x !== c) : [...s, c]))}
                className={cx('relative h-6 w-11 shrink-0 rounded-full transition', on ? 'bg-brand-600' : 'bg-ink-300')}
              >
                <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', on ? 'start-[1.375rem]' : 'start-0.5')} />
              </button>
            </li>
          );
        })}
      </ul>
      <Button onClick={() => void save()} loading={loading}>{t.biz.save}</Button>
    </Card>
  );
}

function Team({ businessId, canManage }: { businessId: string; canManage: boolean }) {
  const { t, errorMessage } = useI18n();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    api<{ members: Member[] }>(`/businesses/${businessId}/members`)
      .then((r) => setMembers(r.members))
      .catch((e) => setError(errorMessage(e)));
  }, [businessId, errorMessage]);
  useEffect(load, [load]);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setLoading(true);
    try {
      await fn();
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    await run(() =>
      api(`/businesses/${businessId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: String(f.get('email')).trim(), role: f.get('role') }),
      }),
    );
    form.reset();
  }

  if (!members) return error ? <Alert>{error}</Alert> : <PageLoader label={t.common.loading} />;

  return (
    <Card className="space-y-5">
      <h2 className="font-bold">{t.biz.membersTitle}</h2>
      {error && <Alert>{error}</Alert>}
      <ul className="divide-y divide-ink-100">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{m.user.name}</p>
              <p className="truncate text-xs text-ink-500" dir="ltr">{m.user.email}</p>
            </div>
            {canManage ? (
              <>
                <select
                  value={m.role}
                  disabled={loading}
                  onChange={(e) =>
                    void run(() => api(`/businesses/${businessId}/members/${m.id}`, { method: 'PATCH', body: JSON.stringify({ role: e.target.value }) }))
                  }
                  className="h-9 rounded-lg border border-white/70 bg-white/70 backdrop-blur px-2 text-sm"
                >
                  {(['owner', 'manager', 'staff', 'viewer'] as const).map((r) => (
                    <option key={r} value={r}>{t.roles[r]}</option>
                  ))}
                </select>
                <Button variant="danger" className="h-9 px-3" disabled={loading} onClick={() => void run(() => api(`/businesses/${businessId}/members/${m.id}`, { method: 'DELETE' }))}>
                  {t.biz.remove}
                </Button>
              </>
            ) : (
              <Badge>{t.roles[m.role]}</Badge>
            )}
          </li>
        ))}
      </ul>
      {canManage && (
        <form onSubmit={onAdd} className="flex flex-col gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label={t.biz.memberEmail}>
              <Input name="email" type="email" required dir="ltr" />
            </Field>
          </div>
          <select name="role" defaultValue="staff" className="h-11 rounded-xl border border-white/70 bg-white/70 backdrop-blur px-3 text-sm">
            {(['manager', 'staff', 'viewer'] as const).map((r) => (
              <option key={r} value={r}>{t.roles[r]}</option>
            ))}
          </select>
          <Button type="submit" loading={loading}>{t.biz.addMember}</Button>
        </form>
      )}
    </Card>
  );
}
