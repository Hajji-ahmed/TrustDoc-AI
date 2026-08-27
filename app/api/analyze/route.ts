import { NextResponse } from 'next/server'
import { analysisResultSchema } from '@/lib/schema'
import { buildMockAnalysis } from '@/lib/mock'
import { analyzeDocument, ModelOutputError } from '@/lib/openai'
import type { AnalyzeError, AnalyzeErrorCode, AnalyzeResponse } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const DEMO_DELAY_MS = 1500

function errorResponse(code: AnalyzeErrorCode, message: string, status: number) {
  const body: AnalyzeError = { error: { code, message } }
  return NextResponse.json(body, { status })
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse('INVALID_REQUEST', 'La requête envoyée est illisible.', 400)
  }

  const imageDataUrl = (payload as { imageDataUrl?: unknown })?.imageDataUrl
  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    return errorResponse(
      'INVALID_REQUEST',
      "Aucune image de document exploitable n'a été reçue.",
      400,
    )
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    await new Promise((resolve) => setTimeout(resolve, DEMO_DELAY_MS))
    const parsed = analysisResultSchema.safeParse(buildMockAnalysis())
    if (!parsed.success) {
      console.error('[analyze] jeu de démonstration invalide', parsed.error.issues)
      return errorResponse('INVALID_MODEL_OUTPUT', 'Le jeu de démonstration est invalide.', 500)
    }
    const body: AnalyzeResponse = { mode: 'demo', result: parsed.data }
    return NextResponse.json(body)
  }

  try {
    const result = await analyzeDocument(imageDataUrl, apiKey)
    const body: AnalyzeResponse = { mode: 'live', result }
    return NextResponse.json(body)
  } catch (cause) {
    if (cause instanceof ModelOutputError) {
      console.error('[analyze] sortie du modèle invalide :', cause.message)
      return errorResponse(
        'INVALID_MODEL_OUTPUT',
        "L'analyse produite n'est pas exploitable. Relancez l'analyse du document.",
        502,
      )
    }

    console.error("[analyze] échec de l'appel au fournisseur :", cause)
    return errorResponse(
      'UPSTREAM_FAILURE',
      "Le service d'analyse est momentanément indisponible. Réessayez dans quelques instants.",
      502,
    )
  }
}
