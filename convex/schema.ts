import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Identifiants
    email: v.string(),
    passwordHash: v.string(),

    // Slug pour URLs propres (ex: "marie-dupont", "marie-dupont-2")
    slug: v.optional(v.string()),

    // Type de compte
    accountType: v.union(
      v.literal("annonceur_pro"),
      v.literal("annonceur_particulier"),
      v.literal("utilisateur")
    ),

    // Informations personnelles
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),

    // Champs PRO (optionnels)
    siret: v.optional(v.string()),
    companyName: v.optional(v.string()),

    // Classification entreprise (pour calcul prix conseillé)
    companyType: v.optional(v.union(
      v.literal("micro_enterprise"),   // Micro-entrepreneur, EI (pas de TVA)
      v.literal("regular_company"),    // SARL, SAS, EURL, etc. (TVA)
      v.literal("unknown")
    )),
    isVatSubject: v.optional(v.boolean()),  // Assujetti TVA
    legalForm: v.optional(v.string()),       // Forme juridique brute (catjurlib)

    // Metadata
    cguAcceptedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    emailVerified: v.boolean(),
    isActive: v.boolean(),

    // Role (admin ou user)
    role: v.optional(v.union(v.literal("user"), v.literal("admin"))),

    // Stripe Connect (pour annonceurs - virements)
    stripeAccountId: v.optional(v.string()), // acct_xxx
    stripeChargesEnabled: v.optional(v.boolean()), // Peut recevoir des paiements
    stripePayoutsEnabled: v.optional(v.boolean()), // Peut recevoir des virements
    stripeDetailsSubmitted: v.optional(v.boolean()), // Onboarding terminé
    stripeAccountUpdatedAt: v.optional(v.number()), // Dernière mise à jour
  })
    .index("by_email", ["email"])
    .index("by_slug", ["slug"])
    .index("by_account_type", ["accountType"])
    .index("by_siret", ["siret"])
    .index("by_role", ["role"])
    .index("by_stripe_account", ["stripeAccountId"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"])
    .index("by_expires", ["expiresAt"]),

  // Configuration système (APIs, paramètres)
  systemConfig: defineTable({
    key: v.string(),
    value: v.string(),
    isSecret: v.boolean(),
    environment: v.union(v.literal("development"), v.literal("production")),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"])
    .index("by_key_env", ["key", "environment"]),

  // Profil annonceur (description, bio, etc.)
  profiles: defineTable({
    userId: v.id("users"),
    profileImageUrl: v.optional(v.string()), // URL Cloudinary de la photo de profil
    coverImageUrl: v.optional(v.string()), // URL Cloudinary de la photo de couverture/bannière
    bio: v.optional(v.string()), // Description courte
    description: v.optional(v.string()), // Description détaillée
    experience: v.optional(v.string()), // Années d'expérience, formations
    availability: v.optional(v.string()), // Disponibilités (texte libre)
    location: v.optional(v.string()), // Ville/zone d'intervention (texte libre)
    radius: v.optional(v.number()), // Rayon d'intervention en km

    // Localisation structurée (pour calcul prix conseillé)
    postalCode: v.optional(v.string()),   // Code postal (ex: "75015")
    city: v.optional(v.string()),          // Ville (ex: "Paris")
    department: v.optional(v.string()),    // Département (ex: "75", "2A", "971")
    region: v.optional(v.string()),        // Région (ex: "Ile-de-France")
    // Coordonnées GPS (pour recherche par distance)
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    googlePlaceId: v.optional(v.string()), // ID Google Maps pour référence
    acceptedAnimals: v.optional(v.array(v.string())), // ["chien", "chat", "rongeur", etc.]

    // Conditions de garde - Logement
    housingType: v.optional(v.union(
      v.literal("house"),      // Maison
      v.literal("apartment")   // Appartement
    )),
    housingSize: v.optional(v.number()), // Surface en m²
    hasGarden: v.optional(v.boolean()),
    gardenSize: v.optional(v.string()), // "petit", "moyen", "grand"

    // Conditions de garde - Mode de vie
    isSmoker: v.optional(v.boolean()),
    hasChildren: v.optional(v.boolean()),
    childrenAges: v.optional(v.array(v.string())), // ["0-3", "4-10", "11-17"]

    // Conditions de garde - Alimentation
    providesFood: v.optional(v.boolean()), // L'annonceur fournit l'alimentation

    hasVehicle: v.optional(v.boolean()),
    // Animaux de l'annonceur
    ownedAnimals: v.optional(v.array(v.object({
      id: v.optional(v.string()), // ID unique pour l'édition
      type: v.string(), // "chien", "chat", etc.
      name: v.string(),
      breed: v.optional(v.string()), // Race
      age: v.optional(v.number()), // Âge en années
      gender: v.optional(v.string()), // "male", "female", "unknown"
      profilePhoto: v.optional(v.string()), // URL Cloudinary
      galleryPhotos: v.optional(v.array(v.string())), // URLs Cloudinary
      weight: v.optional(v.number()), // Poids en kg
      size: v.optional(v.string()), // "petit", "moyen", "grand", "tres_grand"
      description: v.optional(v.string()),
      goodWithChildren: v.optional(v.boolean()),
      goodWithDogs: v.optional(v.boolean()),
      goodWithCats: v.optional(v.boolean()),
      goodWithOtherAnimals: v.optional(v.boolean()),
      behaviorTraits: v.optional(v.array(v.string())),
    }))),
    // Activités proposées par l'annonceur
    selectedActivities: v.optional(v.array(v.object({
      activityId: v.id("activities"), // Référence à l'activité du catalogue
      customDescription: v.optional(v.string()), // Description personnalisée par l'annonceur
    }))),
    // Photos de l'environnement (URLs Cloudinary)
    environmentPhotos: v.optional(v.array(v.object({
      id: v.string(), // ID unique pour le drag & drop
      url: v.string(), // URL Cloudinary
      caption: v.optional(v.string()), // Légende optionnelle
    }))),
    // Buffers de temps autour des services (en minutes)
    // Permet à l'annonceur de bloquer du temps avant/après chaque service
    bufferBefore: v.optional(v.number()), // Minutes à bloquer avant un service (0, 15, 30, 45, 60)
    bufferAfter: v.optional(v.number()),  // Minutes à bloquer après un service (0, 15, 30, 45, 60)
    // Nombre max d'animaux acceptés en même temps sur un créneau
    maxAnimalsPerSlot: v.optional(v.number()), // Ex: 3 = peut garder 3 animaux simultanément
    // I-CAD (Identification des Carnivores Domestiques)
    // true = inscrit I-CAD, false = non inscrit, undefined = pas encore renseigné
    icadRegistered: v.optional(v.boolean()),

    // Vérification d'identité
    // true = identité vérifiée par admin, false/undefined = non vérifié
    isIdentityVerified: v.optional(v.boolean()),
    identityVerifiedAt: v.optional(v.number()), // Date de vérification

    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_department", ["department"])
    .index("by_postal_code", ["postalCode"])
    .index("by_verified", ["isIdentityVerified"]),

  // Profil client (propriétaires d'animaux)
  clientProfiles: defineTable({
    userId: v.id("users"),
    // Photo
    profileImageUrl: v.optional(v.string()),
    // Bio
    description: v.optional(v.string()),
    // Localisation
    location: v.optional(v.string()),        // Adresse complète
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    googlePlaceId: v.optional(v.string()),
    // Metadata
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // Adresses des clients (pour services à domicile)
  clientAddresses: defineTable({
    userId: v.id("users"),
    label: v.string(),            // Nom de l'adresse (ex: "Maison", "Travail")
    address: v.string(),          // Adresse complète
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    country: v.optional(v.string()),
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    googlePlaceId: v.optional(v.string()),
    additionalInfo: v.optional(v.string()), // Instructions (code, étage, etc.)
    isDefault: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_default", ["userId", "isDefault"]),

  // Services proposés par les annonceurs
  // Structure simplifiée: category (prestation) + animalTypes + formules (variants)
  services: defineTable({
    userId: v.id("users"),
    category: v.string(), // Slug de la prestation (ex: "toilettage", "garde")
    animalTypes: v.array(v.string()), // Types d'animaux acceptés pour ce service
    isActive: v.boolean(),
    basePrice: v.optional(v.number()), // Prix "à partir de" (min des formules, en centimes)
    // Champs legacy (optionnels pour rétrocompatibilité migration)
    name: v.optional(v.string()), // Ancien: nom personnalisé
    description: v.optional(v.string()), // Ancien: description
    price: v.optional(v.number()), // Ancien: prix en centimes
    priceUnit: v.optional(v.union(
      v.literal("hour"),
      v.literal("day"),
      v.literal("week"),
      v.literal("month"),
      v.literal("flat")
    )), // Ancien: unité de prix
    duration: v.optional(v.number()), // Ancien: durée en minutes
    hasVariants: v.optional(v.boolean()), // Legacy: toujours true maintenant
    // Lieu de prestation
    serviceLocation: v.optional(v.union(
      v.literal("announcer_home"),  // Chez l'annonceur uniquement
      v.literal("client_home"),     // Chez le client uniquement
      v.literal("both")             // Les deux possibles (client choisit)
    )),
    // Garde de nuit
    allowOvernightStay: v.optional(v.boolean()),  // L'annonceur accepte la garde de nuit
    dayStartTime: v.optional(v.string()),          // Heure début journée "08:00"
    dayEndTime: v.optional(v.string()),            // Heure fin journée "20:00"
    overnightPrice: v.optional(v.number()),        // Prix de la nuit en centimes
    // Modération (simplifiée - catégories gérées par admin)
    moderationStatus: v.optional(v.union(
      v.literal("approved"),
      v.literal("pending"),
      v.literal("rejected")
    )),
    moderationNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_category", ["category"])
    .index("by_category_active", ["category", "isActive"])
    .index("by_moderation_status", ["moderationStatus"]),

  // Variantes de service (formules/tarifs)
  serviceVariants: defineTable({
    serviceId: v.id("services"),
    name: v.string(), // "Toilettage Simple", "Toilettage Premium"
    description: v.optional(v.string()),
    objectives: v.optional(v.array(v.object({
      icon: v.string(), // Emoji ou icône
      text: v.string(), // Texte de l'objectif
    }))), // Objectifs de la prestation avec icônes
    numberOfSessions: v.optional(v.number()), // Nombre de séances (optionnel, défaut: 1)
    sessionInterval: v.optional(v.number()), // Délai minimum en jours entre chaque séance (ex: 7 = 1 séance/semaine)
    sessionType: v.optional(v.union(v.literal("individual"), v.literal("collective"))), // Type de séance
    maxAnimalsPerSession: v.optional(v.number()), // Nombre max d'animaux par séance (si collective)
    // Lieu de prestation et animaux acceptés (au niveau de la formule)
    serviceLocation: v.optional(v.union(
      v.literal("announcer_home"),
      v.literal("client_home"),
      v.literal("both")
    )), // Où la prestation est effectuée (si collective, forcé à announcer_home)
    animalTypes: v.optional(v.array(v.string())), // Types d'animaux acceptés pour cette formule
    // Ancien système (rétrocompatibilité) - prix unique
    price: v.number(), // Prix principal en centimes
    priceUnit: v.union(
      v.literal("hour"),
      v.literal("day"),
      v.literal("week"),
      v.literal("month"),
      v.literal("flat")
    ),
    // Nouveau système - multi-tarification par unité de temps
    // Permet de définir un prix différent pour chaque unité (heure, jour, semaine, mois)
    pricing: v.optional(v.object({
      hourly: v.optional(v.number()),  // Prix à l'heure en centimes
      daily: v.optional(v.number()),   // Prix à la journée en centimes
      weekly: v.optional(v.number()),  // Prix à la semaine en centimes
      monthly: v.optional(v.number()), // Prix au mois en centimes
      nightly: v.optional(v.number()), // Prix de la nuit en centimes
    })),
    duration: v.optional(v.number()), // Durée en minutes
    includedFeatures: v.optional(v.array(v.string())), // ["Brossage", "Lavage", "Séchage"]
    order: v.number(), // Ordre d'affichage
    isActive: v.boolean(),
    needsSlotConfiguration: v.optional(v.boolean()), // true si formule collective sans créneaux configurés
    slotsCount: v.optional(v.number()), // Nombre de créneaux futurs configurés (cache)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_service", ["serviceId"])
    .index("by_service_active", ["serviceId", "isActive"]),

  // Options additionnelles pour les services
  serviceOptions: defineTable({
    serviceId: v.id("services"),
    name: v.string(), // "Shampoing anti-puces", "Parfum"
    description: v.optional(v.string()),
    price: v.number(), // Prix en centimes
    priceType: v.union(
      v.literal("flat"), // Forfait unique (+8€)
      v.literal("per_day"), // Par jour (+5€/jour)
      v.literal("per_unit") // Par unité (+8€/promenade)
    ),
    unitLabel: v.optional(v.string()), // "par jour", "par promenade" (si per_day ou per_unit)
    maxQuantity: v.optional(v.number()), // Quantité max sélectionnable
    order: v.number(), // Ordre d'affichage
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_service", ["serviceId"])
    .index("by_service_active", ["serviceId", "isActive"]),

  // Catégories de services (gérées par l'admin)
  serviceCategories: defineTable({
    slug: v.string(), // Identifiant unique (ex: "garde", "toilettage")
    name: v.string(), // Nom affiché (ex: "Garde", "Toilettage")
    description: v.optional(v.string()),
    icon: v.optional(v.string()), // Emoji ou nom d'icône
    color: v.optional(v.string()), // Couleur HEX (ex: "#FF6B6B") pour le design
    imageStorageId: v.optional(v.id("_storage")), // Image de la catégorie
    order: v.number(), // Ordre d'affichage
    isActive: v.boolean(),
    // Référence vers la catégorie parente (hiérarchie à 2 niveaux max)
    // undefined = catégorie parente (niveau racine)
    // Id = sous-catégorie
    parentCategoryId: v.optional(v.id("serviceCategories")),
    // Type de facturation pour cette catégorie
    billingType: v.optional(v.union(
      v.literal("hourly"),    // Facturation à l'heure (toilettage, promenade...)
      v.literal("daily"),     // Facturation à la journée (pension...)
      v.literal("flexible")   // L'annonceur choisit (garde - courte ou longue durée)
    )),
    // Prix horaire conseillé par défaut (en centimes)
    // Utilisé quand pas assez de données pour calculer une moyenne
    defaultHourlyPrice: v.optional(v.number()),
    // Permettre la réservation par plage (dates ou heures)
    // true = le client peut sélectionner une plage de dates ou d'heures
    allowRangeBooking: v.optional(v.boolean()),
    // Multi-pricing : types de prix autorisés pour cette catégorie
    // Si vide ou undefined, tous les types sont autorisés
    allowedPriceUnits: v.optional(v.array(v.union(
      v.literal("hour"),
      v.literal("day"),
      v.literal("week"),
      v.literal("month")
    ))),
    // Formules par défaut pour cette catégorie
    // L'annonceur peut les utiliser comme base et ajouter son prix
    defaultVariants: v.optional(v.array(v.object({
      name: v.string(),              // Nom de la formule (ex: "Garde Standard")
      description: v.optional(v.string()), // Description par défaut
      suggestedDuration: v.optional(v.number()), // Durée suggérée en minutes
      includedFeatures: v.optional(v.array(v.string())), // Caractéristiques incluses
    }))),
    // Autoriser l'annonceur à créer ses propres formules
    // true = peut ajouter des formules personnalisées en plus des défauts
    // false = doit utiliser uniquement les formules par défaut
    allowCustomVariants: v.optional(v.boolean()),
    // Autoriser la garde de nuit pour cette catégorie
    // true = les annonceurs peuvent proposer la garde de nuit
    allowOvernightStay: v.optional(v.boolean()),
    // Format d'affichage des sous-catégories (uniquement pour les catégories parentes)
    // hierarchy = "Garde > Garde standard"
    // subcategory = "Garde standard" (défaut)
    // badge = "[Garde] Garde standard"
    displayFormat: v.optional(v.union(
      v.literal("hierarchy"),
      v.literal("subcategory"),
      v.literal("badge")
    )),
    // Catégorie basée sur la capacité (uniquement pour les catégories parentes)
    // Si true, les réservations sont gérées par capacité (nombre d'animaux max simultanés)
    // au lieu de bloquer entièrement le créneau horaire
    // Ex: Un gardien peut garder 3 animaux en même temps, donc 3 réservations peuvent
    // chevaucher sur le même créneau
    isCapacityBased: v.optional(v.boolean()),
    // Blocage des créneaux basé sur la durée du service (sous-catégories uniquement)
    // Si true: créneau bloqué = startTime + durée_variant + bufferAfter
    // Les formules doivent avoir une durée définie quand ce mode est activé
    enableDurationBasedBlocking: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"])
    .index("by_active", ["isActive"])
    .index("by_parent", ["parentCategoryId"]),

  // Photos des prestations
  photos: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"), // ID du fichier stocké dans Convex
    url: v.optional(v.string()), // URL publique
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.number(), // Pour ordonner les photos
    isProfilePhoto: v.boolean(), // Photo de profil principale
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_order", ["userId", "order"]),

  // Missions (réservations de services)
  missions: defineTable({
    announcerId: v.id("users"),
    clientId: v.id("users"),
    serviceId: v.optional(v.id("services")),

    // Client info (dénormalisé pour affichage rapide)
    clientName: v.string(),
    clientPhone: v.optional(v.string()),

    // Animal (référence ou données inline pour invités)
    animalId: v.optional(v.id("animals")), // Référence si utilisateur connecté
    animal: v.object({
      name: v.string(),
      type: v.string(),
      emoji: v.string(),
    }),

    // Service
    serviceName: v.string(),
    serviceCategory: v.string(),
    variantId: v.optional(v.string()), // ID de la formule choisie
    variantName: v.optional(v.string()), // Nom de la formule (dénormalisé)
    optionIds: v.optional(v.array(v.string())), // IDs des options choisies
    optionNames: v.optional(v.array(v.string())), // Noms des options (dénormalisé)

    // Prix détaillé
    basePrice: v.optional(v.number()), // Prix de base de la formule (centimes)
    optionsPrice: v.optional(v.number()), // Prix des options (centimes)
    platformFee: v.optional(v.number()), // Commission plateforme (centimes)
    announcerEarnings: v.optional(v.number()), // Revenus annonceur après commission (centimes)

    // Dates
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(), // "YYYY-MM-DD"
    startTime: v.optional(v.string()), // "HH:MM"
    endTime: v.optional(v.string()),

    // Garde de nuit
    includeOvernightStay: v.optional(v.boolean()), // Garde de nuit incluse
    overnightNights: v.optional(v.number()),       // Nombre de nuits
    overnightAmount: v.optional(v.number()),       // Montant des nuits en centimes
    dayStartTime: v.optional(v.string()),          // Heure début journée "08:00"
    dayEndTime: v.optional(v.string()),            // Heure fin journée "20:00"

    // Lieu de prestation choisi par le client
    serviceLocation: v.optional(v.union(
      v.literal("announcer_home"),  // Chez l'annonceur
      v.literal("client_home")      // Chez le client (à domicile)
    )),

    // Statut
    status: v.union(
      v.literal("pending_acceptance"), // En attente d'acceptation par l'annonceur
      v.literal("pending_confirmation"), // Accepté, en attente de confirmation client
      v.literal("upcoming"), // Confirmé, à venir
      v.literal("in_progress"), // En cours
      v.literal("completed"), // Terminée
      v.literal("refused"), // Refusée par l'annonceur
      v.literal("cancelled") // Annulée
    ),

    // Paiement client
    amount: v.number(), // Montant en centimes
    paymentStatus: v.union(
      v.literal("not_due"), // Pas encore dû
      v.literal("pending"), // En attente de paiement (fonds bloqués)
      v.literal("paid"), // Payé (capturé)
      v.literal("refunded") // Remboursé
    ),

    // Paiement annonceur (virement)
    announcerPaymentStatus: v.optional(v.union(
      v.literal("not_due"), // Pas encore dû
      v.literal("pending"), // Transfert créé, en attente
      v.literal("paid") // Virement effectué
    )),

    // Localisation
    location: v.string(), // Adresse complète
    city: v.optional(v.string()), // Ville extraite
    clientCoordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),

    // Notes
    clientNotes: v.optional(v.string()),
    announcerNotes: v.optional(v.string()),
    cancellationReason: v.optional(v.string()),

    // Stripe - Paiement
    stripePaymentId: v.optional(v.id("stripePayments")), // Référence au paiement Stripe
    completedByClientAt: v.optional(v.number()), // Date de confirmation par le client
    autoCaptureScheduledAt: v.optional(v.number()), // Date prévue pour l'auto-capture (+48h)

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_announcer", ["announcerId"])
    .index("by_client", ["clientId"])
    .index("by_announcer_status", ["announcerId", "status"])
    .index("by_announcer_dates", ["announcerId", "startDate"])
    .index("by_auto_capture", ["autoCaptureScheduledAt"]),

  // Disponibilités / Indisponibilités des annonceurs
  availability: defineTable({
    userId: v.id("users"),
    date: v.string(), // "YYYY-MM-DD"
    status: v.union(
      v.literal("available"), // Disponible
      v.literal("partial"), // Partiellement disponible
      v.literal("unavailable") // Indisponible
    ),
    // Créneaux horaires (si statut partiel)
    timeSlots: v.optional(
      v.array(
        v.object({
          startTime: v.string(), // "HH:MM"
          endTime: v.string(), // "HH:MM"
        })
      )
    ),
    reason: v.optional(v.string()), // Raison de l'indisponibilité
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // Fiches animaux des utilisateurs
  animals: defineTable({
    // Propriétaire
    userId: v.id("users"),

    // Informations de base
    name: v.string(),
    type: v.string(), // "chien", "chat", "oiseau", etc.
    breed: v.optional(v.string()), // Race
    gender: v.union(v.literal("male"), v.literal("female"), v.literal("unknown")),
    birthDate: v.optional(v.string()), // "YYYY-MM-DD"

    // Caractéristiques physiques
    weight: v.optional(v.number()), // Poids en kg
    size: v.optional(v.string()), // "petit", "moyen", "grand", "très grand"

    // Description
    description: v.optional(v.string()),

    // Photo de profil (Cloudinary)
    profilePhoto: v.optional(v.string()), // URL Cloudinary

    // Galerie photos (Cloudinary URLs)
    galleryPhotos: v.optional(v.array(v.string())), // URLs Cloudinary

    // Ancien système de photos (Convex storage) - pour rétrocompatibilité
    photos: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      isPrimary: v.boolean(),
      order: v.number(),
    }))),

    // Compatibilité sociale (réponses explicites)
    goodWithChildren: v.optional(v.boolean()),
    goodWithDogs: v.optional(v.boolean()),
    goodWithCats: v.optional(v.boolean()),
    goodWithOtherAnimals: v.optional(v.boolean()),

    // Traits de caractère - Système de tags par section
    // Section "Compatibilité" (ancien système pour rétrocompatibilité)
    compatibilityTraits: v.optional(v.array(v.string())),

    // Section "Comportement"
    behaviorTraits: v.optional(v.array(v.string())),
    // Ex: ["Anxieux", "Agressif", "Peureux", "Joueur", "Calme", "Énergique"]

    // Section "Besoins"
    needsTraits: v.optional(v.array(v.string())),
    // Ex: ["A besoin de se dépenser", "Demande beaucoup d'attention"]

    // Traits personnalisés (ajoutés par l'utilisateur)
    customTraits: v.optional(v.array(v.string())),

    // Allergies
    hasAllergies: v.optional(v.boolean()),
    allergiesDetails: v.optional(v.string()),

    // Contraintes particulières (texte libre)
    specialNeeds: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),

    // Métadonnées
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"]),

  // Réservations en attente (avant finalisation)
  pendingBookings: defineTable({
    // Données de la réservation
    announcerId: v.id("users"),
    serviceId: v.id("services"),
    variantId: v.string(),
    optionIds: v.optional(v.array(v.string())),

    // Dates sélectionnées
    startDate: v.string(),
    endDate: v.string(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()), // Heure de fin calculée (startTime + durée)

    // Créneaux collectifs (pour formules collectives)
    collectiveSlotIds: v.optional(v.array(v.id("collectiveSlots"))),
    // Nombre d'animaux (pour formules collectives)
    animalCount: v.optional(v.number()),
    // Type d'animal sélectionné
    selectedAnimalType: v.optional(v.string()),

    // Séances multi-sessions (pour formules individuelles multi-séances)
    sessions: v.optional(v.array(v.object({
      date: v.string(),
      startTime: v.string(),
      endTime: v.string(),
    }))),

    // Garde de nuit
    includeOvernightStay: v.optional(v.boolean()), // Le client souhaite la garde de nuit
    overnightNights: v.optional(v.number()),       // Nombre de nuits
    overnightAmount: v.optional(v.number()),       // Montant des nuits en centimes

    // Lieu de prestation choisi par le client
    serviceLocation: v.optional(v.union(
      v.literal("announcer_home"),  // Chez l'annonceur
      v.literal("client_home")      // Chez le client (à domicile)
    )),

    // Adresse invité (pour les utilisateurs non connectés avec service à domicile)
    guestAddress: v.optional(v.object({
      address: v.string(),
      city: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      coordinates: v.optional(v.object({
        lat: v.number(),
        lng: v.number(),
      })),
    })),

    // Prix calculé
    calculatedAmount: v.number(),

    // Si utilisateur connecté
    userId: v.optional(v.id("users")),

    // Si invité (données temporaires)
    guestEmail: v.optional(v.string()),

    // Statut de la réservation en attente
    status: v.optional(v.union(
      v.literal("pending"), // En attente de finalisation
      v.literal("awaiting_email_verification"), // En attente de vérification email
      v.literal("email_verified"), // Email vérifié, prêt à créer la mission
      v.literal("completed"), // Converti en mission
      v.literal("expired") // Expiré
    )),

    // Données du client pour réservation invité
    clientData: v.optional(v.object({
      firstName: v.string(),
      lastName: v.string(),
      phone: v.string(),
      animalName: v.string(),
      animalType: v.string(),
      notes: v.optional(v.string()),
    })),

    // Adresse de la prestation
    location: v.optional(v.string()),
    city: v.optional(v.string()), // Ville extraite
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),

    // Expiration (24h)
    expiresAt: v.number(),

    createdAt: v.number(),
  })
    .index("by_expires", ["expiresAt"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Préférences utilisateur
  userPreferences: defineTable({
    userId: v.id("users"),

    // Horaires de disponibilité (pour accepter les réservations)
    acceptReservationsFrom: v.optional(v.string()), // "08:00"
    acceptReservationsTo: v.optional(v.string()),   // "20:00"

    // Mode de facturation pour les dépassements
    // "round_up" = arrondir à la demi-journée/journée supérieure
    // "exact" = facturer les heures exactes en supplément
    billingMode: v.optional(
      v.union(v.literal("round_up"), v.literal("exact"))
    ),

    // Seuil pour arrondir (en heures)
    // Ex: si seuil = 2 et dépassement = 1h, on facture les heures
    // Si dépassement >= 2h, on arrondit à la demi-journée
    roundUpThreshold: v.optional(v.number()),

    // Préférences de notification (stockées ici pour persistance)
    notifications: v.optional(
      v.object({
        email: v.optional(
          v.object({
            newMission: v.optional(v.boolean()),
            messages: v.optional(v.boolean()),
            reviews: v.optional(v.boolean()),
            payments: v.optional(v.boolean()),
            newsletter: v.optional(v.boolean()),
          })
        ),
        push: v.optional(
          v.object({
            newMission: v.optional(v.boolean()),
            messages: v.optional(v.boolean()),
            reviews: v.optional(v.boolean()),
            payments: v.optional(v.boolean()),
            reminders: v.optional(v.boolean()),
          })
        ),
        sms: v.optional(
          v.object({
            newMission: v.optional(v.boolean()),
            urgentMessages: v.optional(v.boolean()),
            payments: v.optional(v.boolean()),
          })
        ),
      })
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Clés développeur pour le système de présence
  devKeys: defineTable({
    name: v.string(), // Nom du développeur
    key: v.string(), // Clé unique (64 chars hex)
    isActive: v.boolean(),
    createdAt: v.number(),
    createdBy: v.id("users"), // Admin qui a créé la clé
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"])
    .index("by_active", ["isActive"]),

  // Présence des développeurs (heartbeats)
  devPresence: defineTable({
    devKeyId: v.id("devKeys"),
    lastHeartbeat: v.number(), // Timestamp du dernier heartbeat
    onlineSince: v.number(), // Début de la session
    userAgent: v.optional(v.string()),
  }).index("by_devKey", ["devKeyId"]),

  // Tokens de vérification d'email
  emailVerificationTokens: defineTable({
    userId: v.id("users"),
    token: v.string(), // Token unique 64 chars hex
    email: v.string(), // Email à vérifier
    expiresAt: v.number(), // Expiration (24h)
    createdAt: v.number(),
    usedAt: v.optional(v.number()), // Date d'utilisation si utilisé
    // Contexte de la vérification
    context: v.optional(v.union(
      v.literal("registration"), // Inscription simple
      v.literal("reservation") // Inscription via réservation
    )),
    // Référence à la réservation en attente (si contexte = reservation)
    pendingBookingId: v.optional(v.id("pendingBookings")),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"])
    .index("by_expires", ["expiresAt"])
    .index("by_pending_booking", ["pendingBookingId"]),

  // Tokens de réinitialisation de mot de passe
  passwordResetTokens: defineTable({
    userId: v.id("users"),
    token: v.string(), // Token unique 64 chars hex
    email: v.string(), // Email de l'utilisateur
    expiresAt: v.number(), // Expiration (1h)
    createdAt: v.number(),
    usedAt: v.optional(v.number()), // Date d'utilisation si utilisé
    createdByAdmin: v.optional(v.boolean()), // true si créé par un admin
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"])
    .index("by_expires", ["expiresAt"]),

  // Templates d'emails personnalisables
  emailTemplates: defineTable({
    // Identifiant unique du template
    slug: v.string(), // "verification", "verification_reservation", "welcome", "reservation_confirmation", etc.
    name: v.string(), // Nom affiché dans l'admin
    description: v.optional(v.string()), // Description du template

    // Contenu du template
    subject: v.string(), // Sujet de l'email (avec variables)
    htmlContent: v.string(), // Contenu HTML (avec variables)

    // Variables disponibles pour ce template
    availableVariables: v.array(v.object({
      key: v.string(), // ex: "firstName"
      description: v.string(), // ex: "Prénom de l'utilisateur"
      example: v.optional(v.string()), // ex: "Jean"
    })),

    // Métadonnées
    isActive: v.boolean(),
    isSystem: v.boolean(), // true = template système non supprimable
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["isActive"]),

  // Historique des emails envoyés
  emailLogs: defineTable({
    to: v.string(),
    from: v.string(),
    subject: v.string(),
    template: v.string(), // "verification", "reservation_confirmation", etc.
    status: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("pending")
    ),
    resendId: v.optional(v.string()), // ID Resend pour tracking
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()), // Données additionnelles (userId, bookingId, etc.)
    createdAt: v.number(),
  })
    .index("by_to", ["to"])
    .index("by_template", ["template"])
    .index("by_status", ["status"]),

  // Invitations administrateur (tokens à usage unique)
  adminInvitations: defineTable({
    token: v.string(), // Token unique 64 chars hex
    status: v.union(
      v.literal("pending"),
      v.literal("used"),
      v.literal("expired"),
      v.literal("revoked")
    ),
    createdAt: v.number(),
    expiresAt: v.number(), // createdAt + 24h
    createdBy: v.id("users"),
    note: v.optional(v.string()), // Note optionnelle pour identifier l'invitation
    // Usage
    usedAt: v.optional(v.number()),
    usedBy: v.optional(v.id("users")),
    // Revocation
    revokedAt: v.optional(v.number()),
    revokedBy: v.optional(v.id("users")),
  })
    .index("by_token", ["token"])
    .index("by_status", ["status"])
    .index("by_created_by", ["createdBy"]),

  // Activités proposables par les annonceurs (catalogue admin)
  activities: defineTable({
    name: v.string(), // "Promenades quotidiennes", "Jeux et stimulation"
    emoji: v.string(), // "🚶", "🎾"
    description: v.optional(v.string()), // Description par défaut
    order: v.number(), // Ordre d'affichage
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_order", ["order"])
    .index("by_active", ["isActive"]),

  // Paiements Stripe (pré-autorisations et captures)
  stripePayments: defineTable({
    missionId: v.id("missions"),

    // Identifiants Stripe
    checkoutSessionId: v.optional(v.string()), // cs_xxx (pour Checkout Session)
    paymentIntentId: v.optional(v.string()), // pi_xxx
    clientSecret: v.optional(v.string()), // Pour Stripe Elements

    // Montants (en centimes)
    amount: v.number(), // Montant total
    platformFee: v.number(), // Commission plateforme
    announcerEarnings: v.number(), // Revenus annonceur

    // Statut du paiement
    status: v.union(
      v.literal("pending"), // Checkout Session créée, en attente client
      v.literal("authorized"), // Pré-autorisation réussie (fonds bloqués)
      v.literal("captured"), // Paiement capturé
      v.literal("cancelled"), // Annulé (pré-autorisation relâchée)
      v.literal("expired"), // Session expirée (1h)
      v.literal("failed"), // Échec du paiement
      v.literal("refunded") // Remboursé au client
    ),

    // URL de paiement (interne ou Stripe)
    checkoutUrl: v.optional(v.string()),
    expiresAt: v.number(), // Timestamp expiration (+1h)

    // Timestamps capture
    authorizedAt: v.optional(v.number()), // Date pré-autorisation
    capturedAt: v.optional(v.number()), // Date capture
    cancelledAt: v.optional(v.number()), // Date annulation

    // Remboursement
    refundedAt: v.optional(v.number()), // Date remboursement
    refundedAmount: v.optional(v.number()), // Montant remboursé (centimes)

    // Transfert vers annonceur (Stripe Connect)
    transferId: v.optional(v.string()), // tr_xxx
    transferAmount: v.optional(v.number()), // Montant transféré (centimes)
    transferCreatedAt: v.optional(v.number()), // Date création transfert

    // Métadonnées Stripe
    stripeCustomerId: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_mission", ["missionId"])
    .index("by_checkout_session", ["checkoutSessionId"])
    .index("by_payment_intent", ["paymentIntentId"])
    .index("by_status", ["status"])
    .index("by_expires", ["expiresAt"]),

  // Notifications in-app
  notifications: defineTable({
    // Destinataire
    userId: v.id("users"),

    // Type de notification
    type: v.union(
      // Missions
      v.literal("new_mission"),           // Annonceur: nouvelle demande reçue
      v.literal("mission_accepted"),      // Client: demande acceptée
      v.literal("mission_refused"),       // Client: demande refusée
      v.literal("mission_confirmed"),     // Annonceur: client a confirmé
      v.literal("mission_started"),       // Les deux: mission démarrée
      v.literal("mission_completed"),     // Les deux: mission terminée
      v.literal("mission_cancelled"),     // Les deux: annulation

      // Paiements
      v.literal("payment_authorized"),    // Client: paiement pré-autorisé
      v.literal("payment_captured"),      // Annonceur: paiement capturé
      v.literal("payout_sent"),           // Annonceur: virement envoyé

      // Avis
      v.literal("review_received"),       // Annonceur: nouvel avis

      // Messages (futur)
      v.literal("new_message"),           // Nouveau message reçu

      // Système
      v.literal("welcome"),               // Nouveau compte créé
      v.literal("reminder"),              // Rappel (ex: mission demain)
      v.literal("system")                 // Notification système générique
    ),

    // Contenu
    title: v.string(),
    message: v.string(),

    // Lien contextuel
    linkType: v.optional(v.union(
      v.literal("mission"),
      v.literal("payment"),
      v.literal("profile"),
      v.literal("review"),
      v.literal("message"),
      v.literal("settings")
    )),
    linkId: v.optional(v.string()),
    linkUrl: v.optional(v.string()),

    // Statut
    isRead: v.boolean(),
    readAt: v.optional(v.number()),

    // Metadata flexible
    metadata: v.optional(v.any()),

    // Timestamps
    createdAt: v.number(),
    expiresAt: v.number(),  // Auto-delete après 30 jours
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_user_type", ["userId", "type"])
    .index("by_expires", ["expiresAt"]),

  // Pages légales (CGV, CGU, Confidentialité, Annulation)
  legalPages: defineTable({
    slug: v.string(), // "cgv", "cgu", "privacy", "cancellation"
    title: v.string(), // Titre affiché
    content: v.string(), // Contenu HTML
    version: v.number(), // Version du document
    status: v.union(
      v.literal("draft"), // Brouillon
      v.literal("published") // Publié
    ),
    lastModifiedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  // Demandes de visite (mode maintenance)
  visitRequests: defineTable({
    name: v.string(),
    ipAddress: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
  })
    .index("by_ip", ["ipAddress"])
    .index("by_status", ["status"])
    .index("by_ip_status", ["ipAddress", "status"]),

  // Demandes de vérification d'identité des annonceurs
  verificationRequests: defineTable({
    userId: v.id("users"),

    // Code de vérification à écrire sur la photo selfie
    verificationCode: v.string(), // Code aléatoire 6 caractères (ex: "A3K9P2")

    // Documents uploadés (URLs Cloudinary)
    idCardFrontUrl: v.optional(v.string()), // CNI recto
    idCardBackUrl: v.optional(v.string()),  // CNI verso
    selfieWithCodeUrl: v.optional(v.string()), // Selfie avec le code écrit sur papier

    // Statut de la demande
    status: v.union(
      v.literal("pending"),    // Documents en cours de soumission
      v.literal("submitted"),  // Tous les documents soumis, en attente de review
      v.literal("approved"),   // Vérifié et approuvé
      v.literal("rejected")    // Rejeté (documents non conformes)
    ),

    // Informations de review admin
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()), // Raison du rejet si applicable
    adminNotes: v.optional(v.string()), // Notes internes admin

    // Résultat de la vérification automatique par IA
    aiVerificationResult: v.optional(v.object({
      codeMatch: v.boolean(),
      codeDetected: v.union(v.string(), v.null()),
      faceMatch: v.boolean(),
      faceMatchConfidence: v.number(),
      idCardValid: v.boolean(),
      issues: v.array(v.string()),
      autoApproved: v.boolean(),
      verifiedAt: v.number(),
      confidenceThreshold: v.optional(v.number()), // Seuil de confiance utilisé
    })),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    submittedAt: v.optional(v.number()), // Date de soumission complète
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_user_status", ["userId", "status"]),

  // Avoirs clients (crédits pour remboursements)
  clientCredits: defineTable({
    clientId: v.id("users"),
    amount: v.number(),                    // Montant restant en centimes
    originalAmount: v.number(),            // Montant initial en centimes
    reason: v.string(),                    // Raison du crédit
    missionId: v.optional(v.id("missions")), // Mission associée si remboursement
    createdBy: v.id("users"),              // Admin qui a créé
    status: v.union(
      v.literal("active"),
      v.literal("used"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    usedAt: v.optional(v.number()),
    usedOnMissionId: v.optional(v.id("missions")),
    expiresAt: v.optional(v.number()),     // Date d'expiration optionnelle
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"])
    .index("by_client_active", ["clientId", "status"]),

  // Virements annonceurs
  announcerPayouts: defineTable({
    announcerId: v.id("users"),
    amount: v.number(),                    // Montant en centimes
    missions: v.array(v.id("missions")),   // Missions incluses
    status: v.union(
      v.literal("pending"),                // En attente
      v.literal("processing"),             // En cours de traitement
      v.literal("completed"),              // Viré
      v.literal("failed")                  // Échoué
    ),
    stripeTransferId: v.optional(v.string()),
    stripePayoutId: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),   // Date prévue
    processedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_announcer", ["announcerId"])
    .index("by_status", ["status"])
    .index("by_scheduled", ["scheduledAt"]),

  // Factures
  invoices: defineTable({
    recipientType: v.union(v.literal("client"), v.literal("announcer")),
    recipientId: v.id("users"),
    missionId: v.optional(v.id("missions")),
    invoiceNumber: v.string(),             // "INV-2026-0001"
    amount: v.number(),                    // Montant TTC en centimes
    amountHT: v.optional(v.number()),      // Montant HT si TVA
    tva: v.optional(v.number()),           // Montant TVA
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      total: v.number(),
    })),
    pdfStorageId: v.optional(v.id("_storage")), // ID du PDF stocké
    pdfUrl: v.optional(v.string()),        // URL du PDF généré
    sentAt: v.optional(v.number()),
    sentTo: v.optional(v.string()),        // Email destinataire
    createdBy: v.id("users"),              // Admin
    createdAt: v.number(),
  })
    .index("by_recipient", ["recipientId"])
    .index("by_mission", ["missionId"])
    .index("by_number", ["invoiceNumber"]),

  // ============================================
  // Créneaux collectifs
  // ============================================

  // Créneaux pour séances collectives
  collectiveSlots: defineTable({
    variantId: v.id("serviceVariants"),
    userId: v.id("users"),              // Annonceur (pour requêtes rapides)
    serviceId: v.id("services"),        // Service parent (pour requêtes rapides)

    // Date et horaires
    date: v.string(),                   // "YYYY-MM-DD"
    startTime: v.string(),              // "HH:MM"
    endTime: v.string(),                // "HH:MM" (calculé: startTime + duration)

    // Capacité
    maxAnimals: v.number(),             // Copié de variant.maxAnimalsPerSession
    bookedAnimals: v.number(),          // Nombre d'animaux actuellement réservés
    acceptedAnimalTypes: v.array(v.string()), // Copié de variant.animalTypes

    // Récurrence (null si créneau unique)
    recurrenceId: v.optional(v.string()), // ID unique pour grouper les créneaux récurrents
    recurrencePattern: v.optional(v.union(
      v.literal("daily"),               // Tous les jours
      v.literal("weekly"),              // Toutes les semaines
      v.literal("biweekly"),            // Toutes les 2 semaines
      v.literal("monthly")              // Tous les mois
    )),
    recurrenceEndDate: v.optional(v.string()), // Date de fin de la récurrence "YYYY-MM-DD"

    // Statut
    isActive: v.boolean(),
    isCancelled: v.boolean(),           // true si annulé par l'annonceur
    cancellationReason: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_variant", ["variantId"])
    .index("by_user", ["userId"])
    .index("by_service", ["serviceId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_variant_date", ["variantId", "date"])
    .index("by_recurrence", ["recurrenceId"])
    .index("by_active_date", ["isActive", "date"]),

  // Réservations sur les créneaux collectifs
  // Lie une mission à un ou plusieurs créneaux
  collectiveSlotBookings: defineTable({
    slotId: v.id("collectiveSlots"),
    missionId: v.id("missions"),
    clientId: v.id("users"),
    animalId: v.optional(v.id("animals")), // Animal concerné

    // Nombre d'animaux réservés sur ce créneau
    animalCount: v.number(),

    // Numéro de séance dans le pack (1, 2, 3...)
    sessionNumber: v.number(),

    // Statut de la réservation sur ce créneau
    status: v.union(
      v.literal("booked"),              // Réservé
      v.literal("completed"),           // Séance effectuée
      v.literal("cancelled"),           // Annulé par le client
      v.literal("rescheduled"),         // Reporté (client a changé de créneau)
      v.literal("slot_cancelled")       // Créneau annulé par l'annonceur
    ),

    // Si rescheduled ou slot_cancelled, référence au nouveau créneau
    newSlotId: v.optional(v.id("collectiveSlots")),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
  })
    .index("by_slot", ["slotId"])
    .index("by_mission", ["missionId"])
    .index("by_client", ["clientId"])
    .index("by_slot_status", ["slotId", "status"]),

  // Notifications de changement de créneau
  // Quand un annonceur modifie/annule un créneau partiellement réservé
  slotChangeNotifications: defineTable({
    slotId: v.id("collectiveSlots"),
    bookingId: v.id("collectiveSlotBookings"),
    clientId: v.id("users"),
    missionId: v.id("missions"),

    // Type de changement
    changeType: v.union(
      v.literal("time_changed"),        // Horaire modifié
      v.literal("date_changed"),        // Date modifiée
      v.literal("cancelled")            // Créneau annulé
    ),

    // Détails du changement
    previousDate: v.optional(v.string()),
    previousStartTime: v.optional(v.string()),
    previousEndTime: v.optional(v.string()),
    newDate: v.optional(v.string()),
    newStartTime: v.optional(v.string()),
    newEndTime: v.optional(v.string()),
    reason: v.optional(v.string()),

    // Statut de la notification
    status: v.union(
      v.literal("pending"),             // En attente de réponse client
      v.literal("acknowledged"),        // Client a vu la notification
      v.literal("rescheduled"),         // Client a choisi un nouveau créneau
      v.literal("refunded"),            // Client a demandé remboursement
      v.literal("expired")              // Délai de réponse expiré
    ),

    // Réponse du client
    clientResponse: v.optional(v.union(
      v.literal("accept_change"),       // Accepte le changement (si modification)
      v.literal("reschedule"),          // Veut changer de créneau
      v.literal("cancel")               // Veut annuler et être remboursé
    )),
    clientResponseAt: v.optional(v.number()),
    newSelectedSlotId: v.optional(v.id("collectiveSlots")), // Si reschedule

    // Timestamps
    createdAt: v.number(),
    expiresAt: v.number(),              // Délai de réponse (ex: 48h)
  })
    .index("by_client", ["clientId"])
    .index("by_mission", ["missionId"])
    .index("by_slot", ["slotId"])
    .index("by_status", ["status"])
    .index("by_expires", ["expiresAt"]),

  // ============================================
  // SEO - Pages services et villes
  // ============================================

  // Pages SEO pour les services
  seoServicePages: defineTable({
    // Identifiant
    slug: v.string(), // "garde-animaux", "promenade"

    // Référence vers serviceCategories (pour générer les CTAs automatiquement)
    serviceCategoryId: v.optional(v.id("serviceCategories")),

    // Contenu principal
    title: v.string(), // "Garde d'animaux de confiance"
    subtitle: v.optional(v.string()),
    description: v.string(), // Description courte pour SEO

    // Hero section - Image Cloudinary URL
    heroImageUrl: v.optional(v.string()),

    // Thumbnail - Miniature pour l'affichage sur la homepage (300x200)
    thumbnailUrl: v.optional(v.string()),

    // CTAs - Textes personnalisables (URLs générées automatiquement)
    ctaPrimaryText: v.optional(v.string()), // Par défaut: "Trouver un prestataire"
    ctaSecondaryText: v.optional(v.string()), // Par défaut: "Devenir prestataire"

    // Features (liste à puces)
    features: v.array(v.object({
      icon: v.optional(v.string()), // emoji ou lucide icon
      title: v.string(),
      description: v.optional(v.string()),
    })),

    // 3 cartes de description
    descriptionCards: v.array(v.object({
      title: v.string(),
      content: v.string(),
      icon: v.optional(v.string()),
    })),

    // SEO
    metaTitle: v.string(),
    metaDescription: v.string(),

    // Status
    isActive: v.boolean(),
    order: v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active_order", ["isActive", "order"])
    .index("by_category", ["serviceCategoryId"]),

  // Villes pour le SEO
  seoServiceCities: defineTable({
    slug: v.string(), // "paris", "lyon"
    name: v.string(), // "Paris", "Lyon"
    region: v.string(), // "Île-de-France"
    department: v.optional(v.string()), // "75"
    postalCodes: v.optional(v.array(v.string())), // ["75001", "75002"...]
    population: v.optional(v.number()), // Pour le tri par importance
    coordinates: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    isActive: v.boolean(),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active_order", ["isActive", "order"])
    .index("by_region", ["region"]),

  // Pages service + ville (générées)
  seoServiceCityPages: defineTable({
    servicePageId: v.id("seoServicePages"),
    cityId: v.id("seoServiceCities"),

    // Contenu personnalisé (avec variables {{ville}}, {{region}}, {{service}})
    title: v.string(), // "Garde d'animaux à {{ville}}"
    description: v.string(),
    metaTitle: v.string(),
    metaDescription: v.string(),

    // Contenu optionnel spécifique
    customContent: v.optional(v.string()), // Markdown ou HTML

    // Stats locales (optionnel)
    localStats: v.optional(v.object({
      announcersCount: v.optional(v.number()),
      averageRating: v.optional(v.number()),
      completedMissions: v.optional(v.number()),
    })),

    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_service_city", ["servicePageId", "cityId"])
    .index("by_city", ["cityId"])
    .index("by_service", ["servicePageId"])
    .index("by_active", ["isActive"]),
});
