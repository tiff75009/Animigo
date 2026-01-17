import { mutation } from "../_generated/server";
import { hashPassword } from "../auth/utils";

// À exécuter UNE SEULE FOIS pour créer l'admin par défaut
export const createDefaultAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    // Vérifier si admin existe déjà
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "admin@admin.com"))
      .first();

    if (existingAdmin) {
      // Mettre à jour le rôle si nécessaire
      if (existingAdmin.role !== "admin") {
        await ctx.db.patch(existingAdmin._id, { role: "admin" });
        return { success: true, message: "Admin role updated" };
      }
      return { success: false, message: "Admin already exists" };
    }

    const now = Date.now();
    const passwordHash = await hashPassword("password");

    await ctx.db.insert("users", {
      email: "admin@admin.com",
      passwordHash,
      accountType: "utilisateur",
      firstName: "Admin",
      lastName: "Animigo",
      phone: "0600000000",
      role: "admin",
      cguAcceptedAt: now,
      createdAt: now,
      updatedAt: now,
      emailVerified: true,
      isActive: true,
    });

    return { success: true, message: "Default admin created: admin@admin.com / password" };
  },
});
