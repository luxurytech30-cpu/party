import type { Metadata } from 'next';
import { Heebo, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { notFound } from 'next/navigation';
import { LOCALES, isLocale, localeDirection } from '@party/shared';
import { Header } from '@/components/Header';
import { PackageDock } from '@/components/home/PackageDrawer';
import { dictionaries } from '@/lib/i18n';
import { Providers } from '@/lib/providers';
import '../globals.css';
import '../celebration.css';

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});
const hebrew = Heebo({ subsets: ['hebrew', 'latin'], variable: '--font-hebrew', display: 'swap' });

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = dictionaries[isLocale(locale) ? locale : 'ar'];
  return { title: `${t.brand} — ${t.tagline}`, description: t.heroSubtitle };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} dir={localeDirection(locale)} className={`${arabic.variable} ${hebrew.variable}`}>
      <body className="min-h-dvh font-sans antialiased" style={locale === 'he' ? { fontFamily: 'var(--font-hebrew), var(--font-arabic), system-ui' } : undefined}>
        <div aria-hidden className="ambient">
          <span style={{ width: 420, height: 420, top: -80, insetInlineEnd: -60, background: '#f4a6c5' }} />
          <span style={{ width: 360, height: 360, top: '35%', insetInlineStart: -120, background: '#f3d9a4', animationDelay: '-6s' }} />
          <span style={{ width: 380, height: 380, bottom: -120, insetInlineEnd: '20%', background: '#c4b5fd', animationDelay: '-12s' }} />
        </div>
        <Providers locale={locale}>
          <Header />
          <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">{children}</main>
          <PackageDock />
        </Providers>
      </body>
    </html>
  );
}
