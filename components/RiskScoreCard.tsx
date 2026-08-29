import { Badge } from '@/components/ui/Badge'
import { RISK_LABELS, RISK_STYLES } from '@/lib/risk'
import type { RiskLevel } from '@/lib/types'

export function RiskScoreCard({
  score,
  level,
  documentType,
}: {
  score: number
  level: RiskLevel
  documentType: string
}) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, score))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--color-brand-soft)"
            strokeWidth="13"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={RISK_STYLES[level].stroke}
            strokeWidth="13"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl tabular-nums">{clamped}</span>
          <span className="text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)]">
            out of 100
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
          Risk score
        </p>
        <div className="mt-1.5">
          <Badge level={level}>{RISK_LABELS[level]}</Badge>
        </div>
        <p className="mt-3 text-sm">
          <span className="text-[var(--color-ink-muted)]">Detected type: </span>
          <span className="font-medium">{documentType}</span>
        </p>
      </div>
    </div>
  )
}
