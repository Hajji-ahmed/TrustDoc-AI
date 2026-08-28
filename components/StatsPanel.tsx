import type { Stats } from '@/lib/stats-shape'

// Compteurs cumulés, relus depuis /api/stats. Ils survivent au rechargement de
// la page et au redémarrage du serveur : l'état vit dans data/stats.json, pas
// dans le composant.

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

function formatLastAnalysis(iso: string | null) {
  if (!iso) return "Aucune analyse enregistrée pour l'instant."
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Aucune analyse enregistrée pour l'instant."
  return `Dernière analyse le ${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`
}

export function StatsPanel({ stats }: { stats: Stats }) {
  return (
    <section aria-label="Statistiques cumulées des analyses">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {TILES.map((tile) => {
          const value = tile.key === 'total' ? stats.totalAnalyses : stats.byLevel[tile.key]
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
        {formatLastAnalysis(stats.lastAnalysisAt)}
      </p>
    </section>
  )
}
