// @ts-nocheck
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

// ============================================
// HELPERS - Réutilisés depuis invoices.ts
// ============================================

async function resolveServiceTypeSlug(ctx: any, serviceCategory: string): Promise<string | undefined> {
  if (!serviceCategory) return undefined;

  const category = await ctx.db
    .query("serviceCategories")
    .withIndex("by_slug", (q: any) => q.eq("slug", serviceCategory))
    .first();

  if (!category) return undefined;

  let typeId = category.typeId;

  if (!typeId && category.parentCategoryId) {
    const parentCat = await ctx.db.get(category.parentCategoryId);
    if (parentCat?.typeId) {
      typeId = parentCat.typeId;
    }
  }

  if (!typeId) return undefined;

  const catType = await ctx.db.get(typeId);
  return catType?.slug;
}

function computeInvoiceUnit(
  mission: any,
  serviceTypeSlug: string | undefined
): { unit: string; quantity: number } {
  const animalCount = mission.animalCount || (mission.animals?.length) || 1;

  if (serviceTypeSlug === "garde") {
    if (mission.startDate !== mission.endDate) {
      const start = new Date(mission.startDate);
      const end = new Date(mission.endDate);
      const diffMs = end.getTime() - start.getTime();
      const nbJours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      return { unit: "jour", quantity: nbJours * animalCount };
    }
    if (mission.startTime && mission.endTime) {
      const [sh, sm] = mission.startTime.split(":").map(Number);
      const [eh, em] = mission.endTime.split(":").map(Number);
      const hours = Math.max(1, Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60));
      return { unit: "H", quantity: hours * animalCount };
    }
    return { unit: "jour", quantity: 1 * animalCount };
  }

  if (mission.numberOfSessions && mission.numberOfSessions > 1) {
    return { unit: "séance", quantity: mission.numberOfSessions * animalCount };
  }

  if (mission.startTime && mission.endTime) {
    const [sh, sm] = mission.startTime.split(":").map(Number);
    const [eh, em] = mission.endTime.split(":").map(Number);
    const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (totalMinutes >= 60) {
      const hours = Math.max(1, Math.round(totalMinutes / 60));
      return { unit: "H", quantity: hours * animalCount };
    }
    return { unit: "min", quantity: Math.max(1, totalMinutes) * animalCount };
  }

  return { unit: "séance", quantity: 1 * animalCount };
}

// ============================================
// HELPERS - Numéros de document
// ============================================

async function getNextInvoiceNumber(ctx: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FA-${year}-`;

  const invoices = await ctx.db
    .query("invoices")
    .order("desc")
    .collect();

  const yearInvoices = invoices.filter((i: any) =>
    i.invoiceNumber.startsWith(prefix)
  );

  if (yearInvoices.length === 0) {
    return `${prefix}0001`;
  }

  const lastNumber = yearInvoices
    .map((i: any) => parseInt(i.invoiceNumber.replace(prefix, ""), 10))
    .sort((a: number, b: number) => b - a)[0];

  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
}

async function getNextReceiptNumber(ctx: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RP-${year}-`;

  const invoices = await ctx.db
    .query("invoices")
    .order("desc")
    .collect();

  const yearReceipts = invoices.filter((i: any) =>
    i.invoiceNumber.startsWith(prefix)
  );

  if (yearReceipts.length === 0) {
    return `${prefix}0001`;
  }

  const lastNumber = yearReceipts
    .map((i: any) => parseInt(i.invoiceNumber.replace(prefix, ""), 10))
    .sort((a: number, b: number) => b - a)[0];

  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
}

// ============================================
// AUTO-GÉNÉRATION DE FACTURE / REÇU
// ============================================

export const autoGenerateInvoice = internalMutation({
  args: {
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    console.log("=== autoGenerateInvoice START ===", args.missionId);

    // 1. Charger la mission
    const mission = await ctx.db.get(args.missionId);
    if (!mission) {
      console.error("Mission non trouvée:", args.missionId);
      return;
    }

    // Vérifier que la mission est bien complétée
    if (mission.status !== "completed") {
      console.log("Mission pas encore complétée, skip:", mission.status);
      return;
    }

    // Vérifier qu'aucune facture n'existe déjà
    if (mission.invoiceId) {
      console.log("Facture déjà générée pour cette mission:", mission.invoiceId);
      return;
    }

    const existingInvoice = await ctx.db
      .query("invoices")
      .withIndex("by_mission", (q: any) => q.eq("missionId", args.missionId))
      .first();

    if (existingInvoice) {
      console.log("Facture existante trouvée:", existingInvoice._id);
      // Mettre à jour le lien mission → facture
      await ctx.db.patch(args.missionId, { invoiceId: existingInvoice._id });
      return;
    }

    // 2. Charger l'annonceur et le client
    const announcer = await ctx.db.get(mission.announcerId);
    if (!announcer) {
      console.error("Annonceur non trouvé:", mission.announcerId);
      return;
    }

    const client = await ctx.db.get(mission.clientId);
    if (!client) {
      console.error("Client non trouvé:", mission.clientId);
      return;
    }

    // 3. Déterminer le type de document
    const documentType: "invoice" | "receipt" =
      announcer.accountType === "annonceur_pro" ? "invoice" : "receipt";

    // 4. Résoudre le type de service
    const serviceTypeSlug = await resolveServiceTypeSlug(ctx, mission.serviceCategory);

    // 5. Calculer unité et quantité
    const { unit, quantity } = computeInvoiceUnit(mission, serviceTypeSlug);

    // 6. Construire les items
    const items: { description: string; quantity: number; unit?: string; unitPrice: number; total: number }[] = [];

    const basePriceAmount = mission.basePrice || mission.announcerEarnings || mission.amount;
    const baseTotal = basePriceAmount - (mission.optionsPrice || 0) - (mission.overnightAmount || 0);

    const animalCount = mission.animalCount || (mission.animals?.length) || 1;
    let description = `${mission.serviceName}${mission.variantName ? ` - ${mission.variantName}` : ""}`;
    if (animalCount > 1) {
      const animalNames = mission.animals?.map((a: any) => a.name).join(", ");
      description += ` (${animalCount} animaux${animalNames ? ` : ${animalNames}` : ""})`;
    }

    const unitPrice = quantity > 0 ? Math.round(baseTotal / quantity) : baseTotal;
    items.push({
      description,
      quantity,
      unit,
      unitPrice,
      total: baseTotal,
    });

    if (mission.optionNames && mission.optionNames.length > 0 && mission.optionsPrice) {
      items.push({
        description: `Options : ${mission.optionNames.join(", ")}`,
        quantity: 1,
        unit: "forfait",
        unitPrice: mission.optionsPrice,
        total: mission.optionsPrice,
      });
    }

    if (mission.includeOvernightStay && mission.overnightAmount && mission.overnightNights) {
      items.push({
        description: "Garde de nuit",
        quantity: mission.overnightNights,
        unit: "nuit",
        unitPrice: Math.round(mission.overnightAmount / mission.overnightNights),
        total: mission.overnightAmount,
      });
    }

    // 7. Calcul TVA
    const isVatSubject = announcer.isVatSubject === true;
    const totalService = items.reduce((sum, item) => sum + item.total, 0);
    const effectiveVatRate = mission.vatRate ?? 20;

    let amountHT: number | undefined;
    let tva: number | undefined;
    let amountTTC: number;

    if (isVatSubject) {
      amountTTC = totalService;
      amountHT = Math.round(totalService / (1 + effectiveVatRate / 100));
      tva = amountTTC - amountHT;
    } else {
      amountTTC = totalService;
    }

    // 8. Générer le numéro
    const invoiceNumber = documentType === "invoice"
      ? await getNextInvoiceNumber(ctx)
      : await getNextReceiptNumber(ctx);

    // 9. Insérer la facture/reçu
    const invoiceId = await ctx.db.insert("invoices", {
      recipientType: "client" as const,
      recipientId: mission.clientId,
      missionId: args.missionId,
      invoiceNumber,
      amount: amountTTC,
      amountHT,
      tva,
      vatRate: effectiveVatRate,
      items,
      documentType,
      createdBy: mission.announcerId,
      createdAt: Date.now(),
    });

    // 10. Lier la facture à la mission
    await ctx.db.patch(args.missionId, { invoiceId });

    console.log(`Auto-generated ${documentType} ${invoiceNumber} for mission ${args.missionId}`);

    // 11. Planifier la notification
    await ctx.scheduler.runAfter(0, internal.services.invoiceHelpers.sendInvoiceNotifications, {
      missionId: args.missionId,
      invoiceId,
      documentType,
      invoiceNumber,
      clientId: mission.clientId,
      announcerId: mission.announcerId,
      serviceName: mission.serviceName,
      startDate: mission.startDate,
    });

    // 12. Planifier la génération PDF (si un template admin existe)
    await ctx.scheduler.runAfter(0, internal.services.pdfGenerator.generatePdfFromTemplate, {
      invoiceId,
    });

    return { invoiceId, invoiceNumber, documentType };
  },
});

// ============================================
// NOTIFICATIONS FACTURE / REÇU
// ============================================

export const sendInvoiceNotifications = internalMutation({
  args: {
    missionId: v.id("missions"),
    invoiceId: v.id("invoices"),
    documentType: v.union(v.literal("invoice"), v.literal("receipt")),
    invoiceNumber: v.string(),
    clientId: v.id("users"),
    announcerId: v.id("users"),
    serviceName: v.string(),
    startDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { sendInvoiceAvailableNotification, sendServiceCompletedNotification } = await import("../lib/notificationTemplates");

    // Notification facture/reçu au client
    await sendInvoiceAvailableNotification({
      userId: args.clientId,
      missionId: args.missionId,
      invoiceId: args.invoiceId,
      documentType: args.documentType,
      invoiceNumber: args.invoiceNumber,
      serviceName: args.serviceName,
    });

    // Notification prestation terminée au client
    const announcer = await ctx.db.get(args.announcerId);
    const announcerName = announcer ? `${announcer.firstName} ${announcer.lastName.charAt(0)}.` : "Le prestataire";

    await sendServiceCompletedNotification({
      userId: args.clientId,
      missionId: args.missionId,
      announcerName,
      serviceName: args.serviceName,
      startDate: args.startDate,
    });

    // Planifier l'envoi de l'email
    const { getEmailConfigFromDb } = await import("../api/emailInternal");
    const { emailConfig, appUrl } = await getEmailConfigFromDb(ctx.db);

    if (emailConfig) {
      const client = await ctx.db.get(args.clientId);
      if (client) {
        const mission = await ctx.db.get(args.missionId);
        const slug = args.documentType === "invoice" ? "invoice_available" : "receipt_available";

        await ctx.scheduler.runAfter(0, internal.api.email.sendDocumentAvailableEmail, {
          recipientEmail: client.email,
          recipientName: client.firstName,
          documentType: args.documentType,
          documentNumber: args.invoiceNumber,
          serviceName: args.serviceName,
          missionDate: args.startDate,
          emailConfig,
          appUrl,
        });
      }
    }
  },
});
