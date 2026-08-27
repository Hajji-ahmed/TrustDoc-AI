// Accents d'identité des panneaux. Volontairement limités à des tons froids :
// le vert, l'ambre et le rouge restent réservés à la signalétique de risque,
// pour qu'une couleur de panneau ne puisse jamais être lue comme un verdict.
export type CardAccent = 'navy' | 'teal' | 'indigo' | 'slate'

const ACCENT_BAR: Record<CardAccent, string> = {
  navy: 'bg-[var(--color-brand)]',
  teal: 'bg-[var(--color-accent-teal)]',
  indigo: 'bg-[var(--color-accent-indigo)]',
  slate: 'bg-[var(--color-accent-slate)]',
}

const ACCENT_DOT: Record<CardAccent, string> = {
  navy: 'bg-[var(--color-brand)]',
  teal: 'bg-[var(--color-accent-teal)]',
  indigo: 'bg-[var(--color-accent-indigo)]',
  slate: 'bg-[var(--color-accent-slate)]',
}

const ACCENT_TINT: Record<CardAccent, string> = {
  navy: 'bg-[var(--color-brand-soft)]',
  teal: 'bg-[var(--color-accent-teal-soft)]',
  indigo: 'bg-[var(--color-accent-indigo-soft)]',
  slate: 'bg-[var(--color-accent-slate-soft)]',
}

export function Card({
  children,
  className = '',
  accent,
}: {
  children: React.ReactNode
  className?: string
  accent?: CardAccent
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl bg-[var(--color-surface)] shadow-card ${className}`}
    >
      {accent ? <div className={`h-1 ${ACCENT_BAR[accent]}`} aria-hidden="true" /> : null}
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  accent,
}: {
  title: string
  subtitle?: string
  accent?: CardAccent
}) {
  return (
    <div
      className={`border-b border-[var(--color-line)] px-5 py-4 ${
        accent ? ACCENT_TINT[accent] : ''
      }`}
    >
      <div className="flex items-center gap-2">
        {accent ? (
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${ACCENT_DOT[accent]}`}
            aria-hidden="true"
          />
        ) : null}
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      </div>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{subtitle}</p>
      ) : null}
    </div>
  )
}
