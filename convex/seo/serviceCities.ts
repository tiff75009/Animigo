import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../admin/utils";
import { ConvexError } from "convex/values";

// ============================================
// Queries publiques
// ============================================

// Liste les villes actives (public)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const cities = await ctx.db
      .query("seoServiceCities")
      .withIndex("by_active_order", (q) => q.eq("isActive", true))
      .collect();

    // Trier par ordre
    cities.sort((a, b) => a.order - b.order);

    return cities.map((city) => ({
      id: city._id,
      slug: city.slug,
      name: city.name,
      region: city.region,
      department: city.department,
      population: city.population,
      coordinates: city.coordinates,
    }));
  },
});

// Récupérer une ville par slug (public)
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const city = await ctx.db
      .query("seoServiceCities")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!city || !city.isActive) {
      return null;
    }

    return {
      id: city._id,
      slug: city.slug,
      name: city.name,
      region: city.region,
      department: city.department,
      postalCodes: city.postalCodes,
      population: city.population,
      coordinates: city.coordinates,
    };
  },
});

// Liste les villes par région (public)
export const listByRegion = query({
  args: { region: v.string() },
  handler: async (ctx, args) => {
    const cities = await ctx.db
      .query("seoServiceCities")
      .withIndex("by_region", (q) => q.eq("region", args.region))
      .collect();

    // Filtrer les actives et trier par ordre
    const activeCities = cities
      .filter((c) => c.isActive)
      .sort((a, b) => a.order - b.order);

    return activeCities.map((city) => ({
      id: city._id,
      slug: city.slug,
      name: city.name,
      region: city.region,
      department: city.department,
      population: city.population,
    }));
  },
});

// Liste toutes les régions uniques (public)
export const listRegions = query({
  args: {},
  handler: async (ctx) => {
    const cities = await ctx.db
      .query("seoServiceCities")
      .withIndex("by_active_order", (q) => q.eq("isActive", true))
      .collect();

    // Extraire les régions uniques
    const regions = Array.from(new Set(cities.map((c) => c.region))).sort();

    return regions;
  },
});

// ============================================
// Queries admin
// ============================================

// Liste toutes les villes (admin)
export const adminList = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const cities = await ctx.db.query("seoServiceCities").collect();

    // Trier par région puis par ordre
    cities.sort((a, b) => {
      if (a.region !== b.region) {
        return a.region.localeCompare(b.region);
      }
      return a.order - b.order;
    });

    // Compter les pages associées pour chaque ville
    const citiesWithCounts = await Promise.all(
      cities.map(async (city) => {
        const cityPages = await ctx.db
          .query("seoServiceCityPages")
          .withIndex("by_city", (q) => q.eq("cityId", city._id))
          .collect();

        return {
          id: city._id,
          slug: city.slug,
          name: city.name,
          region: city.region,
          department: city.department,
          postalCodes: city.postalCodes,
          population: city.population,
          coordinates: city.coordinates,
          isActive: city.isActive,
          order: city.order,
          pagesCount: cityPages.length,
          activePagesCount: cityPages.filter((p) => p.isActive).length,
          createdAt: city.createdAt,
          updatedAt: city.updatedAt,
        };
      })
    );

    return citiesWithCounts;
  },
});

// Récupérer une ville par ID (admin)
export const adminGet = query({
  args: {
    token: v.string(),
    cityId: v.id("seoServiceCities"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const city = await ctx.db.get(args.cityId);
    if (!city) {
      return null;
    }

    return {
      ...city,
      id: city._id,
    };
  },
});

// ============================================
// Mutations admin
// ============================================

// Créer une ville
export const create = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
    name: v.string(),
    region: v.string(),
    department: v.optional(v.string()),
    postalCodes: v.optional(v.array(v.string())),
    population: v.optional(v.number()),
    coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Vérifier que le slug est unique
    const existing = await ctx.db
      .query("seoServiceCities")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new ConvexError("Une ville avec ce slug existe déjà");
    }

    // Trouver l'ordre max
    const allCities = await ctx.db.query("seoServiceCities").collect();
    const maxOrder = allCities.reduce((max, city) => Math.max(max, city.order), -1);

    const now = Date.now();

    const cityId = await ctx.db.insert("seoServiceCities", {
      slug: args.slug.toLowerCase().replace(/\s+/g, "-"),
      name: args.name,
      region: args.region,
      department: args.department,
      postalCodes: args.postalCodes,
      population: args.population,
      coordinates: args.coordinates,
      isActive: true,
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, cityId };
  },
});

// Mettre à jour une ville
export const update = mutation({
  args: {
    token: v.string(),
    cityId: v.id("seoServiceCities"),
    slug: v.optional(v.string()),
    name: v.optional(v.string()),
    region: v.optional(v.string()),
    department: v.optional(v.string()),
    postalCodes: v.optional(v.array(v.string())),
    population: v.optional(v.number()),
    coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const city = await ctx.db.get(args.cityId);
    if (!city) {
      throw new ConvexError("Ville non trouvée");
    }

    // Si le slug change, vérifier qu'il est unique
    if (args.slug && args.slug !== city.slug) {
      const newSlug = args.slug;
      const existing = await ctx.db
        .query("seoServiceCities")
        .withIndex("by_slug", (q) => q.eq("slug", newSlug))
        .first();

      if (existing) {
        throw new ConvexError("Une ville avec ce slug existe déjà");
      }
    }

    // Construire les mises à jour
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updatedAt: Date.now() };

    if (args.slug !== undefined) updates.slug = args.slug.toLowerCase().replace(/\s+/g, "-");
    if (args.name !== undefined) updates.name = args.name;
    if (args.region !== undefined) updates.region = args.region;
    if (args.department !== undefined) updates.department = args.department;
    if (args.postalCodes !== undefined) updates.postalCodes = args.postalCodes;
    if (args.population !== undefined) updates.population = args.population;
    if (args.coordinates !== undefined) updates.coordinates = args.coordinates;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.cityId, updates);

    return { success: true };
  },
});

// Supprimer une ville
export const delete_ = mutation({
  args: {
    token: v.string(),
    cityId: v.id("seoServiceCities"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const city = await ctx.db.get(args.cityId);
    if (!city) {
      throw new ConvexError("Ville non trouvée");
    }

    // Supprimer toutes les pages service+ville associées
    const cityPages = await ctx.db
      .query("seoServiceCityPages")
      .withIndex("by_city", (q) => q.eq("cityId", args.cityId))
      .collect();

    for (const page of cityPages) {
      await ctx.db.delete(page._id);
    }

    await ctx.db.delete(args.cityId);

    return { success: true, deletedPages: cityPages.length };
  },
});

// Import en masse des villes
export const bulkCreate = mutation({
  args: {
    token: v.string(),
    cities: v.array(
      v.object({
        slug: v.string(),
        name: v.string(),
        region: v.string(),
        department: v.optional(v.string()),
        postalCodes: v.optional(v.array(v.string())),
        population: v.optional(v.number()),
        coordinates: v.optional(
          v.object({
            lat: v.number(),
            lng: v.number(),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Trouver l'ordre max actuel
    const allCities = await ctx.db.query("seoServiceCities").collect();
    let currentOrder = allCities.reduce((max, city) => Math.max(max, city.order), -1);

    const now = Date.now();
    const created: string[] = [];
    const skipped: string[] = [];

    for (const cityData of args.cities) {
      // Vérifier si le slug existe déjà
      const existing = await ctx.db
        .query("seoServiceCities")
        .withIndex("by_slug", (q) => q.eq("slug", cityData.slug.toLowerCase()))
        .first();

      if (existing) {
        skipped.push(cityData.name);
        continue;
      }

      currentOrder++;

      await ctx.db.insert("seoServiceCities", {
        slug: cityData.slug.toLowerCase().replace(/\s+/g, "-"),
        name: cityData.name,
        region: cityData.region,
        department: cityData.department,
        postalCodes: cityData.postalCodes,
        population: cityData.population,
        coordinates: cityData.coordinates,
        isActive: true,
        order: currentOrder,
        createdAt: now,
        updatedAt: now,
      });

      created.push(cityData.name);
    }

    return {
      success: true,
      created: created.length,
      skipped: skipped.length,
      createdCities: created,
      skippedCities: skipped,
    };
  },
});

// Toggle actif/inactif
export const toggleActive = mutation({
  args: {
    token: v.string(),
    cityId: v.id("seoServiceCities"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const city = await ctx.db.get(args.cityId);
    if (!city) {
      throw new ConvexError("Ville non trouvée");
    }

    await ctx.db.patch(args.cityId, {
      isActive: !city.isActive,
      updatedAt: Date.now(),
    });

    return { success: true, isActive: !city.isActive };
  },
});

// Réordonner les villes
export const reorder = mutation({
  args: {
    token: v.string(),
    cityIds: v.array(v.id("seoServiceCities")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    for (let i = 0; i < args.cityIds.length; i++) {
      await ctx.db.patch(args.cityIds[i], {
        order: i,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Seed des principales villes françaises
export const seedDefaultCities = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Vérifier si des villes existent déjà
    const existing = await ctx.db.query("seoServiceCities").first();
    if (existing) {
      throw new ConvexError("Des villes existent déjà");
    }

    const defaultCities = [
      { slug: "paris", name: "Paris", region: "Île-de-France", department: "75", population: 2161000 },
      { slug: "marseille", name: "Marseille", region: "Provence-Alpes-Côte d'Azur", department: "13", population: 870731 },
      { slug: "lyon", name: "Lyon", region: "Auvergne-Rhône-Alpes", department: "69", population: 522969 },
      { slug: "toulouse", name: "Toulouse", region: "Occitanie", department: "31", population: 493465 },
      { slug: "nice", name: "Nice", region: "Provence-Alpes-Côte d'Azur", department: "06", population: 342669 },
      { slug: "nantes", name: "Nantes", region: "Pays de la Loire", department: "44", population: 314138 },
      { slug: "montpellier", name: "Montpellier", region: "Occitanie", department: "34", population: 290053 },
      { slug: "strasbourg", name: "Strasbourg", region: "Grand Est", department: "67", population: 287228 },
      { slug: "bordeaux", name: "Bordeaux", region: "Nouvelle-Aquitaine", department: "33", population: 260958 },
      { slug: "lille", name: "Lille", region: "Hauts-de-France", department: "59", population: 236234 },
      { slug: "rennes", name: "Rennes", region: "Bretagne", department: "35", population: 222485 },
      { slug: "reims", name: "Reims", region: "Grand Est", department: "51", population: 182211 },
      { slug: "saint-etienne", name: "Saint-Étienne", region: "Auvergne-Rhône-Alpes", department: "42", population: 173089 },
      { slug: "toulon", name: "Toulon", region: "Provence-Alpes-Côte d'Azur", department: "83", population: 171953 },
      { slug: "le-havre", name: "Le Havre", region: "Normandie", department: "76", population: 169733 },
      { slug: "grenoble", name: "Grenoble", region: "Auvergne-Rhône-Alpes", department: "38", population: 158454 },
      { slug: "dijon", name: "Dijon", region: "Bourgogne-Franche-Comté", department: "21", population: 156920 },
      { slug: "angers", name: "Angers", region: "Pays de la Loire", department: "49", population: 154508 },
      { slug: "nimes", name: "Nîmes", region: "Occitanie", department: "30", population: 150564 },
      { slug: "aix-en-provence", name: "Aix-en-Provence", region: "Provence-Alpes-Côte d'Azur", department: "13", population: 147122 },
    ];

    const now = Date.now();

    for (let i = 0; i < defaultCities.length; i++) {
      await ctx.db.insert("seoServiceCities", {
        ...defaultCities[i],
        isActive: true,
        order: i,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, count: defaultCities.length };
  },
});
