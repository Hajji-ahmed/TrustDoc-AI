import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "DocShield AI — Contrôle d'authenticité documentaire",
  description:
    'Analyse assistée par IA de documents officiels : score de risque, anomalies détectées et informations extraites.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
