import { NextResponse } from 'next/server'
import { readStats } from '@/lib/stats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const stats = await readStats()
  return NextResponse.json(stats, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
