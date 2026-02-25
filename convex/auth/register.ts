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
  generateUniqueSlug,
} from "./utils";
import { getEmailConfigFromDb } from "../api/emailInternal";

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

// Regex de validation username
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

// Arguments de base pour l'inscription
const baseRegistrationArgs = {
  email: v.string(),
  password: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  phone: v.string(),
  username: v.string(),
  phoneVerified: v.optional(v.boolean()),
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
    // Données entreprise (de l'API société.com)
    companyAddress: v.optional(v.string()),
    companyPostalCode: v.optional(v.string()),
    companyCity: v.optional(v.string()),
    activityCode: v.optional(v.string()),
    activityLabel: v.optional(v.string()),
    companyCreationDate: v.optional(v.string()),
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

    // Validation username
    const username = args.username.toLowerCase().trim();
    if (!USERNAME_REGEX.test(username)) {
      return { success: false, error: "Nom d'utilisateur invalide (3-30 caractères, lettres, chiffres, tirets et underscores)" };
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

    // Vérifier unicité username
    const existingUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (existingUsername) {
      return { success: false, error: "Ce nom d'utilisateur est déjà pris" };
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

    // Générer un slug unique (prenom seulement, ville sera ajoutée plus tard)
    const slug = await generateUniqueSlug(ctx.db, args.firstName.trim());

    // Créer l'utilisateur
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      slug,
      accountType: "annonceur_pro",
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      phone: args.phone.replace(/\s/g, ""),
      username,
      siret: args.siret,
      companyName: args.companyName.trim(),
      // Classification entreprise
      companyType: args.companyType || "unknown",
      isVatSubject: args.isVatSubject ?? false,
      legalForm: args.legalForm,
      // Données entreprise
      companyAddress: args.companyAddress,
      companyPostalCode: args.companyPostalCode,
      companyCity: args.companyCity,
      activityCode: args.activityCode,
      activityLabel: args.activityLabel,
      companyCreationDate: args.companyCreationDate,
      cguAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
      emailVerified: false,
      phoneVerified: args.phoneVerified ?? false,
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

    // Récupérer la config email depuis la DB
    const { emailConfig, appUrl } = await getEmailConfigFromDb(ctx.db);

    // Scheduler l'envoi d'email de vérification
    await ctx.scheduler.runAfter(0, internal.api.email.sendVerificationEmail, {
      userId,
      email: args.email.toLowerCase(),
      firstName: args.firstName.trim(),
      token: verificationToken,
      emailConfig,
      appUrl,
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

    // Validation username
    const username = args.username.toLowerCase().trim();
    if (!USERNAME_REGEX.test(username)) {
      return { success: false, error: "Nom d'utilisateur invalide (3-30 caractères, lettres, chiffres, tirets et underscores)" };
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

    // Vérifier unicité username
    const existingUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (existingUsername) {
      return { success: false, error: "Ce nom d'utilisateur est déjà pris" };
    }

    const now = Date.now();
    const passwordHash = await hashPassword(args.password);

    // Générer un slug unique (prenom seulement, ville sera ajoutée plus tard)
    const slug = await generateUniqueSlug(ctx.db, args.firstName.trim());

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      slug,
      accountType: "annonceur_particulier",
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      phone: args.phone.replace(/\s/g, ""),
      username,
      cguAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
      emailVerified: false,
      phoneVerified: args.phoneVerified ?? false,
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

    // Récupérer la config email depuis la DB
    const { emailConfig, appUrl } = await getEmailConfigFromDb(ctx.db);

    // Scheduler l'envoi d'email de vérification
    await ctx.scheduler.runAfter(0, internal.api.email.sendVerificationEmail, {
      userId,
      email: args.email.toLowerCase(),
      firstName: args.firstName.trim(),
      token: verificationToken,
      emailConfig,
      appUrl,
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

    // Validation username
    const username = args.username.toLowerCase().trim();
    if (!USERNAME_REGEX.test(username)) {
      return { success: false, error: "Nom d'utilisateur invalide (3-30 caractères, lettres, chiffres, tirets et underscores)" };
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

    // Vérifier unicité username
    const existingUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (existingUsername) {
      return { success: false, error: "Ce nom d'utilisateur est déjà pris" };
    }

    const now = Date.now();
    const passwordHash = await hashPassword(args.password);

    // Générer un slug unique (prenom seulement, ville sera ajoutée plus tard)
    const slug = await generateUniqueSlug(ctx.db, args.firstName.trim());

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      slug,
      accountType: "utilisateur",
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      phone: args.phone.replace(/\s/g, ""),
      username,
      cguAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
      emailVerified: false,
      phoneVerified: args.phoneVerified ?? false,
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

    // Récupérer la config email depuis la DB
    const { emailConfig, appUrl } = await getEmailConfigFromDb(ctx.db);

    // Scheduler l'envoi d'email de vérification
    await ctx.scheduler.runAfter(0, internal.api.email.sendVerificationEmail, {
      userId,
      email: args.email.toLowerCase(),
      firstName: args.firstName.trim(),
      token: verificationToken,
      emailConfig,
      appUrl,
    });

    return {
      success: true,
      token,
      userId,
      accountType: "utilisateur",
    };
  },
});
