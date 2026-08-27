import { Card, CardHeader } from '@/components/ui/Card'
import type { ExtractedField } from '@/lib/types'

function confidenceLabel(confidence: number) {
  if (confidence >= 0.9) return 'Lecture sûre'
  if (confidence >= 0.7) return 'Lecture probable'
  return 'Lecture incertaine'
}

export function ExtractedFields({ fields }: { fields: ExtractedField[] }) {
  return (
    <Card>
      <CardHeader
        title="Informations extraites"
        subtitle={`${fields.length} champ${fields.length > 1 ? 's' : ''} identifié${
          fields.length > 1 ? 's' : ''
        }`}
      />
      {fields.length === 0 ? (
        <p className="p-5 text-sm text-[var(--color-ink-muted)]">
          Aucun champ n&apos;a pu être extrait de ce document.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {fields.map((field) => (
            <li key={field.label} className="px-5 py-3">
              <p className="text-xs text-[var(--color-ink-muted)]">{field.label}</p>
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
