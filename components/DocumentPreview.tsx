'use client'

import { clampRegion, overlayStroke, regionNumbers } from '@/lib/risk'
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
  const numbers = regionNumbers(regions, elements)
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
          <>
            <svg
              viewBox="0 0 1 1"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
            >
              {drawable.map((region) => {
                const severity = severityById.get(region.elementId)!
                const color = overlayStroke(severity)
                const active = activeElementId === region.elementId
                return (
                  <rect
                    key={`${region.elementId}-${region.x}-${region.y}`}
                    x={region.x}
                    y={region.y}
                    width={region.width}
                    height={region.height}
                    fill={color}
                    fillOpacity={active ? 0.28 : 0.14}
                    stroke={color}
                    strokeWidth={active ? 3 : 2}
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

            {/* Les numéros sont en HTML et non en SVG : le viewBox est étiré
                en preserveAspectRatio="none", ce qui déformerait le texte. */}
            {drawable.map((region) => {
              const severity = severityById.get(region.elementId)!
              const active = activeElementId === region.elementId
              return (
                <span
                  key={`num-${region.elementId}-${region.x}`}
                  style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%` }}
                  className={`pointer-events-none absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white ${
                    severity === 'HIGH'
                      ? 'bg-[var(--color-risk-high)]'
                      : 'bg-[var(--color-risk-medium)]'
                  } ${active ? 'scale-125' : ''}`}
                >
                  {numbers.get(region.elementId)}
                </span>
              )
            })}
          </>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--color-ink-muted)]">
        <span className="truncate">{document.fileName}</span>
        <span className="shrink-0">
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
          {drawable.length > 1 ? 's' : ''} — les numéros renvoient à la liste des anomalies.
        </p>
      ) : null}
    </div>
  )
}
