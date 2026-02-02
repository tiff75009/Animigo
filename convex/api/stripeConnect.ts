// @ts-nocheck
"use node";

import { internalAction, action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import Stripe from "stripe";
import { ConvexError } from "convex/values";

/**
 * Stripe Connect Custom - Gestion des comptes annonceurs
 *
 * Avec Stripe Connect Custom, la plateforme collecte les infos et crée le compte.
 * L'annonceur fournit uniquement : Nom, Prénom, Date de naissance, Adresse, IBAN
 * Pas besoin de créer un compte Stripe côté annonceur.
 */

// ============================================
// ACTIONS (appels API Stripe)
// ============================================

/**
 * Créer un compte Stripe Connect Custom pour un annonceur
 */
export const createCustomAccount = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.object({
      day: v.number(),
      month: v.number(),
      year: v.number(),
    }),
    address: v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      city: v.string(),
      postalCode: v.string(),
      country: v.string(), // "FR"
    }),
    phone: v.optional(v.string()),
    ipAddress: v.string(), // IP du client pour TOS acceptance
    stripeSecretKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== createCustomAccount START ===");
    console.log("User:", args.userId);

    // Vérifier que la clé Stripe semble valide (commence par sk_)
    if (!args.stripeSecretKey || !args.stripeSecretKey.startsWith("sk_")) {
      console.error("Clé Stripe invalide - doit commencer par sk_");
      throw new Error("Clé Stripe invalide. Vérifiez la configuration dans le panel admin.");
    }

    try {
      const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

      // Créer le compte Custom
      const account = await stripe.accounts.create({
        type: "custom",
        country: args.address.country,
        email: args.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        individual: {
          first_name: args.firstName,
          last_name: args.lastName,
          email: args.email,
          phone: args.phone,
          dob: {
            day: args.dateOfBirth.day,
            month: args.dateOfBirth.month,
            year: args.dateOfBirth.year,
          },
          address: {
            line1: args.address.line1,
            line2: args.address.line2,
            city: args.address.city,
            postal_code: args.address.postalCode,
            country: args.address.country,
          },
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: args.ipAddress,
        },
        settings: {
          payouts: {
            schedule: {
              interval: "manual", // On gère les payouts nous-mêmes
            },
          },
        },
      });

      console.log("Compte Custom créé:", account.id);

      // Sauvegarder dans Convex
      await ctx.runMutation(internal.api.stripeConnectQueries.saveAccountToUser, {
        userId: args.userId,
        stripeAccountId: account.id,
        status: "pending",
      });

      return {
        success: true,
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      };
    } catch (error) {
      console.error("Erreur création compte Custom:", error);
      throw error;
    }
  },
});

/**
 * Ajouter un compte bancaire (IBAN) à un compte Custom
 */
export const addBankAccount = internalAction({
  args: {
    userId: v.id("users"),
    stripeAccountId: v.string(),
    iban: v.string(),
    accountHolderName: v.string(),
    stripeSecretKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== addBankAccount START ===");
    console.log("Account:", args.stripeAccountId);

    try {
      const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

      // Déterminer le pays depuis l'IBAN (2 premières lettres)
      const country = args.iban.substring(0, 2).toUpperCase();

      // Ajouter le compte bancaire
      const bankAccount = await stripe.accounts.createExternalAccount(
        args.stripeAccountId,
        {
          external_account: {
            object: "bank_account",
            country: country,
            currency: "eur",
            account_holder_name: args.accountHolderName,
            account_holder_type: "individual",
            account_number: args.iban, // IBAN complet
          },
        }
      );

      console.log("Compte bancaire ajouté:", bankAccount.id);

      // Masquer l'IBAN pour le stockage (garder uniquement les 4 derniers)
      const ibanLast4 = args.iban.slice(-4);
      const ibanMasked = args.iban.substring(0, 4) + "****" + ibanLast4;

      // Sauvegarder l'IBAN masqué
      await ctx.runMutation(internal.api.stripeConnectQueries.saveIbanToUser, {
        userId: args.userId,
        iban: ibanMasked,
        ibanLast4: ibanLast4,
      });

      return {
        success: true,
        bankAccountId: bankAccount.id,
        last4: ibanLast4,
      };
    } catch (error) {
      console.error("Erreur ajout compte bancaire:", error);
      throw error;
    }
  },
});

/**
 * Vérifier le statut d'un compte Custom
 */
export const checkAccountStatus = internalAction({
  args: {
    stripeAccountId: v.string(),
    stripeSecretKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== checkAccountStatus START ===");

    try {
      const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

      const account = await stripe.accounts.retrieve(args.stripeAccountId);

      // Déterminer le statut
      let status: "pending" | "verified" | "restricted" | "disabled" = "pending";

      if (account.charges_enabled && account.payouts_enabled) {
        status = "verified";
      } else if (account.requirements?.disabled_reason) {
        status = "disabled";
      } else if (account.requirements?.currently_due?.length) {
        status = "restricted";
      }

      return {
        success: true,
        status,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirementsDue: account.requirements?.currently_due || [],
        disabledReason: account.requirements?.disabled_reason,
      };
    } catch (error) {
      console.error("Erreur vérification compte:", error);
      throw error;
    }
  },
});

/**
 * Créer un transfert vers le compte d'un annonceur
 */
export const createTransfer = internalAction({
  args: {
    stripeAccountId: v.string(),
    amount: v.number(), // en centimes
    missionId: v.id("missions"),
    description: v.optional(v.string()),
    stripeSecretKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== createTransfer START ===");
    console.log("Amount:", args.amount, "to", args.stripeAccountId);

    try {
      const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

      const transfer = await stripe.transfers.create({
        amount: args.amount,
        currency: "eur",
        destination: args.stripeAccountId,
        description: args.description || `Virement mission ${args.missionId}`,
        metadata: {
          missionId: args.missionId,
        },
      });

      console.log("Transfert créé:", transfer.id);

      return {
        success: true,
        transferId: transfer.id,
        amount: transfer.amount,
      };
    } catch (error) {
      console.error("Erreur création transfert:", error);
      throw error;
    }
  },
});

/**
 * Créer un payout instantané vers le compte bancaire de l'annonceur
 */
export const createInstantPayout = internalAction({
  args: {
    stripeAccountId: v.string(),
    amount: v.number(), // en centimes (après déduction des frais)
    stripeSecretKey: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== createInstantPayout START ===");

    try {
      const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

      // Créer un payout sur le compte connecté
      const payout = await stripe.payouts.create(
        {
          amount: args.amount,
          currency: "eur",
          method: "instant", // Payout instantané
        },
        {
          stripeAccount: args.stripeAccountId, // Sur le compte de l'annonceur
        }
      );

      console.log("Payout instantané créé:", payout.id);

      return {
        success: true,
        payoutId: payout.id,
        amount: payout.amount,
        arrivalDate: payout.arrival_date,
      };
    } catch (error) {
      console.error("Erreur payout instantané:", error);
      throw error;
    }
  },
});

// NOTE: Les mutations (saveAccountToUser, saveIbanToUser, updatePayoutMode, updateAccountStatus)
// sont dans stripeConnectQueries.ts car ce fichier utilise "use node"

// ============================================
// ACTIONS PUBLIQUES (appelées depuis le frontend)
// ============================================

// NOTE: setupBankAccountMutation est dans stripeConnectQueries.ts car ce fichier utilise "use node"

/**
 * Action interne pour configurer le compte bancaire avec Account Token
 * Pour les plateformes FR, Stripe exige l'utilisation d'account tokens
 * Le token est créé côté frontend avec Stripe.js
 */
export const setupBankAccountAction = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    stripeAccountId: v.union(v.string(), v.null()),
    stripeSecretKey: v.string(),
    accountToken: v.string(), // Token créé côté frontend avec Stripe.js
    bankAccountToken: v.string(), // Token pour le compte bancaire
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("=== setupBankAccountAction START ===");
    console.log("User:", args.userId);

    try {
      const stripe = new Stripe(args.stripeSecretKey, { apiVersion: "2024-12-18.acacia" });

      let accountId = args.stripeAccountId;

      // Si pas de compte Stripe, en créer un avec le token
      if (!accountId) {
        console.log("Création du compte Custom avec account token...");
        const account = await stripe.accounts.create({
          type: "custom",
          country: "FR",
          email: args.email,
          account_token: args.accountToken,
          capabilities: {
            transfers: { requested: true },
          },
          settings: {
            payouts: {
              schedule: {
                interval: "manual",
              },
            },
          },
        });

        console.log("Compte Custom créé:", account.id);
        accountId = account.id;

        // Sauvegarder dans Convex
        await ctx.runMutation(internal.api.stripeConnectQueries.saveAccountToUser, {
          userId: args.userId,
          stripeAccountId: account.id,
          status: "pending",
        });
      }

      // Ajouter le compte bancaire avec le token
      console.log("Ajout du compte bancaire avec token...");
      const bankAccount = await stripe.accounts.createExternalAccount(
        accountId,
        {
          external_account: args.bankAccountToken,
        }
      );

      console.log("Compte bancaire ajouté:", bankAccount.id);

      // Extraire les 4 derniers chiffres du compte bancaire
      const last4 = (bankAccount as any).last4 || "****";
      const ibanMasked = `****${last4}`;

      await ctx.runMutation(internal.api.stripeConnectQueries.saveIbanToUser, {
        userId: args.userId,
        iban: ibanMasked,
        ibanLast4: last4,
      });

      // Vérifier le statut du compte
      const account = await stripe.accounts.retrieve(accountId);
      let status: "pending" | "verified" | "restricted" | "disabled" = "pending";

      if (account.charges_enabled && account.payouts_enabled) {
        status = "verified";
      } else if (account.requirements?.disabled_reason) {
        status = "disabled";
      } else if (account.requirements?.currently_due?.length) {
        status = "restricted";
      }

      await ctx.runMutation(internal.api.stripeConnectQueries.updateAccountStatus, {
        stripeAccountId: accountId,
        status: status,
        chargesEnabled: account.charges_enabled ?? false,
        payoutsEnabled: account.payouts_enabled ?? false,
      });

      console.log("=== setupBankAccountAction SUCCESS ===");
      return { success: true };

    } catch (error: any) {
      console.error("Erreur setupBankAccountAction:", error);
      throw error;
    }
  },
});

// NOTE: setupBankAccount est maintenant une mutation dans stripeConnectQueries.ts
// Elle planifie setupBankAccountAction en arrière-plan

// NOTE: Les queries (getAnnouncerStripeInfo, validateAnnouncerSession)
// sont dans stripeConnectQueries.ts car ce fichier utilise "use node"
