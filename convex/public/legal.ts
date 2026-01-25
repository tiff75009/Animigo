import { query } from "../_generated/server";
import { v } from "convex/values";

// Query publique: Récupère une page légale publiée
export const getPublishedLegalPage = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("legalPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    // Ne retourner que si la page est publiée
    if (!page || page.status !== "published") {
      return null;
    }

    return {
      slug: page.slug,
      title: page.title,
      content: page.content,
      version: page.version,
      publishedAt: page.publishedAt,
    };
  },
});

// Query publique: Liste toutes les pages légales publiées (pour navigation)
export const listPublishedLegalPages = query({
  args: {},
  handler: async (ctx) => {
    const pages = await ctx.db
      .query("legalPages")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    // Trier par ordre: cgv, cgu, privacy, cancellation
    const order = ["cgv", "cgu", "privacy", "cancellation"];
    const sortedPages = pages.sort((a, b) => {
      const indexA = order.indexOf(a.slug);
      const indexB = order.indexOf(b.slug);
      return indexA - indexB;
    });

    return sortedPages.map((page) => ({
      slug: page.slug,
      title: page.title,
    }));
  },
});
