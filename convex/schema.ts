import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Identifiants
    email: v.string(),
    passwordHash: v.string(),

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
  })
    .index("by_email", ["email"])
    .index("by_account_type", ["accountType"])
    .index("by_siret", ["siret"])
    .index("by_role", ["role"]),

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
    hasGarden: v.optional(v.boolean()),
    hasVehicle: v.optional(v.boolean()),
    // Animaux de l'annonceur
    ownedAnimals: v.optional(v.array(v.object({
      type: v.string(), // "chien", "chat", etc.
      name: v.string(),
      breed: v.optional(v.string()), // Race
      age: v.optional(v.number()), // Âge en années
    }))),
    // Buffers de temps autour des services (en minutes)
    // Permet à l'annonceur de bloquer du temps avant/après chaque service
    bufferBefore: v.optional(v.number()), // Minutes à bloquer avant un service (0, 15, 30, 45, 60)
    bufferAfter: v.optional(v.number()),  // Minutes à bloquer après un service (0, 15, 30, 45, 60)
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_department", ["department"])
    .index("by_postal_code", ["postalCode"]),

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
    price: v.number(), // Prix en centimes
    priceUnit: v.union(
      v.literal("hour"),
      v.literal("day"),
      v.literal("week"),
      v.literal("month"),
      v.literal("flat")
    ),
    duration: v.optional(v.number()), // Durée en minutes
    includedFeatures: v.optional(v.array(v.string())), // ["Brossage", "Lavage", "Séchage"]
    order: v.number(), // Ordre d'affichage
    isActive: v.boolean(),
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
    imageStorageId: v.optional(v.id("_storage")), // Image de la catégorie
    order: v.number(), // Ordre d'affichage
    isActive: v.boolean(),
    // Type de facturation pour cette catégorie
    billingType: v.optional(v.union(
      v.literal("hourly"),    // Facturation à l'heure (toilettage, promenade...)
      v.literal("daily"),     // Facturation à la journée (pension...)
      v.literal("flexible")   // L'annonceur choisit (garde - courte ou longue durée)
    )),
    // Prix horaire conseillé par défaut (en centimes)
    // Utilisé quand pas assez de données pour calculer une moyenne
    defaultHourlyPrice: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_order", ["order"])
    .index("by_active", ["isActive"]),

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

    // Paiement
    amount: v.number(), // Montant en centimes
    paymentStatus: v.union(
      v.literal("not_due"), // Pas encore dû
      v.literal("pending"), // En attente de paiement
      v.literal("paid") // Payé
    ),

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

    // Description
    description: v.optional(v.string()),

    // Galerie photos (plusieurs photos possibles)
    photos: v.optional(v.array(v.object({
      storageId: v.id("_storage"),
      isPrimary: v.boolean(), // Photo principale affichée en miniature
      order: v.number(), // Ordre d'affichage
    }))),

    // Traits de caractère - Système de tags par section
    // Section "Compatibilité"
    compatibilityTraits: v.optional(v.array(v.string())),
    // Ex: ["Ne s'entend pas avec les mâles", "Ne s'entend pas avec les chats"]

    // Section "Comportement"
    behaviorTraits: v.optional(v.array(v.string())),
    // Ex: ["Anxieux", "Agressif", "Peureux", "Joueur", "Calme", "Énergique"]

    // Section "Besoins"
    needsTraits: v.optional(v.array(v.string())),
    // Ex: ["A besoin de se dépenser", "Demande beaucoup d'attention"]

    // Traits personnalisés (ajoutés par l'utilisateur)
    customTraits: v.optional(v.array(v.string())),

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

  // Paiements Stripe (pré-autorisations et captures)
  stripePayments: defineTable({
    missionId: v.id("missions"),

    // Identifiants Stripe
    checkoutSessionId: v.string(), // cs_xxx
    paymentIntentId: v.optional(v.string()), // pi_xxx (renseigné après checkout)

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
      v.literal("failed") // Échec du paiement
    ),

    // URL de paiement
    checkoutUrl: v.string(),
    expiresAt: v.number(), // Timestamp expiration session (+1h)

    // Timestamps capture
    authorizedAt: v.optional(v.number()), // Date pré-autorisation
    capturedAt: v.optional(v.number()), // Date capture
    cancelledAt: v.optional(v.number()), // Date annulation

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
});
