import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DocShield AI — Document authenticity screening',
  description:
    'AI-assisted analysis of official documents: risk score, detected anomalies and extracted information.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
