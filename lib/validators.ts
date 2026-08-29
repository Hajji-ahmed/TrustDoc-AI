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
 * Les anomalies sont toujours formulées comme des points à vérifier, jamais
 * comme des accusations. Elles se répartissent en deux natures, déclarées une
 * seule fois dans le registre CHECKS en bas de fichier :
 *
 * - « fait » : un constat de calendrier ou d'arithmétique qu'un document
 *   authentique ne peut pas porter — une période qui finit avant de commencer,
 *   un 31 février, une somme qui ne tombe pas juste. Sévérité haute, et le
 *   score plancher correspondant.
 * - « forme » : un format ou une clé de contrôle qui échoue. Un chiffre mal lu
 *   produit exactement le même symptôme, donc sévérité modérée et plancher
 *   plus bas. C'est de cette catégorie qu'est venu le faux positif sur un vrai
 *   certificat ISO.
 */

type FindingKind = 'fact' | 'format'

/** Ce qu'un contrôle produit : la sévérité est décidée par le registre. */
type RawFinding = Omit<SuspiciousElement, 'severity'>

interface Finding {
  element: SuspiciousElement
  kind: FindingKind
}

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

const MONTHS: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
}

// Trois écritures rencontrées sur les documents : aaaa-mm-jj, jj/mm/aaaa, et la
// forme littérale « 1er janvier 2026 », courante sur les pièces administratives.
const DATE_FORMS = new RegExp(
  '(\\d{4})[-/.](\\d{1,2})[-/.](\\d{1,2})' +
    '|(\\d{1,2})[-/.](\\d{1,2})[-/.](\\d{4})' +
    `|(\\d{1,2})\\s*(?:er)?\\s+(${Object.keys(MONTHS).join('|')})\\s+(\\d{4})`,
  'g',
)

interface DateParts {
  year: number
  month: number
  day: number
}

function readDateParts(raw: string): DateParts[] {
  const text = normalize(raw)
  const found: DateParts[] = []
  DATE_FORMS.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = DATE_FORMS.exec(text)) !== null) {
    if (match[1]) {
      found.push({ year: +match[1], month: +match[2], day: +match[3] })
    } else if (match[4]) {
      found.push({ year: +match[6], month: +match[5], day: +match[4] })
    } else {
      found.push({ year: +match[9], month: MONTHS[match[8]], day: +match[7] })
    }
  }

  return found
}

/**
 * Construit la date, ou null si elle n'existe pas.
 *
 * new Date(2026, 1, 31) ne lève pas : il renvoie le 2 mars. Sans cette
 * relecture, un « 31 février » — l'un des indices de falsification les plus
 * simples à repérer — serait normalisé en date valide avant d'atteindre le
 * moindre contrôle.
 */
function toDate(parts: DateParts): Date | null {
  const date = new Date(parts.year, parts.month - 1, parts.day)
  const faithful =
    date.getFullYear() === parts.year &&
    date.getMonth() === parts.month - 1 &&
    date.getDate() === parts.day
  return faithful ? date : null
}

/** Toutes les dates lisibles d'une valeur, dans leur ordre d'apparition. */
export function parseDates(raw: string): Date[] {
  return readDateParts(raw)
    .map(toDate)
    .filter((date): date is Date => date !== null)
}

/** Première date lisible de la valeur, ou null. */
export function parseDate(raw: string): Date | null {
  return parseDates(raw)[0] ?? null
}

/** La valeur porte une date d'apparence normale qui ne correspond à aucun jour. */
export function hasImpossibleDate(raw: string): boolean {
  const parts = readDateParts(raw)
  return parts.length > 0 && parts.some((part) => toDate(part) === null)
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

function checkIce(fields: ExtractedField[]): RawFinding[] {
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
        category: 'COHERENCE_DONNEES' as const,
      }
    })
}

function checkVatArithmetic(fields: ExtractedField[]): RawFinding[] {
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
      category: 'COHERENCE_DONNEES' as const,
    },
  ]
}

// Libellés portant une information de temps. Comme pour l'IBAN, les contrôles
// de date ne se déclenchent que si le libellé l'annonce : une référence de
// dossier peut avoir la silhouette d'une date sans en être une.
const DATE_LABEL = /\bdate\b|echeance|validite|expiration|emission|delivrance|periode/
const ISSUE_LABEL = /date.*(emission|delivrance|edition|factur)|date\s*du\s*document/
const VALIDITY_LABEL = /validite|expiration|\bvalable\b/

const DAY_MS = 24 * 60 * 60 * 1000

function checkImpossibleDates(fields: ExtractedField[]): RawFinding[] {
  return findFields(fields, DATE_LABEL)
    .filter((field) => hasImpossibleDate(field.value))
    .map((field, index) => ({
      id: `check-impossible-date-${index + 1}`,
      title: `Date inexistante — ${field.label}`,
      description:
        `La valeur lue « ${field.value} » ne correspond à aucun jour du calendrier. ` +
        `Un document authentique ne porte pas une telle date. À confronter au ` +
        `document : un chiffre mal lu produirait le même symptôme.`,
      category: 'COHERENCE_DONNEES' as const,
    }))
}

/** Une période dont la fin précède le début ne peut pas exister. */
function checkPeriodOrder(fields: ExtractedField[]): RawFinding[] {
  return findFields(fields, DATE_LABEL)
    .map((field) => ({ field, dates: parseDates(field.value) }))
    .filter(({ dates }) => dates.length >= 2)
    .filter(({ dates }) => dates[0].getTime() > dates[dates.length - 1].getTime())
    .map(({ field }, index) => ({
      id: `check-period-${index + 1}`,
      title: `Période qui se termine avant de commencer — ${field.label}`,
      description:
        `La valeur lue « ${field.value} » décrit une période dont la fin précède ` +
        `le début. Cette combinaison est impossible sur un document authentique. ` +
        `Vérifier les deux dates sur le document.`,
      category: 'COHERENCE_DONNEES' as const,
    }))
}

/** Un document ne peut pas cesser d'être valable avant d'avoir été émis. */
function checkValidityBeforeIssue(fields: ExtractedField[]): RawFinding[] {
  const issued = findField(fields, ISSUE_LABEL)
  const validity = findField(fields, VALIDITY_LABEL)
  if (!issued || !validity) return []

  const issuedDate = parseDate(issued.value)
  // La fin de validité est la dernière date du champ : « du X au Y » comme
  // « jusqu'au Y » désignent tous deux Y.
  const validityDates = parseDates(validity.value)
  const validityEnd = validityDates[validityDates.length - 1]
  if (!issuedDate || !validityEnd) return []
  if (validityEnd.getTime() >= issuedDate.getTime()) return []

  return [
    {
      id: 'check-validity-1',
      title: 'Validité expirée avant la date d’émission',
      description:
        `Le document est daté du ${issued.value} et annonce une validité ` +
        `« ${validity.value} », soit une expiration antérieure à sa propre émission. ` +
        `Vérifier les deux champs sur le document.`,
      category: 'COHERENCE_DONNEES' as const,
    },
  ]
}

/** Un document daté du futur n'a pas pu être émis. */
function checkFutureIssue(fields: ExtractedField[], now: Date): RawFinding[] {
  const issued = findField(fields, ISSUE_LABEL)
  if (!issued) return []

  const issuedDate = parseDate(issued.value)
  if (!issuedDate) return []
  // Un jour de tolérance : fuseaux horaires et horloges décalées ne doivent pas
  // suffire à faire signaler un document émis le jour même.
  if (issuedDate.getTime() <= now.getTime() + DAY_MS) return []

  return [
    {
      id: 'check-future-1',
      title: 'Date d’émission postérieure à aujourd’hui',
      description:
        `Le document annonce une émission au ${issued.value}, soit une date à venir. ` +
        `Un document ne peut pas avoir été émis dans le futur. Vérifier la date sur ` +
        `le document.`,
      category: 'COHERENCE_DONNEES' as const,
    },
  ]
}

// Taux de TVA en vigueur au Maroc, plus l'exonération. Le contrôle
// arithmétique voisin valide HT + TVA = TTC : une facture affichant 17,3 % de
// TVA le passe sans broncher tant que la somme tombe juste. Le taux, lui, ne
// s'invente pas.
const LEGAL_VAT_RATES = [0, 7, 10, 14, 20]
const VAT_RATE_TOLERANCE = 0.5

function checkVatRate(fields: ExtractedField[]): RawFinding[] {
  const ht = findField(fields, /total\s*ht|montant\s*ht|base\s*(hors\s*taxe|ht)/)
  const vat = findField(fields, /\btva\b|taxe\s*sur\s*la\s*valeur/)
  if (!ht || !vat) return []

  const htValue = parseAmount(ht.value)
  const vatValue = parseAmount(vat.value)
  if (htValue === null || vatValue === null || htValue <= 0) return []

  const rate = (vatValue / htValue) * 100
  if (LEGAL_VAT_RATES.some((legal) => Math.abs(rate - legal) <= VAT_RATE_TOLERANCE)) {
    return []
  }

  return [
    {
      id: 'check-tva-rate-1',
      title: 'Taux de TVA hors barème',
      description:
        `${vatValue.toLocaleString('fr-FR')} de TVA sur ${htValue.toLocaleString('fr-FR')} ` +
        `hors taxes donne un taux de ${rate.toLocaleString('fr-FR', {
          maximumFractionDigits: 2,
        })} %, qui ne correspond à aucun taux en vigueur (0, 7, 10, 14 ou 20 %). ` +
        `Vérifier les deux montants sur le document.`,
      category: 'COHERENCE_DONNEES' as const,
    },
  ]
}

function checkDates(fields: ExtractedField[]): RawFinding[] {
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

/**
 * Libellés dont la valeur doit être la même sur toutes les pages d'un document.
 *
 * La liste est volontairement courte. « Date » ou « Total » peuvent
 * légitimement différer d'une page à l'autre ; un numéro de facture, non.
 * Comparer tout libellé répété rejouerait exactement l'erreur du contrôle IBAN
 * sur le certificat ISO : signaler une variation normale comme une anomalie.
 */
const CONSTANT_ACROSS_PAGES =
  /numero\s*(de\s*)?(facture|dossier|certificat|reference|compte)|^reference\b|titulaire|beneficiaire|\bice\b|\biban\b|\brib\b|emetteur/

/** Réduit une valeur à ce qui doit être comparé : ni casse, ni accents, ni ponctuation. */
function comparable(raw: string): string {
  return normalize(raw).replace(/[^a-z0-9]/g, '')
}

function checkCrossPageConsistency(fields: ExtractedField[]): RawFinding[] {
  const groups = new Map<string, ExtractedField[]>()
  for (const field of findFields(fields, CONSTANT_ACROSS_PAGES)) {
    const key = normalize(field.label)
    groups.set(key, [...(groups.get(key) ?? []), field])
  }

  const findings: RawFinding[] = []
  for (const group of groups.values()) {
    // Deux occurrences sur la même page ne prouvent rien : un document peut
    // répéter un champ. C'est la divergence entre pages qui est anormale.
    if (new Set(group.map((field) => field.page)).size < 2) continue
    if (new Set(group.map((field) => comparable(field.value))).size < 2) continue

    const seen = group
      .map((field) => `« ${field.value} » page ${field.page}`)
      .join(', ')

    findings.push({
      id: `check-crosspage-${findings.length + 1}`,
      title: `Valeur différente d'une page à l'autre — ${group[0].label}`,
      description:
        `Ce champ devrait porter la même valeur sur tout le document. Les pages ` +
        `analysées donnent : ${seen}. Un identifiant qui change en cours de ` +
        `document est une incohérence majeure. Confronter les pages entre elles.`,
      category: 'COHERENCE_DONNEES' as const,
    })
  }

  return findings
}

function checkIban(fields: ExtractedField[]): RawFinding[] {
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
      category: 'COHERENCE_DONNEES' as const,
    }))
}

// Registre des contrôles. C'est l'unique endroit où se décide la nature d'un
// constat — et donc sa sévérité comme son poids dans le score.
const CHECKS: { kind: FindingKind; run: (fields: ExtractedField[], now: Date) => RawFinding[] }[] = [
  { kind: 'format', run: (fields) => checkIce(fields) },
  { kind: 'format', run: (fields) => checkIban(fields) },
  { kind: 'format', run: (fields) => checkVatRate(fields) },
  { kind: 'fact', run: (fields) => checkVatArithmetic(fields) },
  { kind: 'fact', run: (fields) => checkImpossibleDates(fields) },
  { kind: 'fact', run: (fields) => checkPeriodOrder(fields) },
  { kind: 'fact', run: (fields) => checkValidityBeforeIssue(fields) },
  { kind: 'fact', run: (fields, now) => checkFutureIssue(fields, now) },
  { kind: 'fact', run: (fields) => checkDates(fields) },
  { kind: 'fact', run: (fields) => checkCrossPageConsistency(fields) },
]

function collectFindings(fields: ExtractedField[], now: Date): Finding[] {
  return CHECKS.flatMap(({ kind, run }) =>
    run(fields, now).map((raw) => ({
      kind,
      element: { ...raw, severity: kind === 'fact' ? ('HIGH' as const) : ('MEDIUM' as const) },
    })),
  )
}

/**
 * Lance tous les contrôles sur les champs extraits.
 *
 * `now` est un paramètre pour que les contrôles restent testables : un test
 * qui dépendrait de l'horloge réelle passerait ou échouerait selon le jour.
 */
export function runDeterministicChecks(
  fields: ExtractedField[],
  now: Date = new Date(),
): SuspiciousElement[] {
  return collectFindings(fields, now).map((finding) => finding.element)
}

/**
 * Score plancher imposé par les contrôles.
 *
 * Un fait suffit à faire basculer en risque élevé : un document dont la période
 * de validité se termine avant de commencer n'est pas « à surveiller », il est
 * incohérent. Les constats de forme restent plus bas, parce qu'un chiffre mal
 * lu suffit à les déclencher.
 */
function scoreFloor(findings: Finding[]): number {
  const facts = findings.filter((finding) => finding.kind === 'fact').length
  const formats = findings.length - facts

  let floor = 0
  if (formats > 0) floor = formats >= 2 ? 70 : 50
  if (facts > 0) floor = Math.max(floor, facts >= 2 ? 90 : 75)
  return floor
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
      '(identifiant ICE, clé IBAN, arithmétique et taux de TVA, existence et ' +
      'cohérence des dates).'
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
  const collected = collectFindings(result.extractedInformation, new Date())
  const findings = collected.map((finding) => finding.element)

  let riskScore = result.riskScore
  let recommendation = result.recommendation

  if (findings.length > 0) {
    // Un contrôle en échec impose un plancher : « risque faible » devient
    // impossible dès qu'une vérification objective échoue. Le plancher dépend
    // de la nature du constat, pas seulement de leur nombre.
    riskScore = Math.max(riskScore, scoreFloor(collected))

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

  // Chaque point du score doit être traçable à un constat affiché. Un modèle
  // renvoyant 20 sur un document où ni lui ni les contrôles n'ont rien trouvé
  // produit un chiffre que le relecteur ne peut ni vérifier ni expliquer.
  //
  // La remise à zéro exige que le verdict soit lui aussi « acceptable » : si le
  // modèle recommande une vérification sans avoir formalisé d'anomalie, son
  // avertissement est conservé par les planchers ci-dessus.
  const nothingFound = findings.length === 0 && result.suspiciousElements.length === 0
  if (nothingFound && recommendation.action === 'ACCEPTER') {
    riskScore = 0
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
