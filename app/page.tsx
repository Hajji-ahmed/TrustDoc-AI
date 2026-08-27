'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/states/EmptyState'
import { LoadingState } from '@/components/states/LoadingState'
import { ErrorState } from '@/components/states/ErrorState'
import { UploadZone } from '@/components/UploadZone'
import { DocumentPreview } from '@/components/DocumentPreview'
import type { PreparedDocument } from '@/lib/pdf'
import type { AnalysisMode, AnalysisResult, AnalyzeError, AnalyzeResponse } from '@/lib/types'

type Status = 'idle' | 'filePrepared' | 'analyzing' | 'success' | 'error'

export default function DashboardPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [preparedDocument, setPreparedDocument] = useState<PreparedDocument | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [mode, setMode] = useState<AnalysisMode | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  function handlePrepared(doc: PreparedDocument) {
    setPreparedDocument(doc)
    setResult(null)
    setErrorMessage('')
    setStatus('filePrepared')
  }

  async function runAnalysis() {
    if (!preparedDocument) return
    setStatus('analyzing')
    setErrorMessage('')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: preparedDocument.dataUrl }),
      })

      const payload: AnalyzeResponse | AnalyzeError = await response.json()

      if (!response.ok || 'error' in payload) {
        setErrorMessage(
          'error' in payload
            ? payload.error.message
            : "Le service d'analyse est momentanément indisponible.",
        )
        setStatus('error')
        return
      }

      setResult(payload.result)
      setMode(payload.mode)
      setStatus('success')
    } catch {
      setErrorMessage(
        "La connexion au service d'analyse a échoué. Vérifiez votre réseau puis réessayez.",
      )
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--color-ink)] text-xs font-bold text-white">
              DS
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">DocShield AI</p>
              <p className="text-xs leading-tight text-[var(--color-ink-muted)]">
                Contrôle d&apos;authenticité documentaire
              </p>
            </div>
          </div>
          {mode === 'demo' ? <Badge level="neutral">Mode démonstration</Badge> : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-5">
          <section className="lg:col-span-2">
            <Card>
              <CardHeader title="Document à contrôler" />
              <div className="space-y-4 p-5">
                <UploadZone onPrepared={handlePrepared} disabled={status === 'analyzing'} />
                {preparedDocument ? <DocumentPreview document={preparedDocument} /> : null}
                <Button
                  onClick={() => void runAnalysis()}
                  disabled={!preparedDocument || status === 'analyzing'}
                >
                  {status === 'analyzing' ? 'Analyse en cours…' : 'Analyser le document'}
                </Button>
              </div>
            </Card>
          </section>

          <section className="lg:col-span-3">
            <Card>
              {status === 'analyzing' ? (
                <LoadingState />
              ) : status === 'error' ? (
                <ErrorState message={errorMessage} onRetry={() => void runAnalysis()} />
              ) : status === 'success' && result ? (
                <pre className="overflow-x-auto p-5 text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <EmptyState />
              )}
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
