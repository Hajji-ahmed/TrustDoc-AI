import type { RiskLevel, SuspiciousElement, SuspiciousRegion } from '@/lib/types'

export type { RiskLevel }

export const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: 'Risque faible',
  MEDIUM: 'Risque modéré',
  HIGH: 'Risque élevé',
}

export const RISK_STYLES: Record<
  RiskLevel,
  { text: string; bg: string; border: string; stroke: string; dot: string }
> = {
  LOW: {
    text: 'text-[var(--color-risk-low)]',
    bg: 'bg-[var(--color-risk-low-soft)]',
    border: 'border-[var(--color-risk-low)]',
    stroke: 'var(--color-risk-low)',
    dot: 'bg-[var(--color-risk-low)]',
  },
  MEDIUM: {
    text: 'text-[var(--color-risk-medium)]',
    bg: 'bg-[var(--color-risk-medium-soft)]',
    border: 'border-[var(--color-risk-medium)]',
    stroke: 'var(--color-risk-medium)',
    dot: 'bg-[var(--color-risk-medium)]',
  },
  HIGH: {
    text: 'text-[var(--color-risk-high)]',
    bg: 'bg-[var(--color-risk-high-soft)]',
    border: 'border-[var(--color-risk-high)]',
    stroke: 'var(--color-risk-high)',
    dot: 'bg-[var(--color-risk-high)]',
  },
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score <= 33) return 'LOW'
  if (score <= 66) return 'MEDIUM'
  return 'HIGH'
}

// Sévérité d'une anomalie. Distinct de RISK_LABELS, qui qualifie le document
// entier : un document peut être « à risque faible », mais une anomalie déjà
// signalée n'est jamais « faible risque » — elle est de faible sévérité.
export const SEVERITY_LABELS: Record<RiskLevel, string> = {
  LOW: 'Sévérité faible',
  MEDIUM: 'Sévérité modérée',
  HIGH: 'Sévérité élevée',
}

// Couleur du badge d'une anomalie. Jamais de vert, pour la même raison que
// sur le document : une anomalie listée est un signal, pas une validation.
export function severityBadgeLevel(severity: RiskLevel): RiskLevel {
  return severity === 'HIGH' ? 'HIGH' : 'MEDIUM'
}

// Couleur d'une zone encadrée sur le document. Jamais de vert : une boîte
// tracée sur un document signale toujours « regardez ici », et le vert
// dirait l'inverse. La sévérité module l'intensité, pas le sens.
export function overlayStroke(severity: RiskLevel): string {
  return severity === 'HIGH' ? 'var(--color-risk-high)' : 'var(--color-risk-medium)'
}

// Numérotation partagée entre les boîtes du document et la liste des
// anomalies. Les deux composants appellent cette fonction avec les mêmes
// entrées, ce qui garantit que le numéro 2 désigne la même chose des deux
// côtés. Les régions orphelines sont exclues avant numérotation.
export function regionNumbers(
  regions: SuspiciousRegion[],
  elements: SuspiciousElement[],
): Map<string, number> {
  const known = new Set(elements.map((element) => element.id))
  const numbers = new Map<string, number>()
  regions
    .filter((region) => known.has(region.elementId))
    .forEach((region) => {
      if (!numbers.has(region.elementId)) {
        numbers.set(region.elementId, numbers.size + 1)
      }
    })
  return numbers
}

// Les coordonnées renvoyées par un modèle vision sortent parfois des bornes.
// On les ramène dans [0, 1] plutôt que de rejeter l'analyse entière.
export function clampRegion(region: SuspiciousRegion): SuspiciousRegion {
  const x = Math.min(1, Math.max(0, region.x))
  const y = Math.min(1, Math.max(0, region.y))
  return {
    ...region,
    x,
    y,
    width: Math.min(1 - x, Math.max(0.01, region.width)),
    height: Math.min(1 - y, Math.max(0.01, region.height)),
  }
}
