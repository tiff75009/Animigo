import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// ============================================
// QUERIES PUBLIQUES
// ============================================

// Récupérer toutes les activités actives (pour les annonceurs)
export const getActiveActivities = query({
  args: {},
  handler: async (ctx) => {
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Trier par ordre
    return activities.sort((a, b) => a.order - b.order);
  },
});

// ============================================
// QUERIES ADMIN
// ============================================

// Récupérer toutes les activités (admin)
export const getAllActivities = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // Vérifier la session admin
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      throw new ConvexError("Accès non autorisé");
    }

    const activities = await ctx.db.query("activities").collect();
    return activities.sort((a, b) => a.order - b.order);
  },
});

// ============================================
// MUTATIONS ADMIN
// ============================================

// Créer une activité
export const createActivity = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    emoji: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Vérifier la session admin
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      throw new ConvexError("Accès non autorisé");
    }

    // Obtenir le prochain ordre
    const activities = await ctx.db.query("activities").collect();
    const maxOrder = activities.reduce((max, a) => Math.max(max, a.order), 0);

    const now = Date.now();
    const activityId = await ctx.db.insert("activities", {
      name: args.name,
      emoji: args.emoji,
      description: args.description,
      order: maxOrder + 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, activityId };
  },
});

// Modifier une activité
export const updateActivity = mutation({
  args: {
    token: v.string(),
    activityId: v.id("activities"),
    name: v.optional(v.string()),
    emoji: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Vérifier la session admin
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      throw new ConvexError("Accès non autorisé");
    }

    const activity = await ctx.db.get(args.activityId);
    if (!activity) {
      throw new ConvexError("Activité non trouvée");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.name !== undefined) updates.name = args.name;
    if (args.emoji !== undefined) updates.emoji = args.emoji;
    if (args.description !== undefined) {
      updates.description = args.description === null ? undefined : args.description;
    }
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.activityId, updates);
    return { success: true };
  },
});

// Supprimer une activité
export const deleteActivity = mutation({
  args: {
    token: v.string(),
    activityId: v.id("activities"),
  },
  handler: async (ctx, args) => {
    // Vérifier la session admin
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      throw new ConvexError("Accès non autorisé");
    }

    const activity = await ctx.db.get(args.activityId);
    if (!activity) {
      throw new ConvexError("Activité non trouvée");
    }

    await ctx.db.delete(args.activityId);
    return { success: true };
  },
});

// Réorganiser les activités (drag & drop)
export const reorderActivities = mutation({
  args: {
    token: v.string(),
    orderedIds: v.array(v.id("activities")),
  },
  handler: async (ctx, args) => {
    // Vérifier la session admin
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      throw new ConvexError("Accès non autorisé");
    }

    // Mettre à jour l'ordre de chaque activité
    const now = Date.now();
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], {
        order: i + 1,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
