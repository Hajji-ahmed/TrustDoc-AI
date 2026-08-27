import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RISK_LABELS } from '@/lib/risk'
import type { SuspiciousElement } from '@/lib/types'

const CATEGORY_LABELS: Record<SuspiciousElement['category'], string> = {
  TYPOGRAPHIE: 'Typographie',
  MISE_EN_PAGE: 'Mise en page',
  COHERENCE_DONNEES: 'Cohérence des données',
  MANIPULATION_IMAGE: "Manipulation d'image",
  ELEMENTS_SECURITE: 'Éléments de sécurité',
}

export function SuspiciousElements({ elements }: { elements: SuspiciousElement[] }) {
  return (
    <Card>
      <CardHeader
        title="Éléments suspects"
        subtitle={`${elements.length} anomalie${elements.length > 1 ? 's' : ''} détectée${
          elements.length > 1 ? 's' : ''
        }`}
      />
      {elements.length === 0 ? (
        <p className="p-5 text-sm text-[var(--color-ink-muted)]">
          Aucune anomalie n&apos;a été détectée sur ce document.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {elements.map((element) => (
            <li key={element.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{element.title}</p>
                <Badge level={element.severity}>{RISK_LABELS[element.severity]}</Badge>
              </div>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {CATEGORY_LABELS[element.category]}
              </p>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{element.description}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
