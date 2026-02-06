// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";

// Motifs par défaut
const DEFAULT_REASONS = [
  { label: "Service non réalisé", slug: "service_non_realise", description: "Le prestataire n'a pas effectué le service convenu", blocksPayment: true, sortOrder: 1 },
  { label: "Qualité insuffisante", slug: "qualite_insuffisante", description: "Le service a été réalisé mais la qualité est insatisfaisante", blocksPayment: false, sortOrder: 2 },
  { label: "Retard important", slug: "retard_important", description: "Le prestataire a eu un retard significatif", blocksPayment: false, sortOrder: 3 },
  { label: "Comportement inapproprié", slug: "comportement_inapproprie", description: "Le prestataire a eu un comportement déplacé", blocksPayment: true, sortOrder: 4 },
  { label: "Animal mal traité", slug: "animal_mal_traite", description: "L'animal n'a pas été correctement pris en charge", blocksPayment: true, sortOrder: 5 },
  { label: "Non-respect des consignes", slug: "non_respect_consignes", description: "Les consignes données n'ont pas été respectées", blocksPayment: false, sortOrder: 6 },
  { label: "Autre", slug: "autre", description: "Autre motif de réclamation", blocksPayment: false, sortOrder: 7 },
];

export const getAll = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const reasons = await ctx.db.query("disputeReasons").collect();
    return reasons.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    label: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    blocksPayment: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const now = Date.now();

    // Trouver le sortOrder max
    const all = await ctx.db.query("disputeReasons").collect();
    const maxOrder = all.reduce((max, r) => Math.max(max, r.sortOrder), 0);

    const id = await ctx.db.insert("disputeReasons", {
      label: args.label,
      slug: args.slug,
      description: args.description,
      blocksPayment: args.blocksPayment,
      isActive: true,
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("disputeReasons"),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    blocksPayment: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const reason = await ctx.db.get(args.id);
    if (!reason) throw new Error("Motif non trouvé");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.label !== undefined) updates.label = args.label;
    if (args.description !== undefined) updates.description = args.description;
    if (args.blocksPayment !== undefined) updates.blocksPayment = args.blocksPayment;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.id, updates);
    return { success: true };
  },
});

export const reorder = mutation({
  args: {
    token: v.string(),
    orderedIds: v.array(v.id("disputeReasons")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const now = Date.now();

    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], {
        sortOrder: i + 1,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const seedDefaults = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const now = Date.now();

    for (const reason of DEFAULT_REASONS) {
      const existing = await ctx.db
        .query("disputeReasons")
        .withIndex("by_slug", (q) => q.eq("slug", reason.slug))
        .first();

      if (!existing) {
        await ctx.db.insert("disputeReasons", {
          ...reason,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true, message: "Motifs par défaut initialisés" };
  },
});
