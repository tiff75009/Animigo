// @ts-nocheck
import { QueryCtx, MutationCtx, ActionCtx, internalQuery } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// Types pour les réponses d'authentification admin
export type AdminAuthResult =
  | {
      success: true;
      user: Doc<"users">;
      session: Doc<"sessions">;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Vérifie l'authentification admin et retourne un résultat
 * Ne throw pas d'erreur - retourne { success: false, error } en cas d'échec
 */
export async function checkAdmin(
  ctx: QueryCtx | MutationCtx,
  token: string | null | undefined
): Promise<AdminAuthResult> {
  if (!token) {
    return { success: false, error: "Token manquant" };
  }

  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    return { success: false, error: "Session invalide ou expirée" };
  }

  const user = await ctx.db.get(session.userId);

  if (!user || !user.isActive) {
    return { success: false, error: "Utilisateur inactif" };
  }

  if (user.role !== "admin") {
    return { success: false, error: "Accès refusé: droits administrateur requis" };
  }

  return { success: true, user, session };
}

/**
 * @deprecated Utiliser checkAdmin() à la place pour éviter les erreurs non gérées
 * Version legacy qui throw des erreurs (pour rétrocompatibilité)
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  token: string
) {
  const result = await checkAdmin(ctx, token);

  if (!result.success) {
    // Pour les queries existantes, on garde le throw
    // mais le message sera plus clair
    throw new Error(result.error);
  }

  return { user: result.user, session: result.session };
}

/**
 * Vérifier l'authentification admin dans une action
 * Utilise une query interne pour vérifier le token
 */
export async function requireAdminAction(
  ctx: ActionCtx,
  token: string
): Promise<{ userId: string }> {
  const result = await ctx.runQuery(internal.admin.utils.checkAdminToken, {
    token,
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  return { userId: result.userId };
}

/**
 * Query interne pour vérifier un token admin (appelée par les actions)
 */
export const checkAdminToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const result = await checkAdmin(ctx, args.token);

    if (!result.success) {
      return { success: false as const, error: result.error };
    }

    return {
      success: true as const,
      userId: result.user._id,
    };
  },
});
