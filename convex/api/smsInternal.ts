import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Query publique : récupérer la config Octopush (pour le frontend)
// Passée ensuite en argument aux actions (contourne le bug ctx.runQuery dans "use node" sur self-hosted)
export const getOctopushConfig = query({
  args: {},
  handler: async (ctx) => {
    const apiLogin = await ctx.db.query("systemConfig").withIndex("by_key", (q: any) => q.eq("key", "octopush_api_login")).first();
    const apiKey = await ctx.db.query("systemConfig").withIndex("by_key", (q: any) => q.eq("key", "octopush_api_key")).first();

    if (!apiLogin?.value || !apiKey?.value) {
      return null;
    }

    return {
      apiLogin: apiLogin.value,
      apiKey: apiKey.value,
    };
  },
});

// Query interne : récupérer une valeur de config
export const getConfigValue = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    return config?.value ?? null;
  },
});

// Query interne : compter les tentatives récentes pour un numéro
export const getRecentAttempts = internalQuery({
  args: {
    phone: v.string(),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const attempts = await ctx.db
      .query("phoneVerificationAttempts")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .collect();

    return attempts.filter((a) => a.createdAt >= args.since).length;
  },
});

// Mutation interne : insérer une tentative de vérification
export const insertAttempt = internalMutation({
  args: {
    phone: v.string(),
    pinId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("phoneVerificationAttempts", {
      phone: args.phone,
      pinId: args.pinId,
      createdAt: Date.now(),
      verified: false,
    });
  },
});

// Query interne : récupérer une tentative par pinId
export const getAttemptByPinId = internalQuery({
  args: { pinId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("phoneVerificationAttempts")
      .withIndex("by_pinId", (q) => q.eq("pinId", args.pinId))
      .first();
  },
});

// Mutation interne : marquer une tentative comme vérifiée
export const markVerified = internalMutation({
  args: {
    pinId: v.string(),
  },
  handler: async (ctx, args) => {
    const attempt = await ctx.db
      .query("phoneVerificationAttempts")
      .withIndex("by_pinId", (q) => q.eq("pinId", args.pinId))
      .first();

    if (attempt) {
      await ctx.db.patch(attempt._id, { verified: true });
    }
  },
});

// Mutation publique : marquer le téléphone de l'utilisateur comme vérifié
// Appelée depuis le dashboard après vérification SMS réussie
export const markUserPhoneVerified = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) throw new ConvexError("Utilisateur non trouvé");

    if (user.phoneVerified) {
      return { success: true, alreadyVerified: true };
    }

    await ctx.db.patch(session.userId, {
      phoneVerified: true,
      updatedAt: Date.now(),
    });

    // Activer automatiquement tous les services inactifs de l'utilisateur
    const services = await ctx.db
      .query("services")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .collect();

    let activatedCount = 0;
    for (const service of services) {
      if (!service.isActive) {
        await ctx.db.patch(service._id, {
          isActive: true,
          updatedAt: Date.now(),
        });
        activatedCount++;
      }
    }

    return { success: true, activatedCount };
  },
});
