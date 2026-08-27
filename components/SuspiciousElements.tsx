'use client'

import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SEVERITY_LABELS, regionNumbers, severityBadgeLevel } from '@/lib/risk'
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
  const numbers = regionNumbers(regions, elements)

  return (
    <Card accent="slate">
      <CardHeader
        accent="slate"
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
          {elements.map((element) => {
            const number = numbers.get(element.id)
            return (
              <li
                key={element.id}
                onMouseEnter={() => onHoverElement?.(element.id)}
                onMouseLeave={() => onHoverElement?.(null)}
                className={`px-5 py-3 ${
                  activeElementId === element.id ? 'bg-[var(--color-canvas)]' : ''
                } ${number ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    {number ? (
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                          element.severity === 'HIGH'
                            ? 'bg-[var(--color-risk-high)]'
                            : 'bg-[var(--color-risk-medium)]'
                        }`}
                      >
                        {number}
                      </span>
                    ) : null}
                    <p className="text-sm font-medium">{element.title}</p>
                  </div>
                  <Badge level={severityBadgeLevel(element.severity)}>
                    {SEVERITY_LABELS[element.severity]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                  {CATEGORY_LABELS[element.category]}
                  {number ? '' : ' — non localisable sur le document'}
                </p>
                <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
                  {element.description}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
