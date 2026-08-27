'use client'

import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RISK_LABELS } from '@/lib/risk'
import type { SuspiciousElement, SuspiciousRegion } from '@/lib/types'

const CATEGORY_LABELS: Record<SuspiciousElement['category'], string> = {
  TYPOGRAPHIE: 'Typographie',
  MISE_EN_PAGE: 'Mise en page',
  COHERENCE_DONNEES: 'Cohérence des données',
  MANIPULATION_IMAGE: "Manipulation d'image",
  ELEMENTS_SECURITE: 'Éléments de sécurité',
}

export function SuspiciousElements({
  elements,
  regions = [],
  activeElementId = null,
  onHoverElement,
}: {
  elements: SuspiciousElement[]
  regions?: SuspiciousRegion[]
  activeElementId?: string | null
  onHoverElement?: (id: string | null) => void
}) {
  const locatedIds = new Set(regions.map((region) => region.elementId))

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
            <li
              key={element.id}
              onMouseEnter={() => onHoverElement?.(element.id)}
              onMouseLeave={() => onHoverElement?.(null)}
              className={`px-5 py-4 ${
                activeElementId === element.id ? 'bg-[var(--color-canvas)]' : ''
              } ${locatedIds.has(element.id) ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{element.title}</p>
                <Badge level={element.severity}>{RISK_LABELS[element.severity]}</Badge>
              </div>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {CATEGORY_LABELS[element.category]}
                {locatedIds.has(element.id) ? '' : ' — non localisable sur le document'}
              </p>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{element.description}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
