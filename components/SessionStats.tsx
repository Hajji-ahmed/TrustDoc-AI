import type { RiskLevel } from '@/lib/types'

// Compteurs de la session en cours uniquement. Le prototype ne conserve rien
// entre deux chargements : afficher un cumul historique reviendrait à inventer
// un chiffre sur un outil dont l'objet est justement de ne pas en inventer.
export interface SessionCounts {
  total: number
  byLevel: Record<RiskLevel, number>
}

export const EMPTY_SESSION: SessionCounts = {
  total: 0,
  byLevel: { LOW: 0, MEDIUM: 0, HIGH: 0 },
}

const TILES = [
  {
    key: 'total' as const,
    label: 'Documents analysés',
    bg: 'bg-[var(--color-brand-soft)]',
    chip: 'bg-[var(--color-brand-tint)]',
    text: 'text-[#8c491a]',
  },
  {
    key: 'LOW' as const,
    label: 'Risque faible',
    bg: 'bg-[var(--color-olive-soft)]',
    chip: 'bg-[var(--color-olive-tint)]',
    text: 'text-[var(--color-risk-low)]',
  },
  {
    key: 'MEDIUM' as const,
    label: 'Vérification manuelle',
    bg: 'bg-[var(--color-risk-medium-soft)]',
    chip: 'bg-[#f4e3b8]',
    text: 'text-[var(--color-risk-medium)]',
  },
  {
    key: 'HIGH' as const,
    label: 'Risque élevé',
    bg: 'bg-[var(--color-risk-high-soft)]',
    chip: 'bg-[#f7d2cc]',
    text: 'text-[var(--color-risk-high)]',
  },
]

export function SessionStats({ counts }: { counts: SessionCounts }) {
  return (
    <section aria-label="Analyses de la session en cours">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {TILES.map((tile) => {
          const value = tile.key === 'total' ? counts.total : counts.byLevel[tile.key]
          return (
            <div key={tile.key} className={`rounded-[var(--radius-panel)] px-5 py-4 ${tile.bg}`}>
              <div className={`mb-3 h-8 w-8 rounded-lg ${tile.chip}`} aria-hidden="true" />
              <p className="font-display text-3xl leading-none">{value}</p>
              <p className={`mt-1.5 text-xs ${tile.text}`}>{tile.label}</p>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
        Compteurs de la session en cours. Aucune analyse n&apos;est conservée après
        rechargement de la page.
      </p>
    </section>
  )
}
