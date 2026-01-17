import { QueryCtx, MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";

// Helper pour vérifier le rôle admin dans les mutations/queries
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  token: string
) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session invalide ou expirée");
  }

  const user = await ctx.db.get(session.userId);

  if (!user || !user.isActive) {
    throw new ConvexError("Utilisateur inactif");
  }

  if (user.role !== "admin") {
    throw new ConvexError("Accès refusé: droits administrateur requis");
  }

  return { user, session };
}
