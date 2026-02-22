// @ts-nocheck
import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";

/**
 * Liste paginée des logs email pour admin
 */
export const listEmailLogs = query({
  args: {
    token: v.string(),
    limit: v.optional(v.number()),
    statusFilter: v.optional(v.string()),
    providerFilter: v.optional(v.string()),
    templateFilter: v.optional(v.string()),
    searchEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const limit = args.limit || 50;

    let logsQuery = ctx.db
      .query("emailLogs")
      .withIndex("by_created")
      .order("desc");

    const allLogs = await logsQuery.take(500);

    // Filtres côté serveur
    let filtered = allLogs;

    if (args.statusFilter && args.statusFilter !== "all") {
      filtered = filtered.filter((log) => log.status === args.statusFilter);
    }

    if (args.providerFilter && args.providerFilter !== "all") {
      filtered = filtered.filter((log) => log.provider === args.providerFilter);
    }

    if (args.templateFilter && args.templateFilter !== "all") {
      filtered = filtered.filter((log) => log.template === args.templateFilter);
    }

    if (args.searchEmail) {
      const search = args.searchEmail.toLowerCase();
      filtered = filtered.filter((log) => log.to.toLowerCase().includes(search));
    }

    return filtered.slice(0, limit);
  },
});

/**
 * Stats agrégées pour le dashboard email logs
 */
export const getEmailLogStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // Récupérer les logs des 30 derniers jours
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentLogs = await ctx.db
      .query("emailLogs")
      .withIndex("by_created")
      .filter((q) => q.gte(q.field("createdAt"), thirtyDaysAgo))
      .collect();

    const total = recentLogs.length;
    const sent = recentLogs.filter((l) => l.status === "sent").length;
    const delivered = recentLogs.filter((l) => l.status === "delivered").length;
    const opened = recentLogs.filter((l) => ["opened", "clicked"].includes(l.status)).length;
    const bounced = recentLogs.filter((l) => l.status === "bounced").length;
    const complained = recentLogs.filter((l) => l.status === "complained").length;
    const failed = recentLogs.filter((l) => l.status === "failed").length;
    const blocked = recentLogs.filter((l) => l.status === "blocked").length;

    const brevoCount = recentLogs.filter((l) => l.provider === "brevo").length;
    const resendCount = recentLogs.filter((l) => l.provider === "resend").length;

    return {
      total,
      sent,
      delivered,
      opened,
      bounced,
      complained,
      failed,
      blocked,
      byProvider: { brevo: brevoCount, resend: resendCount },
      deliveryRate: total > 0 ? Math.round(((delivered + opened) / total) * 100) : 0,
      openRate: delivered + sent > 0 ? Math.round((opened / (delivered + sent)) * 100) : 0,
      bounceRate: total > 0 ? Math.round((bounced / total) * 100) : 0,
    };
  },
});
