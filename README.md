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
