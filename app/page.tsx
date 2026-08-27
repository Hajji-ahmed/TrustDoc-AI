'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/states/EmptyState'
import { UploadZone } from '@/components/UploadZone'
import { DocumentPreview } from '@/components/DocumentPreview'
import type { PreparedDocument } from '@/lib/pdf'

export default function DashboardPage() {
  const [document, setDocument] = useState<PreparedDocument | null>(null)

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
            <Card>
              <CardHeader title="Document à contrôler" />
              <div className="space-y-4 p-5">
                <UploadZone onPrepared={setDocument} disabled={false} />
                {document ? <DocumentPreview document={document} /> : null}
              </div>
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
