'use client'

import type { PreparedDocument } from '@/lib/pdf'

export function DocumentPreview({ document }: { document: PreparedDocument }) {
  return (
    <div>
      <div className="overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={document.dataUrl}
          alt={`Aperçu de ${document.fileName}`}
          className="block h-auto w-full"
        />
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
    </div>
  )
}
