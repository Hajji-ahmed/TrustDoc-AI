import { z } from 'zod'
import type { AnalysisResult } from '@/lib/types'

const riskLevel = z.enum(['LOW', 'MEDIUM', 'HIGH'])

const suspiciousCategory = z.enum([
  'TYPOGRAPHIE',
  'MISE_EN_PAGE',
  'COHERENCE_DONNEES',
  'MANIPULATION_IMAGE',
  'ELEMENTS_SECURITE',
])

export const analysisResultSchema = z.object({
  riskScore: z.number().min(0).max(100),
  riskLevel,
  detectedDocumentType: z.string().min(1),
  extractedInformation: z.array(
    z.object({
      label: z.string().min(1),
      value: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  suspiciousElements: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      severity: riskLevel,
      category: suspiciousCategory,
    }),
  ),
  suspiciousRegions: z.array(
    z.object({
      elementId: z.string().min(1),
      page: z.number().int().min(1),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      label: z.string(),
    }),
  ),
  explanation: z.string().min(1),
  recommendation: z.object({
    action: z.enum(['ACCEPTER', 'VERIFICATION_MANUELLE', 'REJETER']),
    summary: z.string().min(1),
    nextSteps: z.array(z.string()),
  }),
}) satisfies z.ZodType<AnalysisResult>

export const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'riskScore',
    'riskLevel',
    'detectedDocumentType',
    'extractedInformation',
    'suspiciousElements',
    'suspiciousRegions',
    'explanation',
    'recommendation',
  ],
  properties: {
    riskScore: { type: 'integer', description: 'Score de risque global de 0 à 100.' },
    riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    detectedDocumentType: {
      type: 'string',
      description: 'Type de document identifié, en français. Exemple : "Relevé bancaire".',
    },
    extractedInformation: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value', 'confidence'],
        properties: {
          label: { type: 'string', description: 'Nom du champ, en français.' },
          value: { type: 'string' },
          confidence: { type: 'number', description: 'Confiance de lecture entre 0 et 1.' },
        },
      },
    },
    suspiciousElements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'description', 'severity', 'category'],
        properties: {
          id: { type: 'string', description: 'Identifiant unique, format "sus-1", "sus-2".' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          category: {
            type: 'string',
            enum: [
              'TYPOGRAPHIE',
              'MISE_EN_PAGE',
              'COHERENCE_DONNEES',
              'MANIPULATION_IMAGE',
              'ELEMENTS_SECURITE',
            ],
          },
        },
      },
    },
    suspiciousRegions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['elementId', 'page', 'x', 'y', 'width', 'height', 'label'],
        properties: {
          elementId: {
            type: 'string',
            description: 'Doit correspondre à un id présent dans suspiciousElements.',
          },
          page: {
            type: 'integer',
            description:
              'Numéro de la page portant la zone, à partir de 1, tel qu’annoncé avant chaque image. Les coordonnées sont relatives à cette page.',
          },
          x: { type: 'number', description: 'Coin gauche, normalisé entre 0 et 1.' },
          y: { type: 'number', description: 'Coin haut, normalisé entre 0 et 1.' },
          width: { type: 'number', description: 'Largeur normalisée entre 0 et 1.' },
          height: { type: 'number', description: 'Hauteur normalisée entre 0 et 1.' },
          label: { type: 'string', description: 'Libellé court affiché sur la zone.' },
        },
      },
    },
    explanation: { type: 'string' },
    recommendation: {
      type: 'object',
      additionalProperties: false,
      required: ['action', 'summary', 'nextSteps'],
      properties: {
        action: { type: 'string', enum: ['ACCEPTER', 'VERIFICATION_MANUELLE', 'REJETER'] },
        summary: { type: 'string' },
        nextSteps: { type: 'array', items: { type: 'string' } },
      },
    },
  },
} as const
