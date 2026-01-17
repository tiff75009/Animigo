# Animigo

Plateforme de mise en relation entre proprietaires d'animaux et gardes de confiance.

## Prerequis

- [Bun](https://bun.sh/) (gestionnaire de paquets)
- Convex self-hosted configure

## Installation

```bash
bun install
```

## Configuration

Creer un fichier `.env.local` a la racine du projet :

```env
NEXT_PUBLIC_CONVEX_URL=https://votre-instance-convex.example.com
```

## Developpement

Lancer les deux commandes dans des terminaux separes :

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

---

## Fonctionnalites implementees

### Authentification

- **Inscription** (`/inscription`)
  - 3 types de comptes : Utilisateur, Annonceur Particulier, Annonceur Pro
  - Validation SIRET en temps reel via API INSEE pour les pros
  - Detection automatique du type d'entreprise (micro-entreprise, societe)
  - Hachage des mots de passe avec bcrypt
  - Verification de la complexite du mot de passe

- **Connexion** (`/connexion`)
  - Authentification par email/mot de passe
  - Gestion des sessions avec tokens
  - Protection contre le brute force
  - Redirection automatique selon le role

### Panel Administration (`/admin`)

- **Tableau de bord**
  - Statistiques globales (utilisateurs, annonceurs, services)
  - Graphiques de croissance
  - Activite recente

- **Gestion des utilisateurs** (`/admin/utilisateurs`)
  - Liste paginee avec filtres
  - Details des comptes
  - Actions d'administration

- **Gestion des annonceurs** (`/admin/annonceurs`)
  - Liste des annonceurs pro et particuliers
  - Verification des SIRET
  - Statistiques par annonceur

- **Moderation des services** (`/admin/moderation/services`)
  - File d'attente de moderation
  - Approbation/Rejet avec commentaires
  - Detection automatique des contenus suspects (emails, telephones)

- **Categories de services** (`/admin/services/categories`)
  - CRUD complet des categories (prestations)
  - Personnalisation des icones et images
  - Type de facturation (horaire, journalier, flexible)
  - Prix horaire conseille par defaut (utilise quand pas assez de donnees marche)
  - Ordre d'affichage drag & drop

- **Integrations API** (`/admin/integrations`)
  - Configuration API INSEE (SIRENE)
  - Configuration API Adresse (gouvernement)
  - Stockage securise des cles API
  - Test de connexion en temps reel

- **Parametres** (`/admin/parametres`)
  - Activation/desactivation de la moderation globale
  - Configuration systeme

### Dashboard Annonceur (`/dashboard`)

- **Page Services** (`/dashboard/services`)
  - **Nouveau modele simplifie** : Prestation + Formules + Options
    - Selection d'une prestation (categorie geree par admin)
    - Types d'animaux acceptes
    - Formules obligatoires (au moins 1)
    - Options additionnelles
  - **Systeme de formules (variantes)**
    - Prix horaire × duree = prix total
    - Fonctionnalites incluses par formule
    - Glisser-deposer pour reordonner
  - **Options additionnelles**
    - Prix forfaitaire, par jour ou par unite
    - Quantite maximale configurable
  - **Prix conseilles intelligents**
    - Priorite 1 : Moyenne des prix des autres annonceurs
    - Priorite 2 : Prix par defaut admin de la categorie
    - Priorite 3 : Prix de reference codes en dur
  - Moderation automatique du contenu
  - Bouton "Sponsoriser" (a venir)

- **Page Planning** (`/dashboard/planning`)
  - **4 vues calendrier** : Jour, Semaine, Mois, Annee
  - **Gestion des disponibilites**
    - Clic simple : definir la dispo d'un jour
    - Glisser-deposer : selectionner une plage de dates
    - Statuts : Disponible, Partiel, Indisponible
    - Action rapide "Weekends indispo"
  - **Gestion des missions**
    - Affichage des missions sur le calendrier
    - Detail des missions avec actions (accepter, refuser, annuler, terminer)
    - Statistiques mensuelles (missions, revenus)
  - **Vue liste** pour mobile

### Integrations API

#### API INSEE (SIRENE)

Validation et enrichissement des donnees entreprise :
- Verification du numero SIRET
- Recuperation de la raison sociale
- Detection du type d'entreprise (micro, societe)
- Verification de l'assujettissement TVA

```typescript
// Utilisation
const result = await ctx.runQuery(api.api.insee.verifySiret, { siret: "12345678901234" });
```

#### API Adresse (data.gouv.fr)

Autocompletion et geocodage des adresses :
- Recherche d'adresses avec autocompletion
- Recuperation des coordonnees GPS
- Extraction du code postal, ville, departement, region

```typescript
// Utilisation
const result = await ctx.runQuery(api.api.location.searchAddress, { query: "10 rue..." });
```

---

## Structure du projet

```
app/
  (auth)/              # Pages d'authentification
    connexion/
    inscription/
  admin/               # Panel d'administration
    annonceurs/
    connexion/
    integrations/
    moderation/services/
    parametres/
    services/categories/
    utilisateurs/
  dashboard/           # Dashboard annonceur
    planning/
      components/
        views/         # MonthView, WeekView, DayView, YearView
        availability/  # AvailabilityModal
    services/
      components/      # VariantManager, OptionManager, PriceRecommendation
  components/          # Composants partages
    ui/                # Composants UI (input, checkbox, etc.)
  hooks/               # Hooks React personnalises
    useAuth.ts
    useAdminAuth.ts
    usePlanning.ts
  lib/                 # Utilitaires

convex/
  admin/               # Fonctions admin
    serviceCategories.ts  # CRUD categories
    moderation.ts         # Moderation des services
  api/                 # Integrations API externes
    insee.ts
    location.ts
  auth/                # Authentification
    login.ts
    register.ts
    session.ts
  planning/            # Planning et missions
    missions.ts
    availability.ts
  services/            # Gestion des services
    services.ts           # CRUD services
    variants.ts           # Gestion des formules
    options.ts            # Gestion des options
    pricing.ts            # Calcul prix conseilles
  utils/               # Utilitaires
    contentModeration.ts
    defaultPricing.ts
  schema.ts            # Schema de la base de donnees
```

---

## Schema de la base de donnees

### Tables principales

- `users` - Utilisateurs (tous types)
- `sessions` - Sessions d'authentification
- `profiles` - Profils des annonceurs (localisation, animaux acceptes, etc.)
- `services` - Services/Prestations proposes (lie a une categorie)
- `serviceVariants` - Formules de service (prix horaire, duree, fonctionnalites)
- `serviceOptions` - Options additionnelles (supplements)
- `serviceCategories` - Categories de services gerees par admin
- `photos` - Photos des annonceurs
- `missions` - Reservations de services
- `availability` - Disponibilites des annonceurs
- `userPreferences` - Preferences utilisateur (notifications, facturation)
- `systemConfig` - Configuration systeme

---

## Securite

- Hachage des mots de passe avec bcrypt (10 rounds)
- Tokens de session aleatoires (64 caracteres hex)
- Expiration des sessions (7 jours)
- Protection des routes admin
- Moderation du contenu (detection emails/telephones)
- Stockage securise des cles API (chiffrees en base)
