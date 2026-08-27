export function EmptyState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-muted)]">
        <span aria-hidden="true" className="text-lg">
          ⌕
        </span>
      </div>
      <h3 className="text-sm font-semibold">Aucune analyse en cours</h3>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--color-ink-muted)]">
        Déposez un document officiel dans la zone de gauche, puis lancez l&apos;analyse pour
        obtenir un score de risque et le détail des anomalies détectées.
      </p>
    </div>
  )
}
