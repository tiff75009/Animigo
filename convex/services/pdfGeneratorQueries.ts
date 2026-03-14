// @ts-nocheck
import { query, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// ============================================
// QUERIES / MUTATIONS internes pour pdfGenerator (action Node.js)
// Séparées car "use node" ne supporte que les actions
// ============================================

const formatDateFR = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR");
};

export const validateSessionForPdf = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;
    return { userId: session.userId };
  },
});

export const getInvoiceForPdf = internalQuery({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.invoiceId);
  },
});

export const getUserForPdf = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getDefaultPdfTemplate = internalQuery({
  args: {
    documentType: v.union(v.literal("invoice"), v.literal("receipt")),
    companyType: v.string(),
  },
  handler: async (ctx, args) => {
    const templates = await ctx.db
      .query("pdfTemplates")
      .withIndex("by_document_type", (q: any) => q.eq("documentType", args.documentType))
      .collect();

    const defaults = templates.filter((t) => t.isDefault);

    // 1. Chercher un template ciblé pour ce companyType
    const specific = defaults.find(
      (t) => t.targetCompanyType === args.companyType
    );
    if (specific) return specific;

    // 2. Sinon, chercher un template "all" (tous types)
    const generic = defaults.find(
      (t) => !t.targetCompanyType || t.targetCompanyType === "all"
    );
    if (generic) return generic;

    // 3. Sinon, premier default trouvé
    return defaults[0] || null;
  },
});

export const getInvoiceFullData = internalQuery({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) return null;

    // Charger émetteur (annonceur)
    const emitter = await ctx.db.get(invoice.createdBy);
    const emitterProfile = emitter
      ? await ctx.db
          .query("profiles")
          .withIndex("by_user", (q: any) => q.eq("userId", emitter._id))
          .first()
      : null;

    // Charger destinataire (client)
    const recipient = await ctx.db.get(invoice.recipientId);
    const recipientProfile = recipient
      ? await ctx.db
          .query("clientProfiles")
          .withIndex("by_user", (q: any) => q.eq("userId", recipient._id))
          .first()
      : null;

    // Mission associée
    const mission = invoice.missionId ? await ctx.db.get(invoice.missionId) : null;

    // ── Adresses ──
    const announcerAddress = emitterProfile
      ? [emitterProfile.location, emitterProfile.postalCode, emitterProfile.city].filter(Boolean).join(", ")
      : "";
    const clientAddress = recipientProfile
      ? [recipientProfile.location, recipientProfile.postalCode, recipientProfile.city].filter(Boolean).join(", ")
      : "";

    // ── Dates de mission ──
    let missionDateRange = "";
    if (mission) {
      missionDateRange = mission.startDate === mission.endDate
        ? formatDateFR(mission.startDate)
        : `${formatDateFR(mission.startDate)} - ${formatDateFR(mission.endDate)}`;
    }

    // ── Animaux ──
    const animals: { name: string; type: string; emoji?: string }[] =
      mission?.animals || (mission?.animal ? [mission.animal] : []);
    const animalNames = animals.map((a) => a.name).join(", ");
    const animalTypes = [...new Set(animals.map((a) => a.type))].join(", ");
    const animalDetails = animals.map((a) => `${a.name} (${a.type})`).join(", ");
    const animalCount = mission?.animalCount || animals.length || 1;

    // ── Session type ──
    const sessionType = mission?.sessionType || "individual";
    const sessionTypeLabel = sessionType === "collective" ? "Collectif" : "Individuel";

    // ── Horaires ──
    const startTime = mission?.startTime || "";
    const endTime = mission?.endTime || "";
    const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : "";

    // ── Nuits / jours ──
    const overnightNights = mission?.overnightNights || 0;
    let durationInfo = "";
    if (mission && mission.startDate !== mission.endDate) {
      const start = new Date(mission.startDate);
      const end = new Date(mission.endDate);
      const nbJours = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      durationInfo = `${nbJours} jour${nbJours > 1 ? "s" : ""}`;
      if (overnightNights > 0) {
        durationInfo += `, ${overnightNights} nuit${overnightNights > 1 ? "s" : ""}`;
      }
    }

    // ── SAP ──
    const isSapApplied = mission?.isSapApplied || false;
    const sapApprovalNumber = emitterProfile?.sapApprovalNumber || "";
    const sapMention = isSapApplied
      ? `Service à la personne${invoice.vatRate === 10 ? " - TVA réduite 10%" : ""}`
      : "";

    // ── Description enrichie ──
    const detailParts: string[] = [];
    if (animalDetails) detailParts.push(animalDetails);
    if (missionDateRange) detailParts.push(missionDateRange);
    if (timeRange) detailParts.push(timeRange);
    if (durationInfo) detailParts.push(durationInfo);
    detailParts.push(sessionTypeLabel);
    if (sapMention) detailParts.push(sapMention);
    const descriptionDetails = detailParts.join("\n");

    return {
      items: invoice.items,
      clientName: recipient ? `${recipient.firstName} ${recipient.lastName}` : "",
      clientEmail: recipient?.email || "",
      clientPhone: recipient?.phone || "",
      clientAddress,
      announcerName: emitter ? `${emitter.firstName} ${emitter.lastName}` : "",
      announcerEmail: emitter?.email || "",
      announcerPhone: emitter?.phone || "",
      announcerAddress,
      companyName: emitter?.companyName || "",
      siret: emitter?.siret || "",
      serviceName: mission?.serviceName || "",
      variantName: mission?.variantName || "",
      missionDateRange,
      animalNames,
      animalTypes,
      animalDetails,
      animalCount,
      sessionTypeLabel,
      timeRange,
      durationInfo,
      descriptionDetails,
      isSapApplied,
      sapMention,
      sapApprovalNumber,
    };
  },
});

// ============================================
// Query publique : retourne template + inputs pour génération PDF côté client
// ============================================

const formatPrice = (cents: number) => {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
};

export const getInvoicePdfBundle = query({
  args: {
    token: v.string(),
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    // 1. Valider la session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();
    if (!session || session.expiresAt < Date.now()) return null;

    // 2. Charger la facture
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) return null;

    // Vérifier l'accès (créateur ou destinataire)
    if (invoice.createdBy !== session.userId && invoice.recipientId !== session.userId) {
      return null;
    }

    // 3. Résoudre le companyType de l'annonceur
    const emitter = await ctx.db.get(invoice.createdBy);
    const companyType = emitter?.companyType || "unknown";

    // 4. Chercher le template par défaut
    const documentType = invoice.documentType || "invoice";
    const templates = await ctx.db
      .query("pdfTemplates")
      .withIndex("by_document_type", (q: any) => q.eq("documentType", documentType))
      .collect();

    const defaults = templates.filter((t) => t.isDefault);
    const template =
      defaults.find((t) => t.targetCompanyType === companyType) ||
      defaults.find((t) => !t.targetCompanyType || t.targetCompanyType === "all") ||
      defaults[0] || null;

    if (!template) return null;

    // 5. Charger les données complètes (inline pour éviter appel internalQuery)
    const emitterProfile = emitter
      ? await ctx.db
          .query("profiles")
          .withIndex("by_user", (q: any) => q.eq("userId", emitter._id))
          .first()
      : null;

    const recipient = await ctx.db.get(invoice.recipientId);
    const recipientProfile = recipient
      ? await ctx.db
          .query("clientProfiles")
          .withIndex("by_user", (q: any) => q.eq("userId", recipient._id))
          .first()
      : null;

    const mission = invoice.missionId ? await ctx.db.get(invoice.missionId) : null;

    const announcerAddress = emitterProfile
      ? [emitterProfile.location, emitterProfile.postalCode, emitterProfile.city].filter(Boolean).join(", ")
      : "";
    const clientAddress = recipientProfile
      ? [recipientProfile.location, recipientProfile.postalCode, recipientProfile.city].filter(Boolean).join(", ")
      : "";

    let missionDateRange = "";
    if (mission) {
      missionDateRange = mission.startDate === mission.endDate
        ? formatDateFR(mission.startDate)
        : `${formatDateFR(mission.startDate)} - ${formatDateFR(mission.endDate)}`;
    }

    const animals: { name: string; type: string; emoji?: string }[] =
      mission?.animals || (mission?.animal ? [mission.animal] : []);
    const animalDetails = animals.map((a: any) => `${a.name} (${a.type})`).join(", ");

    const sessionType = mission?.sessionType || "individual";
    const sessionTypeLabel = sessionType === "collective" ? "Collectif" : "Individuel";

    const startTime = mission?.startTime || "";
    const endTime = mission?.endTime || "";
    const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : "";

    const overnightNights = mission?.overnightNights || 0;
    let durationInfo = "";
    if (mission && mission.startDate !== mission.endDate) {
      const start = new Date(mission.startDate);
      const end = new Date(mission.endDate);
      const nbJours = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      durationInfo = `${nbJours} jour${nbJours > 1 ? "s" : ""}`;
      if (overnightNights > 0) {
        durationInfo += `, ${overnightNights} nuit${overnightNights > 1 ? "s" : ""}`;
      }
    }

    const isSapApplied = mission?.isSapApplied || false;
    const sapApprovalNumber = emitterProfile?.sapApprovalNumber || "";
    const sapMention = isSapApplied
      ? `Service à la personne${invoice.vatRate === 10 ? " - TVA réduite 10%" : ""}`
      : "";

    const detailParts: string[] = [];
    if (animalDetails) detailParts.push(animalDetails);
    if (missionDateRange) detailParts.push(missionDateRange);
    if (timeRange) detailParts.push(timeRange);
    if (durationInfo) detailParts.push(durationInfo);
    detailParts.push(sessionTypeLabel);
    if (sapMention) detailParts.push(sapMention);
    const descriptionDetails = detailParts.join("\n");

    // 6. Construire les inputs pdfme
    const isVatSubject = !!invoice.tva && invoice.tva > 0;
    const vatRate = invoice.vatRate || 20;
    const mentionTVA = isVatSubject ? "" : "TVA non applicable, art. 293 B du CGI";

    const itemsTable = invoice.items.map((item: any, index: number) => {
      let desc = item.description;
      if (index === 0 && descriptionDetails) {
        desc += "\n" + descriptionDetails;
      }
      const itemTTC = item.total;
      const itemHT = isVatSubject ? Math.round(itemTTC / (1 + vatRate / 100)) : itemTTC;
      const itemTVA = itemTTC - itemHT;
      const unitPriceHT = isVatSubject ? Math.round(item.unitPrice / (1 + vatRate / 100)) : item.unitPrice;
      return [
        desc,
        String(item.quantity),
        item.unit || "",
        formatPrice(unitPriceHT),
        isVatSubject ? `${vatRate}%` : "0%",
        formatPrice(itemTVA),
        formatPrice(itemTTC),
      ];
    });

    const totalsRows: string[][] = [];
    if (isVatSubject) {
      totalsRows.push(["Total HT", formatPrice(invoice.amountHT || invoice.amount)]);
      totalsRows.push([`TVA (${vatRate}%)`, formatPrice(invoice.tva!)]);
    }
    totalsRows.push(["Total TTC", formatPrice(invoice.amount)]);

    const inputs = {
      invoiceNumber: invoice.invoiceNumber,
      documentType: documentType === "invoice" ? "FACTURE" : "REÇU",
      date: formatDateFR(new Date().toISOString().split("T")[0]),
      clientName: recipient ? `${recipient.firstName} ${recipient.lastName}` : "",
      clientEmail: recipient?.email || "",
      clientPhone: recipient?.phone || "",
      clientAddress,
      announcerName: emitter ? `${emitter.firstName} ${emitter.lastName}` : "",
      announcerEmail: emitter?.email || "",
      announcerPhone: emitter?.phone || "",
      announcerAddress,
      companyName: emitter?.companyName || "",
      siret: emitter?.siret ? `SIRET : ${emitter.siret}` : "",
      serviceName: mission?.serviceName || "",
      missionDate: missionDateRange,
      sessionType: sessionTypeLabel,
      animalDetails,
      timeRange,
      sapMention,
      sapApprovalNumber: sapApprovalNumber ? `Agrément SAP : ${sapApprovalNumber}` : "",
      amountHT: `Total HT : ${invoice.amountHT ? formatPrice(invoice.amountHT) : formatPrice(invoice.amount)}`,
      tva: isVatSubject ? `TVA (${vatRate}%) : ${formatPrice(invoice.tva!)}` : "",
      amountTTC: `Total TTC : ${formatPrice(invoice.amount)}`,
      vatRate: `${vatRate} %`,
      mentionTVA,
      itemsTable: JSON.stringify(itemsTable),
      totalsTable: JSON.stringify(totalsRows),
    };

    return {
      templateJson: template.templateJson,
      inputs,
    };
  },
});

export const updateInvoicePdf = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    pdfStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.pdfStorageId);
    await ctx.db.patch(args.invoiceId, {
      pdfStorageId: args.pdfStorageId,
      pdfUrl: url || undefined,
    });
  },
});
