import { Button } from '@/components/ui/Button'

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-risk-high)] text-[var(--color-risk-high)]">
        <span aria-hidden="true" className="text-lg">
          !
        </span>
      </div>
      <h3 className="text-sm font-semibold">The analysis did not complete</h3>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--color-ink-muted)]">{message}</p>
      <div className="mt-5 w-40">
        <Button onClick={onRetry} variant="secondary">
          Try again
        </Button>
      </div>
    </div>
  )
}
