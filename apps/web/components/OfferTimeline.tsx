'use client';

import { formatMoney } from '@/lib/format';
import { useI18n } from '@/lib/providers';
import type { QuoteOffer } from '@/lib/types';
import { Badge, Button, cx } from './ui';

/**
 * Versioned offer history. `viewer` decides wording; actions are only shown for the
 * current pending offer made by the OTHER side.
 */
export function OfferTimeline({
  offers,
  viewer,
  currentOfferId,
  canRespond,
  busy,
  onRespond,
}: {
  offers: QuoteOffer[];
  viewer: 'business' | 'customer';
  currentOfferId?: string;
  canRespond: boolean;
  busy?: boolean;
  onRespond: (offerId: string, action: 'accept' | 'reject') => void;
}) {
  const { t, locale } = useI18n();
  if (offers.length === 0) return null;
  return (
    <ol className="space-y-3">
      {offers.map((o) => {
        const mine = o.fromSide === viewer;
        const label = o.fromSide === 'business' ? t.q.fromBusiness : viewer === 'customer' ? t.q.fromCustomer : t.q.fromCustomerBiz;
        const actionable = canRespond && !mine && o.status === 'pending' && o._id === currentOfferId;
        return (
          <li
            key={o._id}
            className={cx(
              'rounded-2xl p-4 ring-1',
              mine ? 'ms-6 bg-brand-50 ring-brand-100' : 'me-6 bg-white ring-ink-100',
              o.status === 'superseded' && 'opacity-60',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-ink-500">
                {label} · {t.q.version} {o.version} · {new Date(o.createdAt).toLocaleString(locale)}
              </p>
              <Badge tone={o.status === 'accepted' ? 'success' : o.status === 'rejected' ? 'danger' : o.status === 'pending' ? 'warning' : 'neutral'}>
                {t.q.offerStatus[o.status]}
              </Badge>
            </div>
            <p className="mt-1 text-2xl font-bold">{formatMoney(o.price, locale)}</p>
            {o.terms && <p className="mt-1 whitespace-pre-line text-sm text-ink-700">{o.terms}</p>}
            {actionable && (
              <div className="mt-3 flex gap-2">
                <Button className="h-9" loading={busy} onClick={() => onRespond(o._id, 'accept')}>
                  {t.q.accept}
                </Button>
                <Button variant="danger" className="h-9" disabled={busy} onClick={() => onRespond(o._id, 'reject')}>
                  {t.q.reject}
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
