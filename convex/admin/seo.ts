// @ts-nocheck
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Validate admin session helper (inline)
async function validateAdminSession(ctx: any, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();
  if (!session || session.expiresAt < Date.now()) throw new Error("Session invalide ou expirée");

  const user = await ctx.db.get(session.userId);
  if (!user || user.role !== "admin") throw new Error("Accès réservé aux administrateurs");

  return session;
}

// Get all SEO page configs
export const getAllPageConfigs = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await validateAdminSession(ctx, args.token);
    return await ctx.db.query("seoPageConfigs").collect();
  },
});

// Get config by page key
export const getPageConfig = query({
  args: { token: v.string(), pageKey: v.string() },
  handler: async (ctx, args) => {
    await validateAdminSession(ctx, args.token);
    return await ctx.db
      .query("seoPageConfigs")
      .withIndex("by_page_key", (q: any) => q.eq("pageKey", args.pageKey))
      .first();
  },
});

// Upsert page config
export const upsertPageConfig = mutation({
  args: {
    token: v.string(),
    pageKey: v.string(),
    label: v.string(),
    category: v.string(),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    metaKeywords: v.optional(v.string()),
    ogTitle: v.optional(v.string()),
    ogDescription: v.optional(v.string()),
    ogImageUrl: v.optional(v.string()),
    ogType: v.optional(v.string()),
    twitterCard: v.optional(v.string()),
    twitterTitle: v.optional(v.string()),
    twitterDescription: v.optional(v.string()),
    structuredDataType: v.optional(v.string()),
    structuredDataJson: v.optional(v.string()),
    canonicalUrl: v.optional(v.string()),
    noIndex: v.optional(v.boolean()),
    noFollow: v.optional(v.boolean()),
    availableVariables: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const session = await validateAdminSession(ctx, args.token);
    const { token, ...data } = args;

    const existing = await ctx.db
      .query("seoPageConfigs")
      .withIndex("by_page_key", (q: any) => q.eq("pageKey", args.pageKey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { ...data, updatedAt: Date.now(), updatedBy: session.userId });
    } else {
      await ctx.db.insert("seoPageConfigs", { ...data, updatedAt: Date.now(), updatedBy: session.userId });
    }
  },
});

// Delete page config
export const deletePageConfig = mutation({
  args: { token: v.string(), pageKey: v.string() },
  handler: async (ctx, args) => {
    await validateAdminSession(ctx, args.token);
    const existing = await ctx.db
      .query("seoPageConfigs")
      .withIndex("by_page_key", (q: any) => q.eq("pageKey", args.pageKey))
      .first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// Initialize default SEO configs (run once)
export const initializeDefaults = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await validateAdminSession(ctx, args.token);

    const defaults = [
      {
        pageKey: "home",
        label: "Page d'accueil",
        category: "general",
        metaTitle: "Animigo - Trouvez le garde idéal pour votre animal",
        metaDescription: "Mise en relation entre propriétaires d'animaux et gardes de confiance. Chiens, chats, lapins et plus encore !",
        ogType: "website",
        twitterCard: "summary_large_image",
        availableVariables: ["{{siteName}}"],
      },
      {
        pageKey: "recherche",
        label: "Page de recherche",
        category: "general",
        metaTitle: "Rechercher un prestataire animalier | Animigo",
        metaDescription: "Trouvez le prestataire idéal pour votre animal près de chez vous. Garde, promenade, toilettage et plus.",
        ogType: "website",
        availableVariables: ["{{siteName}}", "{{ville}}", "{{service}}"],
      },
      {
        pageKey: "annonceur_profile",
        label: "Profil annonceur",
        category: "annonceurs",
        metaTitle: "{{announcerName}} - {{serviceName}} | Animigo",
        metaDescription: "{{announcerName}} propose ses services de {{serviceName}} à {{ville}}. Consultez son profil, ses avis et réservez en ligne.",
        ogType: "profile",
        twitterCard: "summary_large_image",
        availableVariables: ["{{siteName}}", "{{announcerName}}", "{{serviceName}}", "{{ville}}", "{{note}}", "{{nombreAvis}}", "{{prix}}"],
      },
      {
        pageKey: "service_page",
        label: "Page service",
        category: "services",
        metaTitle: "{{serviceTitle}} | Animigo",
        metaDescription: "{{serviceDescription}}",
        ogType: "website",
        availableVariables: ["{{siteName}}", "{{serviceTitle}}", "{{serviceDescription}}"],
      },
      {
        pageKey: "service_city_page",
        label: "Page service + ville",
        category: "services",
        metaTitle: "{{serviceTitle}} à {{ville}} | Animigo",
        metaDescription: "Trouvez un prestataire de {{serviceTitle}} à {{ville}} ({{region}}). {{nombreAnnonceurs}} professionnels disponibles.",
        ogType: "website",
        availableVariables: ["{{siteName}}", "{{serviceTitle}}", "{{ville}}", "{{region}}", "{{nombreAnnonceurs}}"],
      },
      {
        pageKey: "faq",
        label: "FAQ",
        category: "general",
        metaTitle: "Questions fréquentes | Animigo",
        metaDescription: "Retrouvez les réponses à vos questions sur Animigo : réservation, paiement, annulation, inscription.",
        ogType: "website",
        availableVariables: ["{{siteName}}"],
      },
      {
        pageKey: "inscription",
        label: "Inscription",
        category: "general",
        metaTitle: "Créer un compte | Animigo",
        metaDescription: "Inscrivez-vous gratuitement sur Animigo pour trouver ou proposer des services animaliers de confiance.",
        noIndex: false,
        availableVariables: ["{{siteName}}"],
      },
      {
        pageKey: "connexion",
        label: "Connexion",
        category: "general",
        metaTitle: "Se connecter | Animigo",
        metaDescription: "Connectez-vous à votre espace Animigo pour gérer vos réservations et vos services.",
        noIndex: true,
        availableVariables: ["{{siteName}}"],
      },
    ];

    for (const config of defaults) {
      const existing = await ctx.db
        .query("seoPageConfigs")
        .withIndex("by_page_key", (q: any) => q.eq("pageKey", config.pageKey))
        .first();
      if (!existing) {
        await ctx.db.insert("seoPageConfigs", {
          ...config,
          updatedAt: Date.now(),
          updatedBy: session.userId,
        });
      }
    }
  },
});

// Get SEO audit data (for score calculation)
export const getSeoAuditData = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await validateAdminSession(ctx, args.token);

    // Count configured pages
    const pageConfigs = await ctx.db.query("seoPageConfigs").collect();

    // Count service pages
    const servicePages = await ctx.db.query("seoServicePages").collect();
    const activeServicePages = servicePages.filter(p => p.isActive);

    // Count cities
    const cities = await ctx.db.query("seoServiceCities").collect();
    const activeCities = cities.filter(c => c.isActive);

    // Count city pages
    const cityPages = await ctx.db.query("seoServiceCityPages").collect();
    const activeCityPages = cityPages.filter(p => p.isActive);

    return {
      pageConfigs,
      totalServicePages: servicePages.length,
      activeServicePages: activeServicePages.length,
      totalCities: cities.length,
      activeCities: activeCities.length,
      totalCityPages: cityPages.length,
      activeCityPages: activeCityPages.length,
      servicePagesWithMeta: activeServicePages.filter(p => p.metaTitle && p.metaDescription).length,
    };
  },
});

// Public query - get page SEO config (no auth needed, used by frontend metadata)
export const getPublicPageConfig = query({
  args: { pageKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("seoPageConfigs")
      .withIndex("by_page_key", (q: any) => q.eq("pageKey", args.pageKey))
      .first();
  },
});
