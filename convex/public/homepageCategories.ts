import { query } from "../_generated/server";
import { v } from "convex/values";
import { calculateDistance, isInBoundingBox } from "../lib/geoUtils";

/**
 * Liste les catégories "affichables" (feuilles de la hiérarchie : types de
 * services concrets comme gardiennage, promenade, dressage, toilettage…)
 * avec le nombre de services actifs pour chacune — éventuellement filtrés
 * par proximité si `coordinates` + `radiusKm` sont fournis.
 *
 * Utilisée sur la homepage (pills + vignettes bento).
 */
export const getHomepageCategories = query({
  args: {
    coordinates: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      })
    ),
    radiusKm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const radiusKm = args.radiusKm ?? 50;

    // 1. Toutes les catégories actives
    const allCategories = await ctx.db
      .query("serviceCategories")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const byId = new Map(allCategories.map((c) => [c._id, c]));

    // 2. Identifier les parents qui ont au moins un enfant actif : on les
    //    exclura de l'affichage (c'est juste un regroupement).
    const parentIdsWithChildren = new Set<string>();
    for (const c of allCategories) {
      if (c.parentCategoryId) parentIdsWithChildren.add(c.parentCategoryId);
    }

    // 3. "Feuilles" : catégories affichables comme type de service concret.
    //    - sous-catégorie (parentCategoryId présent)
    //    - OU catégorie sans enfant
    const leaves = allCategories
      .filter((c) => !parentIdsWithChildren.has(c._id))
      .sort((a, b) => a.order - b.order);

    // 4. Types de catégories pour enrichir la réponse
    const allTypes = await ctx.db
      .query("categoryTypes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
    const typeMap = new Map(allTypes.map((t) => [t._id, t]));

    // 5. Services actifs (une seule query via index by_active)
    const activeServices = await ctx.db
      .query("services")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // 6. Si coordonnées fournies, charger les profils pour filtrer par distance
    const coords = args.coordinates;
    let profileByUserId: Map<string, { lat: number; lng: number } | null> | null = null;

    if (coords) {
      const userIds = Array.from(new Set(activeServices.map((s) => s.userId)));
      const profiles = await Promise.all(
        userIds.map((uid) =>
          ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", uid))
            .first()
        )
      );
      profileByUserId = new Map();
      profiles.forEach((p, i) => {
        const uid = userIds[i];
        profileByUserId!.set(
          uid,
          p?.coordinates ? { lat: p.coordinates.lat, lng: p.coordinates.lng } : null
        );
      });
    }

    // 7. Compter les services par slug de catégorie "feuille"
    const leafSlugs = new Set(leaves.map((l) => l.slug));
    const countBySlug = new Map<string, number>();
    for (const service of activeServices) {
      if (!leafSlugs.has(service.category)) continue;
      if (coords && profileByUserId) {
        const pcoords = profileByUserId.get(service.userId);
        if (!pcoords) continue;
        if (!isInBoundingBox(coords.lat, coords.lng, pcoords.lat, pcoords.lng, radiusKm))
          continue;
        const dist = calculateDistance(coords.lat, coords.lng, pcoords.lat, pcoords.lng);
        if (dist > radiusKm) continue;
      }
      countBySlug.set(service.category, (countBySlug.get(service.category) ?? 0) + 1);
    }

    // 8. Trier par popularité (nombre de services DESC) puis par `order` ASC
    //    On ne dispose pas encore de tracking de recherches ; on utilise donc
    //    le nombre d'annonces comme proxy de popularité.
    const sortedLeaves = [...leaves].sort((a, b) => {
      const ca = countBySlug.get(a.slug) ?? 0;
      const cb = countBySlug.get(b.slug) ?? 0;
      if (ca !== cb) return cb - ca;
      return a.order - b.order;
    });

    // 9. Résoudre les URLs d'images en parallèle
    const results = await Promise.all(
      sortedLeaves.map(async (leaf) => {
        let imageUrl: string | null = null;
        if (leaf.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(leaf.imageStorageId);
        }
        // Le type peut être hérité du parent si non défini sur la feuille
        const ownType = leaf.typeId ? typeMap.get(leaf.typeId) : null;
        const parent = leaf.parentCategoryId ? byId.get(leaf.parentCategoryId) : null;
        const inheritedType =
          !ownType && parent?.typeId ? typeMap.get(parent.typeId) : null;
        const type = ownType ?? inheritedType ?? null;

        return {
          id: leaf._id,
          slug: leaf.slug,
          name: leaf.name,
          description: leaf.description ?? null,
          icon: leaf.icon ?? null,
          color: leaf.color ?? null,
          imageUrl,
          billingType: leaf.billingType ?? null,
          allowOvernightStay: leaf.allowOvernightStay ?? false,
          parentSlug: parent?.slug ?? null,
          parentName: parent?.name ?? null,
          typeSlug: type?.slug ?? null,
          typeName: type?.name ?? null,
          typeColor: type?.color ?? null,
          count: countBySlug.get(leaf.slug) ?? 0,
        };
      })
    );

    return results;
  },
});
