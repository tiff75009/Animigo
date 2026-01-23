# Animigo - Claude Code Config

Marketplace de services animaliers. Next.js 16 + Convex Self-Hosted + Tailwind v4 + ShadCN.

## Commandes Agents

| Commande | Usage |
|----------|-------|
| `/convex` | Backend Convex (schema, mutations, queries) |
| `/ui` | Frontend (Tailwind, ShadCN, Framer Motion) |
| `/orchestrator` | Coordination et planning |
| `/fullstack` | Feature complète (backend + frontend) |

## Dev Commands

```bash
bun run dev          # Next.js :3000
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
// 2. Valider session en premier
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
├── auth/           # Sessions (7j user, 2h admin)
└── api/            # Stripe, Resend, Maps
```

## Design tokens (globals.css)

- Primary: `#FF6B6B` | Secondary: `#4ECDC4` | Background: `#FFF9F0`
- Fonts: Nunito (headings), Inter (body)
- Radius: `rounded-2xl` (cards), `rounded-full` (buttons)

## Workflows

**Mission**: pending_acceptance → pending_confirmation → upcoming → in_progress → completed

**Paiement**: PaymentIntent → authorized → auto-capture 48h après completion

## MCP Tools

| Tool | Quand l'utiliser |
|------|------------------|
| `jina_read_url` | Lire le contenu d'une URL (docs, articles, pages web) |
| `jina_search` | Rechercher sur le web (docs récentes, solutions, exemples) |
| `context7_resolve` | Trouver la doc officielle d'une librairie (Next.js, Convex, Tailwind...) |
| `context7_get_library_docs` | Récupérer la documentation complète d'une lib |

**Utiliser MCP quand :**
- Besoin de docs récentes (après knowledge cutoff)
- Chercher des exemples d'implémentation
- Vérifier la syntaxe/API d'une librairie
- Lire un lien fourni par l'utilisateur

## Langue

Interface en français.
