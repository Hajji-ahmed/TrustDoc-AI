import type { AnalysisResult } from '@/lib/types'

export function buildMockAnalysis(): AnalysisResult {
  return {
    riskScore: 74,
    riskLevel: 'HIGH',
    detectedDocumentType: 'Monthly bank statement',
    extractedInformation: [
      { label: 'Account holder', value: 'Karim El Mansouri', confidence: 0.97, page: 1 },
      {
        label: 'Bank account number',
        value: 'FR76 3000 4008 2800 0123 4567 890',
        confidence: 0.92, page: 1,
      },
      {
        label: 'Institution',
        value: 'Banque Atlantique — Casablanca Centre branch',
        confidence: 0.95, page: 1,
      },
      { label: 'Period covered', value: '01/03/2026 — 31/03/2026', confidence: 0.99, page: 1 },
      { label: 'Closing balance', value: '48,250.00 MAD', confidence: 0.71, page: 1 },
      { label: 'Issue date', value: '02/04/2026', confidence: 0.88, page: 1 },
    ],
    suspiciousElements: [
      {
        id: 'sus-1',
        title: 'Closing balance recomposed',
        description:
          'The closing balance is rendered in a typeface that differs from the rest of the table: irregular spacing between digits and character edges sharper than on neighbouring lines. This contrast is characteristic of text re-inserted over the original document.',
        severity: 'HIGH',
        category: 'MANIPULATION_IMAGE',
      },
      {
        id: 'sus-2',
        title: 'Broken alignment in the amounts column',
        description:
          'The amounts of three transactions do not follow the right alignment applied to the rest of the column, with a constant horizontal offset of a few pixels.',
        severity: 'MEDIUM',
        category: 'MISE_EN_PAGE',
      },
      {
        id: 'sus-3',
        title: 'Sum of transactions inconsistent with the stated balance',
        description:
          'The total of the listed credits and debits does not match the stated closing balance: a gap of 12,400.00 MAD remains and is explained by no visible line of the statement.',
        severity: 'HIGH',
        category: 'COHERENCE_DONNEES',
      },
    ],
    suspiciousRegions: [
      {
        elementId: 'sus-1',
        page: 1,
        x: 0.61,
        y: 0.72,
        width: 0.27,
        height: 0.06,
        label: 'Closing balance',
      },
      {
        elementId: 'sus-2',
        page: 1,
        x: 0.58,
        y: 0.44,
        width: 0.3,
        height: 0.14,
        label: 'Amounts column',
      },
    ],
    explanation:
      'The document shows the general characteristics of a genuine bank statement: structure, header and legal notices match the expected format. Two signals nonetheless converge on an alteration of the financial section. First, the closing balance block does not share the rendering properties of the rest of the table, which suggests re-inserted text. Second, the stated total cannot be derived from the listed transactions, with a significant gap. Taken alone, each of these indications would remain debatable; their conjunction on the same field forms a coherent body of evidence.',
    recommendation: {
      action: 'REJETER',
      summary:
        'Do not accept this statement as proof of income as it stands. The anomalies bear directly on the amounts, that is, on the very information the document is meant to prove.',
      nextSteps: [
        'Request an original statement sent directly by the banking institution.',
        'Verify the stated balance with the issuing bank if the file warrants it.',
        'Compare the amounts against the other proofs of income in the file.',
        'Keep a record of this check in the client file.',
      ],
    },
  }
}
