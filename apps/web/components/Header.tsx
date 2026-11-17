'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LOCALES } from '@party/shared';
import { localeNames } from '@/lib/i18n';
import { useAuth, useI18n } from '@/lib/providers';
import { NotificationBell } from './NotificationBell';
import { ButtonLink } from './ui';

export function Header() {
  const { t, href, locale } = useI18n();
  const { user, isAdmin, logout, state } = useAuth();
  const pathname = usePathname();
  const rest = pathname.replace(/^\/(ar|he|en)/, '') || '/';

  return (
    <header className="site-header sticky top-0 z-30 border-b border-white/60 bg-white/55 shadow-[0_8px_30px_-18px_rgb(76_23_56/0.35)] backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link href={href('/')} className="flex items-center gap-2 text-xl font-extrabold">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg text-white shadow-[var(--shadow-glow)]">✦</span>
          <span className="text-gradient">{t.brand}</span>
        </Link>

        <nav className="ms-auto flex items-center gap-1 sm:gap-2">
          <Link href={href('/search')} className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-white/70 lg:block">
            {t.links.search}
          </Link>
          {user && (
            <>
              <Link href={href('/bookings')} className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-white/70 lg:block">
                {t.links.bookings}
              </Link>
              <Link href={href('/events')} className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-white/70 lg:block">
                {t.links4.events}
              </Link>
              <Link href={href('/quotes')} className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-white/70 lg:block">
                {t.links4.quotes}
              </Link>
              <Link href={href('/favorites')} className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-white/70 lg:block">
                {t.links.favorites}
              </Link>
            </>
          )}
          {user && (
            <Link href={href('/dashboard')} className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-white/70 lg:block">
              {t.nav.dashboard}
            </Link>
          )}
          {isAdmin && (
            <Link href={href('/admin')} className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-white/70 lg:block">
              {t.nav.admin}
            </Link>
          )}

          <select
            aria-label={t.common.language}
            value={locale}
            onChange={(e) => {
              window.location.href = `/${e.target.value}${rest === '/' ? '' : rest}`;
            }}
            className="h-9 max-w-24 rounded-full border border-white/70 bg-white/70 backdrop-blur px-2 text-sm sm:max-w-none sm:px-3"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {localeNames[l]}
              </option>
            ))}
          </select>

          {user && <NotificationBell />}
          {state.status === 'loading' ? null : user ? (
            <button onClick={() => void logout()} className="rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-white/70">
              {t.nav.logout}
            </button>
          ) : (
            <>
              <Link href={href('/login')} className="rounded-full px-3 py-2 text-sm font-medium text-ink-700 hover:bg-white/70">
                {t.nav.login}
              </Link>
              <span className="hidden sm:block">
                <ButtonLink href={href('/register')} className="h-9">
                  {t.nav.register}
                </ButtonLink>
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Mobile quick links */}
      <div className="flex gap-2 overflow-x-auto border-t border-white/50 px-4 py-2 [scrollbar-width:none] lg:hidden">
        <Link href={href('/search')} className="shrink-0 rounded-full bg-white/60 ring-1 ring-white/80 px-3 py-1.5 text-xs font-medium">
          {t.links.search}
        </Link>
      {user && (
        <>
          <Link href={href('/bookings')} className="shrink-0 rounded-full bg-white/60 ring-1 ring-white/80 px-3 py-1.5 text-xs font-medium">
            {t.links.bookings}
          </Link>
          <Link href={href('/events')} className="shrink-0 rounded-full bg-white/60 ring-1 ring-white/80 px-3 py-1.5 text-xs font-medium">
            {t.links4.events}
          </Link>
          <Link href={href('/quotes')} className="shrink-0 rounded-full bg-white/60 ring-1 ring-white/80 px-3 py-1.5 text-xs font-medium">
            {t.links4.quotes}
          </Link>
          <Link href={href('/favorites')} className="shrink-0 rounded-full bg-white/60 ring-1 ring-white/80 px-3 py-1.5 text-xs font-medium">
            {t.links.favorites}
          </Link>
          <Link href={href('/dashboard')} className="shrink-0 rounded-full bg-white/60 ring-1 ring-white/80 px-3 py-1.5 text-xs font-medium">
            {t.nav.dashboard}
          </Link>
          {isAdmin && (
            <Link href={href('/admin')} className="shrink-0 rounded-full bg-white/60 ring-1 ring-white/80 px-3 py-1.5 text-xs font-medium">
              {t.nav.admin}
            </Link>
          )}
        </>
      )}
      </div>
    </header>
  );
}
