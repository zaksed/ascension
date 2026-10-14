/** Composants d'interface réutilisables. */
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-strong shadow-sm',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'bg-transparent text-ink hover:bg-surface-2',
  danger: 'bg-bad text-white hover:opacity-90',
  accent: 'bg-accent-bright text-[#2b1700] hover:brightness-95 shadow-sm',
};
const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-[0.95rem] rounded-xl',
  lg: 'px-5 py-3.5 text-base rounded-2xl',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = ''): string {
  return `inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
}

export function LinkButton({ variant = 'primary', size = 'md', className = '', ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

export function Card({ children, className = '', as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <As className={`bg-surface border border-line rounded-2xl p-4 sm:p-5 ${className}`}>{children}</As>;
}

export function ProgressBar({ value, max = 1, label, tone = 'brand', className = '' }: { value: number; max?: number; label: string; tone?: 'brand' | 'ok' | 'accent' | 'toeic' | 'tm'; className?: string }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  const colors = { brand: 'bg-brand', ok: 'bg-ok', accent: 'bg-accent-bright', toeic: 'bg-toeic', tm: 'bg-tm' };
  return (
    <div className={`h-2.5 w-full rounded-full bg-surface-2 overflow-hidden ${className}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
      <div className={`h-full rounded-full ${colors[tone]} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Anneau de progression (objectif quotidien). */
export function Ring({ value, max, size = 64, stroke = 7, children, label }: { value: number; max: number; size?: number; stroke?: number; children?: ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={pct >= 1 ? 'var(--ok)' : 'var(--accent-bright)'} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} className="transition-[stroke-dasharray] duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-bold">{children}</div>
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'ok' | 'bad' | 'accent' | 'toeic' | 'tm' }) {
  const tones = {
    neutral: 'bg-surface-2 text-muted',
    brand: 'bg-brand-soft text-brand-strong',
    ok: 'bg-ok-soft text-ok',
    bad: 'bg-bad-soft text-bad',
    accent: 'bg-accent-soft text-accent',
    toeic: 'bg-toeic-soft text-toeic',
    tm: 'bg-tm-soft text-tm',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

/** Boîte de dialogue accessible (élément <dialog> natif : focus et Échap gérés). */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[min(92vw,32rem)] rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
      aria-labelledby="modal-title"
    >
      <div className="p-5">
        <h2 id="modal-title" className="text-lg font-bold mb-3">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

export function PageTitle({ children, subtitle, back }: { children: ReactNode; subtitle?: ReactNode; back?: string }) {
  return (
    <header className="mb-4 sm:mb-6">
      {back && (
        <Link to={back} className="text-sm text-muted hover:text-ink inline-flex items-center gap-1 mb-1">
          ← Retour
        </Link>
      )}
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{children}</h1>
      {subtitle && <p className="text-muted mt-1">{subtitle}</p>}
    </header>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-xl font-extrabold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex items-start justify-between gap-4 py-2.5 cursor-pointer">
      <span>
        <span className="font-medium block">{label}</span>
        {description && <span className="text-sm text-muted block">{description}</span>}
      </span>
      <span className="relative inline-flex shrink-0 mt-0.5">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-surface-2 border border-line peer-checked:bg-brand transition-colors peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-brand" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="text-center py-10 px-4">
      <p className="font-semibold">{title}</p>
      {children && <div className="text-muted mt-1 text-sm">{children}</div>}
    </div>
  );
}

export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="grid place-items-center py-16 text-muted" role="status">
      <svg className="animate-spin h-7 w-7" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" />
      </svg>
      <span className="mt-2 text-sm">{label}</span>
    </div>
  );
}
