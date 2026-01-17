import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";

export const getDashboardStats = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const users = await ctx.db.query("users").collect();

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.isActive).length,
      inactiveUsers: users.filter((u) => !u.isActive).length,
      usersByType: {
        annonceur_pro: users.filter((u) => u.accountType === "annonceur_pro")
          .length,
        annonceur_particulier: users.filter(
          (u) => u.accountType === "annonceur_particulier"
        ).length,
        utilisateur: users.filter((u) => u.accountType === "utilisateur")
          .length,
      },
      verifiedEmails: users.filter((u) => u.emailVerified).length,
      recentSignups: users.filter(
        (u) => u.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000
      ).length,
      admins: users.filter((u) => u.role === "admin").length,
    };

    return stats;
  },
});
