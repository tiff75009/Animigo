import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import {
  hashPassword,
  generateSessionToken,
  validateEmail,
  validatePhone,
  validatePassword,
  validateSiret,
} from "./utils";

// Arguments de base pour l'inscription
const baseRegistrationArgs = {
  email: v.string(),
  password: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  phone: v.string(),
  acceptCgu: v.boolean(),
};

// Inscription Annonceur PRO
export const registerPro = mutation({
  args: {
    ...baseRegistrationArgs,
    siret: v.string(),
    companyName: v.string(),
    // Classification entreprise (optionnel, venant de société.com)
    companyType: v.optional(v.union(
      v.literal("micro_enterprise"),
      v.literal("regular_company"),
      v.literal("unknown")
    )),
    isVatSubject: v.optional(v.boolean()),
    legalForm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validations
    if (!validateEmail(args.email)) {
      throw new ConvexError("Adresse email invalide");
    }

    const passwordValidation = validatePassword(args.password);
    if (!passwordValidation.valid) {
      throw new ConvexError(passwordValidation.errors.join(". "));
    }

    if (!validatePhone(args.phone)) {
      throw new ConvexError("Numéro de téléphone invalide");
    }

    if (!validateSiret(args.siret)) {
      throw new ConvexError("Numéro SIRET invalide");
    }

    if (!args.acceptCgu) {
      throw new ConvexError("Vous devez accepter les CGU");
    }

    // Vérifier unicité email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      throw new ConvexError("Un compte existe déjà avec cet email");
    }

    // Vérifier unicité SIRET
    const existingSiret = await ctx.db
      .query("users")
      .withIndex("by_siret", (q) => q.eq("siret", args.siret))
      .first();

    if (existingSiret) {
      throw new ConvexError("Ce numéro SIRET est déjà utilisé");
    }

    const now = Date.now();
    const passwordHash = await hashPassword(args.password);

    // Créer l'utilisateur
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      accountType: "annonceur_pro",
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      phone: args.phone.replace(/\s/g, ""),
      siret: args.siret,
      companyName: args.companyName.trim(),
      // Classification entreprise
      companyType: args.companyType || "unknown",
      isVatSubject: args.isVatSubject ?? false,
      legalForm: args.legalForm,
      cguAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
      emailVerified: false,
      isActive: true,
    });

    // Créer une session
    const token = generateSessionToken();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 jours

    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt,
      createdAt: now,
    });

    return {
      success: true,
      token,
      userId,
      accountType: "annonceur_pro" as const,
    };
  },
});

// Inscription Annonceur Particulier
export const registerParticulier = mutation({
  args: baseRegistrationArgs,
  handler: async (ctx, args) => {
    // Validations
    if (!validateEmail(args.email)) {
      throw new ConvexError("Adresse email invalide");
    }

    const passwordValidation = validatePassword(args.password);
    if (!passwordValidation.valid) {
      throw new ConvexError(passwordValidation.errors.join(". "));
    }

    if (!validatePhone(args.phone)) {
      throw new ConvexError("Numéro de téléphone invalide");
    }

    if (!args.acceptCgu) {
      throw new ConvexError("Vous devez accepter les CGU");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      throw new ConvexError("Un compte existe déjà avec cet email");
    }

    const now = Date.now();
    const passwordHash = await hashPassword(args.password);

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      accountType: "annonceur_particulier",
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      phone: args.phone.replace(/\s/g, ""),
      cguAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
      emailVerified: false,
      isActive: true,
    });

    const token = generateSessionToken();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt,
      createdAt: now,
    });

    return {
      success: true,
      token,
      userId,
      accountType: "annonceur_particulier" as const,
    };
  },
});

// Inscription Utilisateur (propriétaire d'animaux)
export const registerUtilisateur = mutation({
  args: baseRegistrationArgs,
  handler: async (ctx, args) => {
    if (!validateEmail(args.email)) {
      throw new ConvexError("Adresse email invalide");
    }

    const passwordValidation = validatePassword(args.password);
    if (!passwordValidation.valid) {
      throw new ConvexError(passwordValidation.errors.join(". "));
    }

    if (!validatePhone(args.phone)) {
      throw new ConvexError("Numéro de téléphone invalide");
    }

    if (!args.acceptCgu) {
      throw new ConvexError("Vous devez accepter les CGU");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      throw new ConvexError("Un compte existe déjà avec cet email");
    }

    const now = Date.now();
    const passwordHash = await hashPassword(args.password);

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      accountType: "utilisateur",
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      phone: args.phone.replace(/\s/g, ""),
      cguAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
      emailVerified: false,
      isActive: true,
    });

    const token = generateSessionToken();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt,
      createdAt: now,
    });

    return {
      success: true,
      token,
      userId,
      accountType: "utilisateur" as const,
    };
  },
});
