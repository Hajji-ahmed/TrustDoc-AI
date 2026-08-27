import { RISK_STYLES, type RiskLevel } from '@/lib/risk'

export function Badge({
  level,
  children,
}: {
  level: RiskLevel | 'neutral'
  children: React.ReactNode
}) {
  const style =
    level === 'neutral'
      ? {
          text: 'text-[var(--color-ink-muted)]',
          bg: 'bg-[var(--color-canvas)]',
          border: 'border-[var(--color-line)]',
          dot: 'bg-[var(--color-ink-muted)]',
        }
      : RISK_STYLES[level]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.border} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {children}
    </span>
  )
}
