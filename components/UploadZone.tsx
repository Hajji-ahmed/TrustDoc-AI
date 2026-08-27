'use client'

import { useRef, useState } from 'react'
import { DocumentPrepError, prepareDocument, type PreparedDocument } from '@/lib/pdf'

export function UploadZone({
  onPrepared,
  disabled,
}: {
  onPrepared: (doc: PreparedDocument) => void
  disabled: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file || disabled) return
    setError(null)
    setPreparing(true)
    try {
      onPrepared(await prepareDocument(file))
    } catch (cause) {
      setError(
        cause instanceof DocumentPrepError
          ? cause.message
          : "Le document n'a pas pu être préparé. Réessayez avec un autre fichier.",
      )
    } finally {
      setPreparing(false)
    }
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void handleFile(event.dataTransfer.files[0])
        }}
        className={`rounded-lg border border-dashed px-6 py-10 text-center ${
          dragging
            ? 'border-[var(--color-ink)] bg-[var(--color-canvas)]'
            : 'border-[var(--color-line)] bg-[var(--color-surface)]'
        }`}
      >
        <p className="text-sm font-medium">Déposez votre document ici</p>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          PDF, JPG ou PNG — 10 Mo maximum
        </p>
        <button
          type="button"
          disabled={disabled || preparing}
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-md border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-canvas)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {preparing ? 'Préparation…' : 'Parcourir les fichiers'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-[var(--color-risk-high)] bg-[var(--color-risk-high-soft)] px-3 py-2 text-xs text-[var(--color-risk-high)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
