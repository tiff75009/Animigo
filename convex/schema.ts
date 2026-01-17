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

    // Animal
    animal: v.object({
      name: v.string(),
      type: v.string(),
      emoji: v.string(),
    }),

    // Service
    serviceName: v.string(),
    serviceCategory: v.string(),

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
    location: v.string(),

    // Notes
    clientNotes: v.optional(v.string()),
    announcerNotes: v.optional(v.string()),
    cancellationReason: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_announcer", ["announcerId"])
    .index("by_client", ["clientId"])
    .index("by_announcer_status", ["announcerId", "status"])
    .index("by_announcer_dates", ["announcerId", "startDate"]),

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
});
