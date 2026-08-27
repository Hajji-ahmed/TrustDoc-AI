import OpenAI from 'openai'
import { analysisResultSchema, ANALYSIS_JSON_SCHEMA } from '@/lib/schema'
import { ANALYSIS_SYSTEM_PROMPT } from '@/lib/prompt'
import type { AnalysisResult } from '@/lib/types'

const DEFAULT_MODEL = 'gpt-4o'

export class UpstreamError extends Error {}
export class ModelOutputError extends Error {}

export async function analyzeDocument(
  imageDataUrl: string,
  apiKey: string,
): Promise<AnalysisResult> {
  const client = new OpenAI({ apiKey })
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL

  let rawContent: string | null
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyse ce document et renvoie le résultat structuré attendu.',
            },
            { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'document_analysis',
          strict: true,
          schema: ANALYSIS_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    })

    rawContent = completion.choices[0]?.message?.content ?? null
  } catch (cause) {
    throw new UpstreamError(cause instanceof Error ? cause.message : 'appel OpenAI en échec')
  }

  if (!rawContent) {
    throw new ModelOutputError('réponse vide du modèle')
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawContent)
  } catch {
    throw new ModelOutputError('réponse du modèle non parsable en JSON')
  }

  const validated = analysisResultSchema.safeParse(parsedJson)
  if (!validated.success) {
    throw new ModelOutputError(JSON.stringify(validated.error.issues))
  }

  return validated.data
}
