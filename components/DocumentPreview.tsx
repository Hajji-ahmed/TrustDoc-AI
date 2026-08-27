'use client'

import { clampRegion, RISK_STYLES } from '@/lib/risk'
import type { PreparedDocument } from '@/lib/pdf'
import type { SuspiciousElement, SuspiciousRegion } from '@/lib/types'

export function DocumentPreview({
  document,
  regions = [],
  elements = [],
  activeElementId = null,
  onHoverElement,
}: {
  document: PreparedDocument
  regions?: SuspiciousRegion[]
  elements?: SuspiciousElement[]
  activeElementId?: string | null
  onHoverElement?: (id: string | null) => void
}) {
  const severityById = new Map(elements.map((element) => [element.id, element.severity]))
  const drawable = regions
    .filter((region) => severityById.has(region.elementId))
    .map(clampRegion)

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-canvas)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={document.dataUrl}
          alt={`Aperçu de ${document.fileName}`}
          className="block h-auto w-full"
        />
        {drawable.length > 0 ? (
          <svg
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            {drawable.map((region) => {
              const severity = severityById.get(region.elementId)!
              const active = activeElementId === region.elementId
              return (
                <rect
                  key={`${region.elementId}-${region.x}-${region.y}`}
                  x={region.x}
                  y={region.y}
                  width={region.width}
                  height={region.height}
                  fill={RISK_STYLES[severity].stroke}
                  fillOpacity={active ? 0.22 : 0.08}
                  stroke={RISK_STYLES[severity].stroke}
                  strokeWidth={active ? 0.006 : 0.003}
                  vectorEffect="non-scaling-stroke"
                  className="cursor-pointer"
                  onMouseEnter={() => onHoverElement?.(region.elementId)}
                  onMouseLeave={() => onHoverElement?.(null)}
                >
                  <title>{region.label}</title>
                </rect>
              )
            })}
          </svg>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <span className="truncate">{document.fileName}</span>
        <span>
          {document.width} × {document.height} px
          {document.pageCount > 1 ? ` — page 1 sur ${document.pageCount}` : ''}
        </span>
      </div>
      {document.pageCount > 1 ? (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
          Seule la première page est analysée dans cette version.
        </p>
      ) : null}
      {drawable.length > 0 ? (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
          {drawable.length} zone{drawable.length > 1 ? 's' : ''} signalée
          {drawable.length > 1 ? 's' : ''} sur le document. Survolez une zone ou une anomalie
          pour faire le lien.
        </p>
      ) : null}
    </div>
  )
}
