// Accents d'identité des panneaux, dans la gamme du système. Aucun n'emprunte
// au vert / ocre / brique de la signalétique de risque, ni au bleu d'encre des
// actions : un panneau ne peut donc être lu ni comme un verdict ni comme un
// bouton. Les noms d'accents restent ceux du système d'origine — seules leurs
// valeurs ont changé.
export type CardAccent = 'forest' | 'olive' | 'sand' | 'clay'

const ACCENT_BAR: Record<CardAccent, string> = {
  forest: 'bg-[var(--color-forest)]',
  olive: 'bg-[var(--color-olive)]',
  sand: 'bg-[var(--color-accent-sand)]',
  clay: 'bg-[var(--color-accent-clay)]',
}

const ACCENT_TINT: Record<CardAccent, string> = {
  forest: 'bg-[var(--color-forest-tint)]',
  olive: 'bg-[var(--color-olive-soft)]',
  sand: 'bg-[var(--color-accent-sand-soft)]',
  clay: 'bg-[var(--color-accent-clay-soft)]',
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
      className={`overflow-hidden rounded-[var(--radius-panel)] bg-[var(--color-surface)] shadow-card ${className}`}
    >
      {accent ? <div className={`h-1.5 ${ACCENT_BAR[accent]}`} aria-hidden="true" /> : null}
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
            className={`h-2 w-2 shrink-0 rounded-full ${ACCENT_BAR[accent]}`}
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
