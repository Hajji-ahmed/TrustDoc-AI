import type { AnalysisResult } from '@/lib/types'

export function buildMockAnalysis(): AnalysisResult {
  return {
    riskScore: 74,
    riskLevel: 'HIGH',
    detectedDocumentType: 'Relevé bancaire mensuel',
    extractedInformation: [
      { label: 'Titulaire du compte', value: 'Karim El Mansouri', confidence: 0.97, page: 1 },
      {
        label: 'Numéro de compte',
        value: 'FR76 3000 4008 2800 0123 4567 890',
        confidence: 0.92, page: 1,
      },
      {
        label: 'Établissement',
        value: 'Banque Atlantique — Agence Casablanca Centre',
        confidence: 0.95, page: 1,
      },
      { label: 'Période', value: '01/03/2026 — 31/03/2026', confidence: 0.99, page: 1 },
      { label: 'Solde de clôture', value: '48 250,00 MAD', confidence: 0.71, page: 1 },
      { label: "Date d'émission", value: '02/04/2026', confidence: 0.88, page: 1 },
    ],
    suspiciousElements: [
      {
        id: 'sus-1',
        title: 'Solde de clôture recomposé',
        description:
          "Le montant du solde de clôture présente un rendu de police différent du reste du tableau : espacement irrégulier entre les chiffres et bords de caractères plus nets que sur les lignes voisines. Ce contraste est caractéristique d'un texte réinséré par-dessus le document d'origine.",
        severity: 'HIGH',
        category: 'MANIPULATION_IMAGE',
      },
      {
        id: 'sus-2',
        title: 'Alignement rompu dans la colonne des montants',
        description:
          "Les montants de trois opérations ne respectent pas l'alignement à droite appliqué au reste de la colonne, avec un décalage horizontal constant de quelques pixels.",
        severity: 'MEDIUM',
        category: 'MISE_EN_PAGE',
      },
      {
        id: 'sus-3',
        title: 'Somme des opérations incohérente avec le solde affiché',
        description:
          "Le cumul des crédits et débits listés ne correspond pas au solde de clôture indiqué : un écart de 12 400,00 MAD subsiste et ne s'explique par aucune ligne visible du relevé.",
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
        label: 'Solde de clôture',
      },
      {
        elementId: 'sus-2',
        page: 1,
        x: 0.58,
        y: 0.44,
        width: 0.3,
        height: 0.14,
        label: 'Colonne montants',
      },
    ],
    explanation:
      "Le document présente les caractéristiques générales d'un relevé bancaire authentique : structure, en-tête et mentions légales sont conformes au format attendu. Deux signaux convergent toutefois vers une altération du volet financier. D'une part, le bloc du solde de clôture ne partage pas les propriétés de rendu du reste du tableau, ce qui suggère une réinsertion de texte. D'autre part, le total affiché ne se déduit pas des opérations listées, avec un écart significatif. Pris isolément, chacun de ces indices resterait discutable ; leur conjonction sur le même champ constitue un faisceau cohérent.",
    recommendation: {
      action: 'REJETER',
      summary:
        "Ne pas retenir ce relevé comme justificatif de revenus en l'état. Les anomalies portent directement sur les montants, c'est-à-dire sur l'information que le document est censé prouver.",
      nextSteps: [
        "Demander un relevé original transmis directement par l'établissement bancaire.",
        'Vérifier le solde annoncé auprès de la banque émettrice si le dossier le justifie.',
        'Comparer les montants avec les autres justificatifs de revenus du dossier.',
        'Conserver une trace de ce contrôle dans le dossier client.',
      ],
    },
  }
}
