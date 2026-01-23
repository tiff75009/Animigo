import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";

// ============ Internal Queries (pour les actions) ============

// Query interne pour récupérer la config QStash
export const getQStashConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tokenConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "qstash_token"))
      .first();

    const appUrlConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "app_url"))
      .first();

    return {
      token: tokenConfig?.value || null,
      appUrl: appUrlConfig?.value || null,
    };
  },
});

// Query interne pour vérifier admin (utilisée par les actions)
export const checkAdminForAction = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return { success: false as const, error: "Session invalide ou expirée" };
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) {
      return { success: false as const, error: "Utilisateur inactif" };
    }

    if (user.role !== "admin") {
      return { success: false as const, error: "Accès refusé: droits administrateur requis" };
    }

    return { success: true as const, userId: user._id };
  },
});

// ============ Public Queries ============

// Liste des notifications de l'utilisateur
export const list = query({
  args: {
    sessionToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    const limit = args.limit ?? 50;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", session.userId))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

// Compteur de notifications non lues
export const unreadCount = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return 0;
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", session.userId).eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});

// Récupérer une notification spécifique
export const get = query({
  args: {
    sessionToken: v.string(),
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== session.userId) {
      return null;
    }

    return notification;
  },
});

// Liste des notifications par type
export const listByType = query({
  args: {
    sessionToken: v.string(),
    type: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return [];
    }

    const limit = args.limit ?? 20;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", session.userId).eq("type", args.type as any)
      )
      .order("desc")
      .take(limit);

    return notifications;
  },
});
