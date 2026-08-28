import { NextResponse } from 'next/server'
import { readStats, statsBackend } from '@/lib/stats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // L'en-tête dit quelle implantation répond. Sur un déploiement, c'est le
  // moyen le plus court de vérifier que Redis est bien branché sans avoir à
  // lire les journaux.
  const headers = { 'Cache-Control': 'no-store', 'X-Stats-Backend': statsBackend() }

  try {
    return NextResponse.json(await readStats(), { headers })
  } catch (cause) {
    // Un stockage en panne ne doit pas se traduire par des compteurs à zéro :
    // ce serait affirmer qu'aucun document n'a été analysé. On signale
    // l'indisponibilité et l'interface l'affiche comme telle.
    console.error('[stats] lecture impossible :', cause)
    return NextResponse.json(
      {
        error: {
          code: 'STATS_UNAVAILABLE',
          message: "Les compteurs n'ont pas pu être lus.",
        },
      },
      { status: 503, headers },
    )
  }
}
