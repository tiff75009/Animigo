import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";

// Pages légales par défaut
const DEFAULT_LEGAL_PAGES = [
  {
    slug: "cgv",
    title: "Conditions Générales de Vente",
    content: `<h1>Conditions Générales de Vente</h1>
<p>Les présentes conditions générales de vente régissent les relations contractuelles entre la plateforme Animigo et ses utilisateurs.</p>
<h2>Article 1 - Objet</h2>
<p>Les présentes CGV définissent les droits et obligations des parties dans le cadre de la vente de services sur la plateforme Animigo.</p>
<h2>Article 2 - Prix et paiement</h2>
<p>Les prix sont indiqués en euros TTC. Le paiement s'effectue de manière sécurisée via notre prestataire Stripe.</p>
<h2>Article 3 - Droit de rétractation</h2>
<p>Conformément aux dispositions légales, vous disposez d'un délai de 14 jours pour exercer votre droit de rétractation.</p>`,
  },
  {
    slug: "cgu",
    title: "Conditions Générales d'Utilisation",
    content: `<h1>Conditions Générales d'Utilisation</h1>
<p>En utilisant la plateforme Animigo, vous acceptez les présentes conditions d'utilisation.</p>
<h2>Article 1 - Accès au service</h2>
<p>L'accès à la plateforme est gratuit. L'utilisation des services nécessite la création d'un compte utilisateur.</p>
<h2>Article 2 - Inscription</h2>
<p>L'utilisateur s'engage à fournir des informations exactes lors de son inscription et à les maintenir à jour.</p>
<h2>Article 3 - Responsabilités</h2>
<p>Chaque utilisateur est responsable de l'utilisation de son compte et de la confidentialité de ses identifiants.</p>`,
  },
  {
    slug: "privacy",
    title: "Politique de Confidentialité",
    content: `<h1>Politique de Confidentialité</h1>
<p>La protection de vos données personnelles est une priorité pour Animigo.</p>
<h2>Article 1 - Collecte des données</h2>
<p>Nous collectons uniquement les données nécessaires à la fourniture de nos services : nom, prénom, email, téléphone.</p>
<h2>Article 2 - Utilisation des données</h2>
<p>Vos données sont utilisées pour la gestion de votre compte, le traitement des réservations et la communication avec les prestataires.</p>
<h2>Article 3 - Vos droits</h2>
<p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles.</p>`,
  },
  {
    slug: "cancellation",
    title: "Conditions d'Annulation",
    content: `<h1>Conditions d'Annulation</h1>
<p>Les présentes conditions définissent les modalités d'annulation des réservations sur Animigo.</p>
<h2>Article 1 - Annulation par le client</h2>
<p>Le client peut annuler sa réservation sans frais jusqu'à 48h avant le début de la prestation.</p>
<h2>Article 2 - Annulation par le prestataire</h2>
<p>Le prestataire peut annuler une réservation en cas de force majeure. Le client sera intégralement remboursé.</p>
<h2>Article 3 - Remboursement</h2>
<p>Les remboursements sont effectués sous 5 à 10 jours ouvrés sur le moyen de paiement utilisé lors de la réservation.</p>`,
  },
];

// Query: Liste toutes les pages légales
export const listLegalPages = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const pages = await ctx.db.query("legalPages").collect();

    // Trier par ordre: cgv, cgu, privacy, cancellation
    const order = ["cgv", "cgu", "privacy", "cancellation"];
    return pages.sort((a, b) => {
      const indexA = order.indexOf(a.slug);
      const indexB = order.indexOf(b.slug);
      return indexA - indexB;
    });
  },
});

// Query: Récupère une page par slug
export const getLegalPage = query({
  args: {
    token: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    return await ctx.db
      .query("legalPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Mutation: Met à jour une page légale (en brouillon)
export const saveDraft = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const page = await ctx.db
      .query("legalPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!page) {
      throw new Error("Page légale non trouvée");
    }

    await ctx.db.patch(page._id, {
      title: args.title,
      content: args.content,
      status: "draft",
      lastModifiedBy: user._id,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation: Met à jour et publie une page légale
export const updateLegalPage = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const page = await ctx.db
      .query("legalPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!page) {
      throw new Error("Page légale non trouvée");
    }

    const now = Date.now();
    await ctx.db.patch(page._id, {
      title: args.title,
      content: args.content,
      lastModifiedBy: user._id,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Mutation: Publie une page légale
export const publishLegalPage = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const page = await ctx.db
      .query("legalPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!page) {
      throw new Error("Page légale non trouvée");
    }

    const now = Date.now();
    await ctx.db.patch(page._id, {
      status: "published",
      version: page.version + 1,
      publishedAt: now,
      lastModifiedBy: user._id,
      updatedAt: now,
    });

    return { success: true, version: page.version + 1 };
  },
});

// Mutation: Initialise les pages légales par défaut
export const seedDefaultPages = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const now = Date.now();
    let created = 0;

    for (const page of DEFAULT_LEGAL_PAGES) {
      const existing = await ctx.db
        .query("legalPages")
        .withIndex("by_slug", (q) => q.eq("slug", page.slug))
        .first();

      if (!existing) {
        await ctx.db.insert("legalPages", {
          ...page,
          version: 1,
          status: "draft",
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }

    return { success: true, created };
  },
});
