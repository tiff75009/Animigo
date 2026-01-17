import { v } from "convex/values";
import { query, mutation } from "../_generated/server";

// Get user preferences
export const getPreferences = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    // Get preferences
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    if (!preferences) {
      // Return default values
      return {
        userId: session.userId,
        acceptReservationsFrom: "08:00",
        acceptReservationsTo: "20:00",
        billingMode: "round_up" as const,
        roundUpThreshold: 2,
        notifications: {
          email: {
            newMission: true,
            messages: true,
            reviews: true,
            payments: true,
            newsletter: false,
          },
          push: {
            newMission: true,
            messages: true,
            reviews: true,
            payments: true,
            reminders: true,
          },
          sms: {
            newMission: false,
            urgentMessages: false,
            payments: false,
          },
        },
        isDefault: true,
      };
    }

    return {
      ...preferences,
      isDefault: false,
    };
  },
});

// Update planning preferences (availability hours + billing mode)
export const updatePlanningPreferences = mutation({
  args: {
    token: v.string(),
    acceptReservationsFrom: v.optional(v.string()),
    acceptReservationsTo: v.optional(v.string()),
    billingMode: v.optional(v.union(v.literal("round_up"), v.literal("exact"))),
    roundUpThreshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validate session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Session invalide");
    }

    // Get existing preferences
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        acceptReservationsFrom: args.acceptReservationsFrom ?? existing.acceptReservationsFrom,
        acceptReservationsTo: args.acceptReservationsTo ?? existing.acceptReservationsTo,
        billingMode: args.billingMode ?? existing.billingMode,
        roundUpThreshold: args.roundUpThreshold ?? existing.roundUpThreshold,
        updatedAt: now,
      });
    } else {
      // Create new
      await ctx.db.insert("userPreferences", {
        userId: session.userId,
        acceptReservationsFrom: args.acceptReservationsFrom ?? "08:00",
        acceptReservationsTo: args.acceptReservationsTo ?? "20:00",
        billingMode: args.billingMode ?? "round_up",
        roundUpThreshold: args.roundUpThreshold ?? 2,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Update notification preferences
export const updateNotificationPreferences = mutation({
  args: {
    token: v.string(),
    notifications: v.object({
      email: v.optional(
        v.object({
          newMission: v.optional(v.boolean()),
          messages: v.optional(v.boolean()),
          reviews: v.optional(v.boolean()),
          payments: v.optional(v.boolean()),
          newsletter: v.optional(v.boolean()),
        })
      ),
      push: v.optional(
        v.object({
          newMission: v.optional(v.boolean()),
          messages: v.optional(v.boolean()),
          reviews: v.optional(v.boolean()),
          payments: v.optional(v.boolean()),
          reminders: v.optional(v.boolean()),
        })
      ),
      sms: v.optional(
        v.object({
          newMission: v.optional(v.boolean()),
          urgentMessages: v.optional(v.boolean()),
          payments: v.optional(v.boolean()),
        })
      ),
    }),
  },
  handler: async (ctx, args) => {
    // Validate session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Session invalide");
    }

    // Get existing preferences
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    const now = Date.now();

    if (existing) {
      // Merge notifications
      const mergedNotifications = {
        email: {
          ...existing.notifications?.email,
          ...args.notifications.email,
        },
        push: {
          ...existing.notifications?.push,
          ...args.notifications.push,
        },
        sms: {
          ...existing.notifications?.sms,
          ...args.notifications.sms,
        },
      };

      await ctx.db.patch(existing._id, {
        notifications: mergedNotifications,
        updatedAt: now,
      });
    } else {
      // Create new with notifications
      await ctx.db.insert("userPreferences", {
        userId: session.userId,
        notifications: args.notifications,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
