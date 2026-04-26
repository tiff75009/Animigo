import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Validation session admin
async function validateAdminSession(ctx: any, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session invalide ou expirée");
  }

  const user = await ctx.db.get(session.userId);
  if (!user || user.role !== "admin") {
    throw new ConvexError("Accès réservé aux administrateurs");
  }

  return { session, user };
}

// ============================================
// QUERIES
// ============================================

export const listPdfTemplates = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await validateAdminSession(ctx, args.token);

    const templates = await ctx.db
      .query("pdfTemplates")
      .order("desc")
      .collect();

    return templates;
  },
});

export const getPdfTemplate = query({
  args: {
    token: v.string(),
    templateId: v.id("pdfTemplates"),
  },
  handler: async (ctx, args) => {
    await validateAdminSession(ctx, args.token);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new ConvexError("Template non trouvé");
    }

    return template;
  },
});

// ============================================
// MUTATIONS
// ============================================

export const savePdfTemplate = mutation({
  args: {
    token: v.string(),
    templateId: v.optional(v.id("pdfTemplates")),
    name: v.string(),
    slug: v.string(),
    documentType: v.union(
      v.literal("invoice"),
      v.literal("client_receipt"),
      v.literal("receipt"), // déprécié, kept pour compat
    ),
    targetCompanyType: v.optional(v.union(
      v.literal("micro_enterprise"),
      v.literal("regular_company"),
      v.literal("all"),
    )),
    templateJson: v.string(),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    await validateAdminSession(ctx, args.token);

    const now = Date.now();
    const targetCompanyType = args.targetCompanyType || "all";

    // Si isDefault, retirer le default des autres templates du même documentType + targetCompanyType
    if (args.isDefault) {
      const existingDefaults = await ctx.db
        .query("pdfTemplates")
        .withIndex("by_document_type", (q: any) => q.eq("documentType", args.documentType))
        .collect();

      for (const t of existingDefaults) {
        const tTarget = t.targetCompanyType || "all";
        if (t.isDefault && tTarget === targetCompanyType && (!args.templateId || t._id !== args.templateId)) {
          await ctx.db.patch(t._id, { isDefault: false, updatedAt: now });
        }
      }
    }

    if (args.templateId) {
      await ctx.db.patch(args.templateId, {
        name: args.name,
        slug: args.slug,
        documentType: args.documentType,
        targetCompanyType,
        templateJson: args.templateJson,
        isDefault: args.isDefault,
        updatedAt: now,
      });
      return args.templateId;
    } else {
      const templateId = await ctx.db.insert("pdfTemplates", {
        name: args.name,
        slug: args.slug,
        documentType: args.documentType,
        targetCompanyType,
        templateJson: args.templateJson,
        isDefault: args.isDefault,
        createdAt: now,
        updatedAt: now,
      });
      return templateId;
    }
  },
});

export const deletePdfTemplate = mutation({
  args: {
    token: v.string(),
    templateId: v.id("pdfTemplates"),
  },
  handler: async (ctx, args) => {
    await validateAdminSession(ctx, args.token);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new ConvexError("Template non trouvé");
    }

    await ctx.db.delete(args.templateId);
    return { success: true };
  },
});

export const setDefaultTemplate = mutation({
  args: {
    token: v.string(),
    templateId: v.id("pdfTemplates"),
  },
  handler: async (ctx, args) => {
    await validateAdminSession(ctx, args.token);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new ConvexError("Template non trouvé");
    }

    const now = Date.now();
    const targetCompanyType = template.targetCompanyType || "all";

    // Retirer le default des autres du même documentType + targetCompanyType
    const sameType = await ctx.db
      .query("pdfTemplates")
      .withIndex("by_document_type", (q: any) => q.eq("documentType", template.documentType))
      .collect();

    for (const t of sameType) {
      const tTarget = t.targetCompanyType || "all";
      if (t.isDefault && tTarget === targetCompanyType && t._id !== args.templateId) {
        await ctx.db.patch(t._id, { isDefault: false, updatedAt: now });
      }
    }

    await ctx.db.patch(args.templateId, { isDefault: true, updatedAt: now });
    return { success: true };
  },
});
