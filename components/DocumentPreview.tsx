'use client'

import { useEffect, useState } from 'react'
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
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex(0)
  }, [document])

  const severityById = new Map(elements.map((element) => [element.id, element.severity]))

  // La numérotation est calculée sur toutes les pages avant d'être filtrée :
  // le numéro 3 désigne la même anomalie où qu'on se trouve dans le document,
  // et il reste accordé avec la liste des éléments suspects.
  const numbers = regionNumbers(regions, elements)
  const known = regions.filter((region) => severityById.has(region.elementId))

  // Survoler une anomalie de la liste amène sur sa page : sans cela, le lien
  // entre la liste et le document se romprait dès la deuxième page.
  useEffect(() => {
    if (!activeElementId) return
    const target = known.find((region) => region.elementId === activeElementId)
    if (target) {
      setPageIndex(Math.min(Math.max(target.page - 1, 0), document.pages.length - 1))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeElementId])

  const page = document.pages[Math.min(pageIndex, document.pages.length - 1)]
  const drawable = known.filter((region) => region.page === pageIndex + 1).map(clampRegion)
  const analyzedCount = document.pages.length
  const skippedCount = document.pageCount - analyzedCount

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-canvas)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={page.dataUrl}
          alt={`Aperçu de ${document.fileName}, page ${pageIndex + 1}`}
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

      {analyzedCount > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          {document.pages.map((_, index) => {
            const marked = known.some((region) => region.page === index + 1)
            const current = index === pageIndex
            return (
              <button
                key={index}
                type="button"
                onClick={() => setPageIndex(index)}
                aria-current={current ? 'true' : undefined}
                aria-label={`Page ${index + 1}${marked ? ', comporte des zones signalées' : ''}`}
                className={`relative h-8 min-w-8 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                  current
                    ? 'bg-[var(--color-brand)] text-[var(--color-on-dark)]'
                    : 'bg-[var(--color-brand-soft)] text-[var(--color-brand-ink)] hover:bg-[var(--color-brand-tint)]'
                }`}
              >
                {index + 1}
                {marked ? (
                  <span
                    aria-hidden="true"
                    className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ${
                      current ? 'ring-[var(--color-brand)]' : 'ring-[var(--color-brand-soft)]'
                    } bg-[var(--color-risk-high)]`}
                  />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--color-ink-muted)]">
        <span className="truncate">{document.fileName}</span>
        <span className="shrink-0">
          {page.width} × {page.height} px
          {document.pageCount > 1 ? ` — page ${pageIndex + 1} sur ${document.pageCount}` : ''}
        </span>
      </div>

      {skippedCount > 0 ? (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
          Les {analyzedCount} premières pages sont analysées. {skippedCount} page
          {skippedCount > 1 ? 's' : ''} au-delà n&apos;
          {skippedCount > 1 ? 'ont' : 'a'} pas été transmise{skippedCount > 1 ? 's' : ''}.
        </p>
      ) : null}

      {drawable.length > 0 ? (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
          {drawable.length} zone{drawable.length > 1 ? 's' : ''} signalée
          {drawable.length > 1 ? 's' : ''} sur cette page — les numéros renvoient à la liste
          des anomalies.
        </p>
      ) : null}
    </div>
  )
}
