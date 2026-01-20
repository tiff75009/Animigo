// @ts-nocheck
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
  hashPassword,
  generateSessionToken,
  validateEmail,
  validatePhone,
  validatePassword,
  validateSiret,
} from "./utils";

// Types pour les réponses standardisées
export type RegisterResult =
  | {
      success: true;
      token: string;
      userId: string;
      accountType: "annonceur_pro" | "annonceur_particulier" | "utilisateur";
    }
  | {
      success: false;
      error: string;
    };

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
  handler: async (ctx, args): Promise<RegisterResult> => {
    // Validations
    if (!validateEmail(args.email)) {
      return { success: false, error: "Adresse email invalide" };
    }

    const passwordValidation = validatePassword(args.password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors.join(". ") };
    }

    if (!validatePhone(args.phone)) {
      return { success: false, error: "Numéro de téléphone invalide" };
    }

    if (!validateSiret(args.siret)) {
      return { success: false, error: "Numéro SIRET invalide" };
    }

    if (!args.acceptCgu) {
      return { success: false, error: "Vous devez accepter les CGU" };
    }

    // Vérifier unicité email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      return { success: false, error: "Un compte existe déjà avec cet email" };
    }

    // Vérifier unicité SIRET
    const existingSiret = await ctx.db
      .query("users")
      .withIndex("by_siret", (q) => q.eq("siret", args.siret))
      .first();

    if (existingSiret) {
      return { success: false, error: "Ce numéro SIRET est déjà utilisé" };
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

    // Créer le token de vérification et programmer l'envoi d'email
    const verificationTokenBytes = new Uint8Array(32);
    crypto.getRandomValues(verificationTokenBytes);
    const verificationToken = Array.from(verificationTokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await ctx.db.insert("emailVerificationTokens", {
      userId,
      token: verificationToken,
      email: args.email.toLowerCase(),
      expiresAt: now + 24 * 60 * 60 * 1000, // 24h
      createdAt: now,
    });

    // Scheduler l'envoi d'email de vérification
    await ctx.scheduler.runAfter(0, internal.api.email.sendVerificationEmail, {
      userId,
      email: args.email.toLowerCase(),
      firstName: args.firstName.trim(),
      token: verificationToken,
    });

    return {
      success: true,
      token,
      userId,
      accountType: "annonceur_pro",
    };
  },
});

// Inscription Annonceur Particulier
export const registerParticulier = mutation({
  args: baseRegistrationArgs,
  handler: async (ctx, args): Promise<RegisterResult> => {
    // Validations
    if (!validateEmail(args.email)) {
      return { success: false, error: "Adresse email invalide" };
    }

    const passwordValidation = validatePassword(args.password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors.join(". ") };
    }

    if (!validatePhone(args.phone)) {
      return { success: false, error: "Numéro de téléphone invalide" };
    }

    if (!args.acceptCgu) {
      return { success: false, error: "Vous devez accepter les CGU" };
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      return { success: false, error: "Un compte existe déjà avec cet email" };
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

    // Créer le token de vérification et programmer l'envoi d'email
    const verificationTokenBytes = new Uint8Array(32);
    crypto.getRandomValues(verificationTokenBytes);
    const verificationToken = Array.from(verificationTokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await ctx.db.insert("emailVerificationTokens", {
      userId,
      token: verificationToken,
      email: args.email.toLowerCase(),
      expiresAt: now + 24 * 60 * 60 * 1000, // 24h
      createdAt: now,
    });

    // Scheduler l'envoi d'email de vérification
    await ctx.scheduler.runAfter(0, internal.api.email.sendVerificationEmail, {
      userId,
      email: args.email.toLowerCase(),
      firstName: args.firstName.trim(),
      token: verificationToken,
    });

    return {
      success: true,
      token,
      userId,
      accountType: "annonceur_particulier",
    };
  },
});

// Inscription Utilisateur (propriétaire d'animaux)
export const registerUtilisateur = mutation({
  args: baseRegistrationArgs,
  handler: async (ctx, args): Promise<RegisterResult> => {
    if (!validateEmail(args.email)) {
      return { success: false, error: "Adresse email invalide" };
    }

    const passwordValidation = validatePassword(args.password);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors.join(". ") };
    }

    if (!validatePhone(args.phone)) {
      return { success: false, error: "Numéro de téléphone invalide" };
    }

    if (!args.acceptCgu) {
      return { success: false, error: "Vous devez accepter les CGU" };
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingUser) {
      return { success: false, error: "Un compte existe déjà avec cet email" };
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

    // Créer le token de vérification et programmer l'envoi d'email
    const verificationTokenBytes = new Uint8Array(32);
    crypto.getRandomValues(verificationTokenBytes);
    const verificationToken = Array.from(verificationTokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await ctx.db.insert("emailVerificationTokens", {
      userId,
      token: verificationToken,
      email: args.email.toLowerCase(),
      expiresAt: now + 24 * 60 * 60 * 1000, // 24h
      createdAt: now,
    });

    // Scheduler l'envoi d'email de vérification
    await ctx.scheduler.runAfter(0, internal.api.email.sendVerificationEmail, {
      userId,
      email: args.email.toLowerCase(),
      firstName: args.firstName.trim(),
      token: verificationToken,
    });

    return {
      success: true,
      token,
      userId,
      accountType: "utilisateur",
    };
  },
});
