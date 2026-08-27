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
import { RiskScoreCard } from '@/components/RiskScoreCard'
import { ExtractedFields } from '@/components/ExtractedFields'
import { SuspiciousElements } from '@/components/SuspiciousElements'
import { RecommendationBanner, AnalysisExplanation } from '@/components/AnalysisReport'
import type { PreparedDocument } from '@/lib/pdf'
import type { AnalysisMode, AnalysisResult, AnalyzeError, AnalyzeResponse } from '@/lib/types'

type Status = 'idle' | 'filePrepared' | 'analyzing' | 'success' | 'error'

export default function DashboardPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [preparedDocument, setPreparedDocument] = useState<PreparedDocument | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [mode, setMode] = useState<AnalysisMode | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [activeElementId, setActiveElementId] = useState<string | null>(null)

  function handlePrepared(doc: PreparedDocument) {
    setPreparedDocument(doc)
    setResult(null)
    setErrorMessage('')
    setActiveElementId(null)
    setStatus('filePrepared')
  }

  async function runAnalysis() {
    if (!preparedDocument) return
    setStatus('analyzing')
    setErrorMessage('')
    setActiveElementId(null)

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
    // Sur écran large, la page ne défile pas : seuls les panneaux défilent.
    // En dessous de 1024 px, on repasse en défilement normal — forcer tout
    // dans un écran de portable rendrait le texte illisible.
    <div className="flex min-h-screen flex-col lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <header className="shrink-0 bg-[var(--color-brand)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">
              DS
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-white">DocShield AI</p>
              <p className="text-xs leading-tight text-white/70">
                Contrôle d&apos;authenticité documentaire
              </p>
            </div>
          </div>
          {mode === 'demo' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white/70" aria-hidden="true" />
              Mode démonstration
            </span>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6 lg:min-h-0">
        <div className="grid gap-6 lg:h-full lg:grid-cols-5">
          <section className="lg:col-span-2 lg:min-h-0">
            <Card className="flex flex-col lg:h-full">
              <div className="shrink-0">
                <CardHeader title="Document à contrôler" />
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
                <div className="shrink-0">
                  <UploadZone onPrepared={handlePrepared} disabled={status === 'analyzing'} />
                </div>
                {preparedDocument ? (
                  <DocumentPreview
                    document={preparedDocument}
                    regions={result?.suspiciousRegions ?? []}
                    elements={result?.suspiciousElements ?? []}
                    activeElementId={activeElementId}
                    onHoverElement={setActiveElementId}
                  />
                ) : null}
                <div className="shrink-0">
                  <Button
                    onClick={() => void runAnalysis()}
                    disabled={!preparedDocument || status === 'analyzing'}
                  >
                    {status === 'analyzing' ? 'Analyse en cours…' : 'Analyser le document'}
                  </Button>
                </div>
              </div>
            </Card>
          </section>

          <section className="lg:col-span-3 lg:min-h-0">
            {status === 'analyzing' ? (
              <Card className="lg:flex lg:h-full lg:items-center lg:justify-center">
                <LoadingState />
              </Card>
            ) : status === 'error' ? (
              <Card className="lg:flex lg:h-full lg:items-center lg:justify-center">
                <ErrorState message={errorMessage} onRetry={() => void runAnalysis()} />
              </Card>
            ) : status === 'success' && result ? (
              <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
                <Card className="shrink-0">
                  <RiskScoreCard
                    score={result.riskScore}
                    level={result.riskLevel}
                    documentType={result.detectedDocumentType}
                  />
                </Card>
                <div className="shrink-0 overflow-y-auto lg:max-h-40">
                  <RecommendationBanner recommendation={result.recommendation} />
                </div>
                <div className="grid gap-4 lg:min-h-0 lg:flex-1 xl:grid-cols-2">
                  <ExtractedFields fields={result.extractedInformation} />
                  <SuspiciousElements
                    elements={result.suspiciousElements}
                    regions={result.suspiciousRegions}
                    activeElementId={activeElementId}
                    onHoverElement={setActiveElementId}
                  />
                </div>
                <div className="shrink-0 lg:h-36">
                  <AnalysisExplanation explanation={result.explanation} />
                </div>
              </div>
            ) : (
              <Card className="lg:flex lg:h-full lg:items-center lg:justify-center">
                <EmptyState />
              </Card>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
