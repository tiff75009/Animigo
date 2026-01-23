import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";
import { Id } from "../_generated/dataModel";

// Seuil pour considérer un dev comme hors ligne (2 minutes)
const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000;

// Générer une clé dev sécurisée (même pattern que session tokens)
function generateDevKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ==================== MUTATIONS ADMIN ====================

// Créer une nouvelle clé développeur
export const createDevKey = mutation({
  args: {
    token: v.string(),
    devName: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const key = generateDevKey();
    const devKeyId = await ctx.db.insert("devKeys", {
      name: args.devName.trim(),
      key,
      isActive: true,
      createdAt: Date.now(),
      createdBy: user._id,
    });

    // Retourner la clé une seule fois à la création
    return { devKeyId, key };
  },
});

// Révoquer une clé développeur
export const revokeDevKey = mutation({
  args: {
    token: v.string(),
    devKeyId: v.id("devKeys"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const devKey = await ctx.db.get(args.devKeyId);
    if (!devKey) {
      throw new Error("Clé introuvable");
    }

    // Marquer comme révoquée
    await ctx.db.patch(args.devKeyId, {
      isActive: false,
      revokedAt: Date.now(),
      revokedBy: user._id,
    });

    // Supprimer le record de présence s'il existe
    const presence = await ctx.db
      .query("devPresence")
      .withIndex("by_devKey", (q) => q.eq("devKeyId", args.devKeyId))
      .first();

    if (presence) {
      await ctx.db.delete(presence._id);
    }

    return { success: true };
  },
});

// ==================== QUERIES ADMIN ====================

// Récupérer toutes les clés avec leur statut de présence
export const getAllDevKeys = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const devKeys = await ctx.db.query("devKeys").collect();
    const presences = await ctx.db.query("devPresence").collect();

    // Map des présences par devKeyId
    const presenceMap = new Map(
      presences.map((p) => [p.devKeyId.toString(), p])
    );
    const now = Date.now();

    return devKeys.map((dk) => {
      const presence = presenceMap.get(dk._id.toString());
      const isOnline =
        presence && now - presence.lastHeartbeat < OFFLINE_THRESHOLD_MS;

      return {
        id: dk._id,
        name: dk.name,
        key: dk.key,
        isActive: dk.isActive,
        createdAt: dk.createdAt,
        revokedAt: dk.revokedAt,
        isOnline: isOnline ?? false,
        onlineSince: isOnline ? presence.onlineSince : null,
        lastSeen: presence?.lastHeartbeat ?? null,
      };
    });
  },
});

// Récupérer uniquement les développeurs en ligne (pour sidebar/indicateur)
export const getOnlineDevs = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const now = Date.now();
    const presences = await ctx.db.query("devPresence").collect();

    // Filtrer les présences actives
    const onlinePresences = presences.filter(
      (p) => now - p.lastHeartbeat < OFFLINE_THRESHOLD_MS
    );

    const result: Array<{
      name: string;
      onlineSince: number;
      lastHeartbeat: number;
    }> = [];

    for (const p of onlinePresences) {
      const devKey = await ctx.db.get(p.devKeyId);
      if (devKey && devKey.isActive) {
        result.push({
          name: devKey.name,
          onlineSince: p.onlineSince,
          lastHeartbeat: p.lastHeartbeat,
        });
      }
    }

    return result;
  },
});

// ==================== MUTATIONS PUBLIQUES (heartbeat) ====================

// Heartbeat - appelé toutes les 30s par le client dev
export const heartbeat = mutation({
  args: {
    devKey: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Trouver la clé dev
    const devKeyDoc = await ctx.db
      .query("devKeys")
      .withIndex("by_key", (q) => q.eq("key", args.devKey))
      .first();

    if (!devKeyDoc || !devKeyDoc.isActive) {
      return { success: false, error: "Invalid or revoked key" };
    }

    // Chercher un record de présence existant
    const existingPresence = await ctx.db
      .query("devPresence")
      .withIndex("by_devKey", (q) => q.eq("devKeyId", devKeyDoc._id))
      .first();

    const now = Date.now();

    if (existingPresence) {
      // Mettre à jour le heartbeat
      await ctx.db.patch(existingPresence._id, {
        lastHeartbeat: now,
        userAgent: args.userAgent,
      });
    } else {
      // Créer un nouveau record de présence
      await ctx.db.insert("devPresence", {
        devKeyId: devKeyDoc._id,
        lastHeartbeat: now,
        onlineSince: now,
        userAgent: args.userAgent,
      });
    }

    return { success: true, devName: devKeyDoc.name };
  },
});

// Déconnexion - appelé quand le dev ferme son navigateur
export const disconnect = mutation({
  args: { devKey: v.string() },
  handler: async (ctx, args) => {
    const devKeyDoc = await ctx.db
      .query("devKeys")
      .withIndex("by_key", (q) => q.eq("key", args.devKey))
      .first();

    if (!devKeyDoc) {
      return { success: false };
    }

    // Supprimer le record de présence
    const presence = await ctx.db
      .query("devPresence")
      .withIndex("by_devKey", (q) => q.eq("devKeyId", devKeyDoc._id))
      .first();

    if (presence) {
      await ctx.db.delete(presence._id);
    }

    return { success: true };
  },
});
