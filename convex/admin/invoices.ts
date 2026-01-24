import { query, mutation, action, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin, requireAdminAction } from "./utils";
import { internal } from "../_generated/api";

// Query: Liste des factures
export const listInvoices = query({
  args: {
    token: v.string(),
    recipientId: v.optional(v.id("users")),
    recipientType: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let invoices = await ctx.db
      .query("invoices")
      .order("desc")
      .collect();

    // Filtrer par destinataire
    if (args.recipientId) {
      invoices = invoices.filter((i) => i.recipientId === args.recipientId);
    }

    // Filtrer par type
    if (args.recipientType) {
      invoices = invoices.filter((i) => i.recipientType === args.recipientType);
    }

    const total = invoices.length;
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    const paginatedInvoices = invoices.slice(offset, offset + limit);

    // Enrichir avec les infos destinataire
    const enrichedInvoices = await Promise.all(
      paginatedInvoices.map(async (invoice) => {
        const recipient = await ctx.db.get(invoice.recipientId);
        const mission = invoice.missionId ? await ctx.db.get(invoice.missionId) : null;

        return {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          recipientType: invoice.recipientType,
          amount: invoice.amount,
          amountHT: invoice.amountHT,
          tva: invoice.tva,
          items: invoice.items,
          pdfUrl: invoice.pdfUrl,
          sentAt: invoice.sentAt,
          sentTo: invoice.sentTo,
          createdAt: invoice.createdAt,
          recipient: recipient ? {
            id: recipient._id,
            name: `${recipient.firstName} ${recipient.lastName}`,
            email: recipient.email,
            companyName: recipient.companyName,
          } : null,
          mission: mission ? {
            id: mission._id,
            serviceName: mission.serviceName,
            startDate: mission.startDate,
          } : null,
        };
      })
    );

    return {
      invoices: enrichedInvoices,
      total,
    };
  },
});

// Query: Détails d'une facture
export const getInvoiceDetails = query({
  args: {
    token: v.string(),
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Facture non trouvée");

    const recipient = await ctx.db.get(invoice.recipientId);
    const mission = invoice.missionId ? await ctx.db.get(invoice.missionId) : null;
    const createdBy = await ctx.db.get(invoice.createdBy);

    // Récupérer le profil si c'est un annonceur
    let profile = null;
    if (recipient && (recipient.accountType === "annonceur_pro" || recipient.accountType === "annonceur_particulier")) {
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", invoice.recipientId))
        .first();
    }

    return {
      ...invoice,
      recipient: recipient ? {
        id: recipient._id,
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        email: recipient.email,
        phone: recipient.phone,
        companyName: recipient.companyName,
        siret: recipient.siret,
        accountType: recipient.accountType,
      } : null,
      recipientAddress: profile ? {
        location: profile.location,
        city: profile.city,
        postalCode: profile.postalCode,
      } : null,
      mission: mission ? {
        id: mission._id,
        serviceName: mission.serviceName,
        variantName: mission.variantName,
        startDate: mission.startDate,
        endDate: mission.endDate,
        amount: mission.amount,
      } : null,
      createdByName: createdBy ? `${createdBy.firstName} ${createdBy.lastName}` : "Système",
    };
  },
});

// Query: Générer le prochain numéro de facture
export const getNextInvoiceNumber = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    // Trouver la dernière facture de l'année
    const invoices = await ctx.db
      .query("invoices")
      .order("desc")
      .collect();

    const yearInvoices = invoices.filter((i) => i.invoiceNumber.startsWith(prefix));

    if (yearInvoices.length === 0) {
      return `${prefix}0001`;
    }

    // Extraire le numéro le plus élevé
    const lastNumber = yearInvoices
      .map((i) => parseInt(i.invoiceNumber.replace(prefix, ""), 10))
      .sort((a, b) => b - a)[0];

    return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
  },
});

// Mutation: Créer une facture
export const createInvoice = mutation({
  args: {
    token: v.string(),
    recipientType: v.union(v.literal("client"), v.literal("announcer")),
    recipientId: v.id("users"),
    missionId: v.optional(v.id("missions")),
    items: v.array(v.object({
      description: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
    })),
    applyTVA: v.optional(v.boolean()),
    tvaRate: v.optional(v.number()), // Ex: 20 pour 20%
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    // Vérifier que le destinataire existe
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) throw new ConvexError("Destinataire non trouvé");

    // Calculer les totaux
    const itemsWithTotal = args.items.map((item) => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));

    const amountHT = itemsWithTotal.reduce((sum, item) => sum + item.total, 0);

    let tva = 0;
    let amount = amountHT;

    if (args.applyTVA && args.tvaRate) {
      tva = Math.round(amountHT * args.tvaRate / 100);
      amount = amountHT + tva;
    }

    // Générer le numéro de facture
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const invoices = await ctx.db
      .query("invoices")
      .order("desc")
      .collect();

    const yearInvoices = invoices.filter((i) => i.invoiceNumber.startsWith(prefix));

    let nextNumber = 1;
    if (yearInvoices.length > 0) {
      const lastNumber = yearInvoices
        .map((i) => parseInt(i.invoiceNumber.replace(prefix, ""), 10))
        .sort((a, b) => b - a)[0];
      nextNumber = lastNumber + 1;
    }

    const invoiceNumber = `${prefix}${String(nextNumber).padStart(4, "0")}`;

    // Créer la facture
    const invoiceId = await ctx.db.insert("invoices", {
      recipientType: args.recipientType,
      recipientId: args.recipientId,
      missionId: args.missionId,
      invoiceNumber,
      amount,
      amountHT: args.applyTVA ? amountHT : undefined,
      tva: args.applyTVA ? tva : undefined,
      items: itemsWithTotal,
      createdBy: user._id,
      createdAt: Date.now(),
    });

    return { invoiceId, invoiceNumber };
  },
});

// Mutation interne: Mettre à jour l'URL du PDF
export const updateInvoicePdf = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    pdfStorageId: v.id("_storage"),
    pdfUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.invoiceId, {
      pdfStorageId: args.pdfStorageId,
      pdfUrl: args.pdfUrl,
    });
  },
});

// Mutation: Marquer une facture comme envoyée
export const markInvoiceSent = mutation({
  args: {
    token: v.string(),
    invoiceId: v.id("invoices"),
    sentTo: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Facture non trouvée");

    await ctx.db.patch(args.invoiceId, {
      sentAt: Date.now(),
      sentTo: args.sentTo,
    });

    return { success: true };
  },
});

// Query: Factures d'un utilisateur
export const getUserInvoices = query({
  args: {
    token: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_recipient", (q) => q.eq("recipientId", args.userId))
      .order("desc")
      .collect();

    return invoices.map((invoice) => ({
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      pdfUrl: invoice.pdfUrl,
      sentAt: invoice.sentAt,
      createdAt: invoice.createdAt,
    }));
  },
});

// Query: Stats des factures
export const getInvoiceStats = query({
  args: {
    token: v.string(),
    period: v.union(v.literal("month"), v.literal("year")),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const [year, month] = args.date.split("-").map(Number);

    let startDate: number;
    let endDate: number;

    if (args.period === "month") {
      startDate = new Date(year, month - 1, 1).getTime();
      endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime();
    } else {
      startDate = new Date(year, 0, 1).getTime();
      endDate = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
    }

    const invoices = await ctx.db
      .query("invoices")
      .collect();

    const periodInvoices = invoices.filter(
      (i) => i.createdAt >= startDate && i.createdAt <= endDate
    );

    const clientInvoices = periodInvoices.filter((i) => i.recipientType === "client");
    const announcerInvoices = periodInvoices.filter((i) => i.recipientType === "announcer");

    return {
      total: periodInvoices.length,
      totalAmount: periodInvoices.reduce((sum, i) => sum + i.amount, 0),
      clientInvoices: clientInvoices.length,
      clientAmount: clientInvoices.reduce((sum, i) => sum + i.amount, 0),
      announcerInvoices: announcerInvoices.length,
      announcerAmount: announcerInvoices.reduce((sum, i) => sum + i.amount, 0),
      sentCount: periodInvoices.filter((i) => i.sentAt).length,
    };
  },
});
