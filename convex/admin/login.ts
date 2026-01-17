import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { verifyPassword, generateSessionToken } from "../auth/utils";

// Login admin spécifique avec expiration plus courte (2h)
export const adminLogin = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user || user.role !== "admin") {
      throw new ConvexError("Identifiants invalides");
    }

    if (!user.isActive) {
      throw new ConvexError("Ce compte a été désactivé");
    }

    const isValid = await verifyPassword(args.password, user.passwordHash);
    if (!isValid) {
      throw new ConvexError("Identifiants invalides");
    }

    const now = Date.now();
    const token = generateSessionToken();
    const expiresAt = now + 2 * 60 * 60 * 1000; // 2 heures seulement

    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
      createdAt: now,
    });

    return {
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  },
});
