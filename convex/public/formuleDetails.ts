import { query } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

/**
 * Query publique : récupère le détail complet d'une formule (variant)
 * pour la page `/formule/[id]`. Inclut le service parent, la catégorie,
 * et un mini-profil de l'annonceur.
 *
 * Pas d'authentification requise.
 */
export const getVariantDetails = query({
  args: { variantId: v.id("serviceVariants") },
  handler: async (ctx, args) => {
    const variant = await ctx.db.get(args.variantId);
    if (!variant) return null;
    if (!variant.isActive) return null;

    const service = await ctx.db.get(variant.serviceId);
    if (!service || !service.isActive) return null;

    // Vérifier le statut de modération
    if (service.moderationStatus === "rejected") return null;

    // Catégorie
    const category = await ctx.db
      .query("serviceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", service.category))
      .first();

    // Annonceur
    const announcer = await ctx.db.get(service.userId);
    if (!announcer) return null;

    // Profil annonceur (pour bio, avatar, localisation, etc.)
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", service.userId))
      .first();

    // Options du service liées à cette variante (ou partagées)
    const allOptions = await ctx.db
      .query("serviceOptions")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .collect();
    const variantOptions = allOptions.filter(
      (o) => !o.variantId || o.variantId === variant._id
    );

    // Compter les autres formules actives du même service (pour CTA "voir toutes")
    const siblingVariants = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service_active", (q) =>
        q.eq("serviceId", service._id).eq("isActive", true)
      )
      .collect();

    // Statut annonceur (Particulier / Pro / Micro)
    let statusType: "particulier" | "micro_entrepreneur" | "professionnel" = "particulier";
    if (announcer.accountType === "annonceur_pro") {
      statusType =
        announcer.companyType === "micro_enterprise"
          ? "micro_entrepreneur"
          : "professionnel";
    }

    // Photos triées par ordre
    const photos = (variant.photos ?? [])
      .slice()
      .sort((a, b) => a.order - b.order);

    return {
      variant: {
        id: variant._id,
        name: variant.name,
        description: variant.description ?? null,
        objectives: variant.objectives ?? [],
        numberOfSessions: variant.numberOfSessions ?? 1,
        sessionInterval: variant.sessionInterval ?? null,
        sessionType: variant.sessionType ?? "individual",
        maxAnimalsPerSession: variant.maxAnimalsPerSession ?? null,
        serviceLocation: variant.serviceLocation ?? null,
        animalTypes: variant.animalTypes ?? [],
        dogCategoryAcceptance: variant.dogCategoryAcceptance ?? null,
        acceptedDogSizes: variant.acceptedDogSizes ?? [],
        price: variant.price,
        priceUnit: variant.priceUnit,
        pricing: variant.pricing ?? null,
        duration: variant.duration ?? null,
        pricingMode: variant.pricingMode ?? null,
        includedFeatures: variant.includedFeatures ?? [],
        isSapEligible: variant.isSapEligible ?? false,
        photos,
      },
      service: {
        id: service._id,
        category: service.category,
        animalTypes: service.animalTypes,
        serviceLocation: service.serviceLocation ?? null,
        allowOvernightStay: service.allowOvernightStay ?? false,
        siblingVariantsCount: siblingVariants.length,
      },
      category: category
        ? {
            id: category._id,
            slug: category.slug,
            name: category.name,
            icon: category.icon ?? null,
            description: category.description ?? null,
            isCapacityBased: category.isCapacityBased ?? false,
          }
        : null,
      announcer: {
        id: announcer._id,
        slug: (announcer.username || (announcer as any).slug) ?? null,
        firstName: announcer.firstName,
        lastName: announcer.lastName,
        statusType,
        verified: announcer.accountType === "annonceur_pro",
        sapApproved: profile?.isSapApproved ?? false,
        profileImageUrl:
          (profile?.listingDisplayImage === "logo" && profile?.companyLogoUrl)
            ? profile.companyLogoUrl
            : profile?.profileImageUrl ?? null,
        coverImageUrl: profile?.coverImageUrl ?? null,
        bio: profile?.bio ?? null,
        city: profile?.city ?? null,
        location: profile?.location ?? null,
        rating: 4.5, // TODO : calculer depuis les avis
        reviewCount: 0, // TODO
      },
      options: variantOptions
        .filter((o) => o.isActive)
        .sort((a, b) => a.order - b.order)
        .map((o) => ({
          id: o._id,
          name: o.name,
          description: o.description ?? null,
          price: o.price,
          priceType: o.priceType,
          unitLabel: o.unitLabel ?? null,
          maxQuantity: o.maxQuantity ?? null,
        })),
    };
  },
});
