import { Card, CardHeader } from '@/components/ui/Card'
import type { ExtractedField } from '@/lib/types'

function confidenceLabel(confidence: number) {
  if (confidence >= 0.9) return 'Confident reading'
  if (confidence >= 0.7) return 'Probable reading'
  return 'Uncertain reading'
}

export function ExtractedFields({ fields }: { fields: ExtractedField[] }) {
  // Un même libellé peut désormais apparaître sur plusieurs pages : la page
  // n'est affichée que si le document en compte plus d'une, sinon elle
  // n'apprend rien.
  const showPage = new Set(fields.map((field) => field.page)).size > 1

  return (
    <Card accent="olive">
      <CardHeader
        accent="olive"
        title="Extracted information"
        subtitle={`${fields.length} field${fields.length > 1 ? 's' : ''} identified`}
      />
      {fields.length === 0 ? (
        <p className="p-5 text-sm text-[var(--color-ink-muted)]">
          No field could be extracted from this document.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {/* La clé porte l'index : le libellé n'est plus unique dès qu'un champ
              est lu sur plusieurs pages. */}
          {fields.map((field, index) => (
            <li key={`${field.label}-${field.page}-${index}`} className="px-5 py-3">
              <p className="text-xs text-[var(--color-ink-muted)]">
                {field.label}
                {showPage ? (
                  <span className="ml-1.5 opacity-70">— page {field.page}</span>
                ) : null}
              </p>
              <p className="mt-0.5 break-words text-sm font-medium">{field.value}</p>
              <p className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
                {confidenceLabel(field.confidence)} — {Math.round(field.confidence * 100)} %
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
