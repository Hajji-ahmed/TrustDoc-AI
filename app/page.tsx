'use client'

import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/states/EmptyState'

export default function DashboardPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[var(--color-ink)] text-xs font-bold text-white">
              DS
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">DocShield AI</p>
              <p className="text-xs leading-tight text-[var(--color-ink-muted)]">
                Contrôle d&apos;authenticité documentaire
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-5">
          <section className="lg:col-span-2">
            <Card className="p-5">
              <p className="text-sm text-[var(--color-ink-muted)]">
                Zone de dépôt — implémentée en tâche 3.
              </p>
            </Card>
          </section>
          <section className="lg:col-span-3">
            <Card>
              <EmptyState />
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
