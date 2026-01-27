**TOUJOURS PARLER EN FRANÇAIS.**

# Animigo - Configuration Claude Code

**Langue : Toujours répondre en français.**

Marketplace de services animaliers. Next.js 16 + Convex Self-Hosted + Tailwind v4 + ShadCN.

## Commandes Agents

| Commande | Usage |
|----------|-------|
| `/convex` | Backend Convex (schéma, mutations, queries) |
| `/ui` | Frontend (Tailwind, ShadCN, Framer Motion) |
| `/orchestrator` | Coordination et planification |
| `/fullstack` | Fonctionnalité complète (backend + frontend) |

## Commandes de développement

```bash
bun run dev          # Next.js :3000
bun run build        # Build production
bunx convex dev      # Backend Convex
```

## Règles critiques

### "use client" obligatoire si :
- useState/useEffect/useRef
- onClick/onChange/onSubmit
- useQuery/useMutation (Convex)

### Convex - toujours :
```typescript
// 1. Typer les args
args: { sessionToken: v.string(), id: v.id("missions") }
// 2. Valider la session en premier
const session = await validateSession(ctx, args.sessionToken);
// 3. Utiliser les indexes
.withIndex("by_user", (q) => q.eq("userId", userId))
```

### Accessibilité :
- `<button>` pour les actions (pas `<div onClick>`)
- Labels sur tous les inputs

## Structure

```
app/
├── dashboard/      # Annonceur (14 pages)
├── client/         # Client
├── admin/          # Admin (10+ pages)
├── components/ui/  # ShadCN
└── hooks/          # useAuth, useConvexAction...

convex/
├── schema.ts       # 23 tables
├── auth/           # Sessions (7j utilisateur, 2h admin)
└── api/            # Stripe, Resend, Maps
```

## Tokens de design (globals.css)

- Primaire : `#FF6B6B` | Secondaire : `#4ECDC4` | Fond : `#FFF9F0`
- Polices : Love Taking (H1/H2 spéciaux), Montserrat (corps 400, titres/boutons 600-700)
- Arrondis : `rounded-2xl` (cartes), `rounded-full` (boutons)

## Workflows

**Mission** : pending_acceptance → pending_confirmation → upcoming → in_progress → completed

**Paiement** : PaymentIntent → encaissement immédiat → transfert annonceur le 25 du mois

## Outils MCP

| Outil | Quand l'utiliser |
|-------|------------------|
| `context7_resolve` | Trouver la doc officielle d'une librairie (Next.js, Convex, Tailwind...) |
| `context7_get_library_docs` | Récupérer la documentation complète d'une lib |
| `exa_search` | Rechercher sur le web (docs récentes, solutions, exemples) |
| `exa_get_contents` | Lire le contenu d'une URL (docs, articles, pages web) |

**Utiliser les outils MCP quand :**
- Besoin de docs récentes (après la date de coupure des connaissances)
- Chercher des exemples d'implémentation
- Vérifier la syntaxe/API d'une librairie
- Lire un lien fourni par l'utilisateur

## Langue

Interface en français.
