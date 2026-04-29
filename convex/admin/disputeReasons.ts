// @ts-nocheck
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";

// Motifs par défaut (avec templates clients/admin pré-rédigés)
const DEFAULT_REASONS = [
  {
    label: "Service non réalisé",
    slug: "service_non_realise",
    description: "Le prestataire n'a pas effectué le service convenu",
    blocksPayment: true,
    sortOrder: 1,
    clientHelperMessage:
      "Pour ce motif, merci de nous fournir un maximum de détails afin que nous puissions traiter votre réclamation rapidement :\n\n• Date et heure auxquelles le service devait avoir lieu\n• Avez-vous tenté de contacter le prestataire ? (capture des messages, journal d'appels)\n• Photos ou vidéos prouvant l'absence du prestataire (si applicable)\n• Tout autre élément démontrant la non-réalisation\n\nLe versement du paiement au prestataire est automatiquement suspendu pendant l'examen.",
    resolutionTemplate:
      "Bonjour,\n\nNous avons examiné votre réclamation concernant la non-réalisation de la prestation \"{service}\" du {date}.\n\nAprès vérification des éléments fournis et échange avec le prestataire, nous confirmons que le service n'a pas été réalisé. Vous serez intégralement remboursé(e) du montant de {montant}€ sous 5 à 10 jours ouvrés sur votre moyen de paiement initial.\n\nNous sommes désolés pour ce désagrément. L'équipe Animigo vous remercie pour votre signalement, qui nous aide à maintenir la qualité de notre plateforme.\n\nCordialement,\nL'équipe Animigo",
  },
  {
    label: "Qualité insuffisante",
    slug: "qualite_insuffisante",
    description: "Le service a été réalisé mais la qualité est insatisfaisante",
    blocksPayment: false,
    sortOrder: 2,
    clientHelperMessage:
      "Aidez-nous à comprendre précisément ce qui ne va pas :\n\n• Quels aspects du service ne correspondaient pas à vos attentes ?\n• Photos avant/après si pertinent (ex: toilettage, soins)\n• Avez-vous échangé avec le prestataire à ce sujet ? Quelle a été sa réaction ?\n• Si une remise en état a été nécessaire, joignez les justificatifs\n\nPlus votre description est détaillée et étayée, plus nous pourrons proposer une résolution juste.",
    resolutionTemplate:
      "Bonjour,\n\nNous avons étudié votre réclamation concernant la qualité de la prestation \"{service}\" réalisée le {date} et avons recueilli la version du prestataire.\n\nAu vu des éléments transmis, nous vous proposons {un geste commercial / un remboursement partiel de X€ / un avoir / une nouvelle prestation offerte}. Cette résolution sera appliquée sous 5 à 10 jours ouvrés.\n\nNous restons à votre disposition pour toute question. Merci de nous avoir signalé ce problème : votre retour nous aide à améliorer la qualité des prestations sur Animigo.\n\nCordialement,\nL'équipe Animigo",
  },
  {
    label: "Retard important",
    slug: "retard_important",
    description: "Le prestataire a eu un retard significatif",
    blocksPayment: false,
    sortOrder: 3,
    clientHelperMessage:
      "Pour traiter votre réclamation, merci de préciser :\n\n• Heure prévue vs. heure réelle d'arrivée du prestataire\n• Le prestataire vous a-t-il prévenu(e) ? (capture des messages)\n• Conséquences concrètes de ce retard (animal stressé, planning perturbé, frais supplémentaires…)\n• Cela s'est-il déjà produit avec ce prestataire ?\n\nNous évaluerons un éventuel geste commercial en fonction de la gravité du retard et de ses conséquences.",
    resolutionTemplate:
      "Bonjour,\n\nMerci de nous avoir signalé le retard de {durée} sur la prestation \"{service}\" du {date}. Nous avons échangé avec le prestataire à ce sujet.\n\nAu vu des circonstances, nous vous accordons {un avoir de X€ / un remboursement partiel de X€ / un rappel formel au prestataire}. {Le crédit sera disponible sur votre compte sous 24h / Le remboursement interviendra sous 5 à 10 jours ouvrés}.\n\nNous prenons ce type de signalement très au sérieux pour garantir la fiabilité de nos prestataires.\n\nCordialement,\nL'équipe Animigo",
  },
  {
    label: "Comportement inapproprié",
    slug: "comportement_inapproprie",
    description: "Le prestataire a eu un comportement déplacé",
    blocksPayment: true,
    sortOrder: 4,
    clientHelperMessage:
      "Cette réclamation est traitée en priorité. Merci de nous fournir le maximum d'éléments factuels :\n\n• Description précise des faits (date, heure, lieu, témoins éventuels)\n• Captures des échanges écrits (SMS, messages dans l'app)\n• Photos, vidéos ou enregistrements audio si vous en disposez\n• Le prestataire a-t-il été agressif, irrespectueux, intrusif ?\n\nLe versement au prestataire est immédiatement suspendu. En cas de fait grave, n'hésitez pas à porter plainte auprès des autorités : nous coopérerons avec elles si besoin.",
    resolutionTemplate:
      "Bonjour,\n\nNous avons examiné avec la plus grande attention votre signalement concernant le comportement du prestataire lors de la prestation \"{service}\" du {date}.\n\nSuite à notre enquête, nous confirmons {la suspension immédiate du compte / un avertissement formel / la résiliation du compte du prestataire}. Vous serez intégralement remboursé(e) du montant de {montant}€ sous 5 à 10 jours ouvrés.\n\nNous sommes profondément désolés pour ce que vous avez vécu. La sécurité et le respect de nos clients sont des priorités absolues. Si vous souhaitez engager des démarches juridiques, nous vous accompagnerons.\n\nCordialement,\nL'équipe Animigo",
  },
  {
    label: "Animal mal traité",
    slug: "animal_mal_traite",
    description: "L'animal n'a pas été correctement pris en charge",
    blocksPayment: true,
    sortOrder: 5,
    clientHelperMessage:
      "Le bien-être animal est notre priorité absolue. Pour traiter votre réclamation efficacement :\n\n• Décrivez précisément ce qui s'est passé (négligence, maltraitance, manque de soin…)\n• Joignez des photos ou vidéos de l'état de votre animal après la prestation\n• Si vous avez consulté un vétérinaire, joignez la facture et le rapport médical\n• Avez-vous des témoins ? Caméras de surveillance ?\n\nLe paiement au prestataire est immédiatement suspendu. Pour les cas graves, nous signalons systématiquement aux autorités compétentes (DDPP, vétérinaire référent).",
    resolutionTemplate:
      "Bonjour,\n\nVotre signalement concernant la prise en charge de votre animal lors de la prestation \"{service}\" du {date} a fait l'objet d'une enquête approfondie.\n\nAu vu des éléments transmis ({photos / certificat vétérinaire / témoignages}), nous confirmons {la suspension immédiate / la résiliation du compte} du prestataire. Vous serez intégralement remboursé(e) ({montant}€) et nous prendrons en charge {les frais vétérinaires sur présentation de la facture / un dédommagement complémentaire de X€}.\n\n{Si applicable : Nous procédons également à un signalement auprès des autorités compétentes.}\n\nNous tenons à vous exprimer nos plus sincères regrets et restons mobilisés à vos côtés.\n\nCordialement,\nL'équipe Animigo",
  },
  {
    label: "Non-respect des consignes",
    slug: "non_respect_consignes",
    description: "Les consignes données n'ont pas été respectées",
    blocksPayment: false,
    sortOrder: 6,
    clientHelperMessage:
      "Pour que nous puissions traiter votre réclamation, précisez :\n\n• Les consignes que vous aviez données (alimentation, médicaments, horaires, lieu…) — idéalement en joignant les messages où vous les avez transmises\n• Quelles consignes spécifiquement n'ont pas été respectées\n• Les conséquences sur votre animal ou votre logement\n• Photos/preuves si applicables\n\nUne consigne claire et écrite renforce considérablement votre dossier.",
    resolutionTemplate:
      "Bonjour,\n\nNous avons étudié votre réclamation concernant le non-respect des consignes lors de la prestation \"{service}\" du {date}.\n\nAprès analyse des consignes transmises et de la réponse du prestataire, nous {confirmons le manquement et vous accordons un avoir de X€ / un remboursement partiel de X€}. Le crédit sera disponible sur votre compte sous 24h.\n\nNous avons rappelé au prestataire l'importance de respecter scrupuleusement les consignes des clients. Merci pour votre vigilance, qui contribue à améliorer la qualité du service.\n\nCordialement,\nL'équipe Animigo",
  },
  {
    label: "Autre",
    slug: "autre",
    description: "Autre motif de réclamation",
    blocksPayment: false,
    sortOrder: 7,
    clientHelperMessage:
      "Décrivez-nous précisément ce qui s'est passé. Pour faciliter le traitement :\n\n• Soyez factuel(le) et chronologique\n• Joignez tout élément utile (photos, captures d'échanges, factures, etc.)\n• Indiquez clairement ce que vous attendez comme résolution\n\nNotre équipe support reviendra vers vous sous 48h ouvrées.",
    resolutionTemplate:
      "Bonjour,\n\nNous avons examiné votre réclamation concernant la prestation \"{service}\" du {date}.\n\nAu vu des éléments fournis et après échange avec le prestataire, nous vous proposons la résolution suivante : {décrire la résolution proposée — remboursement, avoir, geste commercial, etc.}.\n\nNous restons à votre disposition pour toute question complémentaire. Merci de votre confiance.\n\nCordialement,\nL'équipe Animigo",
  },
];

export const getAll = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const reasons = await ctx.db.query("disputeReasons").collect();
    return reasons.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const create = mutation({
  args: {
    token: v.string(),
    label: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    blocksPayment: v.boolean(),
    clientHelperMessage: v.optional(v.string()),
    resolutionTemplate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const now = Date.now();

    // Trouver le sortOrder max
    const all = await ctx.db.query("disputeReasons").collect();
    const maxOrder = all.reduce((max, r) => Math.max(max, r.sortOrder), 0);

    const id = await ctx.db.insert("disputeReasons", {
      label: args.label,
      slug: args.slug,
      description: args.description,
      blocksPayment: args.blocksPayment,
      clientHelperMessage: args.clientHelperMessage,
      resolutionTemplate: args.resolutionTemplate,
      isActive: true,
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

export const update = mutation({
  args: {
    token: v.string(),
    id: v.id("disputeReasons"),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    blocksPayment: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    clientHelperMessage: v.optional(v.string()),
    resolutionTemplate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const reason = await ctx.db.get(args.id);
    if (!reason) throw new Error("Motif non trouvé");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.label !== undefined) updates.label = args.label;
    if (args.description !== undefined) updates.description = args.description;
    if (args.blocksPayment !== undefined) updates.blocksPayment = args.blocksPayment;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.clientHelperMessage !== undefined) updates.clientHelperMessage = args.clientHelperMessage;
    if (args.resolutionTemplate !== undefined) updates.resolutionTemplate = args.resolutionTemplate;

    await ctx.db.patch(args.id, updates);

    // Si on toggle blocksPayment, retourner le nb de disputes ACTIVES qui
    // utilisent ce motif (pour que l'UI puisse proposer la propagation).
    let activeDisputesUsingReason: number | undefined;
    if (args.blocksPayment !== undefined && args.blocksPayment !== reason.blocksPayment) {
      const allDisputes = await ctx.db
        .query("disputes")
        .filter((q) => q.eq(q.field("reasonId"), args.id))
        .collect();
      activeDisputesUsingReason = allDisputes.filter(
        (d) => d.status === "open" || d.status === "investigating"
      ).length;
    }
    return { success: true, activeDisputesUsingReason };
  },
});

/**
 * Propage rétroactivement un changement de blocksPayment sur les disputes
 * ACTIVES (open/investigating) utilisant un motif. Pour chaque dispute :
 *  - met à jour `dispute.paymentBlocked`
 *  - patch la mission (`readyForPayout`, `announcerPaymentStatus`) en
 *    cohérence avec la nouvelle valeur
 */
export const applyBlocksPaymentChangeToActiveDisputes = mutation({
  args: {
    token: v.string(),
    reasonId: v.id("disputeReasons"),
    newBlocksPayment: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const now = Date.now();

    const disputes = await ctx.db
      .query("disputes")
      .filter((q) => q.eq(q.field("reasonId"), args.reasonId))
      .collect();
    const active = disputes.filter(
      (d) => d.status === "open" || d.status === "investigating"
    );

    let updated = 0;
    for (const d of active) {
      if (d.paymentBlocked === args.newBlocksPayment) continue;

      await ctx.db.patch(d._id, {
        paymentBlocked: args.newBlocksPayment,
        updatedAt: now,
      });

      const mission = await ctx.db.get(d.missionId);
      if (!mission) continue;

      if (args.newBlocksPayment) {
        // Bloquer le payout
        await ctx.db.patch(d.missionId, {
          readyForPayout: false,
          announcerPaymentStatus: "not_due",
          updatedAt: now,
        });
      } else {
        // Débloquer SAUF si payout déjà parti / mission annulée / refundée
        const skipUnblock =
          mission.paymentStatus === "refunded" ||
          mission.status === "cancelled" ||
          mission.announcerPaymentStatus === "paid" ||
          mission.announcerPaymentStatus === "transferred";
        if (!skipUnblock) {
          await ctx.db.patch(d.missionId, {
            readyForPayout: true,
            updatedAt: now,
          });
        }
      }
      updated++;
    }

    return { success: true, updated };
  },
});

export const reorder = mutation({
  args: {
    token: v.string(),
    orderedIds: v.array(v.id("disputeReasons")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const now = Date.now();

    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], {
        sortOrder: i + 1,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const seedDefaults = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const now = Date.now();

    for (const reason of DEFAULT_REASONS) {
      const existing = await ctx.db
        .query("disputeReasons")
        .withIndex("by_slug", (q) => q.eq("slug", reason.slug))
        .first();

      if (!existing) {
        await ctx.db.insert("disputeReasons", {
          ...reason,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true, message: "Motifs par défaut initialisés" };
  },
});

/**
 * Met à jour les motifs existants avec les templates par défaut
 * (clientHelperMessage + resolutionTemplate) sans écraser les autres champs.
 * À appeler après l'ajout des champs templates au schéma pour rattraper
 * les motifs déjà créés sans templates.
 */
export const seedTemplatesIntoExisting = mutation({
  args: {
    token: v.string(),
    overwrite: v.optional(v.boolean()), // si true, écrase les templates déjà saisis
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const now = Date.now();
    let updated = 0;

    for (const reason of DEFAULT_REASONS) {
      const existing = await ctx.db
        .query("disputeReasons")
        .withIndex("by_slug", (q) => q.eq("slug", reason.slug))
        .first();
      if (!existing) continue;

      const patch: Record<string, unknown> = { updatedAt: now };
      const wantOverwrite = args.overwrite ?? false;
      if (wantOverwrite || !existing.clientHelperMessage) {
        patch.clientHelperMessage = reason.clientHelperMessage;
      }
      if (wantOverwrite || !existing.resolutionTemplate) {
        patch.resolutionTemplate = reason.resolutionTemplate;
      }
      // Ne patche que s'il y a quelque chose à changer (au-delà de updatedAt)
      if (Object.keys(patch).length > 1) {
        await ctx.db.patch(existing._id, patch);
        updated++;
      }
    }

    return {
      success: true,
      updated,
      message: `${updated} motif(s) mis à jour avec les templates par défaut`,
    };
  },
});
