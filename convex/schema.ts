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
  services: defineTable({
    userId: v.id("users"),
    category: v.string(), // Catégorie du service (garde, toilettage, dressage, etc.)
    name: v.string(), // Nom personnalisé du service
    description: v.optional(v.string()),
    price: v.number(), // Prix en centimes
    priceUnit: v.union(
      v.literal("hour"), // par heure
      v.literal("day"), // par jour
      v.literal("week"), // par semaine
      v.literal("month"), // par mois
      v.literal("flat") // forfait
    ),
    duration: v.optional(v.number()), // Durée en minutes
    animalTypes: v.array(v.string()), // Types d'animaux acceptés pour ce service
    isActive: v.boolean(),
    // Modération
    moderationStatus: v.optional(v.union(
      v.literal("approved"), // Approuvé (par défaut si pas de suspicion)
      v.literal("pending"),  // En attente de modération
      v.literal("rejected")  // Rejeté par un modérateur
    )),
    moderationNote: v.optional(v.string()), // Note du modérateur
    moderationReason: v.optional(v.string()), // Raison de la mise en modération (auto-détection)
    moderatedAt: v.optional(v.number()),
    moderatedBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_category", ["category"])
    .index("by_category_active", ["category", "isActive"])
    .index("by_moderation_status", ["moderationStatus"]),

  // Catégories de services (gérées par l'admin)
  serviceCategories: defineTable({
    slug: v.string(), // Identifiant unique (ex: "garde", "toilettage")
    name: v.string(), // Nom affiché (ex: "Garde", "Toilettage")
    description: v.optional(v.string()),
    icon: v.optional(v.string()), // Emoji ou nom d'icône
    imageStorageId: v.optional(v.id("_storage")), // Image de la catégorie
    order: v.number(), // Ordre d'affichage
    isActive: v.boolean(),
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
});
