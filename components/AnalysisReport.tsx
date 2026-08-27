import { Card, CardHeader } from '@/components/ui/Card'
import type { Recommendation } from '@/lib/types'

const ACTION_LABELS: Record<Recommendation['action'], string> = {
  ACCEPTER: 'Document acceptable',
  VERIFICATION_MANUELLE: 'Vérification manuelle requise',
  REJETER: 'Document à rejeter',
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
    <div className={`rounded-xl border p-5 ${ACTION_STYLES[recommendation.action]}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">Recommandation</p>
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
    <Card>
      <CardHeader title="Analyse détaillée" />
      <div className="space-y-3 px-5 py-4">
        <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {explanation}
        </p>
        <p className="border-t border-[var(--color-line)] pt-3 text-xs leading-relaxed text-[var(--color-ink-muted)]">
          DocShield AI est un outil d&apos;aide à la décision. Son analyse est produite par un
          modèle d&apos;intelligence artificielle et peut comporter des erreurs, dans les deux
          sens : un document authentique peut être signalé à tort, un document falsifié peut
          passer inaperçu. Ce résultat ne constitue ni une expertise, ni une preuve, ni un
          verdict juridique.
        </p>
      </div>
    </Card>
  )
}
