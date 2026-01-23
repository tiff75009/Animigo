import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../admin/utils";

// ==========================================
// MUTATIONS PUBLIQUES
// ==========================================

/**
 * Créer une demande de visite (publique)
 * Appelée depuis la page maintenance par les visiteurs
 */
export const createVisitRequest = mutation({
  args: {
    name: v.string(),
    ipAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Vérifier si une demande existe déjà pour cette IP
    const existingRequest = await ctx.db
      .query("visitRequests")
      .withIndex("by_ip", (q) => q.eq("ipAddress", args.ipAddress))
      .first();

    if (existingRequest) {
      // Si déjà approuvée, retourner succès
      if (existingRequest.status === "approved") {
        return { success: true, alreadyApproved: true };
      }
      // Si en attente ou rejetée, on peut mettre à jour le nom
      await ctx.db.patch(existingRequest._id, {
        name: args.name,
        status: "pending",
        updatedAt: Date.now(),
      });
      return { success: true, updated: true };
    }

    // Créer une nouvelle demande
    await ctx.db.insert("visitRequests", {
      name: args.name,
      ipAddress: args.ipAddress,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, created: true };
  },
});

// ==========================================
// QUERIES PUBLIQUES
// ==========================================

/**
 * Récupérer toutes les IPs approuvées (pour le middleware)
 */
export const getApprovedIps = query({
  args: {},
  handler: async (ctx) => {
    const approvedRequests = await ctx.db
      .query("visitRequests")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    return approvedRequests.map((req) => req.ipAddress);
  },
});

/**
 * Vérifier si une IP est approuvée
 */
export const isIpApproved = query({
  args: { ipAddress: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("visitRequests")
      .withIndex("by_ip_status", (q) =>
        q.eq("ipAddress", args.ipAddress).eq("status", "approved")
      )
      .first();

    return request !== null;
  },
});

// ==========================================
// MUTATIONS ADMIN
// ==========================================

/**
 * Approuver une demande de visite
 */
export const approveRequest = mutation({
  args: {
    token: v.string(),
    requestId: v.id("visitRequests"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Demande non trouvée");
    }

    await ctx.db.patch(args.requestId, {
      status: "approved",
      updatedAt: Date.now(),
      reviewedAt: Date.now(),
      reviewedBy: user._id,
    });

    return { success: true };
  },
});

/**
 * Rejeter une demande de visite
 */
export const rejectRequest = mutation({
  args: {
    token: v.string(),
    requestId: v.id("visitRequests"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Demande non trouvée");
    }

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      updatedAt: Date.now(),
      reviewedAt: Date.now(),
      reviewedBy: user._id,
    });

    return { success: true };
  },
});

/**
 * Supprimer une demande de visite
 */
export const deleteRequest = mutation({
  args: {
    token: v.string(),
    requestId: v.id("visitRequests"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Demande non trouvée");
    }

    await ctx.db.delete(args.requestId);

    return { success: true };
  },
});

// ==========================================
// QUERIES ADMIN
// ==========================================

/**
 * Lister les demandes en attente (admin)
 */
export const listPendingRequests = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const pendingRequests = await ctx.db
      .query("visitRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    return pendingRequests;
  },
});

/**
 * Lister toutes les demandes (admin)
 */
export const listAllRequests = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const allRequests = await ctx.db
      .query("visitRequests")
      .order("desc")
      .collect();

    return allRequests;
  },
});

/**
 * Lister les IPs approuvées (admin)
 */
export const listApprovedRequests = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const approvedRequests = await ctx.db
      .query("visitRequests")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .collect();

    return approvedRequests;
  },
});

/**
 * Ajouter manuellement une IP (admin)
 */
export const addManualIp = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    ipAddress: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    // Vérifier si l'IP existe déjà
    const existing = await ctx.db
      .query("visitRequests")
      .withIndex("by_ip", (q) => q.eq("ipAddress", args.ipAddress))
      .first();

    if (existing) {
      // Mettre à jour en approved
      await ctx.db.patch(existing._id, {
        name: args.name,
        status: "approved",
        updatedAt: Date.now(),
        reviewedAt: Date.now(),
        reviewedBy: user._id,
      });
      return { success: true, updated: true };
    }

    // Créer une nouvelle entrée approuvée
    await ctx.db.insert("visitRequests", {
      name: args.name,
      ipAddress: args.ipAddress,
      status: "approved",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      reviewedAt: Date.now(),
      reviewedBy: user._id,
    });

    return { success: true, created: true };
  },
});

/**
 * Révoquer un accès approuvé (remet en rejected)
 */
export const revokeAccess = mutation({
  args: {
    token: v.string(),
    requestId: v.id("visitRequests"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Demande non trouvée");
    }

    await ctx.db.patch(args.requestId, {
      status: "rejected",
      updatedAt: Date.now(),
      reviewedAt: Date.now(),
      reviewedBy: user._id,
    });

    return { success: true };
  },
});
