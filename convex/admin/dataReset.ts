// @ts-nocheck
import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { requireAdmin } from "./utils";

// Définition des groupes de données avec leurs tables
// L'ordre des tables est significatif : enfants avant parents
const DATA_GROUPS: Record<
  string,
  { label: string; tables: string[] }
> = {
  users: {
    label: "Comptes utilisateurs (hors admins)",
    tables: [
      "regularityScores",
      "cancellationPolicies",
      "clientCredits",
      "sapDeclarations",
      "verificationRequests",
      "phoneVerificationAttempts",
      "passwordResetTokens",
      "emailVerificationTokens",
      "userPreferences",
      "clientAddresses",
      "clientProfiles",
      "profiles",
      "sessions",
      "users",
    ],
  },
  animals: {
    label: "Animaux",
    tables: ["animals"],
  },
  reservations: {
    label: "Réservations & Missions",
    tables: [
      "slotChangeNotifications",
      "collectiveSlotBookings",
      "collectiveSlots",
      "availability",
      "pendingBookings",
      "missions",
    ],
  },
  payments: {
    label: "Paiements Stripe",
    tables: [
      "invoices",
      "announcerPayouts",
      "savedPaymentMethods",
      "stripePayments",
    ],
  },
  services: {
    label: "Services & Annonces",
    tables: ["serviceOptions", "serviceVariants", "photos", "services"],
  },
  support: {
    label: "Support & Réclamations",
    tables: ["ticketMessages", "disputes", "supportTickets"],
  },
  reviews: {
    label: "Avis & Favoris",
    tables: ["favorites", "reviews"],
  },
  messaging: {
    label: "Messagerie",
    tables: ["messages", "conversations"],
  },
  notifications: {
    label: "Notifications",
    tables: ["notifications"],
  },
  logs: {
    label: "Logs",
    tables: ["emailLogs", "smsLogs", "activities"],
  },
  visitRequests: {
    label: "Demandes de visite",
    tables: ["visitRequests"],
  },
};

async function getAdminUserIds(ctx: any): Promise<Set<string>> {
  const allUsers = await ctx.db.query("users").collect();
  return new Set(
    allUsers.filter((u: any) => u.role === "admin").map((u: any) => u._id)
  );
}

// Comptage des documents par groupe
export const getDataCounts = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const adminIds = await getAdminUserIds(ctx);
    const counts: Record<
      string,
      { total: number; tables: Record<string, number> }
    > = {};

    for (const [groupKey, group] of Object.entries(DATA_GROUPS)) {
      const tableCounts: Record<string, number> = {};
      let total = 0;

      for (const tableName of group.tables) {
        const docs = await ctx.db.query(tableName).collect();
        let count: number;

        if (tableName === "users" && groupKey === "users") {
          count = docs.filter((u: any) => u.role !== "admin").length;
        } else if (tableName === "sessions" && groupKey === "users") {
          count = docs.filter(
            (s: any) => !adminIds.has(s.userId)
          ).length;
        } else {
          count = docs.length;
        }

        tableCounts[tableName] = count;
        total += count;
      }

      counts[groupKey] = { total, tables: tableCounts };
    }

    return counts;
  },
});

// Suppression de toutes les tables d'un groupe
export const deleteGroup = mutation({
  args: { token: v.string(), group: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const groupDef = DATA_GROUPS[args.group];
    if (!groupDef) throw new Error(`Groupe inconnu: ${args.group}`);

    const adminIds =
      args.group === "users"
        ? await getAdminUserIds(ctx)
        : new Set<string>();

    let totalDeleted = 0;
    const tableResults: Record<string, number> = {};

    for (const tableName of groupDef.tables) {
      const docs = await ctx.db.query(tableName).collect();
      let deleted = 0;

      for (const doc of docs) {
        if (
          tableName === "users" &&
          args.group === "users" &&
          doc.role === "admin"
        )
          continue;
        if (
          tableName === "sessions" &&
          args.group === "users" &&
          adminIds.has(doc.userId)
        )
          continue;

        await ctx.db.delete(doc._id);
        deleted++;
      }

      tableResults[tableName] = deleted;
      totalDeleted += deleted;
    }

    return { group: args.group, totalDeleted, tableResults };
  },
});

// Suppression d'une seule table (fallback si deleteGroup timeout)
export const deleteTable = mutation({
  args: {
    token: v.string(),
    tableName: v.string(),
    excludeAdmins: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const docs = await ctx.db.query(args.tableName).collect();
    let adminIds = new Set<string>();

    if (args.excludeAdmins) {
      adminIds = await getAdminUserIds(ctx);
    }

    let deleted = 0;
    for (const doc of docs) {
      if (args.excludeAdmins) {
        if (args.tableName === "users" && doc.role === "admin") continue;
        if (args.tableName === "sessions" && adminIds.has(doc.userId))
          continue;
      }

      await ctx.db.delete(doc._id);
      deleted++;
    }

    return { tableName: args.tableName, deleted };
  },
});

// Nettoyage des champs Stripe sur les admins restants
export const cleanStripeFieldsOnAdmins = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const allUsers = await ctx.db.query("users").collect();
    const admins = allUsers.filter((u: any) => u.role === "admin");

    for (const admin of admins) {
      await ctx.db.patch(admin._id, {
        stripeAccountId: undefined,
        stripeAccountStatus: undefined,
        stripeChargesEnabled: undefined,
        stripePayoutsEnabled: undefined,
        stripeDetailsSubmitted: undefined,
        stripeAccountUpdatedAt: undefined,
        iban: undefined,
        ibanLast4: undefined,
        payoutMode: undefined,
        stripeCustomerId: undefined,
        pendingSetupIntentSecret: undefined,
      });
    }

    return { cleaned: admins.length };
  },
});
