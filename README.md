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

- **Page Parametres** (`/dashboard/parametres`)
  - **Onglet Planning**
    - Horaires d'acceptation des reservations
    - Mode de facturation (arrondi ou exact)
    - Temps de preparation avant/apres services (buffers)
    - Exemple visuel du temps bloque

### Systeme de Paiement Stripe

Integration complete de Stripe avec pre-autorisation (empreinte bancaire) :

- **Flux de paiement**
  1. Annonceur accepte une mission → Creation Checkout Session Stripe (1h validite)
  2. Email automatique au client avec lien de paiement
  3. Client paie → Pre-autorisation (fonds bloques, pas debites)
  4. Mission passe en "A venir" puis "En cours" puis "Terminee"
  5. Client confirme la fin de prestation OU auto-capture apres 48h
  6. Paiement capture → Fonds debites

- **Pages de paiement**
  - `/paiement/succes` - Confirmation de paiement reussi
  - `/paiement/annule` - Page d'annulation

- **Configuration admin** (`/admin/integrations`)
  - `stripe_secret_key` - Cle secrete Stripe
  - `stripe_public_key` - Cle publique Stripe
  - `stripe_webhook_secret` - Secret du webhook
  - `app_url` - URL de l'application

- **Webhook Stripe**
  - URL : `https://[votre-url-convex].convex.site/stripe-webhook`
  - Evenements geres : `checkout.session.completed`, `checkout.session.expired`, `payment_intent.canceled`

- **Cron jobs automatiques**
  - Auto-capture des paiements (toutes les heures)
  - Nettoyage des sessions expirees (toutes les 6h)

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
  recherche/           # Page de recherche avancée
    page.tsx           # Page principale avec filtres et carte
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
    search/            # Composants de recherche
      FilterSidebar.tsx  # Sidebar filtres avancés dynamiques
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
- `stripePayments` - Paiements Stripe (sessions, pre-autorisations, captures)
- `passwordResetTokens` - Tokens de reinitialisation de mot de passe
- `emailVerificationTokens` - Tokens de verification d'email
- `systemConfig` - Configuration systeme

---

## Convex Self-Hosted - Limitations connues

Sur une instance Convex self-hosted, les **actions** (fonctions avec `"use node"`) ne peuvent pas :
- Appeler `ctx.runQuery()` - retourne HTML 404 au lieu des donnees
- Appeler `ctx.runMutation()` - retourne HTML 404 au lieu des donnees
- Appeler `ctx.scheduler.runAfter()` - retourne "Transient error" avec HTML

**Workaround implemente** :
1. Les mutations recuperent les configs (Stripe, email) depuis la base de donnees
2. Les configs sont passees en parametres aux actions
3. Les actions font uniquement des appels HTTP externes (Stripe API, Resend API)
4. Les operations de base de donnees sont faites dans les mutations avant/apres les actions

Fichiers impactes :
- `convex/api/stripe.ts` - `createCheckoutSession`, `capturePayment`, `cancelPaymentAuthorization`
- `convex/api/email.ts` - `sendVerificationEmail`, `sendPasswordResetEmail`
- `convex/planning/missions.ts` - `acceptMission`, `confirmMissionCompletion`

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

### v0.8.0 - Nouveau Parcours de Reservation et Calcul Tarifaire Intelligent

- **Nouveau parcours de reservation** (`/reserver/[announcerId]`)
  - Interface mobile-first en 4 etapes fluides
  - Etape 1 : Selection du service et de la formule
  - Etape 2 : Choix des dates et horaires avec calendrier interactif
  - Etape 3 : Informations client et animal
  - Etape 4 : Recapitulatif et confirmation
  - Support de la garde de nuit avec calcul automatique
  - Options additionnelles selectionnables

- **Calcul tarifaire intelligent avec journees partielles**
  - Detection automatique des journees partielles vs completes
  - Premier jour : calcul des heures entre l'heure de debut et la fin de journee
  - Dernier jour : calcul des heures entre le debut de journee et l'heure de fin
  - Jours intermediaires : facturation en journees completes
  - Seuil configurable via `workdayHours` dans la config admin (defaut 8h)
  - Affichage detaille du calcul dans le recapitulatif

- **Correction du calcul des commissions**
  - Stockage coherent des montants dans les missions :
    - `amount` = montant total paye par le client (service + commission)
    - `platformFee` = commission de la plateforme
    - `announcerEarnings` = revenus de l'annonceur (prix du service)
  - Commission variable selon le type d'annonceur :
    - Particulier : 15%
    - Micro-entrepreneur : 12%
    - Professionnel : 10%
  - Retrocompatibilite avec les anciennes missions

- **Email de notification aux annonceurs**
  - Nouveau template "Nouvelle demande de reservation"
  - Inclut les plages horaires et dates
  - Affichage de la garde de nuit si applicable
  - Localisation de la prestation

- **Page de finalisation amelioree** (`/reservation/[bookingId]`)
  - Meme calcul tarifaire intelligent
  - Affichage detaille du prix (heures partielles, jours complets, nuits)
  - Support creation de compte pour les nouveaux utilisateurs

### v0.7.1 - Gestion Admin Utilisateurs et Corrections Convex Self-Hosted
- **Actions admin utilisateurs** (`/admin/utilisateurs`)
  - Bouton "Activer manuellement" : active un compte (emailVerified + isActive)
  - Bouton "Renvoyer email confirmation" : genere nouveau token et renvoie l'email
  - Bouton "Reinitialiser mot de passe" : envoie un lien de reset par email
- **Nouvelle table `passwordResetTokens`**
  - Tokens de reinitialisation avec expiration 1h
  - Marquage si cree par admin
- **Corrections Convex self-hosted**
  - Les actions Convex ne peuvent pas appeler `ctx.runQuery`, `ctx.runMutation` ou `ctx.scheduler.runAfter` sur Convex self-hosted (retourne HTML 404)
  - Workaround : passer les configs (Stripe, email) en parametres depuis les mutations
  - L'email de paiement est maintenant envoye directement depuis l'action Stripe
  - Le payment record est cree dans la mutation avant de scheduler l'action

### v0.7.0 - Systeme de Paiement Stripe
- **Integration Stripe complete**
  - Pre-autorisation (empreinte bancaire) avec capture manuelle
  - Checkout Session avec lien de paiement valide 1h
  - Email automatique au client avec lien de paiement
  - Webhook Convex HTTP pour les evenements Stripe
- **Flux de mission ameliore**
  - `acceptMission` declenche automatiquement la creation de session Stripe
  - Nouvelle mutation `confirmMissionCompletion` pour les clients
  - Statuts de paiement : `not_due`, `pending`, `paid`
- **Auto-capture intelligente**
  - Cron job toutes les heures pour capturer les paiements
  - Auto-capture 48h apres la fin de mission si pas de confirmation client
  - Nettoyage automatique des sessions expirees
- **Pages frontend**
  - `/paiement/succes` - Page de confirmation avec prochaines etapes
  - `/paiement/annule` - Page d'annulation avec options
- **Nouvelle table `stripePayments`**
  - Suivi complet des sessions Checkout
  - Statuts : pending, authorized, captured, cancelled, expired, failed, refunded
  - Historique des captures et annulations

### v0.6.0 - Page Recherche Avancée
- **Nouvelle page `/recherche`**
  - Bouton "Trouver un service" dans la navbar (remplace "Trouver un garde")
  - Layout responsive avec carte pleine largeur en haut
  - Liste des annonceurs avec sidebar de filtres avancés
  - Fond cohérent avec la page d'accueil (gradient + emojis flottants)
- **Filtres avancés dynamiques**
  - Tri : pertinence, prix croissant/décroissant, avis, distance
  - Type d'annonceur : particulier, micro-entrepreneur, professionnel
  - Profil : vérifié, avec photo
  - Équipements contextuels selon la catégorie :
    - Garde/Pension : jardin, animaux du pet-sitter
    - Promenade/Transport : véhicule
  - Fourchette de prix (min/max)
- **Cartes d'annonceurs améliorées**
  - Design identique à la page d'accueil
  - Badge de statut (Pro, Micro-ent., Particulier)
  - Badge de disponibilité + nombre de formules
  - Bouton "Voir les formules" avec modale de réservation
- **Modale de réservation intégrée**
  - Liste des formules et options de l'annonceur
  - Calendrier avec disponibilités en temps réel
  - Sélection d'heure avec créneaux bloqués visibles
  - Calcul du total estimé
  - Redirection vers la page de réservation
- **Backend amélioré**
  - Nouveaux arguments de filtrage dans `searchAnnouncers`
  - Filtrage par type de compte, équipements, animaux possédés
  - Tri dynamique des résultats

### v0.5.0 - Gestion des creneaux et temps de preparation
- **Blocage intelligent des creneaux horaires**
  - Blocage par creneau horaire au lieu du jour entier
  - Si une mission est reservee de 10h a 12h, seuls ces creneaux sont bloques
  - Les autres creneaux de la journee restent disponibles
  - Correction du filtre de recherche : les annonceurs avec des creneaux partiellement reserves apparaissent dans les resultats
- **Temps de preparation (buffers)**
  - Configuration du temps a bloquer avant chaque service
  - Configuration du temps a bloquer apres chaque service
  - Options alignees sur les creneaux de 30 minutes (0, 30, 60, 90 min)
  - Exemple visuel du temps bloque dans les parametres
- **Parametres de planning ameliores**
  - Bouton unique "Enregistrer les preferences" pour tous les parametres
  - Messages de succes cote serveur
  - Gestion des erreurs avec affichage utilisateur
- **Corrections diverses**
  - Correction du bug Leaflet "appendChild" (SSR)
  - Utilisation du bon token d'authentification (auth_token)

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
