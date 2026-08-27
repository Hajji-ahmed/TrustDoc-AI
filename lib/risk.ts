export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

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
