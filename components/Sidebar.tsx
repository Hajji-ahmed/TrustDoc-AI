// Les entrées autres que « Analyse » ne correspondent à aucune page : le
// prototype ne conserve rien. Elles sont affichées désactivées plutôt que
// masquées, pour montrer la direction produit sans proposer de lien mort.
const UPCOMING = ['Documents', 'Historique', 'Rapports', 'Paramètres']

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-8 rounded-r-[28px] bg-[var(--color-forest)] px-4 py-6 text-[#f9f4ed] lg:flex">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)]">
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f5ead8"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div>
          <p className="font-display text-[19px] leading-tight">DocShield AI</p>
          <p className="text-[11px] leading-tight opacity-60">Contrôle documentaire</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        <span className="flex items-center gap-3 rounded-full bg-[var(--color-brand)] px-4 py-2.5 text-sm font-semibold text-[#f5ead8]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="9" rx="2" />
            <rect x="14" y="3" width="7" height="5" rx="2" />
            <rect x="14" y="12" width="7" height="9" rx="2" />
            <rect x="3" y="16" width="7" height="5" rx="2" />
          </svg>
          Analyse
        </span>

        {UPCOMING.map((label) => (
          <span
            key={label}
            aria-disabled="true"
            title="Non disponible dans ce prototype"
            className="flex cursor-not-allowed items-center justify-between rounded-full px-4 py-2.5 text-sm text-[#f9f4ed]/35"
          >
            {label}
            <span className="text-[10px] uppercase tracking-wide">bientôt</span>
          </span>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl bg-[var(--color-forest-soft)] px-4 py-3.5">
        <p className="text-xs font-semibold">Aide à la décision</p>
        <p className="mt-1 text-[11px] leading-relaxed opacity-70">
          L&apos;analyse est produite par un modèle et ne constitue ni une expertise ni une
          preuve.
        </p>
      </div>
    </aside>
  )
}
