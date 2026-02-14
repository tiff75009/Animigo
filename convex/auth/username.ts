// @ts-nocheck
import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Regex de validation username : 3-30 caractères, lettres, chiffres, underscores, tirets
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: "Le nom d'utilisateur est requis" };
  }
  if (username.length < 3) {
    return { valid: false, error: "Le nom d'utilisateur doit contenir au moins 3 caractères" };
  }
  if (username.length > 30) {
    return { valid: false, error: "Le nom d'utilisateur ne peut pas dépasser 30 caractères" };
  }
  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, error: "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores" };
  }
  return { valid: true };
}

// Vérifier la disponibilité d'un username (query publique)
export const checkUsernameAvailability = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const username = args.username.toLowerCase().trim();

    // Valider le format
    const validation = validateUsername(username);
    if (!validation.valid) {
      return { available: false, error: validation.error };
    }

    // Chercher si le username existe déjà
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (existing) {
      // Générer une suggestion
      const suggestion = `${username}${Math.floor(Math.random() * 999) + 1}`;
      return { available: false, suggestion };
    }

    return { available: true };
  },
});

// Mettre à jour les informations utilisateur (username, firstName, lastName, phone)
export const updateUserInfo = mutation({
  args: {
    sessionToken: v.string(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
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

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    // Valider et mettre à jour le username si fourni
    if (args.username !== undefined) {
      const username = args.username.toLowerCase().trim();
      const validation = validateUsername(username);
      if (!validation.valid) {
        throw new ConvexError(validation.error!);
      }

      // Vérifier unicité (sauf si c'est le même)
      if (username !== user.username) {
        const existing = await ctx.db
          .query("users")
          .withIndex("by_username", (q) => q.eq("username", username))
          .first();

        if (existing) {
          throw new ConvexError("Ce nom d'utilisateur est déjà pris");
        }
      }

      updates.username = username;
    }

    if (args.firstName !== undefined) {
      updates.firstName = args.firstName.trim();
    }

    if (args.lastName !== undefined) {
      updates.lastName = args.lastName.trim();
    }

    if (args.phone !== undefined) {
      updates.phone = args.phone.replace(/\s/g, "");
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

// Mettre à jour les informations entreprise (champs autorisés par la config admin)
export const updateCompanyInfo = mutation({
  args: {
    sessionToken: v.string(),
    capital: v.optional(v.number()),
    companyName: v.optional(v.string()),
    companyAddress: v.optional(v.string()),
    companyPostalCode: v.optional(v.string()),
    companyCity: v.optional(v.string()),
    activityCode: v.optional(v.string()),
    activityLabel: v.optional(v.string()),
    companyCreationDate: v.optional(v.string()),
    legalForm: v.optional(v.string()),
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

    // Vérifier que c'est un annonceur pro
    if (user.accountType !== "annonceur_pro") {
      throw new ConvexError("Seuls les annonceurs professionnels peuvent modifier ces informations");
    }

    // Lire la config des champs éditables
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "company_editable_fields"))
      .first();

    const defaults: Record<string, boolean> = {
      companyName: false, companyAddress: false, companyPostalCode: false,
      companyCity: false, activityCode: false, activityLabel: false,
      companyCreationDate: false, capital: true, legalForm: false,
    };

    let editableFields = defaults;
    if (config?.value) {
      try {
        editableFields = { ...defaults, ...JSON.parse(config.value) };
      } catch {
        // Garder les defaults
      }
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    // N'appliquer que les champs autorisés (ignorer silencieusement les non-autorisés)
    if (args.capital !== undefined && editableFields.capital) {
      updates.capital = args.capital;
    }
    if (args.companyName !== undefined && editableFields.companyName) {
      updates.companyName = args.companyName.trim();
    }
    if (args.companyAddress !== undefined && editableFields.companyAddress) {
      updates.companyAddress = args.companyAddress.trim();
    }
    if (args.companyPostalCode !== undefined && editableFields.companyPostalCode) {
      updates.companyPostalCode = args.companyPostalCode.trim();
    }
    if (args.companyCity !== undefined && editableFields.companyCity) {
      updates.companyCity = args.companyCity.trim();
    }
    if (args.activityCode !== undefined && editableFields.activityCode) {
      updates.activityCode = args.activityCode.trim();
    }
    if (args.activityLabel !== undefined && editableFields.activityLabel) {
      updates.activityLabel = args.activityLabel.trim();
    }
    if (args.companyCreationDate !== undefined && editableFields.companyCreationDate) {
      updates.companyCreationDate = args.companyCreationDate.trim();
    }
    if (args.legalForm !== undefined && editableFields.legalForm) {
      updates.legalForm = args.legalForm.trim();
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

// Re-synchroniser les données entreprise depuis l'API société.com
// Bypass la config editable fields : ce sont des données officielles
export const syncCompanyFromSiret = mutation({
  args: {
    sessionToken: v.string(),
    companyName: v.optional(v.string()),
    companyAddress: v.optional(v.string()),
    companyPostalCode: v.optional(v.string()),
    companyCity: v.optional(v.string()),
    activityCode: v.optional(v.string()),
    activityLabel: v.optional(v.string()),
    companyCreationDate: v.optional(v.string()),
    legalForm: v.optional(v.string()),
    companyType: v.optional(v.union(
      v.literal("micro_enterprise"),
      v.literal("regular_company"),
      v.literal("unknown"),
    )),
    isVatSubject: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
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

    if (user.accountType !== "annonceur_pro") {
      throw new ConvexError("Seuls les annonceurs professionnels peuvent synchroniser ces informations");
    }

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    // Écrire tous les champs retournés par l'API (données officielles)
    if (args.companyName) updates.companyName = args.companyName;
    if (args.companyAddress) updates.companyAddress = args.companyAddress;
    if (args.companyPostalCode) updates.companyPostalCode = args.companyPostalCode;
    if (args.companyCity) updates.companyCity = args.companyCity;
    if (args.activityCode) updates.activityCode = args.activityCode;
    if (args.activityLabel) updates.activityLabel = args.activityLabel;
    if (args.companyCreationDate) updates.companyCreationDate = args.companyCreationDate;
    if (args.legalForm) updates.legalForm = args.legalForm;
    if (args.companyType) updates.companyType = args.companyType;
    if (args.isVatSubject !== undefined) updates.isVatSubject = args.isVatSubject;

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});
