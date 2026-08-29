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
      page: z.number().int().min(1),
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
    riskScore: { type: 'integer', description: 'Overall risk score from 0 to 100.' },
    riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    detectedDocumentType: {
      type: 'string',
      description: 'Identified document type, in English. Example: "Bank statement".',
    },
    extractedInformation: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value', 'confidence', 'page'],
        properties: {
          label: { type: 'string', description: 'Field name, in English.' },
          value: { type: 'string' },
          confidence: { type: 'number', description: 'Reading confidence between 0 and 1.' },
          page: {
            type: 'integer',
            description:
              'Number of the page the field is read on, starting at 1, as announced before each image.',
          },
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
          id: { type: 'string', description: 'Unique identifier, format "sus-1", "sus-2".' },
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
            description: 'Must match an id present in suspiciousElements.',
          },
          page: {
            type: 'integer',
            description:
              'Number of the page carrying the region, starting at 1, as announced before each image. Coordinates are relative to that page.',
          },
          x: { type: 'number', description: 'Left edge, normalised between 0 and 1.' },
          y: { type: 'number', description: 'Top edge, normalised between 0 and 1.' },
          width: { type: 'number', description: 'Width, normalised between 0 and 1.' },
          height: { type: 'number', description: 'Height, normalised between 0 and 1.' },
          label: { type: 'string', description: 'Short label shown on the region.' },
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
