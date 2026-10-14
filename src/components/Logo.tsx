/** Logo original d'Ascension : un sommet, un sentier en lacets et un drapeau d'arrivée. */
export function Logo({ size = 32, withText = false }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="var(--brand)" />
        <path d="M8 52 26 22l8 12 6-8 16 26z" fill="var(--on-brand)" opacity="0.95" />
        <path d="M26 22l4 6-4-1-4 3z" fill="var(--brand-soft)" />
        <path d="M18 50c6-2 4-6 10-8s6-5 10-6" stroke="var(--brand)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="1 4" />
        <path d="M40 26V12" stroke="var(--accent-bright)" strokeWidth="3" strokeLinecap="round" />
        <path d="M40 12h10l-3 3.5 3 3.5H40z" fill="var(--accent-bright)" />
      </svg>
      {withText && <span className="font-extrabold tracking-tight text-lg">Ascension</span>}
    </span>
  );
}
