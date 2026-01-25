import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../admin/utils";
import { ConvexError } from "convex/values";

// ============================================
// Helpers
// ============================================

/**
 * Génère l'URL du CTA primaire en fonction de la catégorie de service
 */
function generateCtaUrl(categorySlug: string): string {
  if (categorySlug === "garde") {
    return "/recherche?mode=garde";
  }
  return `/recherche?mode=services&category=${categorySlug}`;
}

// ============================================
// Utilitaire de remplacement de variables
// ============================================

function replaceVariables(
  template: string,
  context: {
    ville?: string;
    region?: string;
    service?: string;
    department?: string;
  }
): string {
  return template
    .replace(/\{\{ville\}\}/g, context.ville || "")
    .replace(/\{\{region\}\}/g, context.region || "")
    .replace(/\{\{service\}\}/g, context.service || "")
    .replace(/\{\{department\}\}/g, context.department || "");
}

// ============================================
// Queries publiques
// ============================================

// Récupérer une page service+ville par slugs (public)
export const getByServiceAndCity = query({
  args: {
    serviceSlug: v.string(),
    citySlug: v.string(),
  },
  handler: async (ctx, args) => {
    // Trouver la page service
    const servicePage = await ctx.db
      .query("seoServicePages")
      .withIndex("by_slug", (q) => q.eq("slug", args.serviceSlug))
      .first();

    if (!servicePage || !servicePage.isActive) {
      return null;
    }

    // Trouver la ville
    const city = await ctx.db
      .query("seoServiceCities")
      .withIndex("by_slug", (q) => q.eq("slug", args.citySlug))
      .first();

    if (!city || !city.isActive) {
      return null;
    }

    // Trouver la page service+ville
    const cityPage = await ctx.db
      .query("seoServiceCityPages")
      .withIndex("by_service_city", (q) =>
        q.eq("servicePageId", servicePage._id).eq("cityId", city._id)
      )
      .first();

    if (!cityPage || !cityPage.isActive) {
      return null;
    }

    // Préparer le contexte pour le remplacement de variables
    const context = {
      ville: city.name,
      region: city.region,
      service: servicePage.title,
      department: city.department,
    };

    // Récupérer la catégorie liée pour générer les URLs CTAs
    let category = null;
    if (servicePage.serviceCategoryId) {
      category = await ctx.db.get(servicePage.serviceCategoryId);
    }

    // Générer les URLs CTAs automatiquement
    const ctaPrimaryUrl = category
      ? generateCtaUrl(category.slug)
      : "/recherche";

    // Remplacer les variables dans le contenu
    return {
      id: cityPage._id,
      serviceSlug: args.serviceSlug,
      citySlug: args.citySlug,
      title: replaceVariables(cityPage.title, context),
      description: replaceVariables(cityPage.description, context),
      metaTitle: replaceVariables(cityPage.metaTitle, context),
      metaDescription: replaceVariables(cityPage.metaDescription, context),
      customContent: cityPage.customContent
        ? replaceVariables(cityPage.customContent, context)
        : undefined,
      localStats: cityPage.localStats,
      // Données du service parent
      servicePage: {
        slug: servicePage.slug,
        title: servicePage.title,
        features: servicePage.features,
        descriptionCards: servicePage.descriptionCards,
        heroImageUrl: servicePage.heroImageUrl,
        thumbnailUrl: servicePage.thumbnailUrl,
        ctaPrimaryText: servicePage.ctaPrimaryText || "Trouver un prestataire",
        ctaPrimaryUrl,
        ctaSecondaryText: servicePage.ctaSecondaryText || "Devenir prestataire",
        ctaSecondaryUrl: "/inscription",
        category: category ? {
          id: category._id,
          slug: category.slug,
          name: category.name,
          icon: category.icon,
          color: category.color,
        } : null,
      },
      // Données de la ville
      city: {
        slug: city.slug,
        name: city.name,
        region: city.region,
        department: city.department,
        coordinates: city.coordinates,
      },
    };
  },
});

// Liste les pages d'un service (public) - pour afficher les villes disponibles
export const listByService = query({
  args: { serviceSlug: v.string() },
  handler: async (ctx, args) => {
    // Trouver la page service
    const servicePage = await ctx.db
      .query("seoServicePages")
      .withIndex("by_slug", (q) => q.eq("slug", args.serviceSlug))
      .first();

    if (!servicePage || !servicePage.isActive) {
      return [];
    }

    // Récupérer toutes les pages villes de ce service
    const cityPages = await ctx.db
      .query("seoServiceCityPages")
      .withIndex("by_service", (q) => q.eq("servicePageId", servicePage._id))
      .collect();

    // Filtrer les actives et enrichir avec les données de la ville
    const activeCityPages = await Promise.all(
      cityPages
        .filter((cp) => cp.isActive)
        .map(async (cp) => {
          const city = await ctx.db.get(cp.cityId);
          if (!city || !city.isActive) return null;

          return {
            citySlug: city.slug,
            cityName: city.name,
            region: city.region,
            title: replaceVariables(cp.title, {
              ville: city.name,
              region: city.region,
              service: servicePage.title,
            }),
          };
        })
    );

    return activeCityPages.filter((p) => p !== null);
  },
});

// Liste les services disponibles dans une ville (public)
export const listByCity = query({
  args: { citySlug: v.string() },
  handler: async (ctx, args) => {
    // Trouver la ville
    const city = await ctx.db
      .query("seoServiceCities")
      .withIndex("by_slug", (q) => q.eq("slug", args.citySlug))
      .first();

    if (!city || !city.isActive) {
      return [];
    }

    // Récupérer toutes les pages de cette ville
    const cityPages = await ctx.db
      .query("seoServiceCityPages")
      .withIndex("by_city", (q) => q.eq("cityId", city._id))
      .collect();

    // Filtrer les actives et enrichir avec les données du service
    const activeServicePages = await Promise.all(
      cityPages
        .filter((cp) => cp.isActive)
        .map(async (cp) => {
          const servicePage = await ctx.db.get(cp.servicePageId);
          if (!servicePage || !servicePage.isActive) return null;

          return {
            serviceSlug: servicePage.slug,
            serviceTitle: servicePage.title,
            title: replaceVariables(cp.title, {
              ville: city.name,
              region: city.region,
              service: servicePage.title,
            }),
          };
        })
    );

    return activeServicePages.filter((p) => p !== null);
  },
});

// ============================================
// Queries admin
// ============================================

// Liste toutes les pages service+ville (admin)
export const adminList = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const cityPages = await ctx.db.query("seoServiceCityPages").collect();

    // Enrichir avec les données du service et de la ville
    const enrichedPages = await Promise.all(
      cityPages.map(async (cp) => {
        const servicePage = await ctx.db.get(cp.servicePageId);
        const city = await ctx.db.get(cp.cityId);

        return {
          id: cp._id,
          servicePageId: cp.servicePageId,
          cityId: cp.cityId,
          serviceName: servicePage?.title ?? "Service supprimé",
          serviceSlug: servicePage?.slug ?? "",
          cityName: city?.name ?? "Ville supprimée",
          citySlug: city?.slug ?? "",
          region: city?.region ?? "",
          title: cp.title,
          description: cp.description,
          metaTitle: cp.metaTitle,
          metaDescription: cp.metaDescription,
          customContent: cp.customContent,
          localStats: cp.localStats,
          isActive: cp.isActive,
          createdAt: cp.createdAt,
          updatedAt: cp.updatedAt,
        };
      })
    );

    // Trier par service puis par ville
    enrichedPages.sort((a, b) => {
      if (a.serviceName !== b.serviceName) {
        return a.serviceName.localeCompare(b.serviceName);
      }
      return a.cityName.localeCompare(b.cityName);
    });

    return enrichedPages;
  },
});

// Vue matricielle service × ville (admin)
export const adminMatrix = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Récupérer tous les services et villes
    const services = await ctx.db.query("seoServicePages").collect();
    const cities = await ctx.db.query("seoServiceCities").collect();
    const cityPages = await ctx.db.query("seoServiceCityPages").collect();

    // Créer un map des pages existantes
    const pageMap = new Map<string, { id: string; isActive: boolean }>();
    for (const cp of cityPages) {
      const key = `${cp.servicePageId}_${cp.cityId}`;
      pageMap.set(key, { id: cp._id, isActive: cp.isActive });
    }

    // Construire la matrice
    const matrix = services
      .sort((a, b) => a.order - b.order)
      .map((service) => ({
        serviceId: service._id,
        serviceSlug: service.slug,
        serviceName: service.title,
        serviceActive: service.isActive,
        cities: cities
          .sort((a, b) => a.order - b.order)
          .map((city) => {
            const key = `${service._id}_${city._id}`;
            const page = pageMap.get(key);
            return {
              cityId: city._id,
              citySlug: city.slug,
              cityName: city.name,
              cityActive: city.isActive,
              hasPage: !!page,
              pageId: page?.id,
              pageActive: page?.isActive,
            };
          }),
      }));

    // Stats globales
    const totalServices = services.length;
    const totalCities = cities.length;
    const totalPossible = totalServices * totalCities;
    const totalCreated = cityPages.length;
    const totalActive = cityPages.filter((cp) => cp.isActive).length;

    return {
      matrix,
      stats: {
        totalServices,
        totalCities,
        totalPossible,
        totalCreated,
        totalActive,
        coverage: totalPossible > 0 ? (totalCreated / totalPossible) * 100 : 0,
      },
    };
  },
});

// ============================================
// Mutations admin
// ============================================

// Créer une page service+ville
export const create = mutation({
  args: {
    token: v.string(),
    servicePageId: v.id("seoServicePages"),
    cityId: v.id("seoServiceCities"),
    title: v.string(),
    description: v.string(),
    metaTitle: v.string(),
    metaDescription: v.string(),
    customContent: v.optional(v.string()),
    localStats: v.optional(
      v.object({
        announcersCount: v.optional(v.number()),
        averageRating: v.optional(v.number()),
        completedMissions: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Vérifier que le service existe
    const servicePage = await ctx.db.get(args.servicePageId);
    if (!servicePage) {
      throw new ConvexError("Page service non trouvée");
    }

    // Vérifier que la ville existe
    const city = await ctx.db.get(args.cityId);
    if (!city) {
      throw new ConvexError("Ville non trouvée");
    }

    // Vérifier que la combinaison n'existe pas déjà
    const existing = await ctx.db
      .query("seoServiceCityPages")
      .withIndex("by_service_city", (q) =>
        q.eq("servicePageId", args.servicePageId).eq("cityId", args.cityId)
      )
      .first();

    if (existing) {
      throw new ConvexError("Une page pour ce service et cette ville existe déjà");
    }

    const now = Date.now();

    const pageId = await ctx.db.insert("seoServiceCityPages", {
      servicePageId: args.servicePageId,
      cityId: args.cityId,
      title: args.title,
      description: args.description,
      metaTitle: args.metaTitle,
      metaDescription: args.metaDescription,
      customContent: args.customContent,
      localStats: args.localStats,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, pageId };
  },
});

// Mettre à jour une page service+ville
export const update = mutation({
  args: {
    token: v.string(),
    pageId: v.id("seoServiceCityPages"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    customContent: v.optional(v.string()),
    localStats: v.optional(
      v.object({
        announcersCount: v.optional(v.number()),
        averageRating: v.optional(v.number()),
        completedMissions: v.optional(v.number()),
      })
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new ConvexError("Page non trouvée");
    }

    // Construire les mises à jour
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updatedAt: Date.now() };

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.metaTitle !== undefined) updates.metaTitle = args.metaTitle;
    if (args.metaDescription !== undefined) updates.metaDescription = args.metaDescription;
    if (args.customContent !== undefined) updates.customContent = args.customContent;
    if (args.localStats !== undefined) updates.localStats = args.localStats;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.pageId, updates);

    return { success: true };
  },
});

// Supprimer une page service+ville
export const delete_ = mutation({
  args: {
    token: v.string(),
    pageId: v.id("seoServiceCityPages"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new ConvexError("Page non trouvée");
    }

    await ctx.db.delete(args.pageId);

    return { success: true };
  },
});

// Toggle actif/inactif
export const toggleActive = mutation({
  args: {
    token: v.string(),
    pageId: v.id("seoServiceCityPages"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const page = await ctx.db.get(args.pageId);
    if (!page) {
      throw new ConvexError("Page non trouvée");
    }

    await ctx.db.patch(args.pageId, {
      isActive: !page.isActive,
      updatedAt: Date.now(),
    });

    return { success: true, isActive: !page.isActive };
  },
});

// Générer toutes les pages pour un service (avec toutes les villes actives)
export const generateForService = mutation({
  args: {
    token: v.string(),
    servicePageId: v.id("seoServicePages"),
    titleTemplate: v.string(), // "{{service}} à {{ville}}"
    descriptionTemplate: v.string(),
    metaTitleTemplate: v.string(),
    metaDescriptionTemplate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Vérifier que le service existe
    const servicePage = await ctx.db.get(args.servicePageId);
    if (!servicePage) {
      throw new ConvexError("Page service non trouvée");
    }

    // Récupérer toutes les villes actives
    const cities = await ctx.db
      .query("seoServiceCities")
      .withIndex("by_active_order", (q) => q.eq("isActive", true))
      .collect();

    const now = Date.now();
    let created = 0;
    let skipped = 0;

    for (const city of cities) {
      // Vérifier si la page existe déjà
      const existing = await ctx.db
        .query("seoServiceCityPages")
        .withIndex("by_service_city", (q) =>
          q.eq("servicePageId", args.servicePageId).eq("cityId", city._id)
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Créer la page
      await ctx.db.insert("seoServiceCityPages", {
        servicePageId: args.servicePageId,
        cityId: city._id,
        title: args.titleTemplate,
        description: args.descriptionTemplate,
        metaTitle: args.metaTitleTemplate,
        metaDescription: args.metaDescriptionTemplate,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      created++;
    }

    return { success: true, created, skipped };
  },
});

// Générer toutes les pages pour une ville (avec tous les services actifs)
export const generateForCity = mutation({
  args: {
    token: v.string(),
    cityId: v.id("seoServiceCities"),
    titleTemplate: v.string(),
    descriptionTemplate: v.string(),
    metaTitleTemplate: v.string(),
    metaDescriptionTemplate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Vérifier que la ville existe
    const city = await ctx.db.get(args.cityId);
    if (!city) {
      throw new ConvexError("Ville non trouvée");
    }

    // Récupérer tous les services actifs
    const services = await ctx.db
      .query("seoServicePages")
      .withIndex("by_active_order", (q) => q.eq("isActive", true))
      .collect();

    const now = Date.now();
    let created = 0;
    let skipped = 0;

    for (const service of services) {
      // Vérifier si la page existe déjà
      const existing = await ctx.db
        .query("seoServiceCityPages")
        .withIndex("by_service_city", (q) =>
          q.eq("servicePageId", service._id).eq("cityId", args.cityId)
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Créer la page
      await ctx.db.insert("seoServiceCityPages", {
        servicePageId: service._id,
        cityId: args.cityId,
        title: args.titleTemplate,
        description: args.descriptionTemplate,
        metaTitle: args.metaTitleTemplate,
        metaDescription: args.metaDescriptionTemplate,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      created++;
    }

    return { success: true, created, skipped };
  },
});

// Générer toutes les combinaisons manquantes
export const generateAll = mutation({
  args: {
    token: v.string(),
    titleTemplate: v.string(),
    descriptionTemplate: v.string(),
    metaTitleTemplate: v.string(),
    metaDescriptionTemplate: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Récupérer tous les services et villes actifs
    const services = await ctx.db
      .query("seoServicePages")
      .withIndex("by_active_order", (q) => q.eq("isActive", true))
      .collect();

    const cities = await ctx.db
      .query("seoServiceCities")
      .withIndex("by_active_order", (q) => q.eq("isActive", true))
      .collect();

    const now = Date.now();
    let created = 0;
    let skipped = 0;

    for (const service of services) {
      for (const city of cities) {
        // Vérifier si la page existe déjà
        const existing = await ctx.db
          .query("seoServiceCityPages")
          .withIndex("by_service_city", (q) =>
            q.eq("servicePageId", service._id).eq("cityId", city._id)
          )
          .first();

        if (existing) {
          skipped++;
          continue;
        }

        // Créer la page
        await ctx.db.insert("seoServiceCityPages", {
          servicePageId: service._id,
          cityId: city._id,
          title: args.titleTemplate,
          description: args.descriptionTemplate,
          metaTitle: args.metaTitleTemplate,
          metaDescription: args.metaDescriptionTemplate,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });

        created++;
      }
    }

    return {
      success: true,
      created,
      skipped,
      totalServices: services.length,
      totalCities: cities.length,
    };
  },
});
