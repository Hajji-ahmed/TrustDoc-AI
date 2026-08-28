import type { AnalysisMode, RiskLevel } from '@/lib/types'

// Forme des statistiques, sans aucune dépendance à Node : ce module est
// importable côté client. L'accès au fichier vit dans lib/stats.ts, qui reste
// strictement serveur.

export interface AnalysisRecord {
  at: string
  riskScore: number
  riskLevel: RiskLevel
  documentType: string
  mode: AnalysisMode
}

export interface Stats {
  totalAnalyses: number
  byLevel: Record<RiskLevel, number>
  byMode: Record<AnalysisMode, number>
  firstAnalysisAt: string | null
  lastAnalysisAt: string | null
  history: AnalysisRecord[]
}

export const EMPTY_STATS: Stats = {
  totalAnalyses: 0,
  byLevel: { LOW: 0, MEDIUM: 0, HIGH: 0 },
  byMode: { live: 0, demo: 0 },
  firstAnalysisAt: null,
  lastAnalysisAt: null,
  history: [],
}
