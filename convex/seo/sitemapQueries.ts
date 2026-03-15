// @ts-nocheck
import { query } from "../_generated/server";

export const getActiveSeoServiceSlugs = query({
  args: {},
  handler: async (ctx) => {
    const pages = await ctx.db
      .query("seoServicePages")
      .withIndex("by_active_order", (q) => q.eq("isActive", true))
      .collect();

    return pages.map((page) => ({
      slug: page.slug,
      updatedAt: page.updatedAt,
    }));
  },
});

export const getActiveCityPageSlugs = query({
  args: {},
  handler: async (ctx) => {
    const cityPages = await ctx.db
      .query("seoServiceCityPages")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const results = [];

    for (const cityPage of cityPages) {
      const [servicePage, city] = await Promise.all([
        ctx.db.get(cityPage.servicePageId),
        ctx.db.get(cityPage.cityId),
      ]);

      if (servicePage && city && servicePage.isActive && city.isActive) {
        results.push({
          serviceSlug: servicePage.slug,
          citySlug: city.slug,
          updatedAt: cityPage.updatedAt,
        });
      }
    }

    return results;
  },
});
