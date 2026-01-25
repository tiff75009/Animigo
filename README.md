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

- **Verifications d'identite** (`/admin/verifications`)
  - Liste des demandes avec filtres par statut
  - Visualisation des documents soumis (CNI recto/verso, selfie)
  - Resultats de verification automatique par IA
  - Approbation/Rejet avec notes admin
  - Badge compteur des demandes en attente
  - **Parametres de verification automatique** (panneau settings)
    - Toggle on/off pour l'auto-approbation
    - Seuil de confiance configurable (50%-100%)
    - Tracabilite du seuil utilise pour chaque decision

- **Categories de services** (`/admin/services/categories`)
  - **Structure hierarchique** : Categories parentes et sous-categories (2 niveaux max)
  - CRUD complet avec formulaire modulaire
  - Personnalisation des icones et images
  - **Configuration d'affichage** pour les categories parentes :
    - `hierarchy` : "Parent > Sous-categorie"
    - `subcategory` : Nom de la sous-categorie seul (defaut)
    - `badge` : Badge parent + nom sous-categorie
  - Type de facturation par sous-categorie (horaire, journalier, flexible)
  - Prestations par defaut configurables par sous-categorie
  - Options de garde de nuit configurables
  - Table avec expansion/collapse des sous-categories
  - Ordre d'affichage

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
      page.tsx           # Page principale orchestratrice
      types.ts           # Types TypeScript centralises
      hooks/
        useCategoryPage.ts  # Hook donnees/mutations
      _components/
        CategoryForm/    # Formulaire modulaire
        CategoryTable/   # Table avec expansion
    utilisateurs/
  client/              # Espace client
    profil/            # Page profil client
      page.tsx         # Page principale
      hooks/           # useClientProfile
      components/      # ClientProfileHeader, ClientBioSection, ClientLocationSection
    mes-animaux/       # Gestion des animaux
    reservations/      # Historique des reservations
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
      CategorySelector.tsx  # Selecteur hierarchique de categories
    shared/            # Composants partages entre pages
      CategoryDisplay.tsx  # Affichage configurable des categories
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
  client/              # Fonctions client
    profile.ts            # CRUD profil client
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
- `clientProfiles` - Profils des clients (adresse, bio, coordonnees GPS)
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

### v0.18.0 - Objectifs et Seances pour les Formules

- **Nouveaux champs pour les formules de service**
  - Champ "Objectifs de la prestation" : liste d'objectifs avec icones personnalisables
  - Champ "Nombre de seances" : permet de definir des forfaits multi-seances
  - Champ "Caracteristiques incluses" : liste de features incluses dans la formule
  - Affichage complet dans les formulaires de creation et modification

- **Calcul intelligent du prix total**
  - Nouvelle formule : `prix horaire × (duree/60) × nombre de seances`
  - Affichage du prix total en avant avec mention "total"
  - Detail du calcul en petit : "X€/heure × Ymin × Z seances"
  - Application sur la page annonceur et le parcours de reservation

- **Sidebar des etapes de reservation collapsible**
  - Barre d'etapes repliee par defaut (icones uniquement)
  - Bouton pour deployer et voir les labels complets
  - Mini compteur de progression (X/Y etapes)
  - Meilleure utilisation de l'espace ecran

- **Ameliorations du formulaire de modification**
  - Champs de prix conditionnels selon les types autorises par l'admin
  - Respect du parametre `allowedPriceUnits` des sous-categories
  - Duree limitee aux tranches de 30 minutes (min=30, step=30)
  - Ajout du champ "Caracteristiques incluses" avec gestion dynamique

- **Affichage responsive ameliore**
  - Layout vertical sur mobile, horizontal sur desktop
  - Titre, description et prix adaptes a la taille d'ecran
  - Objectifs affiches ligne par ligne avec titre "Objectifs de la prestation"
  - Badge "X seances" pour les formules multi-seances

- **Backend Convex**
  - Schema `serviceVariants` enrichi : objectives, numberOfSessions, includedFeatures
  - Mise a jour de `updateServiceBasePrice` pour inclure les seances
  - Query `getAnnouncerBySlug` retourne les nouveaux champs

### v0.17.0 - Pages Legales Admin et Ameliorations Tarification

- **Gestion des pages legales** (`/admin/legal`)
  - Interface admin pour gerer CGV, CGU, Politique de confidentialite, Conditions d'annulation
  - Editeur de contenu avec support HTML
  - Systeme de brouillon/publication avec versioning
  - Pages publiques dynamiques (`/legal/[slug]`)
  - URLs en francais (confidentialite, annulation)
  - Navigation entre les pages legales

- **Correction du calcul des prix**
  - Plafonnement du tarif horaire au tarif journalier
  - Evite de payer plus pour moins d'heures (ex: 6h ne coute plus 18€ si le tarif journalier est 11€)
  - Correction appliquee dans toutes les pages de reservation

- **Affichage des prix avec commission incluse**
  - Tous les prix affiches incluent desormais la commission
  - Plus de ligne "Frais de service X%" separee
  - Mention "Frais de service inclus" sous le total
  - Applique sur : sidebar annonceur, etape 4 recapitulatif, page finalisation

- **Format date/heure unifie**
  - Format combine : "Du jeu. 12 fevr. a 9h jusqu'au sam. 14 fevr. a 14h"
  - Affichage de la duree totale (jours + heures)
  - Meme format sur toutes les pages de reservation

- **Detail des tarifs ameliore**
  - Section "Detail des tarifs" avec fond gris
  - Premier jour avec heures reelles (ex: 11h30 → 20h · 8h30)
  - Jours intermediaires avec dates et tarif/jour
  - Dernier jour avec heures reelles (ex: 8h → 14h · 6h)
  - Nuits avec tarif/nuit
  - Options avec prix TTC

- **Background anime page reservation**
  - Gradient de fond similaire a la page d'accueil
  - Blobs animes en arriere-plan avec mouvement fluide
  - Pattes flottantes decoratives (desktop uniquement)
  - Header avec effet de transparence/blur

- **Etapes de reservation pour services garde**
  - Ajout des etapes "Lieu de prestation" et "Options" pour les services en mode garde
  - Barre de progression mise a jour avec 4 etapes visibles
  - Validation obligatoire : date debut, date fin, heure debut, heure fin

- **Backend Convex**
  - Nouvelle table `legalPages` avec slug, titre, contenu, version, statut
  - Fichiers `convex/admin/legalPages.ts` et `convex/public/legal.ts`
  - Lien "Pages legales" ajoute dans la sidebar admin

### v0.16.0 - Refonte Page Annonceur et Experience de Reservation

- **Barre de progression des etapes**
  - Nouvelle barre verticale sur desktop montrant la progression de la reservation
  - 4 etapes : Formule, Date & heure, Lieu, Options
  - Indicateurs visuels : cercles avec icones, progression animee, compteur
  - Position sticky pour rester visible lors du scroll

- **Nouveaux boutons de reservation**
  - "Verifier la reservation" : redirige vers la page de reservation (etape 1)
  - "Finaliser la reservation" : redirige directement vers l'etape de finalisation (etape 4)
  - Disponible sur desktop (sidebar) et mobile (sheet recapitulatif)
  - Parametre URL `finalize=true` pour aller directement a l'etape 4

- **Saisie d'adresse pour les invites (guest checkout)**
  - Nouveau composant `GuestAddressSelector` avec autocompletion Google Maps
  - Calcul et affichage de la distance entre le client et l'annonceur
  - Sauvegarde des coordonnees GPS avec la reservation
  - Utilisateurs connectes : selection parmi les adresses enregistrees
  - Invites : saisie manuelle avec autocompletion

- **Indicateurs visuels de selection obligatoire**
  - Animation pulsante sur la section formules quand aucune n'est selectionnee
  - Bordure coloree et effet de lueur pour attirer l'attention
  - Meme effet sur la section lieu de prestation si applicable
  - Indication subtile sur les options additionnelles

- **Reorganisation des sections**
  - Nouvel ordre : Formule → Calendrier → Lieu → Adresse → Options
  - Le calendrier apparait juste apres la selection de formule
  - Meilleure logique de flux de reservation

- **Validation horaire obligatoire**
  - La reservation ne peut pas etre finalisee sans selection d'heure
  - Message d'avertissement dans le recapitulatif si l'heure manque
  - Boutons de reservation desactives tant que l'heure n'est pas choisie

- **Corrections du positionnement sticky**
  - Barre d'etapes et sidebar restent sous la barre des tabs lors du scroll
  - Valeur `top-36` (144px) pour compenser la hauteur du header + tabs

- **Redesign du header annonceur**
  - Badge de statut sur l'avatar
  - Bio affichee dans le header
  - Meilleur effet d'ombre sur la carte
  - Tabs avec badges de compteurs (services, avis)

### v0.15.0 - Experience Mobile Amelioree (Page Annonceur)

- **Calendrier mobile en bottom sheet**
  - Ouverture automatique du calendrier quand une formule est selectionnee sur mobile
  - Animation fluide depuis le bas de l'ecran (spring animation)
  - Possibilite de fermer et rouvrir le calendrier
  - Header avec nom de la formule selectionnee

- **Selecteur d'heure en roulette (wheel picker)**
  - Nouveau composant `MobileTimePicker` avec effet de roulette
  - 2 roues : heures et minutes
  - Gradient de fondu en haut et en bas pour effet de profondeur
  - Indicateur visuel de la selection actuelle
  - Gestion des creneaux indisponibles (gris barre)
  - Support des couleurs primary et secondary

- **Boutons de selection mobile ameliores**
  - Bouton "tap to select" pour l'heure de debut (icone horloge + chevron)
  - Bouton "tap to select" pour l'heure de fin
  - Affichage de l'heure selectionnee avec style actif
  - Desktop : grille de creneaux conservee

- **Modification des selections existantes**
  - Zone date/heure cliquable dans la barre fixe en bas
  - Style souligne pour indiquer la possibilite de modification
  - Ouvre directement le calendrier pour modifier

- **Condition de validation**
  - Bouton "Reserver maintenant" desactive si aucune heure selectionnee
  - Texte contextuel : "Selectionner une date" ou "Selectionner un horaire"
  - Bouton de confirmation dans le calendrier avec etat desactive/actif

- **Calendrier masque sur mobile dans la page**
  - Calendrier dans `AnnouncerFormules` visible uniquement sur desktop (md:block)
  - Sur mobile, accessible uniquement via le bottom sheet

### v0.14.0 - Admin Finances et Correction Paiements

- **Panel Admin Finances** (`/admin/finances`)
  - Vue mensuelle/annuelle des commissions (a venir, validees, payees)
  - Statistiques des virements annonceurs (en attente, en cours, effectues)
  - Liste des virements programmes
  - Graphique d'evolution des revenus

- **Detail Annonceur Admin** (`/admin/annonceurs/[id]`)
  - Page complete avec 5 onglets : Apercu, Services, Ventes, Finances, Messages
  - Onglet Apercu : infos profil, stats rapides, verification
  - Onglet Services : liste des prestations avec revenus et stats
  - Onglet Ventes : historique des missions avec filtres et pagination
  - Onglet Finances : revenus, virements, avoirs clients
  - Onglet Messages : placeholder pour l'historique des conversations

- **Recherche Annonceurs Admin**
  - Composant `AnnouncerSearchInput` avec autocomplete
  - Recherche par nom, email, SIRET
  - Resultats en dropdown avec avatar et infos
  - Debounce 300ms pour la performance

- **Systeme d'Avoirs Clients**
  - Nouvelle table `clientCredits` pour les remboursements
  - Creation d'avoir avec raison et mission associee
  - Statuts : active, used, expired, cancelled
  - Backend complet dans `convex/admin/credits.ts`

- **Systeme de Virements Annonceurs**
  - Nouvelle table `announcerPayouts` pour suivre les virements
  - Creation de virements avec missions incluses
  - Statuts : pending, processing, completed, failed
  - Planification des virements futurs

- **Systeme de Factures**
  - Nouvelle table `invoices` avec numero unique
  - Generation de factures pour clients et annonceurs
  - Structure detaillee avec items, TVA, totaux

- **Page Paiements Annonceur** (`/dashboard/paiements`)
  - Remplacement des donnees mock par queries Convex dynamiques
  - Stats en temps reel : a encaisser, deja encaisse, total gagne
  - Liste des missions en attente de paiement
  - Historique des virements avec details

- **Correction Flow Paiement Stripe**
  - Suppression du handler `payment_intent.requires_capture` (evenement inexistant)
  - Ajout de `confirmPaymentSuccess` dans le frontend
  - Mise a jour directe des statuts apres confirmation Stripe Elements
  - Fallback si le webhook n'est pas configure
  - Mission passe en "upcoming" et paiement en "authorized" apres confirmation

- **Backend Convex**
  - Nouveau dossier `convex/dashboard/` avec queries paiements annonceur
  - Fichiers `finances.ts`, `announcers.ts`, `credits.ts`, `invoices.ts` dans admin
  - Modification de `stripeClient.ts` pour la confirmation de paiement
  - Modification de `stripeWebhook.ts` pour supprimer l'evenement inexistant

- **Webhook Stripe**
  - URL : `https://[votre-url-convex].convex.site/stripe-webhook`
  - Evenements a configurer : `payment_intent.amount_capturable_updated`, `checkout.session.completed`, `charge.refunded`, etc.

### v0.13.1 - Parametres de Verification Automatique Configurables

- **Panneau de configuration admin** (`/admin/verifications`)
  - Bouton settings dans l'en-tete pour ouvrir le panneau
  - Toggle on/off pour activer/desactiver l'auto-approbation
  - Slider pour ajuster le seuil de confiance (50%-100%, defaut 80%)
  - Sauvegarde persistante dans `systemConfig`

- **Logique d'auto-approbation amelioree**
  - Verification si l'auto-verification est activee dans les parametres
  - Comparaison de la confiance au seuil configure
  - Notes explicatives quand les criteres ne sont pas remplis
  - Tracabilite : le seuil utilise est stocke avec chaque resultat

- **Backend Convex**
  - Nouvelles fonctions `getVerificationSettings` et `updateVerificationSettings` dans `admin/config.ts`
  - Query interne `getVerificationSettings` dans `verification/autoVerify.ts`
  - Schema mis a jour : `confidenceThreshold` optionnel dans `aiVerificationResult`

### v0.13.0 - Verification d'Identite avec IA

- **Systeme de verification d'identite pour les annonceurs**
  - Page dediee `/dashboard/verification` pour soumettre les documents
  - Code de verification unique a 6 caracteres genere pour chaque demande
  - Upload de 3 documents : CNI recto, CNI verso, selfie avec code
  - Lien vers filigrane.beta.gouv.fr pour proteger la CNI
  - Selfie en mode camera-only sur mobile (pas d'acces galerie)

- **Verification automatique par IA (Claude Vision)**
  - Lecture OCR du code sur le selfie
  - Comparaison des visages entre selfie et CNI
  - Validation de l'authenticite de la piece d'identite
  - Auto-approbation si tous les criteres sont valides (confiance >= seuil configure)
  - Resultats detailles stockes en base

- **Interface admin** (`/admin/verifications`)
  - Liste des demandes avec filtres par statut
  - Badge compteur des demandes en attente dans la sidebar
  - Modal de detail avec visualisation des documents
  - Affichage des resultats de l'IA (code detecte, correspondance visages, validite CNI)
  - Boutons Approuver/Rejeter avec notes admin

- **Badge "Identite verifiee"**
  - Affiche sur le profil public de l'annonceur (ShieldCheck icon)
  - Affiche sur les cartes de resultats de recherche
  - Stockage dans `profiles.isIdentityVerified`

- **Sidebar annonceur amelioree**
  - Bouton "Verifier mon profil" si non verifie (jaune)
  - Badge "En cours de verification" si demande en attente (bleu)
  - Icone de verification sur l'avatar si verifie

- **Backend Convex**
  - Nouvelle table `verificationRequests` avec statuts (pending, submitted, approved, rejected)
  - Champ `aiVerificationResult` pour stocker les resultats de l'IA
  - Champs `isIdentityVerified` et `identityVerifiedAt` sur la table `profiles`
  - Action `autoVerifyIdentity` declenchee automatiquement a la soumission

- **Variables d'environnement requises**
  - `ANTHROPIC_API_KEY` pour la verification par IA

### v0.12.0 - Blocage par Duree et Ameliorations UX Reservations

- **Blocage des creneaux base sur la duree du service**
  - Nouvelle option `enableDurationBasedBlocking` sur les sous-categories admin
  - Permet de bloquer automatiquement le creneau selon : duree du service + buffer apres
  - Exemple : toilettage 1h a 10h avec buffer 30min → bloque 10h00-11h30
  - Configurateur visuel dans le formulaire de sous-categorie avec exemple de calcul
  - Calcul du prix fixe base sur la formule selectionnee (pas de tarif horaire)

- **Calendriers responsives (bottom sheet mobile)**
  - Filtre de date sur la page recherche : bottom sheet sur mobile, dropdown sur desktop
  - Calendrier "Voir les dispo" des cartes annonceur : deja en bottom sheet
  - Handle bar de glissement et bouton fermer sur mobile
  - Overlay sombre avec fermeture au clic
  - Coordination : un seul calendrier ouvert a la fois

- **Ameliorations page de finalisation** (`/reservation/[bookingId]`)
  - Tooltip CSS pour les details de commission (remplace l'info box)
  - Pre-remplissage automatique de l'adresse depuis le profil client
  - Fonctionne uniquement pour les prestations a domicile (client_home)

- **Verification preventive des disponibilites**
  - Verification des disponibilites et conflits dans `createPendingBooking`
  - Erreur immediate si l'annonceur est indisponible (avant de remplir le formulaire)
  - Double securite avec la verification existante dans `finalizeBooking`

- **Corrections TypeScript**
  - Correction du type `AvailabilityStatus` dans ServiceCard
  - Correction du type `accountType` dans search.ts (`annonceur_pro` au lieu de `pro`)
  - Suppression des proprietes inexistantes `originalStartTime`/`originalEndTime`

### v0.11.0 - Profil Client avec Adresse et Coordonnees

- **Nouvelle page Profil Client** (`/client/profil`)
  - Photo de profil avec initiales par defaut
  - Section "A propos de moi" editable (bio/description)
  - Section adresse avec autocomplete Google Maps
  - Sauvegarde des coordonnees GPS pour la recherche

- **Enregistrement automatique de l'adresse lors des reservations**
  - Creation automatique du profil client a la premiere reservation
  - Sauvegarde de l'adresse et des coordonnees
  - Fonctionne pour les utilisateurs connectes et les invites (guest checkout)

- **Distance automatique dans les resultats de recherche**
  - Utilisation des coordonnees du profil client si pas de localisation manuelle
  - Affichage de la ville du client dans le header de recherche
  - Calcul de distance base sur l'adresse enregistree

- **Nouvelle table `clientProfiles`**
  - Stockage separe du profil utilisateur (users) et profil client
  - Champs : profileImageUrl, description, location, city, postalCode, coordinates, googlePlaceId
  - Index par userId pour requetes rapides

- **Backend Convex** (`convex/client/profile.ts`)
  - `getClientProfile` : Recupere le profil client complet
  - `getClientCoordinates` : Recupere uniquement les coordonnees (optimise pour la recherche)
  - `upsertClientProfile` : Cree ou met a jour le profil
  - `updateLocation` : Met a jour uniquement la localisation

- **Hook React** (`app/client/profil/hooks/useClientProfile.ts`)
  - Gestion des queries et mutations
  - Etats de chargement et erreurs
  - Fonctions updateProfile et updateLocation

- **Composants modulaires**
  - `ClientProfileHeader` : Photo + infos de base + date d'inscription
  - `ClientBioSection` : Textarea editable avec compteur de caracteres
  - `ClientLocationSection` : Autocomplete adresse avec sauvegarde

- **Navigation client amelioree**
  - Ajout du lien "Mon profil" dans la sidebar client

### v0.10.0 - Systeme de Capacite pour Categories de Garde

- **Gestion de capacite pour les services de garde**
  - Nouveau parametre `isCapacityBased` sur les categories parentes
  - Permet aux annonceurs de garder plusieurs animaux simultanement
  - Verifie le `maxAnimalsPerSlot` du profil annonceur
  - Ne bloque pas les creneaux si la capacite n'est pas atteinte

- **Calendrier de reservation ameliore**
  - Affiche les places restantes pour chaque jour (categories de garde)
  - Indicateur visuel : fond vert avec "X places" pour les jours partiels
  - Indicateur "Complet" en rouge quand capacite maximale atteinte
  - Banniere d'information pour les services de garde

- **Backend - Nouvelles fonctions de capacite** (`convex/lib/capacityUtils.ts`)
  - `isCategoryCapacityBased()` : Verifie si une categorie est basee sur la capacite
  - `getAllSubcategorySlugs()` : Recupere toutes les sous-categories d'un parent
  - `countAnimalsOnSlot()` : Compte les animaux sur toutes les sous-categories
  - `checkBookingConflict()` : Verification unifiee (standard ou capacite)

- **Buffers de temps de preparation**
  - Prise en compte des temps de preparation (bufferBefore/bufferAfter)
  - Blocage intelligent des creneaux avec temps de prep inclus
  - Fonctions `missionsOverlapWithBuffers()` et `applyBuffersToTimeSlot()`

- **Configuration admin amelioree** (`/admin/services/categories`)
  - Nouveau selecteur "Mode de reservation" pour categories parentes
  - Mode standard : bloque le creneau entier
  - Mode garde (capacite) : permet plusieurs animaux selon la limite du profil
  - Propagation automatique aux sous-categories

### v0.9.0 - Structure Hierarchique des Categories

- **Refonte complete de la gestion des categories** (`/admin/services/categories`)
  - **Architecture modulaire** : Page refactorisee de 1433 lignes vers composants modulaires
  - **Structure hierarchique** : Support des categories parentes et sous-categories (max 2 niveaux)
  - **Nouveau hook `useCategoryPage`** : Centralise queries, mutations et state management
  - **Composants modulaires** :
    - `CategoryForm/` : Formulaire avec sections conditionnelles
    - `CategoryTable/` : Table avec expansion/collapse des sous-categories
    - `types.ts` : Types TypeScript centralises

- **Configuration d'affichage des categories**
  - Nouveau champ `displayFormat` dans le schema Convex
  - 3 modes d'affichage configurables par categorie parente :
    - `hierarchy` : "Parent > Sous-categorie"
    - `subcategory` : Nom seul (defaut, retrocompatible)
    - `badge` : [Parent] Sous-categorie
  - Composant `CategoryDisplay` reutilisable

- **Ameliorations du formulaire admin**
  - Selection du type (categorie parente ou sous-categorie)
  - Champs metier uniquement pour les sous-categories (facturation, prix, prestations)
  - Format d'affichage uniquement pour les categories parentes
  - Section prestations par defaut avec ajout/suppression

- **Table des categories amelioree**
  - Affichage hierarchique avec indentation visuelle
  - Lignes parentes avec badge et compteur de sous-categories
  - Bouton expansion/collapse pour voir les sous-categories
  - Colonnes adaptees selon le type (parent vs sous-categorie)
  - Section "Categories orphelines" pour les sous-categories sans parent

- **Backend Convex mis a jour**
  - `getActiveCategories` retourne maintenant une structure hierarchique
  - Validation max 2 niveaux de profondeur
  - Prevention des references circulaires
  - Support du champ `displayFormat`

- **Pages mises a jour**
  - `/recherche` : Gestion de la nouvelle structure hierarchique
  - `/dashboard/services` : Groupement des categories par parent
  - `CategorySelector` : Affichage hierarchique avec headers de section

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

- **Espace client - Reservations ameliore** (`/client/reservations`)
  - Nouvelle page de detail de reservation (`/client/reservations/[missionId]`)
  - Cards ameliorees avec affichage clair des dates et heures de debut/fin
  - Synthese de la duree de la mission
  - Statut du paiement detaille (pre-autorisation, blocage, encaissement)
  - Informations du pet-sitter avec contact direct
  - Support de la garde de nuit avec affichage du nombre de nuits

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
