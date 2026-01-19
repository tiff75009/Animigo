import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";

// Types de commissions disponibles
export const COMMISSION_TYPES = [
  { id: "particulier", label: "Particulier", description: "Annonceurs particuliers" },
  { id: "micro_entrepreneur", label: "Micro-entrepreneur", description: "Auto-entrepreneurs et micro-entreprises" },
  { id: "professionnel", label: "Professionnel", description: "Entreprises (SARL, SAS, etc.)" },
] as const;

// Configuration par défaut des commissions (en pourcentage)
const DEFAULT_COMMISSIONS = {
  particulier: 15, // 15%
  micro_entrepreneur: 12, // 12%
  professionnel: 10, // 10%
};

// Query: Récupérer toutes les configurations de commissions
export const getCommissions = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const commissions: Record<string, number> = {};

    for (const type of COMMISSION_TYPES) {
      const config = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", `commission_${type.id}`))
        .first();

      commissions[type.id] = config
        ? parseFloat(config.value)
        : DEFAULT_COMMISSIONS[type.id as keyof typeof DEFAULT_COMMISSIONS];
    }

    return commissions;
  },
});

// Mutation: Mettre à jour une commission
export const updateCommission = mutation({
  args: {
    token: v.string(),
    type: v.union(
      v.literal("particulier"),
      v.literal("micro_entrepreneur"),
      v.literal("professionnel")
    ),
    rate: v.number(), // Taux en pourcentage (ex: 15 pour 15%)
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    // Validation du taux
    if (args.rate < 0 || args.rate > 50) {
      throw new Error("Le taux de commission doit être entre 0 et 50%");
    }

    const key = `commission_${args.type}`;

    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.rate.toString(),
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        key,
        value: args.rate.toString(),
        isSecret: false,
        environment: "production",
        updatedAt: Date.now(),
        updatedBy: user._id,
      });
    }

    return { success: true, type: args.type, rate: args.rate };
  },
});

// Mutation: Mettre à jour toutes les commissions en une fois
export const updateAllCommissions = mutation({
  args: {
    token: v.string(),
    commissions: v.object({
      particulier: v.number(),
      micro_entrepreneur: v.number(),
      professionnel: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const entries = Object.entries(args.commissions) as [
      keyof typeof args.commissions,
      number
    ][];

    for (const [type, rate] of entries) {
      // Validation du taux
      if (rate < 0 || rate > 50) {
        throw new Error(`Le taux de commission pour ${type} doit être entre 0 et 50%`);
      }

      const key = `commission_${type}`;

      const existing = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: rate.toString(),
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
      } else {
        await ctx.db.insert("systemConfig", {
          key,
          value: rate.toString(),
          isSecret: false,
          environment: "production",
          updatedAt: Date.now(),
          updatedBy: user._id,
        });
      }
    }

    return { success: true };
  },
});

// Query publique: Récupérer le taux de commission pour un type d'annonceur
export const getCommissionRate = query({
  args: {
    announcerType: v.union(
      v.literal("particulier"),
      v.literal("micro_entrepreneur"),
      v.literal("professionnel")
    ),
  },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", `commission_${args.announcerType}`))
      .first();

    const rate = config
      ? parseFloat(config.value)
      : DEFAULT_COMMISSIONS[args.announcerType];

    return { rate };
  },
});

// Query publique: Récupérer tous les taux de commission (pour affichage public)
export const getAllCommissionRates = query({
  args: {},
  handler: async (ctx) => {
    const commissions: Record<string, number> = {};

    for (const type of COMMISSION_TYPES) {
      const config = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", `commission_${type.id}`))
        .first();

      commissions[type.id] = config
        ? parseFloat(config.value)
        : DEFAULT_COMMISSIONS[type.id as keyof typeof DEFAULT_COMMISSIONS];
    }

    return commissions;
  },
});
