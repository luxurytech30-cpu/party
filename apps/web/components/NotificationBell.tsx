'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useI18n } from '@/lib/providers';
import type { AppNotification } from '@/lib/types';
import { cx } from './ui';

const POLL_MS = 60_000;

export function NotificationBell() {
  const { t, href, locale } = useI18n();
  const [data, setData] = useState<{ items: AppNotification[]; unread: number }>({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api<{ items: AppNotification[]; unread: number }>('/me/notifications').then(setData).catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  async function markRead() {
    await api('/me/notifications/read-all', { method: 'POST' }).catch(() => undefined);
    load();
  }

  return (
    <div ref={ref} className="relative">
      <button
        aria-label={t.notif.title}
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-9 place-items-center rounded-full hover:bg-ink-100"
      >
        🔔
        {data.unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 top-11 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-ink-100">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <p className="font-semibold">{t.notif.title}</p>
            {data.unread > 0 && (
              <button onClick={() => void markRead()} className="text-xs font-semibold text-brand-700">
                {t.notif.markRead}
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {data.items.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-500">{t.notif.empty}</li>}
            {data.items.map((n) => {
              const price = typeof n.params?.price === 'number' ? ` · ${formatMoney(n.params.price, locale)}` : '';
              const date = typeof n.params?.date === 'string' ? ` · ${n.params.date}` : '';
              const content = (
                <>
                  <p className={cx('text-sm', !n.readAt && 'font-semibold')}>
                    {!n.readAt && <span className="me-1.5 inline-block size-2 rounded-full bg-brand-600" />}
                    {t.notif.types[n.type] ?? n.type}
                    {price}
                    {date}
                  </p>
                  <p className="text-xs text-ink-500">{new Date(n.createdAt).toLocaleString(locale)}</p>
                </>
              );
              return (
                <li key={n._id} className="border-b border-ink-100 last:border-0">
                  {n.link ? (
                    <Link href={href(n.link)} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-ink-100/60">
                      {content}
                    </Link>
                  ) : (
                    <div className="px-4 py-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
