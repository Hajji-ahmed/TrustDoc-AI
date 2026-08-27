# DocShield AI — Design

Date : 2026-08-27
Statut : validé
Type : nouveau projet (prototype 72 h)

## 1. Objectif

Outil de pré-contrôle d'authenticité documentaire assisté par IA. L'utilisateur
dépose un document officiel (PDF, JPG, PNG). L'application l'analyse via un
modèle multimodal OpenAI et restitue un score de risque, les éléments suspects
détectés, les informations extraites, une explication et une recommandation
d'action.

Le livrable est une démonstration crédible pour un public B2B, pas un système de
production. En cas d'arbitrage, la démontrabilité prime sur la sophistication.

### Périmètre

Catégories de documents couvertes : **identité**, **administratif**,
**financier**. Un prompt unique porte une taxonomie commune et des règles
d'inspection propres à chaque catégorie.

### Hors périmètre

- Aucune persistance : ni base de données, ni compte, ni historique. Un
  rechargement de page repart d'un état vide.
- Aucune authentification.
- Aucune analyse forensique réelle (ELA, métadonnées EXIF, hachage). L'analyse
  repose exclusivement sur le raisonnement visuel du modèle.
- Aucun traitement multi-pages automatique : sur un PDF, la page 1 est analysée.

### Avertissement produit

L'interface indique que le résultat est une aide à la décision et non un verdict
juridique. C'est une exigence de design, pas une note de bas de page : un outil
qui affiche « RISQUE ÉLEVÉ » sur un document authentique doit dire clairement
qu'il se trompe parfois.

## 2. Stack

| Élément | Choix |
|---|---|
| Framework | Next.js, App Router |
| Langage | TypeScript, mode strict |
| Styles | Tailwind CSS |
| IA | API OpenAI, modèle vision configurable via `OPENAI_MODEL` |
| Validation | Zod, côté serveur, sur la réponse du modèle |
| Conversion PDF | `pdfjs-dist`, côté navigateur |
| État | `useState` dans la page dashboard, pas de state manager |

La clé API n'est lue que dans la route serveur. Elle n'est jamais exposée au
bundle client, et aucune variable `NEXT_PUBLIC_` ne la référence.

## 3. Décision structurante : normalisation en image côté client

Le navigateur convertit tout document entrant en une image PNG unique, puis
utilise **cette même image** comme aperçu affiché et comme charge utile envoyée
à l'API.

```
fichier → validation (MIME + taille ≤ 10 Mo)
        → PDF : rendu de la page 1 sur <canvas> via pdfjs
          image : chargement sur <canvas>
        → redimensionnement, côté long ≤ 1600 px
        → export PNG en dataURL
        → aperçu ET payload API
```

Conséquence recherchée : le modèle et l'utilisateur regardent exactement les
mêmes pixels. Les coordonnées normalisées renvoyées par le modèle s'alignent
donc sur l'aperçu par construction, sans transformation de repère.

Alternatives écartées :

- **Envoi du PDF brut au serveur.** Supprime le code de conversion, mais
  l'aperçu devient un `<iframe>` dont l'échelle et le défilement échappent au
  contrôle de l'application. L'overlay de zones suspectes ne peut plus s'aligner
  de façon fiable, ce qui annule une fonctionnalité retenue.
- **Conversion côté serveur** (poppler, `sharp`, `canvas` natif). Correct sur le
  fond, mais impose des dépendances natives, alourdit le build et pose des
  problèmes d'installation sous Windows. Hors budget.

## 4. Contrat de données

Le type ci-dessous est la source de vérité partagée entre client et serveur. Le
schéma Zod et le JSON Schema transmis à OpenAI en dérivent tous les deux.

```ts
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

interface AnalysisResult {
  riskScore: number                   // 0-100
  riskLevel: RiskLevel
  detectedDocumentType: string        // "Relevé bancaire", "Carte d'identité"…
  extractedInformation: {
    label: string                     // "Nom du titulaire"
    value: string
    confidence: number                // 0-1
  }[]
  suspiciousElements: {
    id: string                        // "sus-1" — clé de liaison
    title: string
    description: string
    severity: RiskLevel
    category:
      | 'TYPOGRAPHIE'
      | 'MISE_EN_PAGE'
      | 'COHERENCE_DONNEES'
      | 'MANIPULATION_IMAGE'
      | 'ELEMENTS_SECURITE'
  }[]
  suspiciousRegions: {
    elementId: string                 // référence suspiciousElements[].id
    x: number                         // coin haut-gauche, normalisé 0-1
    y: number
    width: number                     // normalisé 0-1
    height: number
    label: string
  }[]
  explanation: string
  recommendation: {
    action: 'ACCEPTER' | 'VERIFICATION_MANUELLE' | 'REJETER'
    summary: string
    nextSteps: string[]
  }
}
```

`suspiciousRegions[].elementId` référence `suspiciousElements[].id`. Ce lien est
ce qui rend l'overlay interactif : survoler un élément de la liste met en
évidence sa boîte sur le document, et réciproquement. Sans cette clé, les deux
affichages seraient indépendants.

Un élément suspect peut n'avoir aucune région associée (anomalie non
localisable, par exemple une incohérence de dates). L'interface doit gérer ce
cas sans dégradation.

### Enveloppe de réponse

```ts
interface AnalyzeResponse {
  mode: 'live' | 'demo'
  result: AnalysisResult
}
```

`mode` pilote l'affichage du badge « Mode démonstration ».

### Contrat d'erreur

```ts
interface AnalyzeError {
  error: {
    code: 'INVALID_REQUEST' | 'UPSTREAM_FAILURE' | 'INVALID_MODEL_OUTPUT'
    message: string   // formulé pour l'utilisateur final, en français
  }
}
```

Le détail technique d'une erreur est journalisé côté serveur et n'est jamais
renvoyé au client.

## 5. Arborescence

```
docshield-ai/
├── app/
│   ├── layout.tsx              # shell, métadonnées, police
│   ├── page.tsx                # dashboard, machine d'état
│   ├── globals.css             # Tailwind + tokens de risque
│   └── api/analyze/route.ts    # POST, seul lecteur de la clé API
├── components/
│   ├── UploadZone.tsx
│   ├── DocumentPreview.tsx     # <img> + overlay SVG
│   ├── RiskScoreCard.tsx
│   ├── ExtractedFields.tsx
│   ├── SuspiciousElements.tsx
│   ├── AnalysisReport.tsx
│   ├── states/                 # EmptyState, LoadingState, ErrorState
│   └── ui/                     # Card, Badge, Button
├── lib/
│   ├── types.ts
│   ├── schema.ts               # Zod + JSON Schema
│   ├── prompt.ts
│   ├── openai.ts
│   ├── mock.ts
│   └── pdf.ts                  # navigateur uniquement
├── .env.example
└── README.md
```

Chaque composant a une responsabilité unique et reçoit ses données en props.
Aucun composant d'affichage n'appelle l'API : `app/page.tsx` est le seul point
d'orchestration.

## 6. Interface

### Disposition

Écran unique, deux colonnes sur desktop, empilées sur mobile.

```
┌─ Header : DocShield AI ─────────────── [badge Mode démonstration] ─┐
├────────────────────────┬───────────────────────────────────────────┤
│ GAUCHE (40 %)          │ DROITE (60 %)                             │
│                        │                                           │
│ UploadZone             │  idle       → EmptyState                  │
│  ↓ fichier préparé     │  analyzing  → LoadingState                │
│ DocumentPreview        │  error      → ErrorState + Réessayer      │
│  + overlay SVG         │  success    → dashboard de résultats      │
│                        │                                           │
│ [ Analyser le document]│                                           │
└────────────────────────┴───────────────────────────────────────────┘
```

### Machine d'état

`idle → filePrepared → analyzing → success | error`

Les transitions sont déclenchées par des actions explicites. Le dépôt d'un
fichier ne lance pas l'analyse : le bouton « Analyser le document » reste le
seul déclencheur. Déposer un nouveau fichier réinitialise l'état à
`filePrepared` et efface le résultat précédent.

### Dashboard de résultats

De haut en bas :

1. **Bandeau de score** — jauge circulaire (0-100), badge de niveau coloré, type
   de document détecté.
2. **Recommandation** — encadré d'action avec le verdict et les étapes suivantes.
3. **Deux colonnes** — informations extraites à gauche, éléments suspects à
   droite.
4. **Explication** — texte de synthèse.

Survoler un élément suspect met en évidence sa région sur l'aperçu.

### Direction artistique

Interface B2B sobre : fond neutre clair, cartes à bordure fine, hiérarchie
typographique nette, aucune animation décorative. La couleur est réservée à la
signalétique de risque et n'est jamais utilisée en ornement.

Échelle de risque, appliquée de façon identique au score, aux badges de niveau,
aux sévérités et aux boîtes de l'overlay :

| Niveau | Score | Couleur |
|---|---|---|
| LOW | 0-33 | vert |
| MEDIUM | 34-66 | ambre |
| HIGH | 67-100 | rouge |

La couleur ne porte jamais seule l'information : chaque badge est accompagné de
son libellé textuel.

### Langue

Interface et contenus produits par le modèle en français.

## 7. Gestion des erreurs

| Cas | Traitement |
|---|---|
| Type de fichier non supporté | Refus à l'upload, message dans la zone |
| Fichier > 10 Mo | Refus à l'upload |
| PDF illisible ou corrompu | Échec de conversion, aperçu non généré, message dédié |
| Clé API absente | Pas une erreur : bascule en mode démonstration |
| Échec OpenAI (réseau, quota, 401) | `ErrorState` avec « Réessayer », détail journalisé côté serveur |
| JSON du modèle invalide après Zod | `ErrorState` « analyse non exploitable », relance proposée |
| Coordonnées hors bornes | Bornées à [0, 1] côté client, l'analyse reste affichée |
| Région sans élément suspect correspondant | Région ignorée à l'affichage |

Aucun message générique de type « une erreur est survenue » n'est acceptable :
chaque cas ci-dessus a son propre libellé.

## 8. Mode démonstration

Si `OPENAI_API_KEY` est absente ou vide, la route `/api/analyze` renvoie un
résultat mocké réaliste après un délai simulé d'environ 1,5 s, avec
`mode: 'demo'`. Le jeu de données mocké contient plusieurs éléments suspects et
leurs régions, afin que l'overlay et l'interaction de survol soient
démontrables sans clé.

L'interface affiche alors un badge « Mode démonstration » dans l'en-tête. Ce
badge est une exigence d'honnêteté : rien ne doit laisser croire qu'une analyse
réelle a eu lieu.

Le résultat mocké est déterministe. Il est produit par la même fonction de
validation Zod que le chemin réel, ce qui garantit qu'il ne peut pas dériver du
contrat de données.

## 9. Fiabilité de la sortie du modèle

Deux garde-fous successifs :

1. **Sortie structurée** — un JSON Schema strict est transmis à l'API OpenAI.
2. **Validation Zod** — la réponse est re-validée côté serveur avant d'être
   renvoyée. Un échec produit `INVALID_MODEL_OUTPUT`, jamais un dashboard
   partiellement rempli.

## 10. Variables d'environnement

| Variable | Requis | Défaut | Rôle |
|---|---|---|---|
| `OPENAI_API_KEY` | non | — | Absente : mode démonstration |
| `OPENAI_MODEL` | non | `gpt-4o` | Change de modèle vision sans toucher au code |

## 11. Vérification

Pas de suite de tests automatisés : sur un prototype de 72 h, le coût de mise en
place dépasse le bénéfice. La fiabilité repose sur la validation Zod au runtime,
qui est le véritable garde-fou du système.

Chaque tâche livrée est vérifiée par :

1. `npm run build` sans erreur TypeScript ;
2. un parcours manuel en mode démonstration.

Critères d'acceptation du prototype :

- `npm install && npm run dev` suffit à démarrer le projet ;
- sans clé API, le parcours complet est démontrable de bout en bout ;
- avec une clé API, un document réel produit une analyse structurée valide ;
- les boîtes de l'overlay s'alignent visuellement sur les zones décrites ;
- les trois niveaux de risque sont distinguables sans ambiguïté ;
- aucune trace de la clé API dans le bundle client.

## 12. Documentation

Un `README.md` couvre : présentation, prérequis, installation, variables
d'environnement, lancement, mode démonstration, limites connues.
