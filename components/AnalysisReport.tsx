import { Card, CardHeader } from '@/components/ui/Card'
import type { Recommendation } from '@/lib/types'

const ACTION_LABELS: Record<Recommendation['action'], string> = {
  ACCEPTER: 'Document acceptable',
  VERIFICATION_MANUELLE: 'Manual verification required',
  REJETER: 'Document to reject',
}

const ACTION_STYLES: Record<Recommendation['action'], string> = {
  ACCEPTER:
    'border-[var(--color-risk-low)] bg-[var(--color-risk-low-soft)] text-[var(--color-risk-low)]',
  VERIFICATION_MANUELLE:
    'border-[var(--color-risk-medium)] bg-[var(--color-risk-medium-soft)] text-[var(--color-risk-medium)]',
  REJETER:
    'border-[var(--color-risk-high)] bg-[var(--color-risk-high-soft)] text-[var(--color-risk-high)]',
}

export function RecommendationBanner({ recommendation }: { recommendation: Recommendation }) {
  return (
    <div className={`rounded-[var(--radius-panel)] border p-5 ${ACTION_STYLES[recommendation.action]}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">Recommendation</p>
      <p className="mt-1 text-sm font-semibold">{ACTION_LABELS[recommendation.action]}</p>
      <p className="mt-2 text-sm text-[var(--color-ink)]">{recommendation.summary}</p>
      {recommendation.nextSteps.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {recommendation.nextSteps.map((step) => (
            <li key={step} className="flex gap-2 text-sm text-[var(--color-ink)]">
              <span aria-hidden="true">—</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function AnalysisExplanation({ explanation }: { explanation: string }) {
  return (
    <Card accent="forest">
      <CardHeader accent="forest" title="Detailed analysis" />
      <div className="space-y-3 px-5 py-4">
        <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {explanation}
        </p>
        <p className="border-t border-[var(--color-line)] pt-3 text-xs leading-relaxed text-[var(--color-ink-muted)]">
          DocShield AI is a decision-support tool. Its analysis is produced by an artificial
          intelligence model and can be wrong in both directions: a genuine document may be
          flagged in error, a forged one may go unnoticed. This result is neither an expert
          opinion, nor proof, nor a legal verdict.
        </p>
      </div>
    </Card>
  )
}
