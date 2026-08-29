import { NextResponse } from 'next/server'
import { analysisResultSchema } from '@/lib/schema'
import { buildMockAnalysis } from '@/lib/mock'
import { analyzeDocument, ModelOutputError } from '@/lib/openai'
import { consolidateAnalysis } from '@/lib/validators'
import { MAX_ANALYZED_PAGES } from '@/lib/pdf'
import type {
  AnalysisMode,
  AnalysisResult,
  AnalyzeError,
  AnalyzeErrorCode,
  AnalyzeResponse,
} from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const DEMO_DELAY_MS = 1500

function errorResponse(code: AnalyzeErrorCode, message: string, status: number) {
  const body: AnalyzeError = { error: { code, message } }
  return NextResponse.json(body, { status })
}

function respondWithResult(result: AnalysisResult, mode: AnalysisMode) {
  const body: AnalyzeResponse = { mode, result }
  return NextResponse.json(body)
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse('INVALID_REQUEST', 'The request could not be read.', 400)
  }

  const pages = (payload as { pages?: unknown })?.pages
  const isImageDataUrl = (page: unknown) =>
    typeof page === 'string' && page.startsWith('data:image/')

  if (!Array.isArray(pages) || pages.length === 0 || !pages.every(isImageDataUrl)) {
    return errorResponse(
      'INVALID_REQUEST',
      'No usable document image was received.',
      400,
    )
  }

  // Le plafond est déjà appliqué au rendu ; on le revérifie ici parce que la
  // route est atteignable sans passer par l'interface.
  if (pages.length > MAX_ANALYZED_PAGES) {
    return errorResponse(
      'INVALID_REQUEST',
      `An analysis covers at most ${MAX_ANALYZED_PAGES} pages.`,
      400,
    )
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    await new Promise((resolve) => setTimeout(resolve, DEMO_DELAY_MS))
    const parsed = analysisResultSchema.safeParse(buildMockAnalysis())
    if (!parsed.success) {
      console.error('[analyze] jeu de démonstration invalide', parsed.error.issues)
      return errorResponse('INVALID_MODEL_OUTPUT', 'The demo data set is invalid.', 500)
    }
    return respondWithResult(consolidateAnalysis(parsed.data), 'demo')
  }

  try {
    const result = await analyzeDocument(pages, apiKey)
    return respondWithResult(consolidateAnalysis(result), 'live')
  } catch (cause) {
    if (cause instanceof ModelOutputError) {
      console.error('[analyze] sortie du modèle invalide :', cause.message)
      return errorResponse(
        'INVALID_MODEL_OUTPUT',
        'The analysis produced is not usable. Run the document analysis again.',
        502,
      )
    }

    console.error("[analyze] échec de l'appel au fournisseur :", cause)
    return errorResponse(
      'UPSTREAM_FAILURE',
      'The analysis service is temporarily unavailable. Try again shortly.',
      502,
    )
  }
}
