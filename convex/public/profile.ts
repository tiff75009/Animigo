import { query } from "../_generated/server";
import { v } from "convex/values";

// Récupérer un profil public par son username (ou slug en fallback)
export const getPublicProfileBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // Chercher d'abord par username
    let user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.slug.toLowerCase()))
      .first();

    // Fallback : chercher par slug (rétrocompatibilité)
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .first();
    }

    if (!user || !user.isActive) {
      return null;
    }

    // Récupérer le profil associé
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Récupérer les animaux - depuis le profil (ownedAnimals) pour les annonceurs
    // ou depuis la table animals pour les utilisateurs
    const isAnnouncer = user.accountType === "annonceur_pro" || user.accountType === "annonceur_particulier";

    let animalsWithSlug: any[] = [];

    if (isAnnouncer && profile?.ownedAnimals && profile.ownedAnimals.length > 0) {
      // Animaux stockés dans le profil (annonceurs)
      animalsWithSlug = (profile.ownedAnimals as any[]).map((animal: any, index: number) => ({
        id: animal.id || `animal-${index}`,
        name: animal.name || "Animal",
        slug: (animal.name || "animal")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        type: animal.type || "autre",
        breed: animal.breed || null,
        gender: animal.gender || null,
        birthDate: null,
        age: animal.age || null,
        weight: animal.weight || null,
        size: animal.size || null,
        description: animal.description || null,
        profilePhoto: animal.profilePhoto || null,
        galleryPhotos: animal.galleryPhotos || [],
        goodWithChildren: animal.goodWithChildren ?? null,
        goodWithDogs: animal.goodWithDogs ?? null,
        goodWithCats: animal.goodWithCats ?? null,
        goodWithOtherAnimals: animal.goodWithOtherAnimals ?? null,
        behaviorTraits: animal.behaviorTraits || [],
      }));
    } else {
      // Animaux depuis la table animals (utilisateurs)
      const animals = await ctx.db
        .query("animals")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      animalsWithSlug = animals.map((animal) => ({
        id: animal._id,
        name: animal.name,
        slug: animal.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
        type: animal.type,
        breed: animal.breed,
        gender: animal.gender,
        birthDate: animal.birthDate,
        age: null,
        weight: animal.weight,
        size: animal.size,
        description: animal.description,
        profilePhoto: animal.profilePhoto,
        galleryPhotos: animal.galleryPhotos || [],
        goodWithChildren: animal.goodWithChildren,
        goodWithDogs: animal.goodWithDogs,
        goodWithCats: animal.goodWithCats,
        goodWithOtherAnimals: animal.goodWithOtherAnimals,
        behaviorTraits: animal.behaviorTraits || [],
      }));
    }

    // Les avis seront ajoutés ultérieurement quand la table reviews sera créée
    const enrichedReviews: {
      id: string;
      rating: number;
      comment?: string | null;
      createdAt: number;
      reviewer: { firstName: string; lastName: string };
    }[] = [];
    const averageRating = 0;

    // Récupérer les services/formules si c'est un annonceur
    let services: any[] = [];
    let collectiveSlots: any[] = [];
    if (user.accountType === "annonceur_pro" || user.accountType === "annonceur_particulier") {
      const userServices = await ctx.db
        .query("services")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      // Mapping des catégories vers noms et icônes
      const categoryInfo: Record<string, { name: string; icon: string }> = {
        "garde": { name: "Garde", icon: "🏠" },
        "hebergement": { name: "Hébergement", icon: "🛏️" },
        "promenade": { name: "Promenade", icon: "🚶" },
        "visite": { name: "Visite à domicile", icon: "🏡" },
        "toilettage": { name: "Toilettage", icon: "✂️" },
        "education": { name: "Éducation", icon: "🎓" },
        "transport": { name: "Transport", icon: "🚗" },
      };

      // Enrichir avec les variantes (formules)
      services = await Promise.all(
        userServices.map(async (service) => {
          const catInfo = categoryInfo[service.category] || { name: service.category || "Service", icon: "🐾" };

          // Récupérer les variantes du service
          const variants = await ctx.db
            .query("serviceVariants")
            .withIndex("by_service", (q) => q.eq("serviceId", service._id))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

          return {
            id: service._id,
            categorySlug: service.category,
            categoryName: catInfo.name,
            categoryIcon: catInfo.icon,
            animalTypes: service.animalTypes || [],
            formules: variants.map((variant) => ({
              id: variant._id,
              name: variant.name,
              description: variant.description,
              basePrice: variant.price,
              priceUnit: variant.priceUnit,
              pricePerHour: variant.pricing?.hourly,
              pricePerHalfDay: variant.pricing?.halfDaily,
              pricePerDay: variant.pricing?.daily,
              pricePerWeek: variant.pricing?.weekly,
              pricePerMonth: variant.pricing?.monthly,
              animalTypes: variant.animalTypes || [],
              sessionType: variant.sessionType,
              numberOfSessions: variant.numberOfSessions,
              maxAnimalsPerSession: variant.maxAnimalsPerSession,
              duration: variant.duration ?? null,
            })),
          };
        })
      );

      // Récupérer les créneaux collectifs futurs (14 prochains jours)
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const allSlots = await ctx.db
        .query("collectiveSlots")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      collectiveSlots = allSlots
        .filter((slot) =>
          slot.isActive &&
          !slot.isCancelled &&
          slot.date >= todayStr
        )
        .slice(0, 50)
        .map((slot) => ({
          id: slot._id,
          variantId: slot.variantId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxAnimals: slot.maxAnimals,
          bookedAnimals: slot.bookedAnimals ?? 0,
        }));
    }

    // Récupérer les préférences utilisateur (horaires d'acceptation)
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();

    // Récupérer les taux de commission et Stripe depuis systemConfig
    const getConfigValue = async (key: string, defaultValue: number) => {
      const config = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q: any) => q.eq("key", key))
        .first();
      return config ? parseFloat(config.value) : defaultValue;
    };

    // Déterminer le type de commission selon le type de compte
    let commissionType = "particulier";
    if (user.accountType === "annonceur_pro") {
      commissionType = user.companyType === "micro_enterprise" ? "micro_entrepreneur" : "professionnel";
    }

    const commissionRate = await getConfigValue(`commission_${commissionType}`,
      commissionType === "particulier" ? 15 : commissionType === "micro_entrepreneur" ? 12 : 10
    );
    const stripeFeeRate = await getConfigValue("stripe_fee_rate", 3);
    const vatRate = await getConfigValue("commission_vat_rate", 20);

    // TVA uniquement pour les pros assujettis (pas micro-entrepreneurs)
    const isVatApplicable = user.accountType === "annonceur_pro" && user.companyType !== "micro_enterprise";

    // Déterminer le type de membre
    const memberSince = new Date(user.createdAt).getFullYear().toString();

    return {
      id: user._id,
      slug: user.slug,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username ?? undefined,
      accountType: user.accountType,
      memberSince,
      isAnnouncer: user.accountType === "annonceur_pro" || user.accountType === "annonceur_particulier",
      statusType: user.accountType === "annonceur_pro"
        ? "professionnel"
        : user.accountType === "annonceur_particulier"
          ? "particulier"
          : "utilisateur",
      // Données pro
      siret: user.accountType === "annonceur_pro" ? (user.siret || null) : null,
      companyName: user.accountType === "annonceur_pro" ? (user.companyName || null) : null,
      // Profil
      profileImage: (profile?.listingDisplayImage === "logo" && profile?.companyLogoUrl)
        ? profile.companyLogoUrl
        : (profile?.profileImageUrl || null),
      isDisplayingLogo: !!(profile?.listingDisplayImage === "logo" && profile?.companyLogoUrl),
      coverImage: profile?.coverImageUrl || null,
      bio: profile?.description || profile?.bio || null,
      location: (() => {
        // Ne pas exposer la rue/numéro — afficher uniquement ville, CP, pays
        const parts: string[] = [];
        if (profile?.city) parts.push(profile.city);
        if (profile?.postalCode) parts.push(profile.postalCode);
        return parts.length > 0 ? parts.join(", ") : (profile?.location || null);
      })(),
      city: profile?.city || null,
      postalCode: profile?.postalCode || null,
      coordinates: profile?.coordinates || null,
      radius: profile?.radius || null,
      // Équipement (pour annonceurs)
      equipment: {
        housingType: profile?.housingType || null,
        housingSize: profile?.housingSize || null,
        hasGarden: profile?.hasGarden || false,
        gardenSize: profile?.gardenSize || null,
        hasVehicle: profile?.hasVehicle || false,
        isSmoker: profile?.isSmoker ?? null,
        hasChildren: profile?.hasChildren ?? null,
        childrenAges: profile?.childrenAges || [],
        providesFood: profile?.providesFood || false,
      },
      icadRegistered: profile?.icadRegistered || false,
      isIdentityVerified: profile?.isIdentityVerified || false,
      isSapApproved: profile?.isSapApproved || false,
      // Galerie
      gallery: profile?.environmentPhotos?.map((p: { url: string }) => p.url) || [],
      // Animaux
      animals: animalsWithSlug,
      // Avis
      reviews: enrichedReviews,
      rating: averageRating,
      reviewCount: enrichedReviews.length,
      // Services (pour annonceurs)
      services,
      // Créneaux collectifs futurs
      collectiveSlots,
      // Infos booking (buffers, horaires)
      bookingSettings: {
        bufferBefore: profile?.bufferBefore ?? 0,
        bufferAfter: profile?.bufferAfter ?? 0,
        acceptReservationsFrom: preferences?.acceptReservationsFrom ?? "08:00",
        acceptReservationsTo: preferences?.acceptReservationsTo ?? "20:00",
      },
      // Infos prix (commission, TVA, Stripe)
      pricing: {
        commissionRate,
        stripeFeeRate,
        vatRate: isVatApplicable ? vatRate : 0,
        isVatApplicable,
        companyType: user.companyType ?? null,
      },
    };
  },
});

/**
 * Query publique pour les disponibilités d'un annonceur.
 * Croise les disponibilités explicites avec les missions réservées
 * pour calculer le vrai statut de chaque jour.
 */
export const getPublicAvailability = query({
  args: {
    slug: v.string(),
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(),   // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    // Trouver l'utilisateur par username ou slug
    let user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.slug.toLowerCase()))
      .first();
    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .first();
    }
    if (!user || !user.isActive) return { availability: [], collectiveSlots: [] };

    // Récupérer les disponibilités explicites
    const allAvailabilities = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Map des disponibilités par date : garder TOUTES les entrées par date
    // Un annonceur peut avoir plusieurs entrées par date (une par categoryTypeId)
    const availByDate = new Map<string, (typeof allAvailabilities)>();
    for (const a of allAvailabilities) {
      if (a.date < args.startDate || a.date > args.endDate) continue;
      const existing = availByDate.get(a.date) || [];
      existing.push(a);
      availByDate.set(a.date, existing);
    }

    // Récupérer les missions actives (ni annulées ni refusées)
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer", (q: any) => q.eq("announcerId", user._id))
      .collect();

    const activeMissions = missions.filter(
      (m) => m.status !== "cancelled" && m.status !== "refused"
    );

    // Récupérer les créneaux collectifs actifs sur la période
    const allCollectiveSlots = await ctx.db
      .query("collectiveSlots")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeSlots = allCollectiveSlots.filter(
      (s) => s.isActive && !s.isCancelled && s.date >= args.startDate && s.date <= args.endDate
    );

    // Récupérer la capacité max et buffers depuis le profil
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const maxAnimalsPerSlot = profile?.maxAnimalsPerSlot ?? 1;
    const bufferBefore = profile?.bufferBefore ?? 0;
    const bufferAfter = profile?.bufferAfter ?? 0;

    // Récupérer les horaires d'acceptation des réservations
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .first();
    const acceptFrom = preferences?.acceptReservationsFrom ?? "08:00";
    const acceptTo = preferences?.acceptReservationsTo ?? "20:00";

    // Helper: ajouter/soustraire des minutes à un horaire "HH:MM"
    const addMinutes = (time: string, mins: number): string => {
      const [h, m] = time.split(":").map(Number);
      const total = Math.max(0, Math.min(1440, h * 60 + m + mins));
      return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    };

    // Générer toutes les dates de la plage
    const allDates: string[] = [];
    const start = new Date(args.startDate + "T00:00:00");
    const end = new Date(args.endDate + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      allDates.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      );
    }

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;

    // Helper: vérifier si deux plages de dates se chevauchent
    const datesOverlap = (s1: string, e1: string, s2: string, e2: string) =>
      s1 <= e2 && e1 >= s2;

    // Construire le calendrier enrichi
    const availability: {
      date: string;
      status: "available" | "partial" | "unavailable" | "booked_partial" | "booked_full";
      timeSlots: { startTime: string; endTime: string }[];
      bookedSlots: { startTime: string; endTime: string }[];
      bookedCount: number;
      maxCapacity: number;
    }[] = [];

    for (const date of allDates) {
      if (date < todayStr) {
        availability.push({ date, status: "unavailable", timeSlots: [], bookedSlots: [], bookedCount: 0, maxCapacity: maxAnimalsPerSlot });
        continue;
      }

      const dayAvails = availByDate.get(date) || [];
      // Vérifier si au moins une entrée est "available" ou "partial"
      const hasExplicitAvail = dayAvails.some((a) => a.status === "available" || a.status === "partial");
      // Vérifier si toutes les entrées sont explicitement "unavailable"
      const allExplicitUnavail = dayAvails.length > 0 && dayAvails.every((a) => a.status === "unavailable");
      // Récupérer les timeSlots de la première entrée disponible
      const bestAvail = dayAvails.find((a) => a.status === "available" || a.status === "partial");
      const bestStatus = bestAvail?.status ?? (dayAvails[0]?.status);

      // Missions actives ce jour
      const dayMissions = activeMissions.filter((m) => datesOverlap(m.startDate, m.endDate, date, date));

      // Calculer les créneaux réservés avec buffers
      const bookedSlots: { startTime: string; endTime: string }[] = [];
      for (const m of dayMissions) {
        if (m.startTime && m.endTime) {
          bookedSlots.push({
            startTime: addMinutes(m.startTime, -bufferBefore),
            endTime: addMinutes(m.endTime, bufferAfter),
          });
        }
      }

      // Créneaux collectifs ce jour
      const dayCollective = activeSlots.filter((s) => s.date === date);
      // Ajouter les collectifs aux créneaux bloqués
      for (const s of dayCollective) {
        bookedSlots.push({
          startTime: addMinutes(s.startTime, -bufferBefore),
          endTime: addMinutes(s.endTime, bufferAfter),
        });
      }

      // Trier les créneaux réservés
      bookedSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

      // Pas de dispo explicite, pas de missions, pas de collectifs → indisponible
      if (!hasExplicitAvail && dayMissions.length === 0 && dayCollective.length === 0) {
        availability.push({ date, status: "unavailable", timeSlots: [], bookedSlots: [], bookedCount: 0, maxCapacity: maxAnimalsPerSlot });
        continue;
      }

      // Créneaux collectifs sans missions ni dispo explicite → partial (il y a des créneaux dispo)
      if (!hasExplicitAvail && dayMissions.length === 0 && dayCollective.length > 0) {
        const allFull = dayCollective.every((s) => (s.bookedAnimals ?? 0) >= s.maxAnimals);
        availability.push({
          date,
          status: allFull ? "booked_full" : "booked_partial",
          timeSlots: [],
          bookedSlots,
          bookedCount: 0,
          maxCapacity: maxAnimalsPerSlot,
        });
        continue;
      }

      // Indisponibilité explicite (toutes les entrées sont "unavailable")
      if (allExplicitUnavail && !hasExplicitAvail) {
        availability.push({ date, status: "unavailable", timeSlots: [], bookedSlots, bookedCount: dayMissions.length, maxCapacity: maxAnimalsPerSlot });
        continue;
      }

      const bookedCount = dayMissions.length;
      const timeSlots = bestAvail?.timeSlots || [];

      if (bookedCount === 0 && dayCollective.length === 0) {
        // Aucune réservation → disponible (si dispo explicite)
        availability.push({
          date,
          status: hasExplicitAvail ? (bestStatus === "partial" ? "partial" : "available") : "unavailable",
          timeSlots: timeSlots as { startTime: string; endTime: string }[],
          bookedSlots: [],
          bookedCount: 0,
          maxCapacity: maxAnimalsPerSlot,
        });
      } else if (bookedCount >= maxAnimalsPerSlot) {
        // Capacité maximale atteinte → complet (rouge)
        availability.push({
          date,
          status: "booked_full",
          timeSlots: timeSlots as { startTime: string; endTime: string }[],
          bookedSlots,
          bookedCount,
          maxCapacity: maxAnimalsPerSlot,
        });
      } else {
        // Des réservations mais encore de la place → partiellement occupé (orange)
        availability.push({
          date,
          status: "booked_partial",
          timeSlots: timeSlots as { startTime: string; endTime: string }[],
          bookedSlots,
          bookedCount,
          maxCapacity: maxAnimalsPerSlot,
        });
      }
    }

    return {
      availability,
      collectiveSlots: activeSlots.map((s) => ({
        id: s._id,
        variantId: s.variantId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        maxAnimals: s.maxAnimals,
        bookedAnimals: s.bookedAnimals ?? 0,
      })),
      bookingSettings: {
        bufferBefore,
        bufferAfter,
        acceptFrom,
        acceptTo,
      },
    };
  },
});
