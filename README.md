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
  - **Architecture modulaire** avec composants reutilisables
  - **3 onglets** : Mon profil, Services & Tarifs, Photos
  - **Onglet Profil**
    - Bio, description, experience
    - Localisation avec rayon d'intervention
    - Types d'animaux acceptes
    - Equipements (jardin, vehicule)
    - Mes animaux personnels
  - **Onglet Services & Tarifs**
    - **Wizard de creation en 4 etapes** :
      1. Selection de la prestation (categorie)
      2. Types d'animaux acceptes
      3. Definition des formules (prix, duree, avantages)
      4. Options additionnelles (facultatif)
    - **Cartes de service enrichies** :
      - Header cliquable avec gradient et prix affiche
      - Clic sur le header pour ouvrir/fermer la modification
      - Indicateur visuel (chevron) de l'etat ouvert/ferme
      - Apercu des formules et options
      - Badges de statistiques
      - Actions : Modifier, Activer/Desactiver, Supprimer
    - **Modales de confirmation** pour toutes les suppressions :
      - Suppression de service
      - Suppression de formule
      - Suppression d'option
  - **Systeme de formules (variantes)**
    - Prix horaire × duree = prix total
    - Fonctionnalites incluses par formule
    - Glisser-deposer pour reordonner
    - Modal de confirmation avant suppression
  - **Options additionnelles**
    - Prix forfaitaire, par jour ou par unite
    - Quantite maximale configurable
    - Modal de confirmation avant suppression
  - **Prix conseilles intelligents**
    - Priorite 1 : Moyenne des prix des autres annonceurs
    - Priorite 2 : Prix par defaut admin de la categorie
    - Priorite 3 : Prix de reference codes en dur
  - **Onglet Photos**
    - Upload de photos avec drag & drop
    - Galerie avec suppression
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
      page.tsx         # Page principale orchestratrice
      hooks/
        useServicesPageData.ts  # Hook centralise pour queries/mutations
      components/
        tabs/          # ProfileTab, ServicesTab, PhotosTab
        profile/       # ProfileBioSection, LocationSection, etc.
        services/      # ServiceCard, ServiceList, ServiceForm
        photos/        # PhotoUploader, PhotoGallery
        shared/        # SectionCard, FormField, AnimalTypeSelector, ConfirmModal
        VariantManager.tsx   # Gestion des formules
        OptionManager.tsx    # Gestion des options
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

---

## Design System

### Couleurs

| Variable | Couleur | Usage |
|----------|---------|-------|
| `--primary` | #FF6B6B | Actions principales, liens |
| `--secondary` | #4ECDC4 | Succes, elements actifs |
| `--accent` | #FFE66D | Mise en avant |
| `--purple` | #9B5DE5 | Elements secondaires |
| `--foreground` | #1A1A2E | Texte principal |
| `--text-light` | #6B7280 | Texte secondaire |

### Composants UI

- **Cards** : `bg-white rounded-2xl p-6 shadow-sm border border-foreground/5`
- **Boutons primaires** : `bg-primary text-white rounded-xl px-4 py-2.5`
- **Boutons secondaires** : `bg-foreground/5 text-foreground rounded-xl`
- **Badges** : `px-3 py-1.5 rounded-full text-xs font-medium`
- **Inputs** : `border border-foreground/20 rounded-xl px-4 py-3`

### Animations

Utilisation de Framer Motion avec des variants predefinies :
- `containerVariants` : Animation de conteneur avec stagger
- `itemVariants` : Animation d'elements de liste
- `fadeInUp` : Apparition du bas vers le haut
- `scaleIn` : Apparition avec mise a l'echelle

---

## Changelog recent

### v0.4.0 - Systeme de Missions et Reservations
- **Cartes de mission redesignees**
  - Design plus compact et moderne
  - Affichage du prenom uniquement (confidentialite)
  - Masquage de l'adresse exacte et telephone avant acceptation
  - Affichage de la ville uniquement
  - Badge de statut colore
- **Modal de details de mission**
  - Informations client (prenom, animal)
  - Service, formule et options choisies
  - Dates, horaires et localisation
  - Notes du client
  - Decomposition du prix avec commission plateforme (15%)
  - Revenus annonceur mis en avant
  - Lien vers la fiche animal si disponible
- **Calcul de distance automatique**
  - Distance calculee entre l'adresse de l'annonceur et du client
  - Utilisation de la formule Haversine
  - Affichage en km ou metres
  - Necessite l'autocomplete Google Maps pour les coordonnees
- **Flux de reservation ameliore**
  - Sauvegarde des coordonnees GPS lors de la reservation
  - Extraction automatique de la ville
  - Support de l'autocomplete d'adresse Google Maps

### v0.3.1 - Ameliorations UX Services
- Header des cartes de service cliquable pour ouvrir/fermer la modification
- Indicateur visuel (chevron) de l'etat ouvert/ferme
- Modales de confirmation pour la suppression des formules
- Modales de confirmation pour la suppression des options
- Effet hover sur le header des cartes

### v0.3.0 - Refonte Page Services
- Refactorisation complete de `/dashboard/services` (1300+ lignes → composants modulaires)
- Nouveau wizard de creation de service en 4 etapes
- Cartes de service enrichies avec apercu des formules et options
- Modal de confirmation pour les suppressions de services
- Animations fluides avec Framer Motion
- Hook `useServicesPageData` pour centraliser les queries/mutations

### v0.2.0 - Systeme de Planning
- Calendrier avec 4 vues (jour, semaine, mois, annee)
- Gestion des disponibilites par drag & drop
- Integration des missions

### v0.1.0 - MVP
- Authentification multi-roles
- Panel administration complet
- Gestion des services et categories
