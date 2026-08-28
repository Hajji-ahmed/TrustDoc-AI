'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Sidebar } from '@/components/Sidebar'
import { StatsPanel } from '@/components/StatsPanel'
import { EMPTY_STATS, type Stats } from '@/lib/stats-shape'
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
  const [stats, setStats] = useState<Stats>(EMPTY_STATS)
  const [statsUnavailable, setStatsUnavailable] = useState(false)

  // Les compteurs viennent du serveur : au montage pour retrouver le cumul
  // existant, puis après chaque analyse pour refléter l'incrément.
  //
  // Un échec de lecture est signalé, jamais avalé : afficher « 0 » alors que
  // le service n'a pas répondu revient à affirmer qu'aucun document n'a été
  // analysé, ce qui est une information fausse et indiscernable de la vraie.
  const refreshStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats', { cache: 'no-store' })
      if (!response.ok) throw new Error(`réponse ${response.status}`)
      setStats((await response.json()) as Stats)
      setStatsUnavailable(false)
    } catch {
      setStatsUnavailable(true)
    }
  }, [])

  // Le retour sur l'onglet relance la lecture : une page restée ouverte
  // pendant un redémarrage du serveur se remet ainsi à jour d'elle-même,
  // sans rechargement manuel.
  useEffect(() => {
    void refreshStats()
    const onFocus = () => void refreshStats()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshStats])

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
        body: JSON.stringify({ pages: preparedDocument.pages.map((page) => page.dataUrl) }),
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
      void refreshStats()
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
          <StatsPanel
            stats={stats}
            unavailable={statsUnavailable}
            onRetry={() => void refreshStats()}
          />

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
                  <Button
                    onClick={() => void runAnalysis()}
                    disabled={!preparedDocument || status === 'analyzing'}
                  >
                    {status === 'analyzing' ? 'Analyse en cours…' : 'Analyser le document'}
                  </Button>
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
                  <ErrorState message={errorMessage} onRetry={() => void runAnalysis()} />
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
