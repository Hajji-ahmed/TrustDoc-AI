import OpenAI from 'openai'
import { analysisResultSchema, ANALYSIS_JSON_SCHEMA } from '@/lib/schema'
import { ANALYSIS_SYSTEM_PROMPT } from '@/lib/prompt'
import type { AnalysisResult } from '@/lib/types'

const DEFAULT_MODEL = 'gpt-4o'

export class UpstreamError extends Error {}
export class ModelOutputError extends Error {}

export async function analyzeDocument(
  pageDataUrls: string[],
  apiKey: string,
): Promise<AnalysisResult> {
  const client = new OpenAI({ apiKey })
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL

  // Toutes les pages partent dans un seul message : c'est ce qui permet au
  // modèle de confronter les pages entre elles. Chaque image est précédée de
  // son numéro, sur lequel s'appuie le champ page des zones suspectes.
  const intro =
    pageDataUrls.length > 1
      ? `Analyse this ${pageDataUrls.length}-page document and return the expected structured result. The pages are given below in order and form one single document.`
      : 'Analyse this document and return the expected structured result.'

  let rawContent: string | null
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text' as const, text: intro },
            ...pageDataUrls.flatMap((dataUrl, index) => [
              {
                type: 'text' as const,
                text: `Page ${index + 1} sur ${pageDataUrls.length} :`,
              },
              {
                type: 'image_url' as const,
                image_url: { url: dataUrl, detail: 'high' as const },
              },
            ]),
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
