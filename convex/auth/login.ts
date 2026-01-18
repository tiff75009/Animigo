import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { verifyPassword, generateSessionToken } from "./utils";

// Types pour les réponses standardisées
export type LoginResult =
  | {
      success: true;
      token: string;
      user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        accountType: string;
        role: string;
      };
      redirectPath: string;
    }
  | {
      success: false;
      error: string;
    };

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<LoginResult> => {
    // Rechercher l'utilisateur
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      return { success: false, error: "Email ou mot de passe incorrect" };
    }

    if (!user.isActive) {
      return { success: false, error: "Ce compte a été désactivé" };
    }

    // Vérifier le mot de passe
    const isValid = await verifyPassword(args.password, user.passwordHash);

    if (!isValid) {
      return { success: false, error: "Email ou mot de passe incorrect" };
    }

    const now = Date.now();

    // Créer une nouvelle session
    const token = generateSessionToken();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 jours

    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
      createdAt: now,
    });

    // Déterminer la redirection selon le rôle et type de compte
    let redirectPath = "/dashboard";
    if (user.role === "admin") {
      redirectPath = "/admin";
    } else if (user.accountType === "utilisateur") {
      redirectPath = "/recherche";
    }

    return {
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        accountType: user.accountType,
        role: user.role || "user",
      },
      redirectPath,
    };
  },
});
