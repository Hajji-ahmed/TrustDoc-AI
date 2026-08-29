export function LoadingState() {
  const steps = [
    'Reading the document',
    'Structural and typographic analysis',
    'Checking data coherence',
    'Writing the report',
  ]

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-ink)]"
        aria-hidden="true"
      />
      <p className="mt-4 text-sm font-semibold">Analysis in progress</p>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
        This usually takes less than a minute.
      </p>
      <ul className="mt-6 space-y-1.5 text-xs text-[var(--color-ink-muted)]">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </div>
  )
}
