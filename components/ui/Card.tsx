export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-[var(--color-line)] px-5 py-4">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{subtitle}</p>
      ) : null}
    </div>
  )
}
