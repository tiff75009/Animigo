// @ts-nocheck
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { ConvexError } from "convex/values";
import { Doc } from "../_generated/dataModel";

// ============================================
// HELPERS
// ============================================

async function validateSession(ctx: any, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session invalide ou expirée");
  }

  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) {
    throw new ConvexError("Utilisateur non trouvé ou inactif");
  }

  return { session, user };
}

async function validateAdminSession(ctx: any, token: string) {
  const { session, user } = await validateSession(ctx, token);
  if (user.role !== "admin") {
    throw new ConvexError("Accès non autorisé");
  }
  return { session, user };
}

// ============================================
// QUERIES
// ============================================

// Récupérer la déclaration SAP de l'annonceur connecté
export const getSapDeclaration = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const declaration = await ctx.db
      .query("sapDeclarations")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .order("desc")
      .first();

    return declaration;
  },
});

// Admin : liste des déclarations SAP
export const listSapDeclarations = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("submitted"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("revoked")
    )),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      throw new ConvexError("Accès non autorisé");
    }

    let declarations;
    if (args.status) {
      declarations = await ctx.db
        .query("sapDeclarations")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      declarations = await ctx.db
        .query("sapDeclarations")
        .order("desc")
        .collect();
    }

    // Enrichir avec les infos utilisateur
    const enriched = await Promise.all(
      declarations.map(async (decl) => {
        const declUser = await ctx.db.get(decl.userId) as Doc<"users"> | null;
        return {
          ...decl,
          user: declUser ? {
            id: declUser._id,
            firstName: declUser.firstName,
            lastName: declUser.lastName,
            email: declUser.email,
            accountType: declUser.accountType,
            companyName: declUser.companyName,
            siret: declUser.siret,
          } : null,
        };
      })
    );

    return enriched;
  },
});

// Admin : compter les déclarations SAP en attente (pour badge sidebar)
export const countPendingSapDeclarations = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return 0;
    }

    const user = await ctx.db.get(session.userId);
    if (!user || user.role !== "admin") {
      return 0;
    }

    const pending = await ctx.db
      .query("sapDeclarations")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();

    return pending.length;
  },
});

// ============================================
// MUTATIONS
// ============================================

// Créer ou retourner la déclaration SAP en cours
export const getOrCreateSapDeclaration = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const { session, user } = await validateSession(ctx, args.sessionToken);

    // Vérifier que c'est un annonceur
    if (user.accountType !== "annonceur_pro" && user.accountType !== "annonceur_particulier") {
      throw new ConvexError("Seuls les annonceurs peuvent déclarer le statut SAP");
    }

    // Chercher une déclaration existante
    const existing = await ctx.db
      .query("sapDeclarations")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .order("desc")
      .first();

    // Si approuvée, retourner
    if (existing?.status === "approved") {
      return { declaration: existing, isAlreadyApproved: true };
    }

    // Si en cours (pending ou submitted), retourner
    if (existing && (existing.status === "pending" || existing.status === "submitted")) {
      return { declaration: existing, isAlreadyApproved: false };
    }

    // Créer une nouvelle déclaration
    const now = Date.now();
    const id = await ctx.db.insert("sapDeclarations", {
      userId: session.userId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    const newDecl = await ctx.db.get(id);
    return { declaration: newDecl, isAlreadyApproved: false };
  },
});

// Mettre à jour les documents de la déclaration SAP
export const updateSapDocuments = mutation({
  args: {
    sessionToken: v.string(),
    declarationId: v.id("sapDeclarations"),
    sapDeclarationNumber: v.optional(v.string()),
    sapReceiptUrl: v.optional(v.string()),
    exclusivityAttested: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { session } = await validateSession(ctx, args.sessionToken);

    const declaration = await ctx.db.get(args.declarationId);
    if (!declaration || declaration.userId !== session.userId) {
      throw new ConvexError("Déclaration SAP non trouvée");
    }

    if (declaration.status !== "pending" && declaration.status !== "rejected" && declaration.status !== "revoked") {
      throw new ConvexError("Cette déclaration ne peut plus être modifiée");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.sapDeclarationNumber !== undefined) {
      updates.sapDeclarationNumber = args.sapDeclarationNumber;
    }
    if (args.sapReceiptUrl !== undefined) {
      updates.sapReceiptUrl = args.sapReceiptUrl;
    }
    if (args.exclusivityAttested !== undefined) {
      updates.exclusivityAttested = args.exclusivityAttested;
    }

    // Si rejeté ou révoqué, repasser en pending
    if (declaration.status === "rejected" || declaration.status === "revoked") {
      updates.status = "pending";
      updates.rejectionReason = undefined;
    }

    await ctx.db.patch(args.declarationId, updates);
    return { success: true };
  },
});

// Soumettre la déclaration SAP pour review admin
export const submitSapDeclaration = mutation({
  args: {
    sessionToken: v.string(),
    declarationId: v.id("sapDeclarations"),
  },
  handler: async (ctx, args) => {
    const { session } = await validateSession(ctx, args.sessionToken);

    const declaration = await ctx.db.get(args.declarationId);
    if (!declaration || declaration.userId !== session.userId) {
      throw new ConvexError("Déclaration SAP non trouvée");
    }

    // Vérifier que tous les champs sont remplis
    if (!declaration.sapDeclarationNumber) {
      throw new ConvexError("Le numéro de déclaration SAP est requis");
    }
    if (!declaration.sapReceiptUrl) {
      throw new ConvexError("Le récépissé de déclaration est requis");
    }
    if (!declaration.exclusivityAttested) {
      throw new ConvexError("L'attestation d'exercice exclusif SAP est requise");
    }

    if (declaration.status !== "pending") {
      throw new ConvexError("Cette déclaration a déjà été soumise");
    }

    const now = Date.now();
    await ctx.db.patch(args.declarationId, {
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Admin : approuver une déclaration SAP
export const approveSapDeclaration = mutation({
  args: {
    sessionToken: v.string(),
    declarationId: v.id("sapDeclarations"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { session } = await validateAdminSession(ctx, args.sessionToken);

    const declaration = await ctx.db.get(args.declarationId);
    if (!declaration) {
      throw new ConvexError("Déclaration non trouvée");
    }

    if (declaration.status !== "submitted") {
      throw new ConvexError("Cette déclaration n'est pas en attente de validation");
    }

    const now = Date.now();

    // Mettre à jour la déclaration
    await ctx.db.patch(args.declarationId, {
      status: "approved",
      reviewedAt: now,
      reviewedBy: session.userId,
      adminNotes: args.adminNotes,
      updatedAt: now,
    });

    // Mettre à jour le profil annonceur
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", declaration.userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        isSapApproved: true,
        sapApprovedAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Admin : rejeter une déclaration SAP
export const rejectSapDeclaration = mutation({
  args: {
    sessionToken: v.string(),
    declarationId: v.id("sapDeclarations"),
    rejectionReason: v.string(),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { session } = await validateAdminSession(ctx, args.sessionToken);

    const declaration = await ctx.db.get(args.declarationId);
    if (!declaration) {
      throw new ConvexError("Déclaration non trouvée");
    }

    if (declaration.status !== "submitted") {
      throw new ConvexError("Cette déclaration n'est pas en attente de validation");
    }

    const now = Date.now();
    await ctx.db.patch(args.declarationId, {
      status: "rejected",
      reviewedAt: now,
      reviewedBy: session.userId,
      rejectionReason: args.rejectionReason,
      adminNotes: args.adminNotes,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Admin : révoquer une déclaration SAP approuvée
export const revokeSapDeclaration = mutation({
  args: {
    sessionToken: v.string(),
    declarationId: v.id("sapDeclarations"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { session } = await validateAdminSession(ctx, args.sessionToken);

    const declaration = await ctx.db.get(args.declarationId);
    if (!declaration) {
      throw new ConvexError("Déclaration non trouvée");
    }

    if (declaration.status !== "approved") {
      throw new ConvexError("Seules les déclarations approuvées peuvent être révoquées");
    }

    const now = Date.now();

    // Révoquer la déclaration
    await ctx.db.patch(args.declarationId, {
      status: "revoked",
      reviewedAt: now,
      reviewedBy: session.userId,
      rejectionReason: args.reason,
      updatedAt: now,
    });

    // Retirer le statut SAP du profil
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", declaration.userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        isSapApproved: false,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
