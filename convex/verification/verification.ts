import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";
import { Doc } from "../_generated/dataModel";

// Générer un code de vérification aléatoire (6 caractères alphanumériques)
function generateVerificationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sans I, O, 0, 1 pour éviter confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Récupérer ou créer une demande de vérification pour l'utilisateur connecté
export const getOrCreateVerificationRequest = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Valider la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide ou expirée");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new ConvexError("Utilisateur non trouvé");
    }

    // Vérifier que c'est un annonceur
    if (user.accountType !== "annonceur_pro" && user.accountType !== "annonceur_particulier") {
      throw new ConvexError("Seuls les annonceurs peuvent demander une vérification");
    }

    // Chercher une demande existante (pending ou submitted)
    const existingRequest = await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .order("desc")
      .first();

    // Si une demande approuvée existe, retourner
    if (existingRequest?.status === "approved") {
      return { request: existingRequest, isAlreadyVerified: true };
    }

    // Si une demande en cours existe (pending ou submitted), la retourner
    if (existingRequest && (existingRequest.status === "pending" || existingRequest.status === "submitted")) {
      return { request: existingRequest, isAlreadyVerified: false };
    }

    // Créer une nouvelle demande avec un code de vérification
    const now = Date.now();
    const verificationCode = generateVerificationCode();

    const requestId = await ctx.db.insert("verificationRequests", {
      userId: session.userId,
      verificationCode,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    const newRequest = await ctx.db.get(requestId);
    return { request: newRequest, isAlreadyVerified: false };
  },
});

// Récupérer le statut de vérification de l'utilisateur
export const getVerificationStatus = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Valider la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    // Récupérer le profil pour le statut de vérification
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .first();

    // Récupérer la dernière demande
    const latestRequest = await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .order("desc")
      .first();

    return {
      isIdentityVerified: profile?.isIdentityVerified || false,
      identityVerifiedAt: profile?.identityVerifiedAt,
      latestRequest: latestRequest ? {
        id: latestRequest._id,
        status: latestRequest.status,
        verificationCode: latestRequest.verificationCode,
        idCardFrontUrl: latestRequest.idCardFrontUrl,
        idCardBackUrl: latestRequest.idCardBackUrl,
        selfieWithCodeUrl: latestRequest.selfieWithCodeUrl,
        rejectionReason: latestRequest.rejectionReason,
        createdAt: latestRequest.createdAt,
        submittedAt: latestRequest.submittedAt,
      } : null,
    };
  },
});

// Mettre à jour les documents de la demande de vérification
export const updateVerificationDocuments = mutation({
  args: {
    sessionToken: v.string(),
    requestId: v.id("verificationRequests"),
    idCardFrontUrl: v.optional(v.string()),
    idCardBackUrl: v.optional(v.string()),
    selfieWithCodeUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Valider la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide ou expirée");
    }

    // Vérifier que la demande appartient à l'utilisateur
    const request = await ctx.db.get(args.requestId);
    if (!request || request.userId !== session.userId) {
      throw new ConvexError("Demande de vérification non trouvée");
    }

    // Vérifier que la demande est en cours
    if (request.status !== "pending" && request.status !== "rejected") {
      throw new ConvexError("Cette demande ne peut plus être modifiée");
    }

    // Mettre à jour les documents
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.idCardFrontUrl !== undefined) {
      updates.idCardFrontUrl = args.idCardFrontUrl;
    }
    if (args.idCardBackUrl !== undefined) {
      updates.idCardBackUrl = args.idCardBackUrl;
    }
    if (args.selfieWithCodeUrl !== undefined) {
      updates.selfieWithCodeUrl = args.selfieWithCodeUrl;
    }

    // Si rejeté, repasser en pending
    if (request.status === "rejected") {
      updates.status = "pending";
      updates.rejectionReason = undefined;
    }

    await ctx.db.patch(args.requestId, updates);

    return { success: true };
  },
});

// Soumettre la demande de vérification (tous les documents sont prêts)
// Déclenche automatiquement la vérification par IA
export const submitVerificationRequest = mutation({
  args: {
    sessionToken: v.string(),
    requestId: v.id("verificationRequests"),
  },
  handler: async (ctx, args) => {
    // Valider la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide ou expirée");
    }

    // Vérifier que la demande appartient à l'utilisateur
    const request = await ctx.db.get(args.requestId);
    if (!request || request.userId !== session.userId) {
      throw new ConvexError("Demande de vérification non trouvée");
    }

    // Vérifier que tous les documents sont présents
    if (!request.idCardFrontUrl || !request.idCardBackUrl || !request.selfieWithCodeUrl) {
      throw new ConvexError("Tous les documents doivent être fournis avant de soumettre");
    }

    // Vérifier que la demande est en cours
    if (request.status !== "pending") {
      throw new ConvexError("Cette demande a déjà été soumise");
    }

    // Mettre à jour le statut
    const now = Date.now();
    await ctx.db.patch(args.requestId, {
      status: "submitted",
      submittedAt: now,
      updatedAt: now,
    });

    // Planifier la vérification automatique par IA (dans 1 seconde pour laisser le temps au patch)
    await ctx.scheduler.runAfter(1000, internal.verification.autoVerify.autoVerifyIdentity, {
      requestId: args.requestId,
      idCardFrontUrl: request.idCardFrontUrl,
      idCardBackUrl: request.idCardBackUrl,
      selfieWithCodeUrl: request.selfieWithCodeUrl,
      expectedCode: request.verificationCode,
    });

    return { success: true, autoVerificationScheduled: true };
  },
});

// === ADMIN FUNCTIONS ===

// Liste des demandes de vérification pour l'admin
export const listVerificationRequests = query({
  args: {
    sessionToken: v.string(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("submitted"),
      v.literal("approved"),
      v.literal("rejected")
    )),
  },
  handler: async (ctx, args) => {
    // Valider la session admin
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

    // Récupérer les demandes
    let requests;
    if (args.status) {
      requests = await ctx.db
        .query("verificationRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      requests = await ctx.db
        .query("verificationRequests")
        .order("desc")
        .collect();
    }

    // Enrichir avec les infos utilisateur
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const requestUser = await ctx.db.get(request.userId) as Doc<"users"> | null;
        return {
          ...request,
          user: requestUser ? {
            id: requestUser._id,
            firstName: requestUser.firstName,
            lastName: requestUser.lastName,
            email: requestUser.email,
            accountType: requestUser.accountType,
          } : null,
        };
      })
    );

    return enrichedRequests;
  },
});

// Approuver une demande de vérification
export const approveVerification = mutation({
  args: {
    sessionToken: v.string(),
    requestId: v.id("verificationRequests"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Valider la session admin
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const adminUser = await ctx.db.get(session.userId);
    if (!adminUser || adminUser.role !== "admin") {
      throw new ConvexError("Accès non autorisé");
    }

    // Vérifier la demande
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError("Demande non trouvée");
    }

    if (request.status !== "submitted") {
      throw new ConvexError("Cette demande n'est pas en attente de validation");
    }

    const now = Date.now();

    // Mettre à jour la demande
    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedAt: now,
      reviewedBy: session.userId,
      adminNotes: args.adminNotes,
      updatedAt: now,
    });

    // Mettre à jour le profil de l'annonceur
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", request.userId))
      .first();

    if (profile) {
      await ctx.db.patch(profile._id, {
        isIdentityVerified: true,
        identityVerifiedAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Rejeter une demande de vérification
export const rejectVerification = mutation({
  args: {
    sessionToken: v.string(),
    requestId: v.id("verificationRequests"),
    rejectionReason: v.string(),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Valider la session admin
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const adminUser = await ctx.db.get(session.userId);
    if (!adminUser || adminUser.role !== "admin") {
      throw new ConvexError("Accès non autorisé");
    }

    // Vérifier la demande
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError("Demande non trouvée");
    }

    if (request.status !== "submitted") {
      throw new ConvexError("Cette demande n'est pas en attente de validation");
    }

    const now = Date.now();

    // Mettre à jour la demande
    await ctx.db.patch(args.requestId, {
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

// Récupérer les détails d'une demande (admin)
export const getVerificationRequestDetails = query({
  args: {
    sessionToken: v.string(),
    requestId: v.id("verificationRequests"),
  },
  handler: async (ctx, args) => {
    // Valider la session admin
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new ConvexError("Session invalide");
    }

    const adminUser = await ctx.db.get(session.userId);
    if (!adminUser || adminUser.role !== "admin") {
      throw new ConvexError("Accès non autorisé");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }

    const requestUser = await ctx.db.get(request.userId);
    const reviewer = request.reviewedBy ? await ctx.db.get(request.reviewedBy) : null;

    return {
      ...request,
      user: requestUser ? {
        id: requestUser._id,
        firstName: requestUser.firstName,
        lastName: requestUser.lastName,
        email: requestUser.email,
        phone: requestUser.phone,
        accountType: requestUser.accountType,
        createdAt: requestUser.createdAt,
      } : null,
      reviewer: reviewer ? {
        id: reviewer._id,
        firstName: reviewer.firstName,
        lastName: reviewer.lastName,
      } : null,
    };
  },
});

// Vérifier si l'annonceur a une demande en cours (pour la sidebar)
export const hasPendingVerificationRequest = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Valider la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return false;
    }

    // Chercher une demande soumise (en attente de validation)
    const pendingRequest = await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .filter((q) => q.eq(q.field("status"), "submitted"))
      .first();

    return !!pendingRequest;
  },
});

// Compter les demandes en attente de validation (pour le badge admin)
export const countPendingVerifications = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Valider la session admin
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

    // Compter les demandes soumises (en attente de validation)
    const pendingRequests = await ctx.db
      .query("verificationRequests")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();

    return pendingRequests.length;
  },
});
