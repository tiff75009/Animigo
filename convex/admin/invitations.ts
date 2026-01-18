import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { checkAdmin } from "./utils";
import { hashPassword, validatePassword, validateEmail } from "../auth/utils";

// Types de réponse
type InvitationResult =
  | { success: true; token: string; url: string }
  | { success: false; error: string };

type ValidationResult =
  | { success: true; valid: true }
  | { success: true; valid: false; error: string };

type RegistrationResult =
  | {
      success: true;
      token: string;
      user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
      };
    }
  | { success: false; error: string };

// Générer un token sécurisé (64 chars hex)
function generateInvitationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Générer un token de session
function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// === MUTATIONS ===

/**
 * Créer une nouvelle invitation admin
 */
export const createInvitation = mutation({
  args: {
    token: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<InvitationResult> => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      return { success: false, error: auth.error };
    }

    const now = Date.now();
    const invitationToken = generateInvitationToken();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 heures

    await ctx.db.insert("adminInvitations", {
      token: invitationToken,
      status: "pending",
      createdAt: now,
      expiresAt,
      createdBy: auth.user._id,
      note: args.note,
    });

    // L'URL sera construite côté client avec window.location.origin
    return {
      success: true,
      token: invitationToken,
      url: `/admin/inscription?token=${invitationToken}`,
    };
  },
});

/**
 * Révoquer une invitation pending
 */
export const revokeInvitation = mutation({
  args: {
    token: v.string(),
    invitationId: v.id("adminInvitations"),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      return { success: false, error: auth.error };
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      return { success: false, error: "Invitation introuvable" };
    }

    if (invitation.status !== "pending") {
      return { success: false, error: "Seules les invitations en attente peuvent être révoquées" };
    }

    await ctx.db.patch(args.invitationId, {
      status: "revoked",
      revokedAt: Date.now(),
      revokedBy: auth.user._id,
    });

    return { success: true };
  },
});

/**
 * S'inscrire en tant qu'admin avec un token d'invitation
 * Cette mutation est publique (pas besoin d'être authentifié)
 */
export const registerWithInvitation = mutation({
  args: {
    invitationToken: v.string(),
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args): Promise<RegistrationResult> => {
    // Valider l'email
    if (!validateEmail(args.email)) {
      return { success: false, error: "Email invalide" };
    }

    // Valider le mot de passe
    const passwordValidation = validatePassword(args.password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors[0] };
    }

    // Vérifier que l'email n'existe pas déjà
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      return { success: false, error: "Un compte avec cet email existe déjà" };
    }

    // Récupérer et valider l'invitation
    const invitation = await ctx.db
      .query("adminInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.invitationToken))
      .first();

    if (!invitation) {
      return { success: false, error: "Token d'invitation invalide" };
    }

    const now = Date.now();

    // Vérifier le statut de l'invitation
    if (invitation.status === "used") {
      return { success: false, error: "Cette invitation a déjà été utilisée" };
    }
    if (invitation.status === "revoked") {
      return { success: false, error: "Cette invitation a été révoquée" };
    }
    if (invitation.status === "expired" || invitation.expiresAt < now) {
      // Mettre à jour le statut si expiré mais pas encore marqué
      if (invitation.status !== "expired") {
        await ctx.db.patch(invitation._id, { status: "expired" });
      }
      return { success: false, error: "Cette invitation a expiré" };
    }

    // Hasher le mot de passe
    const passwordHash = await hashPassword(args.password);

    // Créer l'utilisateur admin
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      accountType: "utilisateur",
      firstName: args.firstName,
      lastName: args.lastName,
      phone: "",
      cguAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
      emailVerified: true, // Les admins invités sont considérés comme vérifiés
      isActive: true,
      role: "admin",
    });

    // Marquer l'invitation comme utilisée
    await ctx.db.patch(invitation._id, {
      status: "used",
      usedAt: now,
      usedBy: userId,
    });

    // Créer une session pour l'admin (2 heures)
    const sessionToken = generateSessionToken();
    const sessionExpiresAt = now + 2 * 60 * 60 * 1000;

    await ctx.db.insert("sessions", {
      userId,
      token: sessionToken,
      expiresAt: sessionExpiresAt,
      createdAt: now,
    });

    return {
      success: true,
      token: sessionToken,
      user: {
        id: userId,
        email: args.email.toLowerCase(),
        firstName: args.firstName,
        lastName: args.lastName,
        role: "admin",
      },
    };
  },
});

// === QUERIES ===

/**
 * Liste les invitations avec filtres et pagination
 */
export const listInvitations = query({
  args: {
    token: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("used"),
        v.literal("expired"),
        v.literal("revoked"),
        v.literal("all")
      )
    ),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      return { success: false, error: auth.error, invitations: [], total: 0 };
    }

    const now = Date.now();
    const limit = args.limit ?? 20;
    const offset = args.offset ?? 0;

    // Récupérer toutes les invitations
    const rawInvitations = await ctx.db.query("adminInvitations").order("desc").collect();

    // Calculer le statut effectif (pending devient expired si expiré)
    const allInvitations = rawInvitations.map((inv) => ({
      ...inv,
      status:
        inv.status === "pending" && inv.expiresAt < now
          ? ("expired" as const)
          : inv.status,
    }));

    // Filtrer par statut si spécifié
    const invitations =
      args.status && args.status !== "all"
        ? allInvitations.filter((inv) => inv.status === args.status)
        : allInvitations;

    const total = invitations.length;

    // Pagination
    const paginatedInvitations = invitations.slice(offset, offset + limit);

    // Enrichir avec les infos utilisateur
    const enrichedInvitations = await Promise.all(
      paginatedInvitations.map(async (inv) => {
        const createdByUser = await ctx.db.get(inv.createdBy);
        const usedByUser = inv.usedBy ? await ctx.db.get(inv.usedBy) : null;
        const revokedByUser = inv.revokedBy ? await ctx.db.get(inv.revokedBy) : null;

        return {
          id: inv._id,
          token: inv.token,
          status: inv.status,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
          note: inv.note,
          createdBy: createdByUser
            ? {
                id: createdByUser._id,
                firstName: createdByUser.firstName,
                lastName: createdByUser.lastName,
              }
            : null,
          usedAt: inv.usedAt,
          usedBy: usedByUser
            ? {
                id: usedByUser._id,
                firstName: usedByUser.firstName,
                lastName: usedByUser.lastName,
                email: usedByUser.email,
              }
            : null,
          revokedAt: inv.revokedAt,
          revokedBy: revokedByUser
            ? {
                id: revokedByUser._id,
                firstName: revokedByUser.firstName,
                lastName: revokedByUser.lastName,
              }
            : null,
        };
      })
    );

    return {
      success: true,
      invitations: enrichedInvitations,
      total,
      hasMore: offset + limit < total,
    };
  },
});

/**
 * Valider un token d'invitation (public)
 */
export const validateInvitationToken = query({
  args: {
    invitationToken: v.string(),
  },
  handler: async (ctx, args): Promise<ValidationResult> => {
    const invitation = await ctx.db
      .query("adminInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.invitationToken))
      .first();

    if (!invitation) {
      return { success: true, valid: false, error: "Token d'invitation invalide" };
    }

    const now = Date.now();

    if (invitation.status === "used") {
      return { success: true, valid: false, error: "Cette invitation a déjà été utilisée" };
    }
    if (invitation.status === "revoked") {
      return { success: true, valid: false, error: "Cette invitation a été révoquée" };
    }
    if (invitation.status === "expired" || invitation.expiresAt < now) {
      return { success: true, valid: false, error: "Cette invitation a expiré" };
    }

    return { success: true, valid: true };
  },
});

/**
 * Statistiques des invitations
 */
export const getInvitationStats = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await checkAdmin(ctx, args.token);
    if (!auth.success) {
      return { success: false, error: auth.error };
    }

    const now = Date.now();
    const invitations = await ctx.db.query("adminInvitations").collect();

    let pending = 0;
    let used = 0;
    let expired = 0;
    let revoked = 0;

    for (const inv of invitations) {
      if (inv.status === "pending" && inv.expiresAt < now) {
        // Marquer comme expiré
        expired++;
      } else if (inv.status === "pending") {
        pending++;
      } else if (inv.status === "used") {
        used++;
      } else if (inv.status === "expired") {
        expired++;
      } else if (inv.status === "revoked") {
        revoked++;
      }
    }

    return {
      success: true,
      stats: {
        pending,
        used,
        expired,
        revoked,
        total: invitations.length,
      },
    };
  },
});
