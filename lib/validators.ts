import { riskLevelFromScore } from '@/lib/risk'
import type { AnalysisResult, ExtractedField, SuspiciousElement } from '@/lib/types'

/**
 * Contrôles déterministes appliqués aux champs extraits par le modèle.
 *
 * Le modèle de vision sait lire un document et repérer une manipulation
 * visuelle. Il ne sait pas compter des chiffres ni vérifier une clé de
 * contrôle de façon fiable — c'est le rôle de ce module. Chaque fonction ici
 * est pure et son résultat est vérifiable : aucune interprétation.
 *
 * Toutes les anomalies produites sont de sévérité MEDIUM et formulées comme
 * des points à vérifier, jamais comme des accusations : une erreur de lecture
 * du modèle produirait le même symptôme qu'une vraie falsification.
 */

// ---------------------------------------------------------------- utilitaires

function normalize(label: string): string {
  // \p{Diacritic} évite d'écrire une plage de caractères combinants en dur
  // dans le source : « Numéro » et « numero » doivent matcher pareil.
  return label.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function findFields(fields: ExtractedField[], pattern: RegExp): ExtractedField[] {
  return fields.filter((field) => pattern.test(normalize(field.label)))
}

function findField(fields: ExtractedField[], pattern: RegExp): ExtractedField | undefined {
  return findFields(fields, pattern)[0]
}

/**
 * Lit un montant écrit à la française ou à l'anglaise.
 * « 26 150,00 MAD » → 26150   « 1,234.56 » → 1234.56   « 31380 » → 31380
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '')
  if (!/\d/.test(cleaned)) return null

  const lastSeparator = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'))
  let normalized: string

  if (lastSeparator === -1) {
    normalized = cleaned
  } else {
    const decimals = cleaned.length - lastSeparator - 1
    // Un séparateur suivi de 1 ou 2 chiffres est décimal ; sinon c'est un
    // séparateur de milliers (« 26.150 » vaut 26150, pas 26,15).
    normalized =
      decimals >= 1 && decimals <= 2
        ? `${cleaned.slice(0, lastSeparator).replace(/[.,]/g, '')}.${cleaned.slice(
            lastSeparator + 1,
          )}`
        : cleaned.replace(/[.,]/g, '')
  }

  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

/** Lit une date au format jj/mm/aaaa ou aaaa-mm-jj. */
export function parseDate(raw: string): Date | null {
  const ymd = raw.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
  }

  const dmy = raw.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
  }

  return null
}

/**
 * Clé de contrôle IBAN (norme ISO 13616, mod-97).
 * Algorithme international, identique pour tous les pays.
 */
export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/[\s-]/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false

  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let remainder = 0
  for (const character of rearranged) {
    const digits = /\d/.test(character)
      ? character
      : String(character.charCodeAt(0) - 55) // A=10 … Z=35
    for (const digit of digits) {
      remainder = (remainder * 10 + Number(digit)) % 97
    }
  }

  return remainder === 1
}

/** Un ICE marocain comporte exactement 15 chiffres. */
export function isValidIce(raw: string): boolean {
  return /^\d{15}$/.test(raw.replace(/\D/g, ''))
}

// ------------------------------------------------------------------ contrôles

function checkIce(fields: ExtractedField[]): SuspiciousElement[] {
  return findFields(fields, /\bice\b/)
    .filter((field) => /\d/.test(field.value))
    .filter((field) => !isValidIce(field.value))
    .map((field, index) => {
      const digits = field.value.replace(/\D/g, '').length
      return {
        id: `check-ice-${index + 1}`,
        title: `Identifiant ICE non conforme — ${field.label}`,
        description:
          `Un ICE marocain comporte exactement 15 chiffres. La valeur lue « ${field.value} » ` +
          `en contient ${digits}. À vérifier auprès de l'émetteur : il peut s'agir d'un ` +
          `identifiant invalide comme d'une erreur de lecture du document.`,
        severity: 'MEDIUM' as const,
        category: 'COHERENCE_DONNEES' as const,
      }
    })
}

function checkVatArithmetic(fields: ExtractedField[]): SuspiciousElement[] {
  const ht = findField(fields, /total\s*ht|montant\s*ht|base\s*(hors\s*taxe|ht)/)
  const vat = findField(fields, /\btva\b|taxe\s*sur\s*la\s*valeur/)
  const ttc = findField(fields, /total\s*ttc|montant\s*ttc|total\s*a\s*payer|net\s*a\s*payer/)

  if (!ht || !vat || !ttc) return []

  const htValue = parseAmount(ht.value)
  const vatValue = parseAmount(vat.value)
  const ttcValue = parseAmount(ttc.value)
  if (htValue === null || vatValue === null || ttcValue === null) return []

  const expected = htValue + vatValue
  const gap = Math.abs(expected - ttcValue)
  if (gap <= 0.05) return []

  return [
    {
      id: 'check-tva-1',
      title: 'Total TTC incohérent avec le HT et la TVA',
      description:
        `${htValue.toLocaleString('fr-FR')} (HT) + ${vatValue.toLocaleString('fr-FR')} (TVA) ` +
        `donne ${expected.toLocaleString('fr-FR')}, alors que le total indiqué est ` +
        `${ttcValue.toLocaleString('fr-FR')}. Écart de ${gap.toLocaleString('fr-FR')}. ` +
        `Vérifier les trois montants sur le document.`,
      severity: 'MEDIUM' as const,
      category: 'COHERENCE_DONNEES' as const,
    },
  ]
}

function checkDates(fields: ExtractedField[]): SuspiciousElement[] {
  const issued = findField(fields, /date.*(factur|emission|edition)|date\s*du\s*document/)
  const due = findField(fields, /echeance|date\s*limite|date\s*de\s*paiement/)

  if (!issued || !due) return []

  const issuedDate = parseDate(issued.value)
  const dueDate = parseDate(due.value)
  if (!issuedDate || !dueDate) return []
  if (dueDate.getTime() >= issuedDate.getTime()) return []

  return [
    {
      id: 'check-dates-1',
      title: "Date d'échéance antérieure à la date d'émission",
      description:
        `Le document est daté du ${issued.value} et porte une échéance au ${due.value}, ` +
        `soit une échéance antérieure à son émission. Cette combinaison est impossible ` +
        `sur un document authentique.`,
      severity: 'MEDIUM' as const,
      category: 'COHERENCE_DONNEES' as const,
    },
  ]
}

function looksLikeIban(value: string): boolean {
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value.replace(/[\s-]/g, '').toUpperCase())
}

/**
 * Le contrôle IBAN exige deux conditions : un libellé qui annonce des
 * coordonnées bancaires, et une valeur qui en a la forme.
 *
 * La forme seule ne suffit pas. « 2 lettres, 2 chiffres, puis 11 à 30
 * caractères » décrit aussi bien un IBAN qu'un numéro de certificat ou de
 * référence : le contrôle mod-97 échouait alors sur des documents
 * parfaitement authentiques, et le plancher de score plus bas transformait
 * ce faux positif en « risque modéré ».
 *
 * Le compromis est assumé : un IBAN rangé sous un libellé qui ne le dit pas
 * échappe désormais au contrôle. Sur un outil de pré-contrôle, accuser à tort
 * un vrai document coûte plus cher que laisser passer une vérification.
 */
const BANK_ACCOUNT_LABEL = /\biban\b|\brib\b|bancaire|\bbanque\b|\bcompte\b/

function checkIban(fields: ExtractedField[]): SuspiciousElement[] {
  return findFields(fields, BANK_ACCOUNT_LABEL)
    .filter((field) => looksLikeIban(field.value))
    .filter((field) => !isValidIban(field.value))
    .map((field, index) => ({
      id: `check-iban-${index + 1}`,
      title: `Clé de contrôle IBAN invalide — ${field.label}`,
      description:
        `La valeur lue « ${field.value} » ne satisfait pas la clé de contrôle mod-97 de la ` +
        `norme IBAN. Un IBAN authentique la vérifie toujours. À confronter au document : ` +
        `un seul chiffre mal lu suffit à faire échouer ce contrôle.`,
      severity: 'MEDIUM' as const,
      category: 'COHERENCE_DONNEES' as const,
    }))
}

/** Lance tous les contrôles sur les champs extraits. */
export function runDeterministicChecks(fields: ExtractedField[]): SuspiciousElement[] {
  return [
    ...checkIce(fields),
    ...checkVatArithmetic(fields),
    ...checkDates(fields),
    ...checkIban(fields),
  ]
}

// ------------------------------------------------------------- consolidation

/**
 * Le texte d'analyse doit dire la même chose que le compteur d'anomalies.
 *
 * Le modèle rédige son explication avant que les contrôles déterministes ne
 * tournent : il peut donc écrire « aucun problème » pendant que ces contrôles
 * ajoutent une anomalie à la liste. Attribuer chaque constat à son étape lève
 * la contradiction sans réécrire la prose du modèle — les deux affirmations
 * sont vraies, elles ne portent simplement pas sur la même chose.
 */
function summarizeChecks(findings: SuspiciousElement[]): string {
  if (findings.length === 0) {
    return (
      'Contrôles automatiques : aucun écart relevé sur les champs vérifiables ' +
      '(identifiant ICE, clé IBAN, arithmétique HT/TVA/TTC, ordre des dates).'
    )
  }

  const count = `${findings.length} point${findings.length > 1 ? 's' : ''} à vérifier`
  return `Contrôles automatiques : ${count} — ${findings.map((f) => f.title).join(' ; ')}.`
}

/**
 * Applique les contrôles déterministes au résultat du modèle, puis remet en
 * cohérence le score, le niveau, la recommandation et le texte d'analyse.
 *
 * Trois incohérences sont corrigées ici :
 * - un contrôle mathématique en échec ne peut pas cohabiter avec un score bas ;
 * - une recommandation ne peut pas contredire le score qui l'accompagne ;
 * - le texte d'analyse ne peut pas contredire la liste des anomalies.
 */
export function consolidateAnalysis(result: AnalysisResult): AnalysisResult {
  const findings = runDeterministicChecks(result.extractedInformation)

  let riskScore = result.riskScore
  let recommendation = result.recommendation

  if (findings.length > 0) {
    // Un contrôle en échec impose un plancher : « risque faible » devient
    // impossible dès qu'une vérification objective échoue.
    riskScore = Math.max(riskScore, findings.length >= 2 ? 70 : 50)

    if (recommendation.action === 'ACCEPTER') {
      recommendation = { ...recommendation, action: 'VERIFICATION_MANUELLE' }
    }

    recommendation = {
      ...recommendation,
      nextSteps: [
        ...recommendation.nextSteps,
        'Confronter au document original les points relevés par les contrôles automatiques.',
      ],
    }
  }

  // Le verdict qualitatif du modèle prime sur son propre chiffre : s'il
  // recommande le rejet, le score est remonté au niveau correspondant plutôt
  // que d'afficher « risque faible » à côté de « document à rejeter ».
  if (recommendation.action === 'REJETER') {
    riskScore = Math.max(riskScore, 67)
  } else if (recommendation.action === 'VERIFICATION_MANUELLE') {
    riskScore = Math.max(riskScore, 34)
  }

  return {
    ...result,
    riskScore,
    riskLevel: riskLevelFromScore(riskScore),
    suspiciousElements: [...result.suspiciousElements, ...findings],
    explanation: `Analyse visuelle : ${result.explanation.trim()}\n\n${summarizeChecks(findings)}`,
    recommendation,
  }
}
