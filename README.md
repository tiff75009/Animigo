# Animigo

Plateforme de mise en relation entre propriétaires d'animaux et gardes de confiance.

## Prérequis

- [Bun](https://bun.sh/) (gestionnaire de paquets)
- Convex self-hosted configuré

## Installation

```bash
bun install
```

## Configuration

Créer un fichier `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_CONVEX_URL=https://votre-instance-convex.example.com
```

## Développement

Lancer les deux commandes dans des terminaux séparés :

```bash
# Terminal 1 - Next.js
bun run dev

# Terminal 2 - Convex
bunx convex dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## Build

```bash
bun run build
```

## Stack technique

- **Frontend** : Next.js 16, React 19, TypeScript
- **Backend** : Convex (self-hosted)
- **Styling** : Tailwind CSS 4
- **Animations** : Framer Motion
- **Cartes** : Leaflet / React-Leaflet
