import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { EMPTY_STATS, type AnalysisRecord, type Stats } from '@/lib/stats-shape'

export { EMPTY_STATS }
export type { AnalysisRecord, Stats }

/**
 * Historique des analyses, conservé dans un fichier JSON.
 *
 * Ce qui est enregistré : la date, le score, le niveau, le type de document
 * détecté et le mode. Rien d'autre.
 *
 * Ce qui n'est PAS enregistré : les champs extraits, l'image, le nom du
 * fichier. Ils contiennent des données personnelles — noms, numéros de compte,
 * identifiants fiscaux — et un outil de contrôle documentaire n'a aucune
 * raison de constituer une base de ces informations pour tenir un compteur.
 */

const STATS_PATH = join(process.cwd(), 'data', 'stats.json')
const MAX_HISTORY = 200

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

export async function readStats(): Promise<Stats> {
  try {
    return normalize(JSON.parse(await readFile(STATS_PATH, 'utf8')))
  } catch {
    // Fichier absent au premier lancement, ou illisible : on repart de zéro
    // plutôt que de faire échouer la lecture.
    return { ...EMPTY_STATS }
  }
}

// Les écritures sont sérialisées dans le processus : deux analyses simultanées
// liraient sinon le même état et l'une écraserait l'incrément de l'autre.
let writeQueue: Promise<void> = Promise.resolve()

export async function recordAnalysis(record: AnalysisRecord): Promise<void> {
  const task = writeQueue.then(async () => {
    const stats = await readStats()
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
  })

  writeQueue = task.catch(() => undefined)

  try {
    await task
  } catch (cause) {
    // Sur un hébergement au système de fichiers en lecture seule (Vercel),
    // l'écriture échoue. Ce n'est pas une raison de faire échouer l'analyse :
    // on journalise et on continue.
    console.error('[stats] enregistrement impossible :', cause)
  }
}
