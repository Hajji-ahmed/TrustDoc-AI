export function Button({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}) {
  const base =
    'inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50'
  const styles =
    variant === 'primary'
      ? 'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]'
      : 'border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-canvas)]'

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  )
}
