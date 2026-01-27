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

// Taux de TVA par défaut sur les commissions (en pourcentage)
const DEFAULT_VAT_RATE = 20; // 20%

// Frais Stripe par défaut (en pourcentage du montant HT)
const DEFAULT_STRIPE_FEE_RATE = 3; // 3%

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

// ============================================
// TVA sur les commissions
// ============================================

// Query: Récupérer le taux de TVA sur les commissions
export const getVatRate = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "commission_vat_rate"))
      .first();

    return {
      rate: config ? parseFloat(config.value) : DEFAULT_VAT_RATE,
    };
  },
});

// Query admin: Récupérer le taux de TVA avec authentification
export const getVatRateAdmin = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "commission_vat_rate"))
      .first();

    return {
      rate: config ? parseFloat(config.value) : DEFAULT_VAT_RATE,
    };
  },
});

// Mutation: Mettre à jour le taux de TVA sur les commissions
export const updateVatRate = mutation({
  args: {
    token: v.string(),
    rate: v.number(), // Taux en pourcentage (ex: 20 pour 20%)
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    // Validation du taux
    if (args.rate < 0 || args.rate > 30) {
      throw new Error("Le taux de TVA doit être entre 0 et 30%");
    }

    const key = "commission_vat_rate";

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

    return { success: true, rate: args.rate };
  },
});

// ============================================
// Frais Stripe
// ============================================

// Query: Récupérer le taux de frais Stripe
export const getStripeFeeRate = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_fee_rate"))
      .first();

    return {
      rate: config ? parseFloat(config.value) : DEFAULT_STRIPE_FEE_RATE,
    };
  },
});

// Query admin: Récupérer le taux de frais Stripe avec authentification
export const getStripeFeeRateAdmin = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_fee_rate"))
      .first();

    return {
      rate: config ? parseFloat(config.value) : DEFAULT_STRIPE_FEE_RATE,
    };
  },
});

// Mutation: Mettre à jour le taux de frais Stripe
export const updateStripeFeeRate = mutation({
  args: {
    token: v.string(),
    rate: v.number(), // Taux en pourcentage (ex: 3 pour 3%)
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    // Validation du taux
    if (args.rate < 0 || args.rate > 10) {
      throw new Error("Le taux de frais Stripe doit être entre 0 et 10%");
    }

    const key = "stripe_fee_rate";

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

    return { success: true, rate: args.rate };
  },
});

// ============================================
// Query combinée pour récupérer tous les paramètres de tarification
// ============================================

// Query publique: Récupérer tous les paramètres de tarification (commission, TVA, Stripe)
export const getPricingConfig = query({
  args: {
    announcerType: v.optional(
      v.union(
        v.literal("particulier"),
        v.literal("micro_entrepreneur"),
        v.literal("professionnel")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Récupérer le taux de commission
    let commissionRate = DEFAULT_COMMISSIONS.particulier;
    if (args.announcerType) {
      const commissionConfig = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", `commission_${args.announcerType}`))
        .first();
      commissionRate = commissionConfig
        ? parseFloat(commissionConfig.value)
        : DEFAULT_COMMISSIONS[args.announcerType];
    }

    // Récupérer le taux de TVA
    const vatConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "commission_vat_rate"))
      .first();
    const vatRate = vatConfig ? parseFloat(vatConfig.value) : DEFAULT_VAT_RATE;

    // Récupérer le taux de frais Stripe
    const stripeConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "stripe_fee_rate"))
      .first();
    const stripeFeeRate = stripeConfig ? parseFloat(stripeConfig.value) : DEFAULT_STRIPE_FEE_RATE;

    return {
      commissionRate,
      vatRate,
      stripeFeeRate,
    };
  },
});
