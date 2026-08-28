import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { Redis } from '@upstash/redis'
import { EMPTY_STATS, type AnalysisRecord, type Stats } from '@/lib/stats-shape'

export { EMPTY_STATS }
export type { AnalysisRecord, Stats }

/**
 * Historique des analyses.
 *
 * Ce qui est enregistré : la date, le score, le niveau, le type de document
 * détecté et le mode. Rien d'autre.
 *
 * Ce qui n'est PAS enregistré : les champs extraits, l'image, le nom du
 * fichier. Ils contiennent des données personnelles — noms, numéros de compte,
 * identifiants fiscaux — et un outil de contrôle documentaire n'a aucune
 * raison de constituer une base de ces informations pour tenir un compteur.
 *
 * Deux implantations derrière la même interface :
 *
 * - Redis (Upstash) dès que ses variables d'environnement sont présentes.
 *   C'est le cas en production, où l'intégration Vercel les injecte.
 * - Un fichier JSON sinon, pour développer en local sans rien installer.
 *
 * Le fichier ne peut pas servir en production : le disque d'une fonction
 * Vercel est en lecture seule hors /tmp, et /tmp appartient à une instance
 * éphémère — deux visiteurs y verraient deux compteurs différents, remis à
 * zéro à chaque démarrage à froid.
 */

const MAX_HISTORY = 200
const STATS_PATH = join(process.cwd(), 'data', 'stats.json')

const COUNTERS_KEY = 'docshield:stats:counters'
const HISTORY_KEY = 'docshield:stats:history'
const FIRST_KEY = 'docshield:stats:first'
const LAST_KEY = 'docshield:stats:last'

// ------------------------------------------------------------------- backend

let cachedRedis: Redis | null | undefined

function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis

  // L'intégration Vercel injecte UPSTASH_REDIS_REST_*. Les projets créés du
  // temps de Vercel KV portent les mêmes valeurs sous KV_REST_API_* : on
  // accepte les deux plutôt que d'imposer un renommage manuel.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN

  cachedRedis = url && token ? new Redis({ url, token }) : null
  return cachedRedis
}

/**
 * Indique quelle implantation est active. Utile pour diagnostiquer un
 * déploiement sans avoir à lire les journaux.
 *
 * « unconfigured » : on tourne sur Vercel sans Redis. Le fichier y est
 * inutilisable, et se rabattre dessus afficherait des compteurs à zéro —
 * indiscernables d'un vrai zéro. On refuse plutôt, pour que l'interface dise
 * « indisponible » et que la cause saute aux yeux.
 */
export function statsBackend(): 'redis' | 'file' | 'unconfigured' {
  if (getRedis()) return 'redis'
  return process.env.VERCEL ? 'unconfigured' : 'file'
}

const UNCONFIGURED =
  'Compteurs non configurés : sur Vercel, définissez UPSTASH_REDIS_REST_URL et ' +
  'UPSTASH_REDIS_REST_TOKEN (intégration Upstash du tableau de bord).'

// ---------------------------------------------------------------- conversions

function toCount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toRecords(values: unknown[]): AnalysisRecord[] {
  return values
    .map((value) => {
      if (typeof value !== 'string') return value
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    })
    .filter(
      (value): value is AnalysisRecord =>
        Boolean(value) && typeof value === 'object' && 'at' in (value as object),
    )
}

function normalize(raw: unknown): Stats {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_STATS }
  const value = raw as Partial<Stats>
  return {
    totalAnalyses: typeof value.totalAnalyses === 'number' ? value.totalAnalyses : 0,
    byLevel: {
      LOW: value.byLevel?.LOW ?? 0,
      MEDIUM: value.byLevel?.MEDIUM ?? 0,
      HIGH: value.byLevel?.HIGH ?? 0,
    },
    byMode: {
      live: value.byMode?.live ?? 0,
      demo: value.byMode?.demo ?? 0,
    },
    firstAnalysisAt: value.firstAnalysisAt ?? null,
    lastAnalysisAt: value.lastAnalysisAt ?? null,
    history: Array.isArray(value.history) ? value.history.slice(0, MAX_HISTORY) : [],
  }
}

// ---------------------------------------------------------------------- redis

async function readFromRedis(redis: Redis): Promise<Stats> {
  const [counters, history, first, last] = (await redis
    .pipeline()
    .hgetall(COUNTERS_KEY)
    .lrange(HISTORY_KEY, 0, MAX_HISTORY - 1)
    .get(FIRST_KEY)
    .get(LAST_KEY)
    .exec()) as [
    Record<string, unknown> | null,
    unknown[] | null,
    string | null,
    string | null,
  ]

  const fields = counters ?? {}
  return {
    totalAnalyses: toCount(fields.total),
    byLevel: {
      LOW: toCount(fields.LOW),
      MEDIUM: toCount(fields.MEDIUM),
      HIGH: toCount(fields.HIGH),
    },
    byMode: { live: toCount(fields.live), demo: toCount(fields.demo) },
    firstAnalysisAt: first ?? null,
    lastAnalysisAt: last ?? null,
    history: toRecords(history ?? []),
  }
}

// Les compteurs sont incrémentés par HINCRBY, pas par lecture puis écriture :
// deux analyses simultanées sur deux instances de fonction se marcheraient
// sinon dessus, et l'une écraserait l'incrément de l'autre.
async function writeToRedis(redis: Redis, record: AnalysisRecord): Promise<void> {
  await redis
    .pipeline()
    .hincrby(COUNTERS_KEY, 'total', 1)
    .hincrby(COUNTERS_KEY, record.riskLevel, 1)
    .hincrby(COUNTERS_KEY, record.mode, 1)
    .lpush(HISTORY_KEY, JSON.stringify(record))
    .ltrim(HISTORY_KEY, 0, MAX_HISTORY - 1)
    .set(FIRST_KEY, record.at, { nx: true })
    .set(LAST_KEY, record.at)
    .exec()
}

// --------------------------------------------------------------------- fichier

async function readFromFile(): Promise<Stats> {
  try {
    return normalize(JSON.parse(await readFile(STATS_PATH, 'utf8')))
  } catch (cause) {
    // Fichier absent au premier lancement : c'est un état légitime, pas une
    // panne. Toute autre erreur remonte, pour ne pas afficher un faux zéro.
    if ((cause as NodeJS.ErrnoException)?.code === 'ENOENT') return { ...EMPTY_STATS }
    throw cause
  }
}

// Les écritures sont sérialisées dans le processus : deux analyses simultanées
// liraient sinon le même état et l'une écraserait l'incrément de l'autre.
let writeQueue: Promise<void> = Promise.resolve()

async function writeToFile(record: AnalysisRecord): Promise<void> {
  const stats = await readFromFile()
  const next: Stats = {
    totalAnalyses: stats.totalAnalyses + 1,
    byLevel: { ...stats.byLevel, [record.riskLevel]: stats.byLevel[record.riskLevel] + 1 },
    byMode: { ...stats.byMode, [record.mode]: stats.byMode[record.mode] + 1 },
    firstAnalysisAt: stats.firstAnalysisAt ?? record.at,
    lastAnalysisAt: record.at,
    history: [record, ...stats.history].slice(0, MAX_HISTORY),
  }
  await mkdir(dirname(STATS_PATH), { recursive: true })
  await writeFile(STATS_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
}

// ------------------------------------------------------------------ interface

/**
 * Lit les compteurs. Lève en cas de panne du stockage : l'appelant doit
 * signaler l'indisponibilité plutôt que de renvoyer des compteurs à zéro,
 * qui affirmeraient à tort qu'aucun document n'a été analysé.
 */
export async function readStats(): Promise<Stats> {
  const backend = statsBackend()
  if (backend === 'unconfigured') throw new Error(UNCONFIGURED)
  const redis = getRedis()
  return redis ? readFromRedis(redis) : readFromFile()
}

/**
 * Enregistre une analyse. N'échoue jamais bruyamment : un compteur non
 * sauvegardé ne doit pas faire échouer l'analyse que l'utilisateur attend.
 */
export async function recordAnalysis(record: AnalysisRecord): Promise<void> {
  if (statsBackend() === 'unconfigured') {
    console.error(`[stats] ${UNCONFIGURED}`)
    return
  }

  const redis = getRedis()
  try {
    if (redis) {
      await writeToRedis(redis, record)
      return
    }
    const task = writeQueue.then(() => writeToFile(record))
    writeQueue = task.catch(() => undefined)
    await task
  } catch (cause) {
    console.error('[stats] enregistrement impossible :', cause)
  }
}
