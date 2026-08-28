'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sidebar } from '@/components/Sidebar'
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

// Plus d'état « fichier prêt » : la préparation enchaîne directement sur
// l'analyse, il n'existe aucun moment où un document attend un clic.
type Status = 'idle' | 'analyzing' | 'success' | 'error'

export default function DashboardPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [preparedDocument, setPreparedDocument] = useState<PreparedDocument | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [mode, setMode] = useState<AnalysisMode | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [activeElementId, setActiveElementId] = useState<string | null>(null)

  // Le document déposé lance l'analyse immédiatement : plus de clic
  // intermédiaire. Il est passé en argument à runAnalysis et non relu depuis
  // l'état — setPreparedDocument ne prend effet qu'au rendu suivant, et la
  // fonction lirait encore la valeur précédente, voire null au premier dépôt.
  function handlePrepared(doc: PreparedDocument) {
    setPreparedDocument(doc)
    setResult(null)
    setErrorMessage('')
    setActiveElementId(null)
    void runAnalysis(doc)
  }

  async function runAnalysis(doc: PreparedDocument) {
    setStatus('analyzing')
    setErrorMessage('')
    setActiveElementId(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages: doc.pages.map((page) => page.dataUrl) }),
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

  const demoBadge =
    mode === 'demo' ? (
      <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--color-brand)] bg-[var(--color-brand-soft)] px-3.5 py-1.5 text-xs font-semibold text-[#8c491a]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" aria-hidden="true" />
        Mode démonstration
      </span>
    ) : null

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="min-w-0 flex-1">
        {/* La barre latérale est masquée sous 1024 px : la marque revient donc
            dans l'en-tête pour que l'application reste identifiable. */}
        <div className="flex items-center gap-3 px-5 pt-5 lg:hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-sm font-bold text-[#f9f4ed]">
            D
          </div>
          <p className="font-display text-lg leading-none">DocShield AI</p>
        </div>

        <header className="flex flex-wrap items-start justify-between gap-4 px-5 py-6 sm:px-7">
          <div className="min-w-0">
            <h1 className="font-display text-2xl leading-tight sm:text-3xl">
              Analyse de document
            </h1>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Pré-contrôle d&apos;authenticité — score, anomalies localisées, recommandation.
            </p>
          </div>
          {demoBadge}
        </header>

        <main className="space-y-6 px-5 pb-10 sm:px-7">
          {/* Trois paliers : une colonne sous 768 px, résultats sur deux colonnes
              entre 768 et 1280, document et résultats côte à côte au-delà. */}
          <div className="grid gap-6 xl:grid-cols-5">
            <section className="xl:col-span-2">
              <Card accent="sand">
                <CardHeader accent="sand" title="Document à contrôler" />
                <div className="space-y-4 p-5">
                  <UploadZone onPrepared={handlePrepared} disabled={status === 'analyzing'} />
                  {preparedDocument ? (
                    <DocumentPreview
                      document={preparedDocument}
                      regions={result?.suspiciousRegions ?? []}
                      elements={result?.suspiciousElements ?? []}
                      activeElementId={activeElementId}
                      onHoverElement={setActiveElementId}
                    />
                  ) : null}
                  {/* Le bouton ne déclenche plus la première analyse, qui part
                      au dépôt. Il ne sert plus qu'à en relancer une, et
                      n'apparaît donc qu'une fois un document chargé. */}
                  {preparedDocument ? (
                    <Button
                      onClick={() => void runAnalysis(preparedDocument)}
                      disabled={status === 'analyzing'}
                    >
                      {status === 'analyzing' ? 'Analyse en cours…' : "Relancer l'analyse"}
                    </Button>
                  ) : null}
                </div>
              </Card>
            </section>

            <section className="xl:col-span-3">
              {status === 'analyzing' ? (
                <Card>
                  <LoadingState />
                </Card>
              ) : status === 'error' ? (
                <Card>
                  <ErrorState
                    message={errorMessage}
                    onRetry={() => {
                      if (preparedDocument) void runAnalysis(preparedDocument)
                    }}
                  />
                </Card>
              ) : status === 'success' && result ? (
                <div className="space-y-6">
                  <Card accent="forest">
                    <RiskScoreCard
                      score={result.riskScore}
                      level={result.riskLevel}
                      documentType={result.detectedDocumentType}
                    />
                  </Card>
                  <RecommendationBanner recommendation={result.recommendation} />
                  <div className="grid gap-6 md:grid-cols-2">
                    <ExtractedFields fields={result.extractedInformation} />
                    <SuspiciousElements
                      elements={result.suspiciousElements}
                      regions={result.suspiciousRegions}
                      activeElementId={activeElementId}
                      onHoverElement={setActiveElementId}
                    />
                  </div>
                  <AnalysisExplanation explanation={result.explanation} />
                </div>
              ) : (
                <Card>
                  <EmptyState />
                </Card>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
