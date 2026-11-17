'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white shadow-[var(--shadow-glow)] hover:brightness-110 hover:-translate-y-px',
  secondary: 'glass text-ink-900 hover:bg-white/80',
  ghost: 'text-ink-700 hover:bg-white/50',
  danger: 'bg-white/70 text-red-700 ring-1 ring-red-200 backdrop-blur hover:bg-red-50',
};
const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 h-11 text-sm font-semibold transition duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap';

export function Button({
  variant = 'primary',
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button className={cx(base, variants[variant], className)} disabled={loading || props.disabled} {...props}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = 'primary', className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cx(base, variants[variant], className)}>
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={cx('size-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)} />;
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink-700">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-ink-500">{hint}</span>}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}

const inputCls =
  'w-full rounded-xl border border-white/70 bg-white/70 backdrop-blur px-4 h-11 text-sm text-ink-900 placeholder:text-ink-500 shadow-inner shadow-ink-900/[0.03] focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-200/60 outline-none transition';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, 'h-auto min-h-24 py-3', props.className)} />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('glass rounded-[var(--radius-card)] p-5 sm:p-6', className)}>{children}</div>;
}

const badgeTones = {
  neutral: 'bg-white/60 text-ink-700 ring-1 ring-white/80 backdrop-blur',
  brand: 'bg-brand-100/80 text-brand-800 ring-1 ring-brand-200/60 backdrop-blur',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};
export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof badgeTones; children: ReactNode }) {
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badgeTones[tone])}>{children}</span>;
}

export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'success' | 'info'; children: ReactNode }) {
  const tones = {
    danger: 'bg-red-50 text-red-800 ring-red-200',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    info: 'bg-brand-50 text-brand-900 ring-brand-200',
  };
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('rounded-xl px-4 py-3 text-sm ring-1', tones[tone])}>
      {children}
    </div>
  );
}

export function PageLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-ink-500">
      <Spinner /> {label}
    </div>
  );
}

export { cx };
