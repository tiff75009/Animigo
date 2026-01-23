import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { requireAdmin } from "../admin/utils";

// Durée de rétention: 30 jours
const RETENTION_DAYS = 30;

// Types de notifications (pour validation)
export const notificationTypes = [
  "new_mission",
  "mission_accepted",
  "mission_refused",
  "mission_confirmed",
  "mission_started",
  "mission_completed",
  "mission_cancelled",
  "payment_authorized",
  "payment_captured",
  "payout_sent",
  "review_received",
  "new_message",
  "welcome",
  "reminder",
  "system",
] as const;

export type NotificationType = (typeof notificationTypes)[number];

// Création d'une notification depuis le webhook (appelée par l'API)
// Note: La sécurité est gérée par la vérification de signature QStash dans l'API
export const createFromWebhook = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    linkType: v.optional(v.string()),
    linkId: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + RETENTION_DAYS * 24 * 60 * 60 * 1000;

    // Vérifier que l'utilisateur existe
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type as NotificationType,
      title: args.title,
      message: args.message,
      linkType: args.linkType as
        | "mission"
        | "payment"
        | "profile"
        | "review"
        | "message"
        | "settings"
        | undefined,
      linkId: args.linkId,
      linkUrl: args.linkUrl,
      metadata: args.metadata,
      isRead: false,
      createdAt: now,
      expiresAt,
    });
  },
});

// Création d'une notification (appelée en interne par Convex)
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    linkType: v.optional(v.string()),
    linkId: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + RETENTION_DAYS * 24 * 60 * 60 * 1000;

    // Vérifier que l'utilisateur existe
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type as NotificationType,
      title: args.title,
      message: args.message,
      linkType: args.linkType as
        | "mission"
        | "payment"
        | "profile"
        | "review"
        | "message"
        | "settings"
        | undefined,
      linkId: args.linkId,
      linkUrl: args.linkUrl,
      metadata: args.metadata,
      isRead: false,
      createdAt: now,
      expiresAt,
    });
  },
});

// Marquer une notification comme lue
export const markAsRead = mutation({
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
      throw new Error("Session invalide");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== session.userId) {
      throw new Error("Notification non trouvée");
    }

    if (!notification.isRead) {
      await ctx.db.patch(args.notificationId, {
        isRead: true,
        readAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Marquer toutes les notifications comme lues
export const markAllAsRead = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Session invalide");
    }

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", session.userId).eq("isRead", false)
      )
      .collect();

    const now = Date.now();
    for (const notif of unreadNotifications) {
      await ctx.db.patch(notif._id, { isRead: true, readAt: now });
    }

    return { count: unreadNotifications.length };
  },
});

// Supprimer une notification
export const deleteNotification = mutation({
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
      throw new Error("Session invalide");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== session.userId) {
      throw new Error("Notification non trouvée");
    }

    await ctx.db.delete(args.notificationId);
    return { success: true };
  },
});

// Créer une notification de test (admin only)
export const createTestNotification = mutation({
  args: {
    adminToken: v.string(),
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    linkType: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Vérifier que c'est un admin
    await requireAdmin(ctx, args.adminToken);

    const now = Date.now();
    const expiresAt = now + RETENTION_DAYS * 24 * 60 * 60 * 1000;

    // Vérifier que l'utilisateur existe
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type as NotificationType,
      title: args.title,
      message: args.message,
      linkType: args.linkType as
        | "mission"
        | "payment"
        | "profile"
        | "review"
        | "message"
        | "settings"
        | undefined,
      linkUrl: args.linkUrl,
      isRead: false,
      createdAt: now,
      expiresAt,
    });

    return { success: true, notificationId };
  },
});

// Supprimer les notifications expirées (cron job)
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("notifications")
      .withIndex("by_expires", (q) => q.lt("expiresAt", now))
      .take(100); // Batch de 100 pour éviter les timeouts

    for (const notif of expired) {
      await ctx.db.delete(notif._id);
    }

    return { deleted: expired.length };
  },
});
