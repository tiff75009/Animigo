import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// ============================================
// HELPERS
// ============================================

async function validateSession(ctx: any, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new ConvexError("Session invalide ou expirée");
  }

  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) {
    throw new ConvexError("Utilisateur non trouvé ou inactif");
  }

  return { session, user };
}

async function getNextInvoiceNumber(ctx: any) {
  const year = new Date().getFullYear();
  const prefix = `FA-${year}-`;

  const invoices = await ctx.db
    .query("invoices")
    .order("desc")
    .collect();

  const yearInvoices = invoices.filter((i: any) => i.invoiceNumber.startsWith(prefix));

  if (yearInvoices.length === 0) {
    return `${prefix}0001`;
  }

  const lastNumber = yearInvoices
    .map((i: any) => parseInt(i.invoiceNumber.replace(prefix, ""), 10))
    .sort((a: number, b: number) => b - a)[0];

  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
}

// ============================================
// QUERIES ANNONCEUR
// ============================================

// Liste des factures de l'annonceur (celles qu'il a créées)
export const getAnnouncerInvoices = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    // Factures créées par cet annonceur
    const invoices = await ctx.db
      .query("invoices")
      .order("desc")
      .collect();

    const myInvoices = invoices.filter(
      (i) => i.createdBy === user._id || (i.recipientType === "announcer" && i.recipientId === user._id)
    );

    // Enrichir avec les données client
    const enriched = await Promise.all(
      myInvoices.map(async (invoice) => {
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
          pdfStorageId: invoice.pdfStorageId,
          createdAt: invoice.createdAt,
          recipient: recipient
            ? {
                id: recipient._id,
                name: `${recipient.firstName} ${recipient.lastName}`,
                email: recipient.email,
              }
            : null,
          mission: mission
            ? {
                id: mission._id,
                serviceName: mission.serviceName,
                variantName: mission.variantName,
                startDate: mission.startDate,
                endDate: mission.endDate,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

// Missions facturables (complétées sans facture)
export const getInvoiceableMissions = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    // Missions complétées de l'annonceur
    const missions = await ctx.db
      .query("missions")
      .withIndex("by_announcer_status", (q: any) =>
        q.eq("announcerId", user._id).eq("status", "completed")
      )
      .collect();

    // Récupérer les factures existantes liées à des missions
    const allInvoices = await ctx.db
      .query("invoices")
      .order("desc")
      .collect();

    const invoicedMissionIds = new Set(
      allInvoices
        .filter((i) => i.missionId && i.createdBy === user._id)
        .map((i) => i.missionId!.toString())
    );

    // Filtrer les missions sans facture
    const invoiceableMissions = missions.filter(
      (m) => !invoicedMissionIds.has(m._id.toString())
    );

    // Enrichir avec les infos client
    const enriched = await Promise.all(
      invoiceableMissions.map(async (mission) => {
        const client = await ctx.db.get(mission.clientId);
        return {
          _id: mission._id,
          serviceName: mission.serviceName,
          variantName: mission.variantName,
          optionNames: mission.optionNames,
          startDate: mission.startDate,
          endDate: mission.endDate,
          basePrice: mission.basePrice,
          optionsPrice: mission.optionsPrice,
          announcerEarnings: mission.announcerEarnings,
          amount: mission.amount,
          clientName: mission.clientName,
          client: client
            ? {
                id: client._id,
                firstName: client.firstName,
                lastName: client.lastName,
                email: client.email,
                phone: client.phone,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

// ============================================
// HELPER - Résoudre le serviceTypeSlug
// ============================================

async function resolveServiceTypeSlug(ctx: any, serviceCategory: string): Promise<string | undefined> {
  if (!serviceCategory) return undefined;

  const category = await ctx.db
    .query("serviceCategories")
    .withIndex("by_slug", (q: any) => q.eq("slug", serviceCategory))
    .first();

  if (!category) return undefined;

  let typeId = category.typeId;

  // Si c'est une sous-catégorie, récupérer le typeId du parent
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

// ============================================
// HELPER - Calculer unité et quantité pour items facture
// ============================================

function computeInvoiceUnit(
  mission: any,
  serviceTypeSlug: string | undefined
): { unit: string; quantity: number } {
  const animalCount = mission.animalCount || (mission.animals?.length) || 1;

  if (serviceTypeSlug === "garde") {
    // Garde multi-jours
    if (mission.startDate !== mission.endDate) {
      const start = new Date(mission.startDate);
      const end = new Date(mission.endDate);
      const diffMs = end.getTime() - start.getTime();
      const nbJours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      return { unit: "jour", quantity: nbJours * animalCount };
    }
    // Même jour avec horaires
    if (mission.startTime && mission.endTime) {
      const [sh, sm] = mission.startTime.split(":").map(Number);
      const [eh, em] = mission.endTime.split(":").map(Number);
      const hours = Math.max(1, Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60));
      return { unit: "H", quantity: hours * animalCount };
    }
    // Fallback
    return { unit: "jour", quantity: 1 * animalCount };
  }

  // Services
  if (mission.numberOfSessions && mission.numberOfSessions > 1) {
    return { unit: "séance", quantity: mission.numberOfSessions * animalCount };
  }

  // Séance unique avec horaires
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

  // Fallback
  return { unit: "séance", quantity: 1 * animalCount };
}

// ============================================
// MUTATION ANNONCEUR - Créer une facture
// ============================================

export const createAnnouncerInvoice = mutation({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    // Vérifier que c'est un annonceur pro
    if (user.accountType !== "annonceur_pro") {
      throw new ConvexError("Seuls les annonceurs professionnels peuvent créer des factures");
    }

    // Récupérer la mission
    const mission = await ctx.db.get(args.missionId);
    if (!mission) throw new ConvexError("Mission non trouvée");
    if (mission.announcerId !== user._id) {
      throw new ConvexError("Cette mission ne vous appartient pas");
    }
    if (mission.status !== "completed") {
      throw new ConvexError("La mission doit être terminée pour créer une facture");
    }

    // Vérifier qu'aucune facture n'existe déjà pour cette mission
    const existingInvoice = await ctx.db
      .query("invoices")
      .withIndex("by_mission", (q: any) => q.eq("missionId", args.missionId))
      .first();

    if (existingInvoice && existingInvoice.createdBy === user._id) {
      throw new ConvexError("Une facture existe déjà pour cette mission");
    }

    // Récupérer les infos client
    const client = await ctx.db.get(mission.clientId);
    if (!client) throw new ConvexError("Client non trouvé");

    // Résoudre le type de service (garde / service)
    const serviceTypeSlug = await resolveServiceTypeSlug(ctx, mission.serviceCategory);

    // Calculer unité et quantité
    const { unit, quantity } = computeInvoiceUnit(mission, serviceTypeSlug);

    // Construire les items de la facture
    const items: { description: string; quantity: number; unit?: string; unitPrice: number; total: number }[] = [];

    // Montant de base de la prestation (hors options, hors nuit)
    const basePriceAmount = mission.basePrice || mission.announcerEarnings || mission.amount;
    const baseTotal = basePriceAmount - (mission.optionsPrice || 0) - (mission.overnightAmount || 0);

    // Description avec mention animaux si >1
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

    // Options si présentes
    if (mission.optionNames && mission.optionNames.length > 0 && mission.optionsPrice) {
      items.push({
        description: `Options : ${mission.optionNames.join(", ")}`,
        quantity: 1,
        unit: "forfait",
        unitPrice: mission.optionsPrice,
        total: mission.optionsPrice,
      });
    }

    // Garde de nuit si applicable
    if (mission.includeOvernightStay && mission.overnightAmount && mission.overnightNights) {
      items.push({
        description: "Garde de nuit",
        quantity: mission.overnightNights,
        unit: "nuit",
        unitPrice: Math.round(mission.overnightAmount / mission.overnightNights),
        total: mission.overnightAmount,
      });
    }

    // Calcul TVA
    const isVatSubject = user.isVatSubject === true;
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

    // Générer le numéro de facture
    const invoiceNumber = await getNextInvoiceNumber(ctx);

    // Créer la facture
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
      createdBy: user._id,
      createdAt: Date.now(),
    });

    return { invoiceId, invoiceNumber };
  },
});

// Sauvegarder le PDF généré dans le storage
export const saveInvoicePdf = mutation({
  args: {
    token: v.string(),
    invoiceId: v.id("invoices"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Facture non trouvée");
    if (invoice.createdBy !== user._id) {
      throw new ConvexError("Vous n'êtes pas autorisé à modifier cette facture");
    }

    // Récupérer l'URL du fichier stocké
    const url = await ctx.storage.getUrl(args.storageId);

    await ctx.db.patch(args.invoiceId, {
      pdfStorageId: args.storageId,
      pdfUrl: url || undefined,
    });

    return { success: true, pdfUrl: url };
  },
});

// Générer l'URL de téléchargement du PDF
export const getInvoicePdfUrl = query({
  args: {
    token: v.string(),
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Facture non trouvée");

    // Vérifier que l'utilisateur a accès (créateur ou destinataire)
    if (invoice.createdBy !== user._id && invoice.recipientId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    if (!invoice.pdfStorageId) return null;

    const url = await ctx.storage.getUrl(invoice.pdfStorageId);
    return url;
  },
});

// Détails complets d'une facture (pour l'aperçu et la génération PDF)
export const getInvoiceDetails = query({
  args: {
    token: v.string(),
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Facture non trouvée");

    // Vérifier l'accès
    if (invoice.createdBy !== user._id && invoice.recipientId !== user._id) {
      throw new ConvexError("Accès non autorisé");
    }

    // Récupérer les infos de l'émetteur (annonceur)
    const emitter = await ctx.db.get(invoice.createdBy);
    const emitterProfile = emitter
      ? await ctx.db
          .query("profiles")
          .withIndex("by_user", (q: any) => q.eq("userId", emitter._id))
          .first()
      : null;

    // Récupérer les infos du destinataire (client)
    const recipient = await ctx.db.get(invoice.recipientId);
    const recipientProfile = recipient
      ? await ctx.db
          .query("clientProfiles")
          .withIndex("by_user", (q: any) => q.eq("userId", recipient._id))
          .first()
      : null;

    // Mission associée
    const mission = invoice.missionId ? await ctx.db.get(invoice.missionId) : null;

    // Résoudre le serviceTypeSlug
    let serviceTypeSlug: string | null = null;
    if (mission?.serviceCategory) {
      serviceTypeSlug = (await resolveServiceTypeSlug(ctx, mission.serviceCategory)) || null;
    }

    return {
      ...invoice,
      serviceTypeSlug,
      emitter: emitter
        ? {
            id: emitter._id,
            firstName: emitter.firstName,
            lastName: emitter.lastName,
            email: emitter.email,
            phone: emitter.phone,
            siret: emitter.siret,
            companyName: emitter.companyName,
            companyType: emitter.companyType,
            isVatSubject: emitter.isVatSubject,
            legalForm: emitter.legalForm,
          }
        : null,
      emitterAddress: emitterProfile
        ? {
            location: emitterProfile.location,
            city: emitterProfile.city,
            postalCode: emitterProfile.postalCode,
          }
        : null,
      recipient: recipient
        ? {
            id: recipient._id,
            firstName: recipient.firstName,
            lastName: recipient.lastName,
            email: recipient.email,
            phone: recipient.phone,
          }
        : null,
      recipientAddress: recipientProfile
        ? {
            location: recipientProfile.location,
            city: recipientProfile.city,
            postalCode: recipientProfile.postalCode,
          }
        : null,
      mission: mission
        ? {
            id: mission._id,
            serviceName: mission.serviceName,
            variantName: mission.variantName,
            startDate: mission.startDate,
            endDate: mission.endDate,
            amount: mission.amount,
            serviceCategory: mission.serviceCategory,
            startTime: mission.startTime,
            endTime: mission.endTime,
            animal: mission.animal,
            animals: mission.animals,
            animalCount: mission.animalCount,
            sessions: mission.sessions,
            sessionType: mission.sessionType,
            numberOfSessions: mission.numberOfSessions,
            serviceLocation: mission.serviceLocation,
            basePrice: mission.basePrice,
            optionsPrice: mission.optionsPrice,
            serviceAmount: mission.serviceAmount,
            announcerEarnings: mission.announcerEarnings,
            includeOvernightStay: mission.includeOvernightStay,
            overnightNights: mission.overnightNights,
            overnightAmount: mission.overnightAmount,
            optionNames: mission.optionNames,
            platformFee: mission.platformFee,
            stripeFee: mission.stripeFee,
            commissionRate: mission.commissionRate,
            stripeFeeRate: mission.stripeFeeRate,
          }
        : null,
    };
  },
});

// ============================================
// QUERIES CLIENT
// ============================================

// Factures du client (celles où il est destinataire)
export const getClientInvoices = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_recipient", (q: any) => q.eq("recipientId", user._id))
      .order("desc")
      .collect();

    // Enrichir avec les infos annonceur
    const enriched = await Promise.all(
      invoices.map(async (invoice) => {
        const emitter = await ctx.db.get(invoice.createdBy);
        const mission = invoice.missionId ? await ctx.db.get(invoice.missionId) : null;

        return {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          amountHT: invoice.amountHT,
          tva: invoice.tva,
          items: invoice.items,
          pdfUrl: invoice.pdfUrl,
          pdfStorageId: invoice.pdfStorageId,
          createdAt: invoice.createdAt,
          emitter: emitter
            ? {
                id: emitter._id,
                name: `${emitter.firstName} ${emitter.lastName}`,
                companyName: emitter.companyName,
              }
            : null,
          mission: mission
            ? {
                id: mission._id,
                serviceName: mission.serviceName,
                startDate: mission.startDate,
                endDate: mission.endDate,
                platformFee: mission.platformFee,
                stripeFee: mission.stripeFee,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

// Vérifier si une facture existe pour une mission donnée (côté client)
export const getInvoiceForMission = query({
  args: {
    token: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args) => {
    const { user } = await validateSession(ctx, args.token);

    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_mission", (q: any) => q.eq("missionId", args.missionId))
      .first();

    if (!invoice) return null;

    // Vérifier que le client a accès
    if (invoice.recipientId !== user._id && invoice.createdBy !== user._id) {
      return null;
    }

    return {
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      pdfUrl: invoice.pdfUrl,
      pdfStorageId: invoice.pdfStorageId,
      createdAt: invoice.createdAt,
    };
  },
});

// Générer l'URL d'upload pour le storage Convex
export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await validateSession(ctx, args.token);
    return await ctx.storage.generateUploadUrl();
  },
});
