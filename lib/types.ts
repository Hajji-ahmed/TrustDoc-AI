export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type SuspiciousCategory =
  | 'TYPOGRAPHIE'
  | 'MISE_EN_PAGE'
  | 'COHERENCE_DONNEES'
  | 'MANIPULATION_IMAGE'
  | 'ELEMENTS_SECURITE'

export type RecommendedAction = 'ACCEPTER' | 'VERIFICATION_MANUELLE' | 'REJETER'

export interface ExtractedField {
  label: string
  value: string
  confidence: number
}

export interface SuspiciousElement {
  id: string
  title: string
  description: string
  severity: RiskLevel
  category: SuspiciousCategory
}

export interface SuspiciousRegion {
  elementId: string
  x: number
  y: number
  width: number
  height: number
  label: string
}

export interface Recommendation {
  action: RecommendedAction
  summary: string
  nextSteps: string[]
}

export interface AnalysisResult {
  riskScore: number
  riskLevel: RiskLevel
  detectedDocumentType: string
  extractedInformation: ExtractedField[]
  suspiciousElements: SuspiciousElement[]
  suspiciousRegions: SuspiciousRegion[]
  explanation: string
  recommendation: Recommendation
}

export type AnalysisMode = 'live' | 'demo'

export interface AnalyzeResponse {
  mode: AnalysisMode
  result: AnalysisResult
}

export type AnalyzeErrorCode = 'INVALID_REQUEST' | 'UPSTREAM_FAILURE' | 'INVALID_MODEL_OUTPUT'

export interface AnalyzeError {
  error: {
    code: AnalyzeErrorCode
    message: string
  }
}
