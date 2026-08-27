# DocShield AI — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer un prototype Next.js démontrable qui analyse un document officiel via un modèle vision OpenAI et affiche score de risque, zones suspectes, informations extraites et recommandation.

**Architecture:** Le navigateur normalise tout document entrant en une image PNG unique qui sert à la fois d'aperçu et de charge utile. Une seule route serveur `/api/analyze` détient la clé API, appelle OpenAI en sortie structurée, revalide la réponse avec Zod, et bascule sur un jeu de données mocké si aucune clé n'est configurée.

**Tech Stack:** Next.js (App Router), TypeScript strict, Tailwind CSS v4, Zod, SDK `openai`, `pdfjs-dist`.

**Spec:** `docs/superpowers/specs/2026-08-27-docshield-ai-design.md`

## Global Constraints

- Langue de l'interface et des contenus produits par le modèle : **français**.
- La clé API n'est lue que dans `app/api/analyze/route.ts`. Aucune variable `NEXT_PUBLIC_` ne la référence, jamais.
- Aucune persistance : pas de base de données, pas d'auth, pas de `localStorage`.
- Pas de suite de tests automatisés. Vérification de chaque tâche : `npm run build` sans erreur TypeScript + parcours manuel décrit dans la tâche.
- Aucun message d'erreur générique. Chaque cas d'erreur du tableau de la spec a son libellé propre.
- Aucune animation décorative. La couleur est réservée à la signalétique de risque et n'est jamais seule porteuse d'information : chaque badge porte aussi son libellé texte.
- Échelle de risque, appliquée partout de façon identique : `LOW` 0-33 vert, `MEDIUM` 34-66 ambre, `HIGH` 67-100 rouge.
- Les classes Tailwind doivent être écrites en toutes lettres dans le code (jamais construites par concaténation), sinon le compilateur ne les génère pas.
- Le projet doit démarrer avec `npm install && npm run dev`, sans étape manuelle supplémentaire.

---

## Structure des fichiers

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs` | Configuration du projet | 1 |
| `app/globals.css` | Import Tailwind + tokens de risque | 1 |
| `app/layout.tsx` | Shell HTML, métadonnées, header | 1 |
| `app/page.tsx` | Dashboard, machine d'état, seul appelant de l'API | 1, 4 |
| `components/ui/Card.tsx`, `Badge.tsx`, `Button.tsx` | Primitives visuelles sans logique métier | 1 |
| `lib/risk.ts` | Mapping niveau de risque → libellé et classes | 1 |
| `lib/types.ts` | Types partagés client/serveur | 2 |
| `lib/schema.ts` | Schéma Zod + JSON Schema pour OpenAI | 2 |
| `lib/mock.ts` | Jeu de données de démonstration | 2 |
| `app/api/analyze/route.ts` | Route POST, seul lecteur de la clé API | 2, 7 |
| `lib/pdf.ts` | Conversion navigateur document → PNG dataURL | 3 |
| `components/UploadZone.tsx` | Dépôt de fichier, validation, erreurs d'upload | 3 |
| `components/DocumentPreview.tsx` | Aperçu + overlay SVG | 3, 6 |
| `components/states/*.tsx` | EmptyState, LoadingState, ErrorState | 1, 4 |
| `components/RiskScoreCard.tsx` | Jauge + badge de niveau | 5 |
| `components/ExtractedFields.tsx` | Tableau des champs extraits | 5 |
| `components/SuspiciousElements.tsx` | Liste des anomalies, liée à l'overlay | 5, 6 |
| `components/AnalysisReport.tsx` | Explication, recommandation, avertissement | 5 |
| `lib/prompt.ts` | Prompt système d'analyse | 7 |
| `lib/openai.ts` | Client OpenAI et appel vision | 7 |
| `README.md`, `.env.example` | Documentation | 8 |

---

### Task 1: Fondations du projet et coquille du dashboard

Scaffolding manuel plutôt que `create-next-app` : le dossier courant s'appelle
« TrustDoc AI », un nom que `create-next-app` refuse (espace et majuscules), et
un scaffolding écrit à la main reste déterministe et sans invite interactive.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`
- Create: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
- Create: `components/ui/Card.tsx`, `components/ui/Badge.tsx`, `components/ui/Button.tsx`
- Create: `components/states/EmptyState.tsx`
- Create: `lib/risk.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `Card({ children, className }: { children: React.ReactNode; className?: string })`
  - `CardHeader({ title, subtitle }: { title: string; subtitle?: string })`
  - `Badge({ level, children }: { level: RiskLevel | 'neutral'; children: React.ReactNode })`
  - `Button({ children, onClick, disabled, variant }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' })`
  - `EmptyState()`
  - `riskLevelFromScore(score: number): RiskLevel`
  - `RISK_LABELS: Record<RiskLevel, string>`
  - `RISK_STYLES: Record<RiskLevel, { text: string; bg: string; border: string; stroke: string; dot: string }>`

**Note :** `lib/risk.ts` importe le type `RiskLevel` depuis `lib/types.ts`, créé en tâche 2. Pour que la tâche 1 compile seule, `lib/risk.ts` déclare et exporte `RiskLevel` dans cette tâche, et la tâche 2 déplacera cette déclaration vers `lib/types.ts`. Cette étape de déplacement est explicitement listée en tâche 2.

- [ ] **Step 1: Initialiser le dépôt git**

```bash
git init
git branch -M main
```

- [ ] **Step 2: Créer `package.json`**

```json
{
  "name": "docshield-ai",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 3: Créer `tsconfig.json`, `next.config.ts`, `postcss.config.mjs` et `.gitignore`**

`tsconfig.json` :

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts` :

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {}

export default nextConfig
```

`postcss.config.mjs` :

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
```

`.gitignore` :

```
node_modules
.next
out
.env
.env.local
next-env.d.ts
*.tsbuildinfo
```

- [ ] **Step 4: Installer les dépendances**

Run: `npm install`
Expected: installation sans erreur, `node_modules/` créé.

- [ ] **Step 5: Créer `app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-surface: #ffffff;
  --color-canvas: #f6f7f9;
  --color-line: #e3e6ea;
  --color-ink: #11161c;
  --color-ink-muted: #5b6672;

  --color-risk-low: #15803d;
  --color-risk-low-soft: #eaf6ee;
  --color-risk-medium: #b45309;
  --color-risk-medium-soft: #fdf3e3;
  --color-risk-high: #b91c1c;
  --color-risk-high-soft: #fdeceb;
}

html,
body {
  background-color: var(--color-canvas);
  color: var(--color-ink);
}
```

- [ ] **Step 6: Créer `lib/risk.ts`**

```ts
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: 'Risque faible',
  MEDIUM: 'Risque modéré',
  HIGH: 'Risque élevé',
}

export const RISK_STYLES: Record<
  RiskLevel,
  { text: string; bg: string; border: string; stroke: string; dot: string }
> = {
  LOW: {
    text: 'text-[var(--color-risk-low)]',
    bg: 'bg-[var(--color-risk-low-soft)]',
    border: 'border-[var(--color-risk-low)]',
    stroke: 'var(--color-risk-low)',
    dot: 'bg-[var(--color-risk-low)]',
  },
  MEDIUM: {
    text: 'text-[var(--color-risk-medium)]',
    bg: 'bg-[var(--color-risk-medium-soft)]',
    border: 'border-[var(--color-risk-medium)]',
    stroke: 'var(--color-risk-medium)',
    dot: 'bg-[var(--color-risk-medium)]',
  },
  HIGH: {
    text: 'text-[var(--color-risk-high)]',
    bg: 'bg-[var(--color-risk-high-soft)]',
    border: 'border-[var(--color-risk-high)]',
    stroke: 'var(--color-risk-high)',
    dot: 'bg-[var(--color-risk-high)]',
  },
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score <= 33) return 'LOW'
  if (score <= 66) return 'MEDIUM'
  return 'HIGH'
}
```

- [ ] **Step 7: Créer les primitives `components/ui/`**

`components/ui/Card.tsx` :

```tsx
export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-[var(--color-line)] px-5 py-4">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{subtitle}</p>
      ) : null}
    </div>
  )
}
```

`components/ui/Badge.tsx` :

```tsx
import { RISK_STYLES, type RiskLevel } from '@/lib/risk'

export function Badge({
  level,
  children,
}: {
  level: RiskLevel | 'neutral'
  children: React.ReactNode
}) {
  const style =
    level === 'neutral'
      ? {
          text: 'text-[var(--color-ink-muted)]',
          bg: 'bg-[var(--color-canvas)]',
          border: 'border-[var(--color-line)]',
          dot: 'bg-[var(--color-ink-muted)]',
        }
      : RISK_STYLES[level]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.border} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {children}
    </span>
  )
}
```

`components/ui/Button.tsx` :

```tsx
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
      ? 'bg-[var(--color-ink)] text-white hover:bg-black'
      : 'border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-canvas)]'

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  )
}
```

- [ ] **Step 8: Créer `components/states/EmptyState.tsx`**

```tsx
export function EmptyState() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-muted)]">
        <span aria-hidden="true" className="text-lg">
          ⌕
        </span>
      </div>
      <h3 className="text-sm font-semibold">Aucune analyse en cours</h3>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--color-ink-muted)]">
        Déposez un document officiel dans la zone de gauche, puis lancez l&apos;analyse pour
        obtenir un score de risque et le détail des anomalies détectées.
      </p>
    </div>
  )
}
```

- [ ] **Step 9: Créer `app/layout.tsx` et `app/page.tsx`**

`app/layout.tsx` :

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DocShield AI — Contrôle d\'authenticité documentaire',
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
```

`app/page.tsx` :

```tsx
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
```

- [ ] **Step 10: Vérifier le build**

Run: `npm run build`
Expected: build réussi, aucune erreur TypeScript.

- [ ] **Step 11: Vérifier visuellement**

Run: `npm run dev`, ouvrir `http://localhost:3000`
Expected: header DocShield AI, deux colonnes côte à côte sur écran large, empilées sous 1024 px de large (réduire la fenêtre pour vérifier), état vide affiché à droite.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: fondations Next.js, tokens de risque et coquille du dashboard"
```

---

### Task 2: Contrat de données et route API en mode démonstration

**Files:**
- Create: `lib/types.ts`, `lib/schema.ts`, `lib/mock.ts`, `app/api/analyze/route.ts`
- Modify: `lib/risk.ts` (retirer la déclaration de `RiskLevel`, la réimporter depuis `lib/types.ts`)
- Modify: `package.json` (ajout de `zod`)

**Interfaces:**
- Consumes: `RiskLevel` déclaré en tâche 1 dans `lib/risk.ts`, déplacé ici.
- Produces:
  - Tous les types listés dans `lib/types.ts` ci-dessous.
  - `analysisResultSchema: z.ZodType<AnalysisResult>`
  - `ANALYSIS_JSON_SCHEMA: Record<string, unknown>` — JSON Schema strict transmis à OpenAI
  - `buildMockAnalysis(): AnalysisResult`
  - Route `POST /api/analyze` acceptant `{ imageDataUrl: string }` et renvoyant `AnalyzeResponse` ou `AnalyzeError`.

- [ ] **Step 1: Installer Zod**

Run: `npm install zod`
Expected: `zod` ajouté aux dépendances.

- [ ] **Step 2: Créer `lib/types.ts`**

```ts
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type SuspiciousCategory =
  | 'TYPOGRAPHIE'
  | 'MISE_EN_PAGE'
  | 'COHERENCE_DONNEES'
  | 'MANIPULATION_IMAGE'
  | 'ELEMENTS_SECURITE'

export type RecommendedAction = 'ACCEPTER' | 'VERIFICATION_MANUELLE' | 'REJETER'

export interface ExtractedField {
  label: string
  value: string
  confidence: number
}

export interface SuspiciousElement {
  id: string
  title: string
  description: string
  severity: RiskLevel
  category: SuspiciousCategory
}

export interface SuspiciousRegion {
  elementId: string
  x: number
  y: number
  width: number
  height: number
  label: string
}

export interface Recommendation {
  action: RecommendedAction
  summary: string
  nextSteps: string[]
}

export interface AnalysisResult {
  riskScore: number
  riskLevel: RiskLevel
  detectedDocumentType: string
  extractedInformation: ExtractedField[]
  suspiciousElements: SuspiciousElement[]
  suspiciousRegions: SuspiciousRegion[]
  explanation: string
  recommendation: Recommendation
}

export type AnalysisMode = 'live' | 'demo'

export interface AnalyzeResponse {
  mode: AnalysisMode
  result: AnalysisResult
}

export type AnalyzeErrorCode = 'INVALID_REQUEST' | 'UPSTREAM_FAILURE' | 'INVALID_MODEL_OUTPUT'

export interface AnalyzeError {
  error: {
    code: AnalyzeErrorCode
    message: string
  }
}
```

- [ ] **Step 3: Modifier `lib/risk.ts` pour importer `RiskLevel`**

Remplacer la ligne `export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'` par :

```ts
import type { RiskLevel } from '@/lib/types'

export type { RiskLevel }
```

Le reste du fichier reste inchangé. Le réexport préserve les imports déjà écrits en tâche 1 (`import { RISK_STYLES, type RiskLevel } from '@/lib/risk'`).

- [ ] **Step 4: Créer `lib/schema.ts`**

Le JSON Schema est écrit à la main plutôt que dérivé de Zod : le mode `strict`
d'OpenAI impose que chaque objet déclare `additionalProperties: false` et liste
toutes ses propriétés dans `required`, contrainte qu'une conversion automatique
ne respecte pas de façon fiable.

```ts
import { z } from 'zod'
import type { AnalysisResult } from '@/lib/types'

const riskLevel = z.enum(['LOW', 'MEDIUM', 'HIGH'])

const suspiciousCategory = z.enum([
  'TYPOGRAPHIE',
  'MISE_EN_PAGE',
  'COHERENCE_DONNEES',
  'MANIPULATION_IMAGE',
  'ELEMENTS_SECURITE',
])

export const analysisResultSchema = z.object({
  riskScore: z.number().min(0).max(100),
  riskLevel,
  detectedDocumentType: z.string().min(1),
  extractedInformation: z.array(
    z.object({
      label: z.string().min(1),
      value: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  suspiciousElements: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      severity: riskLevel,
      category: suspiciousCategory,
    }),
  ),
  suspiciousRegions: z.array(
    z.object({
      elementId: z.string().min(1),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      label: z.string(),
    }),
  ),
  explanation: z.string().min(1),
  recommendation: z.object({
    action: z.enum(['ACCEPTER', 'VERIFICATION_MANUELLE', 'REJETER']),
    summary: z.string().min(1),
    nextSteps: z.array(z.string()),
  }),
}) satisfies z.ZodType<AnalysisResult>

export const ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'riskScore',
    'riskLevel',
    'detectedDocumentType',
    'extractedInformation',
    'suspiciousElements',
    'suspiciousRegions',
    'explanation',
    'recommendation',
  ],
  properties: {
    riskScore: { type: 'integer', description: 'Score de risque global de 0 à 100.' },
    riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    detectedDocumentType: {
      type: 'string',
      description: 'Type de document identifié, en français. Exemple : "Relevé bancaire".',
    },
    extractedInformation: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value', 'confidence'],
        properties: {
          label: { type: 'string', description: 'Nom du champ, en français.' },
          value: { type: 'string' },
          confidence: { type: 'number', description: 'Confiance de lecture entre 0 et 1.' },
        },
      },
    },
    suspiciousElements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'description', 'severity', 'category'],
        properties: {
          id: { type: 'string', description: 'Identifiant unique, format "sus-1", "sus-2".' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          category: {
            type: 'string',
            enum: [
              'TYPOGRAPHIE',
              'MISE_EN_PAGE',
              'COHERENCE_DONNEES',
              'MANIPULATION_IMAGE',
              'ELEMENTS_SECURITE',
            ],
          },
        },
      },
    },
    suspiciousRegions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['elementId', 'x', 'y', 'width', 'height', 'label'],
        properties: {
          elementId: {
            type: 'string',
            description: 'Doit correspondre à un id présent dans suspiciousElements.',
          },
          x: { type: 'number', description: 'Coin gauche, normalisé entre 0 et 1.' },
          y: { type: 'number', description: 'Coin haut, normalisé entre 0 et 1.' },
          width: { type: 'number', description: 'Largeur normalisée entre 0 et 1.' },
          height: { type: 'number', description: 'Hauteur normalisée entre 0 et 1.' },
          label: { type: 'string', description: 'Libellé court affiché sur la zone.' },
        },
      },
    },
    explanation: { type: 'string' },
    recommendation: {
      type: 'object',
      additionalProperties: false,
      required: ['action', 'summary', 'nextSteps'],
      properties: {
        action: { type: 'string', enum: ['ACCEPTER', 'VERIFICATION_MANUELLE', 'REJETER'] },
        summary: { type: 'string' },
        nextSteps: { type: 'array', items: { type: 'string' } },
      },
    },
  },
} as const
```

- [ ] **Step 5: Créer `lib/mock.ts`**

Le jeu mocké contient trois anomalies, dont **une sans région associée**
(incohérence de dates, non localisable), afin que le cas soit visible en démo.

```ts
import type { AnalysisResult } from '@/lib/types'

export function buildMockAnalysis(): AnalysisResult {
  return {
    riskScore: 74,
    riskLevel: 'HIGH',
    detectedDocumentType: 'Relevé bancaire mensuel',
    extractedInformation: [
      { label: 'Titulaire du compte', value: 'Karim El Mansouri', confidence: 0.97 },
      { label: 'Numéro de compte', value: 'FR76 3000 4008 2800 0123 4567 890', confidence: 0.92 },
      { label: 'Établissement', value: 'Banque Atlantique — Agence Casablanca Centre', confidence: 0.95 },
      { label: 'Période', value: '01/03/2026 — 31/03/2026', confidence: 0.99 },
      { label: 'Solde de clôture', value: '48 250,00 MAD', confidence: 0.71 },
      { label: 'Date d\'émission', value: '02/04/2026', confidence: 0.88 },
    ],
    suspiciousElements: [
      {
        id: 'sus-1',
        title: 'Solde de clôture recomposé',
        description:
          'Le montant du solde de clôture présente un rendu de police différent du reste du tableau : espacement irrégulier entre les chiffres et bords de caractères plus nets que sur les lignes voisines. Ce contraste est caractéristique d\'un texte réinséré par-dessus le document d\'origine.',
        severity: 'HIGH',
        category: 'MANIPULATION_IMAGE',
      },
      {
        id: 'sus-2',
        title: 'Alignement rompu dans la colonne des montants',
        description:
          'Les montants de trois opérations ne respectent pas l\'alignement à droite appliqué au reste de la colonne, avec un décalage horizontal constant de quelques pixels.',
        severity: 'MEDIUM',
        category: 'MISE_EN_PAGE',
      },
      {
        id: 'sus-3',
        title: 'Somme des opérations incohérente avec le solde affiché',
        description:
          'Le cumul des crédits et débits listés ne correspond pas au solde de clôture indiqué : un écart de 12 400,00 MAD subsiste et ne s\'explique par aucune ligne visible du relevé.',
        severity: 'HIGH',
        category: 'COHERENCE_DONNEES',
      },
    ],
    suspiciousRegions: [
      { elementId: 'sus-1', x: 0.61, y: 0.72, width: 0.27, height: 0.06, label: 'Solde de clôture' },
      { elementId: 'sus-2', x: 0.58, y: 0.44, width: 0.3, height: 0.14, label: 'Colonne montants' },
    ],
    explanation:
      'Le document présente les caractéristiques générales d\'un relevé bancaire authentique : structure, en-tête et mentions légales sont conformes au format attendu. Deux signaux convergent toutefois vers une altération du volet financier. D\'une part, le bloc du solde de clôture ne partage pas les propriétés de rendu du reste du tableau, ce qui suggère une réinsertion de texte. D\'autre part, le total affiché ne se déduit pas des opérations listées, avec un écart significatif. Pris isolément, chacun de ces indices resterait discutable ; leur conjonction sur le même champ constitue un faisceau cohérent.',
    recommendation: {
      action: 'REJETER',
      summary:
        'Ne pas retenir ce relevé comme justificatif de revenus en l\'état. Les anomalies portent directement sur les montants, c\'est-à-dire sur l\'information que le document est censé prouver.',
      nextSteps: [
        'Demander un relevé original transmis directement par l\'établissement bancaire.',
        'Vérifier le solde annoncé auprès de la banque émettrice si le dossier le justifie.',
        'Comparer les montants avec les autres justificatifs de revenus du dossier.',
        'Conserver une trace de ce contrôle dans le dossier client.',
      ],
    },
  }
}
```

- [ ] **Step 6: Créer `app/api/analyze/route.ts` (mode démonstration uniquement)**

L'appel réel à OpenAI est ajouté en tâche 7. Le mock passe par la même
validation Zod que le chemin réel, ce qui garantit qu'il ne peut pas diverger
du contrat.

```ts
import { NextResponse } from 'next/server'
import { analysisResultSchema } from '@/lib/schema'
import { buildMockAnalysis } from '@/lib/mock'
import type { AnalyzeError, AnalyzeErrorCode, AnalyzeResponse } from '@/lib/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const DEMO_DELAY_MS = 1500

function errorResponse(code: AnalyzeErrorCode, message: string, status: number) {
  const body: AnalyzeError = { error: { code, message } }
  return NextResponse.json(body, { status })
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return errorResponse('INVALID_REQUEST', 'La requête envoyée est illisible.', 400)
  }

  const imageDataUrl = (payload as { imageDataUrl?: unknown })?.imageDataUrl
  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    return errorResponse(
      'INVALID_REQUEST',
      'Aucune image de document exploitable n\'a été reçue.',
      400,
    )
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    await new Promise((resolve) => setTimeout(resolve, DEMO_DELAY_MS))
    const parsed = analysisResultSchema.safeParse(buildMockAnalysis())
    if (!parsed.success) {
      console.error('[analyze] jeu de démonstration invalide', parsed.error.flatten())
      return errorResponse(
        'INVALID_MODEL_OUTPUT',
        'Le jeu de démonstration est invalide.',
        500,
      )
    }
    const body: AnalyzeResponse = { mode: 'demo', result: parsed.data }
    return NextResponse.json(body)
  }

  // Chemin réel implémenté en tâche 7.
  return errorResponse(
    'UPSTREAM_FAILURE',
    'L\'analyse réelle n\'est pas encore disponible.',
    501,
  )
}
```

- [ ] **Step 7: Vérifier le build**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 8: Vérifier la route en mode démo**

Démarrer `npm run dev`, puis dans un second terminal :

```bash
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageDataUrl":"data:image/png;base64,iVBORw0KGgo="}'
```

Expected: après ~1,5 s, un JSON commençant par `{"mode":"demo","result":{"riskScore":74`.

Vérifier ensuite le rejet d'une requête invalide :

```bash
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" -d '{}'
```

Expected: `{"error":{"code":"INVALID_REQUEST","message":"Aucune image de document exploitable n'a été reçue."}}`

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: contrat de données, schéma Zod et route d'analyse en mode démonstration"
```

---

### Task 3: Dépôt de document et normalisation en image

**Files:**
- Create: `lib/pdf.ts`, `components/UploadZone.tsx`, `components/DocumentPreview.tsx`
- Create: `scripts/copy-pdf-worker.mjs`
- Modify: `package.json` (dépendance `pdfjs-dist`, script `postinstall`)
- Modify: `app/page.tsx` (brancher l'upload et l'aperçu)

**Interfaces:**
- Consumes: `Card`, `CardHeader` (tâche 1).
- Produces:
  - `type PreparedDocument = { dataUrl: string; width: number; height: number; fileName: string; pageCount: number }`
  - `class DocumentPrepError extends Error { code: 'UNSUPPORTED_TYPE' | 'TOO_LARGE' | 'UNREADABLE_PDF' | 'UNREADABLE_IMAGE' }`
  - `prepareDocument(file: File): Promise<PreparedDocument>`
  - `UploadZone({ onPrepared, disabled }: { onPrepared: (doc: PreparedDocument) => void; disabled: boolean })`
  - `DocumentPreview({ document }: { document: PreparedDocument })` — l'overlay est ajouté en tâche 6.

- [ ] **Step 1: Installer `pdfjs-dist` et créer le script de copie du worker**

Run: `npm install pdfjs-dist@^4.10.38`

La version est épinglée en 4.x : la branche 5.x a modifié la signature de
`page.render()`, et le code de la tâche suit l'API 4.x.

`scripts/copy-pdf-worker.mjs` — le worker `pdfjs` doit être servi depuis
`/public` pour être chargé par le navigateur sans configuration webpack :

```js
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')
const targetDir = join(root, 'public')
const target = join(targetDir, 'pdf.worker.min.mjs')

if (!existsSync(source)) {
  console.warn('[copy-pdf-worker] worker pdfjs introuvable, copie ignorée')
  process.exit(0)
}

mkdirSync(targetDir, { recursive: true })
copyFileSync(source, target)
console.log('[copy-pdf-worker] worker copié dans public/')
```

Ajouter dans `package.json`, section `scripts` :

```json
"postinstall": "node scripts/copy-pdf-worker.mjs"
```

Ajouter dans `.gitignore` :

```
public/pdf.worker.min.mjs
```

Run: `node scripts/copy-pdf-worker.mjs`
Expected: `public/pdf.worker.min.mjs` créé.

- [ ] **Step 2: Créer `lib/pdf.ts`**

`pdfjs-dist` est importé dynamiquement pour qu'il ne soit jamais évalué côté
serveur. L'image produite sert à la fois d'aperçu et de charge utile : c'est ce
qui garantit l'alignement de l'overlay en tâche 6.

```ts
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_EDGE_PX = 1600
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']

export type DocumentPrepErrorCode =
  | 'UNSUPPORTED_TYPE'
  | 'TOO_LARGE'
  | 'UNREADABLE_PDF'
  | 'UNREADABLE_IMAGE'

export class DocumentPrepError extends Error {
  code: DocumentPrepErrorCode

  constructor(code: DocumentPrepErrorCode, message: string) {
    super(message)
    this.name = 'DocumentPrepError'
    this.code = code
  }
}

export interface PreparedDocument {
  dataUrl: string
  width: number
  height: number
  fileName: string
  pageCount: number
}

function scaledSize(width: number, height: number) {
  const longestEdge = Math.max(width, height)
  const ratio = longestEdge > MAX_EDGE_PX ? MAX_EDGE_PX / longestEdge : 1
  return { width: Math.round(width * ratio), height: Math.round(height * ratio), ratio }
}

async function prepareImage(file: File): Promise<PreparedDocument> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('image illisible'))
      img.src = objectUrl
    })

    const { width, height } = scaledSize(image.naturalWidth, image.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('contexte canvas indisponible')
    }
    context.drawImage(image, 0, 0, width, height)

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width,
      height,
      fileName: file.name,
      pageCount: 1,
    }
  } catch {
    throw new DocumentPrepError(
      'UNREADABLE_IMAGE',
      'Cette image n\'a pas pu être ouverte. Essayez un autre fichier.',
    )
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function preparePdf(file: File): Promise<PreparedDocument> {
  try {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

    const buffer = await file.arrayBuffer()
    const pdf = await pdfjs.getDocument({ data: buffer }).promise
    const page = await pdf.getPage(1)

    const baseViewport = page.getViewport({ scale: 1 })
    const { ratio } = scaledSize(baseViewport.width, baseViewport.height)
    // On rend au-delà de la taille cible puis on laisse le ratio ramener à
    // MAX_EDGE_PX : un rendu direct à l'échelle 1 produirait un texte trop
    // dégradé pour être lu par le modèle.
    const viewport = page.getViewport({ scale: ratio * 2 })

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('contexte canvas indisponible')
    }

    await page.render({ canvasContext: context, viewport }).promise

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
      fileName: file.name,
      pageCount: pdf.numPages,
    }
  } catch {
    throw new DocumentPrepError(
      'UNREADABLE_PDF',
      'Ce PDF n\'a pas pu être lu. Il est peut-être protégé ou endommagé.',
    )
  }
}

export async function prepareDocument(file: File): Promise<PreparedDocument> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new DocumentPrepError(
      'UNSUPPORTED_TYPE',
      'Format non pris en charge. Déposez un fichier PDF, JPG ou PNG.',
    )
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new DocumentPrepError(
      'TOO_LARGE',
      'Fichier trop volumineux. La taille maximale est de 10 Mo.',
    )
  }

  return file.type === 'application/pdf' ? preparePdf(file) : prepareImage(file)
}
```

- [ ] **Step 3: Créer `components/UploadZone.tsx`**

```tsx
'use client'

import { useRef, useState } from 'react'
import { DocumentPrepError, prepareDocument, type PreparedDocument } from '@/lib/pdf'

export function UploadZone({
  onPrepared,
  disabled,
}: {
  onPrepared: (doc: PreparedDocument) => void
  disabled: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file || disabled) return
    setError(null)
    setPreparing(true)
    try {
      onPrepared(await prepareDocument(file))
    } catch (cause) {
      setError(
        cause instanceof DocumentPrepError
          ? cause.message
          : 'Le document n\'a pas pu être préparé. Réessayez avec un autre fichier.',
      )
    } finally {
      setPreparing(false)
    }
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void handleFile(event.dataTransfer.files[0])
        }}
        className={`rounded-lg border border-dashed px-6 py-10 text-center ${
          dragging
            ? 'border-[var(--color-ink)] bg-[var(--color-canvas)]'
            : 'border-[var(--color-line)] bg-[var(--color-surface)]'
        }`}
      >
        <p className="text-sm font-medium">Déposez votre document ici</p>
        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
          PDF, JPG ou PNG — 10 Mo maximum
        </p>
        <button
          type="button"
          disabled={disabled || preparing}
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-md border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-canvas)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {preparing ? 'Préparation…' : 'Parcourir les fichiers'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-[var(--color-risk-high)] bg-[var(--color-risk-high-soft)] px-3 py-2 text-xs text-[var(--color-risk-high)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 4: Créer `components/DocumentPreview.tsx`**

```tsx
'use client'

import type { PreparedDocument } from '@/lib/pdf'

export function DocumentPreview({ document }: { document: PreparedDocument }) {
  return (
    <div>
      <div className="overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={document.dataUrl}
          alt={`Aperçu de ${document.fileName}`}
          className="block h-auto w-full"
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <span className="truncate">{document.fileName}</span>
        <span>
          {document.width} × {document.height} px
          {document.pageCount > 1 ? ` — page 1 sur ${document.pageCount}` : ''}
        </span>
      </div>
      {document.pageCount > 1 ? (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
          Seule la première page est analysée dans cette version.
        </p>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 5: Brancher l'upload dans `app/page.tsx`**

Remplacer le contenu de la colonne de gauche par l'upload et l'aperçu :

```tsx
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
```

- [ ] **Step 6: Vérifier le build**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 7: Vérifier le parcours d'upload**

Run: `npm run dev`, puis dans le navigateur :

| Action | Attendu |
|---|---|
| Déposer un JPG ou PNG | Aperçu affiché, dimensions ≤ 1600 px sur le côté long |
| Déposer un PDF d'une page | Aperçu de la page 1, texte lisible |
| Déposer un PDF de plusieurs pages | Mention « page 1 sur N » et avertissement affichés |
| Déposer un `.docx` ou `.txt` | Message « Format non pris en charge… » |
| Déposer un fichier > 10 Mo | Message « Fichier trop volumineux… » |
| Déposer un PDF corrompu (renommer un `.txt` en `.pdf`) | Message « Ce PDF n'a pas pu être lu… » |

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: dépôt de document, conversion PDF et aperçu normalisé"
```

---

### Task 4: Machine d'état, appel d'analyse, chargement et erreurs

À l'issue de cette tâche, le parcours est complet de bout en bout en mode
démonstration, mais le résultat s'affiche encore sous forme brute. Le dashboard
de résultats est construit en tâche 5.

**Files:**
- Create: `components/states/LoadingState.tsx`, `components/states/ErrorState.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `PreparedDocument`, `UploadZone`, `DocumentPreview` (tâche 3) ; `AnalyzeResponse`, `AnalyzeError`, `AnalysisResult` (tâche 2) ; `Button`, `Card`, `Badge` (tâche 1).
- Produces:
  - `LoadingState()`
  - `ErrorState({ message, onRetry }: { message: string; onRetry: () => void })`
  - Dans `app/page.tsx` : l'état `status: 'idle' | 'filePrepared' | 'analyzing' | 'success' | 'error'` et les états `result: AnalysisResult | null`, `mode: AnalysisMode | null`.

- [ ] **Step 1: Créer `components/states/LoadingState.tsx`**

Trois étapes textuelles fixes, sans animation décorative : elles indiquent ce
que fait le système, pas un simple « chargement en cours ».

```tsx
export function LoadingState() {
  const steps = [
    'Lecture du document',
    'Analyse structurelle et typographique',
    'Vérification de la cohérence des données',
    'Rédaction du rapport',
  ]

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-ink)]"
        aria-hidden="true"
      />
      <p className="mt-4 text-sm font-semibold">Analyse en cours</p>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
        Cette opération prend généralement moins d&apos;une minute.
      </p>
      <ul className="mt-6 space-y-1.5 text-xs text-[var(--color-ink-muted)]">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Créer `components/states/ErrorState.tsx`**

```tsx
import { Button } from '@/components/ui/Button'

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-risk-high)] text-[var(--color-risk-high)]">
        <span aria-hidden="true" className="text-lg">
          !
        </span>
      </div>
      <h3 className="text-sm font-semibold">L&apos;analyse n&apos;a pas abouti</h3>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--color-ink-muted)]">{message}</p>
      <div className="mt-5 w-40">
        <Button onClick={onRetry} variant="secondary">
          Réessayer
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Câbler la machine d'état dans `app/page.tsx`**

Points à respecter : déposer un nouveau document efface le résultat précédent
et ramène le statut à `filePrepared` ; le bouton reste le seul déclencheur de
l'analyse.

```tsx
'use client'

import { useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/states/EmptyState'
import { LoadingState } from '@/components/states/LoadingState'
import { ErrorState } from '@/components/states/ErrorState'
import { UploadZone } from '@/components/UploadZone'
import { DocumentPreview } from '@/components/DocumentPreview'
import type { PreparedDocument } from '@/lib/pdf'
import type { AnalysisMode, AnalysisResult, AnalyzeError, AnalyzeResponse } from '@/lib/types'

type Status = 'idle' | 'filePrepared' | 'analyzing' | 'success' | 'error'

export default function DashboardPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [preparedDocument, setPreparedDocument] = useState<PreparedDocument | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [mode, setMode] = useState<AnalysisMode | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  function handlePrepared(doc: PreparedDocument) {
    setPreparedDocument(doc)
    setResult(null)
    setErrorMessage('')
    setStatus('filePrepared')
  }

  async function runAnalysis() {
    if (!preparedDocument) return
    setStatus('analyzing')
    setErrorMessage('')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: preparedDocument.dataUrl }),
      })

      const payload: AnalyzeResponse | AnalyzeError = await response.json()

      if (!response.ok || 'error' in payload) {
        setErrorMessage(
          'error' in payload
            ? payload.error.message
            : 'Le service d\'analyse est momentanément indisponible.',
        )
        setStatus('error')
        return
      }

      setResult(payload.result)
      setMode(payload.mode)
      setStatus('success')
    } catch {
      setErrorMessage(
        'La connexion au service d\'analyse a échoué. Vérifiez votre réseau puis réessayez.',
      )
      setStatus('error')
    }
  }

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
          {mode === 'demo' ? <Badge level="neutral">Mode démonstration</Badge> : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-5">
          <section className="lg:col-span-2">
            <Card>
              <CardHeader title="Document à contrôler" />
              <div className="space-y-4 p-5">
                <UploadZone onPrepared={handlePrepared} disabled={status === 'analyzing'} />
                {preparedDocument ? <DocumentPreview document={preparedDocument} /> : null}
                <Button
                  onClick={() => void runAnalysis()}
                  disabled={!preparedDocument || status === 'analyzing'}
                >
                  {status === 'analyzing' ? 'Analyse en cours…' : 'Analyser le document'}
                </Button>
              </div>
            </Card>
          </section>

          <section className="lg:col-span-3">
            <Card>
              {status === 'analyzing' ? (
                <LoadingState />
              ) : status === 'error' ? (
                <ErrorState message={errorMessage} onRetry={() => void runAnalysis()} />
              ) : status === 'success' && result ? (
                <pre className="overflow-x-auto p-5 text-xs">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <EmptyState />
              )}
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Vérifier le build**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 5: Vérifier le parcours complet en mode démo**

S'assurer qu'aucun fichier `.env.local` ne définit `OPENAI_API_KEY`, puis
`npm run dev` :

| Action | Attendu |
|---|---|
| Au chargement | État vide, bouton « Analyser » désactivé |
| Après dépôt d'un document | Bouton activé, état vide toujours affiché |
| Clic sur « Analyser » | État de chargement pendant ~1,5 s |
| Fin de l'analyse | JSON brut affiché, badge « Mode démonstration » dans le header |
| Déposer un nouveau document | Le résultat précédent disparaît, retour à l'état vide |

Vérifier ensuite le cas d'erreur : arrêter le serveur `dev`, cliquer sur
« Analyser », l'`ErrorState` doit s'afficher avec le message réseau et un
bouton « Réessayer ».

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: machine d'état d'analyse, états de chargement et d'erreur"
```

---

### Task 5: Dashboard de résultats

**Files:**
- Create: `components/RiskScoreCard.tsx`, `components/ExtractedFields.tsx`, `components/SuspiciousElements.tsx`, `components/AnalysisReport.tsx`
- Modify: `app/page.tsx` (remplacer le `<pre>` par le dashboard)

**Interfaces:**
- Consumes: `AnalysisResult`, `ExtractedField`, `SuspiciousElement`, `Recommendation` (tâche 2) ; `RISK_LABELS`, `RISK_STYLES` (tâche 1) ; `Card`, `CardHeader`, `Badge` (tâche 1).
- Produces:
  - `RiskScoreCard({ score, level, documentType }: { score: number; level: RiskLevel; documentType: string })`
  - `ExtractedFields({ fields }: { fields: ExtractedField[] })`
  - `SuspiciousElements({ elements }: { elements: SuspiciousElement[] })` — la signature est étendue en tâche 6 avec les props de survol
  - `RecommendationBanner({ recommendation }: { recommendation: Recommendation })`
  - `AnalysisExplanation({ explanation }: { explanation: string })`

Les deux derniers vivent dans le même fichier `components/AnalysisReport.tsx` : ils sont séparés parce que la spec place la recommandation **avant** les deux colonnes et l'explication **après**.

- [ ] **Step 1: Créer `components/RiskScoreCard.tsx`**

Jauge en SVG, sans dépendance graphique. Le score est doublé d'un libellé texte.

```tsx
import { Badge } from '@/components/ui/Badge'
import { RISK_LABELS, RISK_STYLES } from '@/lib/risk'
import type { RiskLevel } from '@/lib/types'

export function RiskScoreCard({
  score,
  level,
  documentType,
}: {
  score: number
  level: RiskLevel
  documentType: string
}) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, score))
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={RISK_STYLES[level].stroke}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{clamped}</span>
          <span className="text-[10px] uppercase tracking-wide text-[var(--color-ink-muted)]">
            sur 100
          </span>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
          Score de risque
        </p>
        <div className="mt-1.5">
          <Badge level={level}>{RISK_LABELS[level]}</Badge>
        </div>
        <p className="mt-3 text-sm">
          <span className="text-[var(--color-ink-muted)]">Type détecté : </span>
          <span className="font-medium">{documentType}</span>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Créer `components/ExtractedFields.tsx`**

La confiance de lecture est affichée en toutes lettres : un champ lu à 0,71 ne
doit pas se présenter comme un fait établi.

```tsx
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
```

- [ ] **Step 3: Créer `components/SuspiciousElements.tsx`**

```tsx
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RISK_LABELS } from '@/lib/risk'
import type { SuspiciousElement } from '@/lib/types'

const CATEGORY_LABELS: Record<SuspiciousElement['category'], string> = {
  TYPOGRAPHIE: 'Typographie',
  MISE_EN_PAGE: 'Mise en page',
  COHERENCE_DONNEES: 'Cohérence des données',
  MANIPULATION_IMAGE: 'Manipulation d\'image',
  ELEMENTS_SECURITE: 'Éléments de sécurité',
}

export function SuspiciousElements({ elements }: { elements: SuspiciousElement[] }) {
  return (
    <Card>
      <CardHeader
        title="Éléments suspects"
        subtitle={`${elements.length} anomalie${elements.length > 1 ? 's' : ''} détectée${
          elements.length > 1 ? 's' : ''
        }`}
      />
      {elements.length === 0 ? (
        <p className="p-5 text-sm text-[var(--color-ink-muted)]">
          Aucune anomalie n&apos;a été détectée sur ce document.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-line)]">
          {elements.map((element) => (
            <li key={element.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{element.title}</p>
                <Badge level={element.severity}>{RISK_LABELS[element.severity]}</Badge>
              </div>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {CATEGORY_LABELS[element.category]}
              </p>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{element.description}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
```

- [ ] **Step 4: Créer `components/AnalysisReport.tsx`**

L'avertissement produit est une exigence de la spec, pas une note optionnelle.

```tsx
import { Card, CardHeader } from '@/components/ui/Card'
import type { Recommendation } from '@/lib/types'

const ACTION_LABELS: Record<Recommendation['action'], string> = {
  ACCEPTER: 'Document acceptable',
  VERIFICATION_MANUELLE: 'Vérification manuelle requise',
  REJETER: 'Document à rejeter',
}

const ACTION_STYLES: Record<Recommendation['action'], string> = {
  ACCEPTER:
    'border-[var(--color-risk-low)] bg-[var(--color-risk-low-soft)] text-[var(--color-risk-low)]',
  VERIFICATION_MANUELLE:
    'border-[var(--color-risk-medium)] bg-[var(--color-risk-medium-soft)] text-[var(--color-risk-medium)]',
  REJETER:
    'border-[var(--color-risk-high)] bg-[var(--color-risk-high-soft)] text-[var(--color-risk-high)]',
}

export function RecommendationBanner({ recommendation }: { recommendation: Recommendation }) {
  return (
    <div className={`rounded-lg border p-5 ${ACTION_STYLES[recommendation.action]}`}>
      <p className="text-xs uppercase tracking-wide opacity-80">Recommandation</p>
      <p className="mt-1 text-sm font-semibold">{ACTION_LABELS[recommendation.action]}</p>
      <p className="mt-2 text-sm text-[var(--color-ink)]">{recommendation.summary}</p>
      {recommendation.nextSteps.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {recommendation.nextSteps.map((step) => (
            <li key={step} className="flex gap-2 text-sm text-[var(--color-ink)]">
              <span aria-hidden="true">—</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function AnalysisExplanation({ explanation }: { explanation: string }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Analyse détaillée" />
        <p className="whitespace-pre-line p-5 text-sm leading-relaxed text-[var(--color-ink-muted)]">
          {explanation}
        </p>
      </Card>

      <p className="text-xs leading-relaxed text-[var(--color-ink-muted)]">
        DocShield AI est un outil d&apos;aide à la décision. Son analyse est produite par un
        modèle d&apos;intelligence artificielle et peut comporter des erreurs, dans les deux
        sens : un document authentique peut être signalé à tort, un document falsifié peut
        passer inaperçu. Ce résultat ne constitue ni une expertise, ni une preuve, ni un
        verdict juridique.
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Remplacer le `<pre>` par le dashboard dans `app/page.tsx`**

Ajouter les imports :

```tsx
import { RiskScoreCard } from '@/components/RiskScoreCard'
import { ExtractedFields } from '@/components/ExtractedFields'
import { SuspiciousElements } from '@/components/SuspiciousElements'
import { RecommendationBanner, AnalysisExplanation } from '@/components/AnalysisReport'
```

Remplacer entièrement la `<section className="lg:col-span-3">` par le bloc
ci-dessous. La `Card` englobante disparaît : elle reste autour des trois états
transitoires, tandis que le dashboard de résultats gère ses propres cartes.
L'ordre suit la spec — score, recommandation, deux colonnes, explication.

```tsx
<section className="lg:col-span-3">
  {status === 'analyzing' ? (
    <Card>
      <LoadingState />
    </Card>
  ) : status === 'error' ? (
    <Card>
      <ErrorState message={errorMessage} onRetry={() => void runAnalysis()} />
    </Card>
  ) : status === 'success' && result ? (
    <div className="space-y-6">
      <Card>
        <RiskScoreCard
          score={result.riskScore}
          level={result.riskLevel}
          documentType={result.detectedDocumentType}
        />
      </Card>
      <RecommendationBanner recommendation={result.recommendation} />
      <div className="grid gap-6 xl:grid-cols-2">
        <ExtractedFields fields={result.extractedInformation} />
        <SuspiciousElements elements={result.suspiciousElements} />
      </div>
      <AnalysisExplanation explanation={result.explanation} />
    </div>
  ) : (
    <Card>
      <EmptyState />
    </Card>
  )}
</section>
```

- [ ] **Step 6: Vérifier le build**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 7: Vérifier le rendu**

Run: `npm run dev`, déposer un document, lancer l'analyse.

| Point | Attendu |
|---|---|
| Jauge | Arc rouge aux ~3/4, valeur 74 au centre |
| Badge de niveau | « Risque élevé », rouge, avec pastille |
| Champs extraits | 6 lignes, mention de confiance sous chaque valeur |
| Éléments suspects | 3 anomalies, badges de sévérité distincts |
| Recommandation | Encadré rouge « Document à rejeter » + 4 étapes |
| Avertissement | Présent sous l'analyse détaillée |
| Responsive | Sous 1280 px, champs et anomalies s'empilent ; sous 1024 px, les deux colonnes principales s'empilent |

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: dashboard de résultats — score, champs extraits, anomalies et rapport"
```

---

### Task 6: Overlay des zones suspectes et liaison au survol

**Files:**
- Modify: `components/DocumentPreview.tsx` (overlay SVG)
- Modify: `components/SuspiciousElements.tsx` (props de survol)
- Modify: `app/page.tsx` (état `activeElementId` partagé)

**Interfaces:**
- Consumes: `SuspiciousRegion`, `SuspiciousElement` (tâche 2) ; `RISK_STYLES` (tâche 1).
- Produces:
  - `clampRegion(region: SuspiciousRegion): SuspiciousRegion` exportée depuis `lib/risk.ts`
  - `DocumentPreview({ document, regions, elements, activeElementId, onHoverElement })`
  - `SuspiciousElements({ elements, activeElementId, onHoverElement })`

- [ ] **Step 1: Ajouter `clampRegion` dans `lib/risk.ts`**

Les coordonnées renvoyées par un modèle vision sortent parfois des bornes.
On les ramène dans `[0, 1]` plutôt que de rejeter l'analyse entière.

```ts
import type { SuspiciousRegion } from '@/lib/types'

export function clampRegion(region: SuspiciousRegion): SuspiciousRegion {
  const x = Math.min(1, Math.max(0, region.x))
  const y = Math.min(1, Math.max(0, region.y))
  return {
    ...region,
    x,
    y,
    width: Math.min(1 - x, Math.max(0.01, region.width)),
    height: Math.min(1 - y, Math.max(0.01, region.height)),
  }
}
```

- [ ] **Step 2: Ajouter l'overlay dans `components/DocumentPreview.tsx`**

L'overlay est un `<svg>` en `viewBox="0 0 1 1"` avec
`preserveAspectRatio="none"`, superposé à l'image en position absolue : les
coordonnées normalisées s'y appliquent directement, sans conversion en pixels
et sans dépendre de la taille de rendu.

Les régions dont l'`elementId` ne correspond à aucun élément suspect sont
ignorées, conformément à la spec.

Remplacer le contenu du fichier par :

```tsx
'use client'

import { clampRegion, RISK_STYLES } from '@/lib/risk'
import type { PreparedDocument } from '@/lib/pdf'
import type { SuspiciousElement, SuspiciousRegion } from '@/lib/types'

export function DocumentPreview({
  document,
  regions = [],
  elements = [],
  activeElementId = null,
  onHoverElement,
}: {
  document: PreparedDocument
  regions?: SuspiciousRegion[]
  elements?: SuspiciousElement[]
  activeElementId?: string | null
  onHoverElement?: (id: string | null) => void
}) {
  const severityById = new Map(elements.map((element) => [element.id, element.severity]))
  const drawable = regions
    .filter((region) => severityById.has(region.elementId))
    .map(clampRegion)

  return (
    <div>
      <div className="relative overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-canvas)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={document.dataUrl}
          alt={`Aperçu de ${document.fileName}`}
          className="block h-auto w-full"
        />
        {drawable.length > 0 ? (
          <svg
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            {drawable.map((region) => {
              const severity = severityById.get(region.elementId)!
              const active = activeElementId === region.elementId
              return (
                <rect
                  key={`${region.elementId}-${region.x}-${region.y}`}
                  x={region.x}
                  y={region.y}
                  width={region.width}
                  height={region.height}
                  fill={RISK_STYLES[severity].stroke}
                  fillOpacity={active ? 0.22 : 0.08}
                  stroke={RISK_STYLES[severity].stroke}
                  strokeWidth={active ? 0.006 : 0.003}
                  vectorEffect="non-scaling-stroke"
                  className="cursor-pointer"
                  onMouseEnter={() => onHoverElement?.(region.elementId)}
                  onMouseLeave={() => onHoverElement?.(null)}
                >
                  <title>{region.label}</title>
                </rect>
              )
            })}
          </svg>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <span className="truncate">{document.fileName}</span>
        <span>
          {document.width} × {document.height} px
          {document.pageCount > 1 ? ` — page 1 sur ${document.pageCount}` : ''}
        </span>
      </div>
      {document.pageCount > 1 ? (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
          Seule la première page est analysée dans cette version.
        </p>
      ) : null}
      {drawable.length > 0 ? (
        <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
          {drawable.length} zone{drawable.length > 1 ? 's' : ''} signalée
          {drawable.length > 1 ? 's' : ''} sur le document. Survolez une zone ou une anomalie
          pour faire le lien.
        </p>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 3: Rendre `SuspiciousElements` interactif**

Modifier la signature et l'élément de liste. Un élément sans région associée
est signalé explicitement — l'utilisateur doit comprendre pourquoi rien ne
s'allume sur le document.

Nouvelle signature :

```tsx
export function SuspiciousElements({
  elements,
  regions = [],
  activeElementId = null,
  onHoverElement,
}: {
  elements: SuspiciousElement[]
  regions?: SuspiciousRegion[]
  activeElementId?: string | null
  onHoverElement?: (id: string | null) => void
})
```

Ajouter en tête du corps :

```tsx
const locatedIds = new Set(regions.map((region) => region.elementId))
```

Remplacer le `<li>` par :

```tsx
<li
  key={element.id}
  onMouseEnter={() => onHoverElement?.(element.id)}
  onMouseLeave={() => onHoverElement?.(null)}
  className={`px-5 py-4 ${
    activeElementId === element.id ? 'bg-[var(--color-canvas)]' : ''
  } ${locatedIds.has(element.id) ? 'cursor-pointer' : ''}`}
>
  <div className="flex items-start justify-between gap-3">
    <p className="text-sm font-medium">{element.title}</p>
    <Badge level={element.severity}>{RISK_LABELS[element.severity]}</Badge>
  </div>
  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
    {CATEGORY_LABELS[element.category]}
    {locatedIds.has(element.id) ? '' : ' — non localisable sur le document'}
  </p>
  <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{element.description}</p>
</li>
```

Ajouter l'import de type `SuspiciousRegion` depuis `@/lib/types`.

- [ ] **Step 4: Partager l'état de survol dans `app/page.tsx`**

Ajouter l'état :

```tsx
const [activeElementId, setActiveElementId] = useState<string | null>(null)
```

Le réinitialiser à `null` dans `handlePrepared` et au début de `runAnalysis`.

Passer les props à l'aperçu :

```tsx
<DocumentPreview
  document={preparedDocument}
  regions={result?.suspiciousRegions ?? []}
  elements={result?.suspiciousElements ?? []}
  activeElementId={activeElementId}
  onHoverElement={setActiveElementId}
/>
```

Et à la liste d'anomalies :

```tsx
<SuspiciousElements
  elements={result.suspiciousElements}
  regions={result.suspiciousRegions}
  activeElementId={activeElementId}
  onHoverElement={setActiveElementId}
/>
```

- [ ] **Step 5: Vérifier le build**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 6: Vérifier l'interaction**

Run: `npm run dev`, déposer un document, lancer l'analyse.

| Point | Attendu |
|---|---|
| Après analyse | Deux rectangles visibles sur l'aperçu, un rouge et un ambre |
| Survol d'un rectangle | Il s'épaissit, la ligne correspondante se surligne dans « Éléments suspects » |
| Survol de « Solde de clôture recomposé » | Le rectangle rouge s'épaissit |
| Survol de « Somme des opérations incohérente » | Aucun rectangle ne réagit, la mention « non localisable sur le document » est affichée |
| Redimensionner la fenêtre | Les rectangles restent alignés sur l'image à toutes les largeurs |

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: overlay des zones suspectes et liaison au survol"
```

---

### Task 7: Intégration OpenAI réelle

**Files:**
- Create: `lib/prompt.ts`, `lib/openai.ts`
- Modify: `app/api/analyze/route.ts`
- Modify: `package.json` (dépendance `openai`)

**Interfaces:**
- Consumes: `analysisResultSchema`, `ANALYSIS_JSON_SCHEMA` (tâche 2) ; `AnalysisResult`, `AnalyzeErrorCode` (tâche 2).
- Produces:
  - `ANALYSIS_SYSTEM_PROMPT: string`
  - `class UpstreamError extends Error`
  - `class ModelOutputError extends Error`
  - `analyzeDocument(imageDataUrl: string, apiKey: string): Promise<AnalysisResult>`

- [ ] **Step 1: Installer le SDK OpenAI**

Run: `npm install openai`

- [ ] **Step 2: Créer `lib/prompt.ts`**

Le prompt couvre les trois catégories retenues (identité, administratif,
financier) et impose la calibration du score. Le point le plus important est
l'instruction anti-sur-signalement : sans elle, un modèle vision signale des
anomalies sur à peu près n'importe quel scan.

```ts
export const ANALYSIS_SYSTEM_PROMPT = `Tu es un analyste documentaire spécialisé dans la détection de falsifications, au service d'un opérateur humain qui prendra la décision finale.

On te transmet l'image d'un document officiel : pièce d'identité, document administratif ou document financier. Tu produis une analyse structurée en français.

MÉTHODE D'INSPECTION

1. Identifier le type de document et sa structure attendue.
2. Extraire les champs porteurs de sens : identité, dates, numéros, montants, émetteur.
3. Inspecter le document selon cinq axes :
   - TYPOGRAPHIE : polices mélangées, graisses incohérentes, espacement irrégulier, alignement de ligne de base rompu sur un champ isolé.
   - MISE_EN_PAGE : marges et grilles non respectées, blocs décalés, proportions inhabituelles pour ce type de document.
   - COHERENCE_DONNEES : totaux qui ne tombent pas juste, dates impossibles ou contradictoires, numéros au format non conforme, âge incompatible avec la date de naissance.
   - MANIPULATION_IMAGE : bords de texte plus nets ou plus flous que leur environnement, ruptures de bruit ou de compression, texte réinséré, photo recollée, résidus d'effacement.
   - ELEMENTS_SECURITE : sceaux, signatures, filigranes, guillochis, zones MRZ absents, déformés ou manifestement copiés.

CALIBRATION DU SCORE

- 0-33 : aucune anomalie significative, ou irrégularités attribuables à la qualité du scan.
- 34-66 : anomalies réelles mais isolées ou explicables autrement, un contrôle humain est nécessaire.
- 67-100 : faisceau d'indices convergents portant sur l'information que le document est censé prouver.

Le champ riskLevel doit être cohérent avec riskScore selon ces mêmes bornes.

RIGUEUR ATTENDUE

Ne signale que ce que tu observes réellement sur l'image. Un scan de mauvaise qualité, une photo prise de travers, une compression agressive ou un document simplement ancien ne sont pas des falsifications : ne les signale pas comme telles. S'il n'y a rien de suspect, renvoie une liste d'éléments suspects vide et un score bas — c'est un résultat valide et attendu, pas un échec d'analyse.

Si l'image est illisible ou ne contient pas de document, renseigne detectedDocumentType en conséquence, laisse les listes vides, attribue un score de 0 et explique dans explanation pourquoi aucune analyse n'a été possible.

ZONES SUSPECTES

Pour chaque anomalie localisable visuellement, fournis une entrée dans suspiciousRegions dont elementId reprend exactement l'id de l'élément suspect correspondant. Les coordonnées sont normalisées entre 0 et 1 : x et y désignent le coin haut-gauche, width et height la taille de la boîte, relativement à l'image entière. Sois généreux sur la taille de la boîte plutôt que trop précis : elle doit contenir la zone concernée.

Une anomalie non localisable, comme une incohérence entre deux valeurs, ne doit pas produire de région : n'invente jamais de coordonnées.

RÉDACTION

explanation fait deux à quatre phrases, expose le raisonnement et distingue ce qui est certain de ce qui est probable. recommendation.summary indique quoi faire du document et pourquoi. nextSteps liste des actions concrètes de vérification. Le tout en français, dans un registre professionnel et sobre, sans dramatisation.`
```

- [ ] **Step 3: Créer `lib/openai.ts`**

```ts
import OpenAI from 'openai'
import { analysisResultSchema, ANALYSIS_JSON_SCHEMA } from '@/lib/schema'
import { ANALYSIS_SYSTEM_PROMPT } from '@/lib/prompt'
import type { AnalysisResult } from '@/lib/types'

const DEFAULT_MODEL = 'gpt-4o'

export class UpstreamError extends Error {}
export class ModelOutputError extends Error {}

export async function analyzeDocument(
  imageDataUrl: string,
  apiKey: string,
): Promise<AnalysisResult> {
  const client = new OpenAI({ apiKey })
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL

  let rawContent: string | null
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyse ce document et renvoie le résultat structuré attendu.',
            },
            { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
          ],
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'document_analysis',
          strict: true,
          schema: ANALYSIS_JSON_SCHEMA as Record<string, unknown>,
        },
      },
    })

    rawContent = completion.choices[0]?.message?.content ?? null
  } catch (cause) {
    throw new UpstreamError(cause instanceof Error ? cause.message : 'appel OpenAI en échec')
  }

  if (!rawContent) {
    throw new ModelOutputError('réponse vide du modèle')
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawContent)
  } catch {
    throw new ModelOutputError('réponse du modèle non parsable en JSON')
  }

  const validated = analysisResultSchema.safeParse(parsedJson)
  if (!validated.success) {
    throw new ModelOutputError(JSON.stringify(validated.error.flatten()))
  }

  return validated.data
}
```

- [ ] **Step 4: Brancher le chemin réel dans `app/api/analyze/route.ts`**

Ajouter l'import :

```ts
import { analyzeDocument, ModelOutputError, UpstreamError } from '@/lib/openai'
```

Remplacer le bloc `// Chemin réel implémenté en tâche 7.` et le `return` qui le
suit par :

```ts
  try {
    const result = await analyzeDocument(imageDataUrl, apiKey)
    const body: AnalyzeResponse = { mode: 'live', result }
    return NextResponse.json(body)
  } catch (cause) {
    if (cause instanceof ModelOutputError) {
      console.error('[analyze] sortie du modèle invalide :', cause.message)
      return errorResponse(
        'INVALID_MODEL_OUTPUT',
        'L\'analyse produite n\'est pas exploitable. Relancez l\'analyse du document.',
        502,
      )
    }

    console.error('[analyze] échec de l\'appel au fournisseur :', cause)
    return errorResponse(
      'UPSTREAM_FAILURE',
      'Le service d\'analyse est momentanément indisponible. Réessayez dans quelques instants.',
      502,
    )
  }
```

Le `console.error` reste côté serveur : aucun détail technique ne part vers le
client.

- [ ] **Step 5: Vérifier le build**

Run: `npm run build`
Expected: build réussi.

- [ ] **Step 6: Vérifier le chemin réel**

Créer un fichier `.env.local` contenant une clé OpenAI valide :

```
OPENAI_API_KEY=sk-...
```

Run: `npm run dev`, puis déposer un document réel et lancer l'analyse.

| Point | Attendu |
|---|---|
| Badge « Mode démonstration » | Absent |
| Résultat | Champs extraits cohérents avec le document déposé |
| Score et niveau | Cohérents entre eux selon les bornes 0-33 / 34-66 / 67-100 |
| Zones suspectes | Alignées avec les éléments décrits, si le modèle en a signalé |
| Document manifestement authentique | Score bas, liste d'anomalies vide ou courte |

Vérifier ensuite le cas d'échec fournisseur : remplacer temporairement la clé
par `sk-invalide`, relancer une analyse. Attendu : `ErrorState` avec « Le
service d'analyse est momentanément indisponible… », et une trace d'erreur dans
le terminal du serveur uniquement.

Supprimer `.env.local` pour revenir au mode démonstration.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: analyse réelle via l'API OpenAI en sortie structurée"
```

---

### Task 8: Documentation et vérification finale

**Files:**
- Create: `README.md`, `.env.example`
- Modify: aucun fichier de code, sauf correctif issu des vérifications.

**Interfaces:**
- Consumes: l'ensemble du projet.
- Produces: documentation d'installation et d'exécution.

- [ ] **Step 1: Créer `.env.example`**

```
# Clé API OpenAI. Si elle est absente ou vide, l'application démarre en mode
# démonstration et renvoie un résultat d'analyse fictif.
OPENAI_API_KEY=

# Modèle vision utilisé. Optionnel — valeur par défaut : gpt-4o
OPENAI_MODEL=gpt-4o
```

- [ ] **Step 2: Créer `README.md`**

````markdown
# DocShield AI

Outil de pré-contrôle d'authenticité documentaire assisté par IA. Vous déposez
un document officiel — pièce d'identité, document administratif ou financier —
et l'application renvoie un score de risque, les anomalies détectées avec leur
localisation sur le document, les informations extraites, une explication et
une recommandation d'action.

Prototype de démonstration. Le résultat est une aide à la décision, pas une
expertise ni une preuve.

## Prérequis

- Node.js 18.18 ou supérieur
- npm

## Installation

```bash
npm install
npm run dev
```

L'application est disponible sur http://localhost:3000

## Variables d'environnement

Copiez `.env.example` vers `.env.local` :

```bash
cp .env.example .env.local
```

| Variable | Requis | Défaut | Rôle |
|---|---|---|---|
| `OPENAI_API_KEY` | non | — | Clé API OpenAI. Absente : mode démonstration |
| `OPENAI_MODEL` | non | `gpt-4o` | Modèle vision utilisé |

La clé n'est lue que côté serveur, dans la route `app/api/analyze/route.ts`.
Elle n'est jamais transmise au navigateur.

## Mode démonstration

Sans `OPENAI_API_KEY`, l'application reste entièrement utilisable : la route
d'analyse renvoie un jeu de résultats fictif mais réaliste, et l'interface
affiche un badge « Mode démonstration ». Toutes les fonctionnalités — aperçu,
zones suspectes, survol lié, dashboard — sont démontrables sans clé.

## Fonctionnement

1. Le navigateur convertit le document déposé en une image PNG unique : rendu
   de la première page via `pdfjs-dist` pour un PDF, redimensionnement pour une
   image. Le côté long est ramené à 1600 px maximum.
2. Cette même image sert d'aperçu affiché **et** de charge utile envoyée à
   `/api/analyze`. Le modèle et l'utilisateur regardent donc exactement les
   mêmes pixels, ce qui garantit l'alignement des zones suspectes sur l'aperçu.
3. La route serveur appelle l'API OpenAI en sortie structurée, puis revalide la
   réponse avec Zod avant de la renvoyer.

## Formats acceptés

PDF, JPG, PNG — 10 Mo maximum. Sur un PDF de plusieurs pages, seule la première
page est analysée.

## Limites connues

- Analyse de la première page uniquement pour les documents multi-pages.
- Aucune persistance : les analyses ne sont pas conservées, un rechargement de
  page repart d'un état vide.
- Aucune analyse forensique réelle : pas d'ELA, pas de lecture de métadonnées
  EXIF, pas de vérification de signature numérique. L'analyse repose
  exclusivement sur le raisonnement visuel du modèle.
- Les coordonnées des zones suspectes sont approximatives : les modèles vision
  localisent correctement, mais cadrent imparfaitement.
- Le résultat peut comporter des erreurs dans les deux sens — faux positifs sur
  un document authentique, faux négatifs sur un document falsifié.

## Structure du projet

```
app/
  api/analyze/route.ts   Route d'analyse — seul lecteur de la clé API
  page.tsx               Dashboard, machine d'état
components/              Composants d'affichage, sans appel réseau
lib/
  pdf.ts                 Conversion document → image (navigateur)
  schema.ts              Schéma Zod et JSON Schema
  prompt.ts              Prompt d'analyse
  openai.ts              Appel au modèle
  mock.ts                Jeu de démonstration
```
````

- [ ] **Step 3: Vérifier l'absence de la clé API dans le bundle client**

```bash
npm run build
grep -r "OPENAI_API_KEY" .next/static || echo "OK — aucune occurrence côté client"
```

Expected: `OK — aucune occurrence côté client`

- [ ] **Step 4: Vérifier les critères d'acceptation de la spec**

| Critère | Vérification |
|---|---|
| `npm install && npm run dev` suffit | Supprimer `node_modules` et `.next`, relancer les deux commandes |
| Parcours complet démontrable sans clé | Sans `.env.local`, dérouler upload → analyse → dashboard |
| Analyse réelle valide avec clé | Avec `.env.local`, analyser un document réel |
| Alignement de l'overlay | Les boîtes couvrent les zones décrites |
| Trois niveaux distinguables | Les badges `LOW`, `MEDIUM`, `HIGH` diffèrent en couleur et en libellé |
| Responsive | Vérifier à 1440 px, 1024 px et 390 px de large |

Corriger tout écart constaté avant de passer à l'étape suivante.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: README, variables d'environnement et vérification finale"
```

---

## Couverture de la spec

| Section de la spec | Tâche |
|---|---|
| 1. Objectif, périmètre, avertissement produit | 5 (avertissement), 8 (README) |
| 2. Stack | 1, 2, 3, 7 |
| 3. Normalisation en image côté client | 3 |
| 4. Contrat de données, enveloppe, contrat d'erreur | 2 |
| 5. Arborescence | 1 à 8 |
| 6. Interface, machine d'état, dashboard, direction artistique | 1, 4, 5, 6 |
| 7. Gestion des erreurs | 3 (upload), 4 (réseau, API), 6 (clamp, régions orphelines), 7 (fournisseur, sortie invalide) |
| 8. Mode démonstration | 2 (route), 4 (badge) |
| 9. Fiabilité de la sortie du modèle | 2 (Zod, JSON Schema), 7 (double garde-fou) |
| 10. Variables d'environnement | 7, 8 |
| 11. Vérification | dernière étape de chaque tâche, 8 (critères d'acceptation) |
| 12. Documentation | 8 |
