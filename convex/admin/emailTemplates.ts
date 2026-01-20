import { mutation, query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";

// Templates par défaut du système
const DEFAULT_TEMPLATES = [
  {
    slug: "verification",
    name: "Vérification d'email - Inscription",
    description: "Email envoyé après l'inscription pour vérifier l'adresse email",
    subject: "Confirmez votre adresse email - {{siteName}}",
    availableVariables: [
      { key: "firstName", description: "Prénom de l'utilisateur", example: "Jean" },
      { key: "verificationUrl", description: "Lien de vérification", example: "https://..." },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "expirationHours", description: "Heures avant expiration", example: "24" },
    ],
    isSystem: true,
  },
  {
    slug: "verification_reservation",
    name: "Vérification d'email - Réservation",
    description: "Email envoyé lors d'une réservation par un nouvel utilisateur",
    subject: "Confirmez votre email pour valider votre réservation - {{siteName}}",
    availableVariables: [
      { key: "firstName", description: "Prénom de l'utilisateur", example: "Jean" },
      { key: "verificationUrl", description: "Lien de vérification", example: "https://..." },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "expirationHours", description: "Heures avant expiration", example: "24" },
      { key: "serviceName", description: "Nom du service réservé", example: "Garde de chien" },
      { key: "announcerName", description: "Nom de l'annonceur", example: "Marie D." },
      { key: "startDate", description: "Date de début", example: "15/02/2025" },
      { key: "endDate", description: "Date de fin", example: "17/02/2025" },
      { key: "totalAmount", description: "Montant total", example: "150,00 €" },
    ],
    isSystem: true,
  },
  {
    slug: "welcome",
    name: "Bienvenue",
    description: "Email envoyé après la confirmation de l'email",
    subject: "Bienvenue sur {{siteName}} ! 🐾",
    availableVariables: [
      { key: "firstName", description: "Prénom de l'utilisateur", example: "Jean" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "dashboardUrl", description: "Lien vers le dashboard", example: "https://..." },
    ],
    isSystem: true,
  },
  {
    slug: "reservation_confirmed",
    name: "Réservation confirmée",
    description: "Email envoyé au client après confirmation de l'email (avec réservation)",
    subject: "Votre réservation est confirmée ! - {{siteName}}",
    availableVariables: [
      { key: "firstName", description: "Prénom du client", example: "Jean" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "announcerName", description: "Nom de l'annonceur", example: "Marie D." },
      { key: "startDate", description: "Date de début", example: "15/02/2025" },
      { key: "endDate", description: "Date de fin", example: "17/02/2025" },
      { key: "startTime", description: "Heure de début", example: "14:00" },
      { key: "animalName", description: "Nom de l'animal", example: "Max" },
      { key: "animalType", description: "Type d'animal", example: "Chien" },
      { key: "totalAmount", description: "Montant total", example: "150,00 €" },
      { key: "location", description: "Lieu de la prestation", example: "Paris 15ème" },
    ],
    isSystem: true,
  },
  {
    slug: "new_reservation_request",
    name: "Nouvelle demande de réservation",
    description: "Email envoyé à l'annonceur quand il reçoit une nouvelle demande",
    subject: "Nouvelle demande de réservation ! - {{siteName}}",
    availableVariables: [
      { key: "announcerFirstName", description: "Prénom de l'annonceur", example: "Marie" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "clientName", description: "Nom du client", example: "Jean D." },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "startDate", description: "Date de début", example: "15/02/2025" },
      { key: "endDate", description: "Date de fin", example: "17/02/2025" },
      { key: "animalName", description: "Nom de l'animal", example: "Max" },
      { key: "animalType", description: "Type d'animal", example: "Chien" },
      { key: "totalAmount", description: "Montant total", example: "150,00 €" },
      { key: "dashboardUrl", description: "Lien vers le dashboard", example: "https://..." },
    ],
    isSystem: true,
  },
  {
    slug: "reservation_accepted",
    name: "Réservation acceptée - Paiement requis",
    description: "Email envoyé au client quand l'annonceur accepte la réservation avec lien de paiement Stripe",
    subject: "Votre réservation a été acceptée - Finalisez le paiement ! - {{siteName}}",
    availableVariables: [
      { key: "firstName", description: "Prénom du client", example: "Jean" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "announcerName", description: "Nom de l'annonceur", example: "Marie D." },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "startDate", description: "Date de début", example: "15/02/2025" },
      { key: "endDate", description: "Date de fin", example: "17/02/2025" },
      { key: "animalName", description: "Nom de l'animal", example: "Max" },
      { key: "paymentUrl", description: "Lien de paiement Stripe", example: "https://checkout.stripe.com/..." },
      { key: "totalAmount", description: "Montant total", example: "150,00 €" },
      { key: "expirationTime", description: "Durée de validité du lien", example: "1 heure" },
    ],
    isSystem: true,
  },
];

// HTML par défaut pour les templates
const getDefaultHtmlContent = (slug: string): string => {
  const baseStyle = `
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; }
    .header p { margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; }
    .content { padding: 40px 30px; }
    .content h2 { margin: 0 0 20px 0; color: #1e293b; font-size: 24px; }
    .content p { margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6; }
    .btn { display: inline-block; background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px; }
    .footer { background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 0; color: #94a3b8; font-size: 12px; }
    .info-box { margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9; }
    .warning-box { margin: 20px 0; padding: 20px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b; }
  `;

  switch (slug) {
    case "verification":
      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyle}</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>🐾 {{siteName}}</h1>
      <p>La plateforme de garde d'animaux de confiance</p>
    </div>
    <div class="content">
      <h2>Bonjour {{firstName}} ! 👋</h2>
      <p>Merci de vous être inscrit(e) sur {{siteName}} ! Pour finaliser votre inscription et accéder à toutes les fonctionnalités, veuillez confirmer votre adresse email.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{verificationUrl}}" class="btn">✓ Confirmer mon email</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
      <p style="word-break: break-all;"><a href="{{verificationUrl}}" style="color: #FF6B6B; font-size: 13px;">{{verificationUrl}}</a></p>
      <div class="warning-box">
        <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ Ce lien expire dans {{expirationHours}} heures.</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "verification_reservation":
      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyle}</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>🐾 {{siteName}}</h1>
      <p>Confirmez votre email pour finaliser votre réservation</p>
    </div>
    <div class="content">
      <h2>Bonjour {{firstName}} ! 👋</h2>
      <p>Vous avez effectué une réservation sur {{siteName}}. Pour la valider, veuillez confirmer votre adresse email.</p>

      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Récapitulatif de votre réservation</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant :</strong> {{totalAmount}}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{verificationUrl}}" class="btn">✓ Confirmer et valider ma réservation</a>
      </div>

      <div class="warning-box">
        <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ Ce lien expire dans {{expirationHours}} heures. Sans confirmation, votre réservation sera annulée.</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "welcome":
      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyle} .header { background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); }</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>🎉 Bienvenue !</h1>
    </div>
    <div class="content">
      <h2>Votre compte est confirmé, {{firstName}} !</h2>
      <p>Félicitations ! Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant profiter de toutes les fonctionnalités de {{siteName}}.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" class="btn" style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%);">Accéder à mon espace</a>
      </div>
    </div>
    <div class="footer">
      <p>© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "reservation_confirmed":
      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyle} .header { background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); }</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>✅ Réservation confirmée !</h1>
    </div>
    <div class="content">
      <h2>Félicitations {{firstName}} !</h2>
      <p>Votre email est maintenant vérifié et votre demande de réservation a été envoyée à {{announcerName}}. Vous recevrez une notification dès que votre réservation sera acceptée.</p>

      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Récapitulatif</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> {{animalName}} ({{animalType}})</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Lieu :</strong> {{location}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant total :</strong> {{totalAmount}}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" class="btn" style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%);">Voir ma réservation</a>
      </div>

      <p style="font-size: 14px; color: #64748b;">Une fois acceptée par le prestataire, vous recevrez un lien de paiement pour finaliser votre réservation.</p>
    </div>
    <div class="footer">
      <p>© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "new_reservation_request":
      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyle} .header { background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); }</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>🔔 Nouvelle réservation !</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{announcerFirstName}} !</h2>
      <p>Vous avez reçu une nouvelle demande de réservation de la part de {{clientName}}.</p>

      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Détails de la demande</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> {{animalName}} ({{animalType}})</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant :</strong> {{totalAmount}}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" class="btn" style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);">Voir et répondre</a>
      </div>

      <p style="font-size: 14px; color: #64748b;">Répondez rapidement pour offrir une bonne expérience à vos clients !</p>
    </div>
    <div class="footer">
      <p>© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "reservation_accepted":
      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyle} .header { background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); }</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>🎉 Bonne nouvelle !</h1>
      <p>Votre réservation a été acceptée</p>
    </div>
    <div class="content">
      <h2>Bonjour {{firstName}} !</h2>
      <p>{{announcerName}} a accepté votre demande de réservation. Pour confirmer définitivement votre prestation, veuillez procéder au paiement sécurisé.</p>

      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Récapitulatif</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> {{animalName}}</p>
        <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold; color: #0369a1;">Montant : {{totalAmount}}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{paymentUrl}}" class="btn" style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%);">💳 Procéder au paiement</a>
      </div>

      <div class="warning-box">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          ⏰ <strong>Important :</strong> Ce lien expire dans {{expirationTime}}. Passé ce délai, vous devrez contacter {{announcerName}} pour une nouvelle demande.
        </p>
      </div>

      <div style="margin-top: 20px; padding: 15px; background-color: #ecfdf5; border-radius: 12px;">
        <p style="margin: 0; color: #065f46; font-size: 14px;">
          🔒 <strong>Paiement sécurisé :</strong> Vos fonds seront réservés (non débités) jusqu'à la réalisation de la prestation. Vous pourrez confirmer la fin de prestation pour déclencher le paiement définitif. Si vous ne confirmez pas sous 48h après la fin, le paiement sera automatiquement finalisé.
        </p>
      </div>
    </div>
    <div class="footer">
      <p>© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    default:
      return "";
  }
};

// Query: Récupérer tous les templates
export const getAll = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    return await ctx.db.query("emailTemplates").collect();
  },
});

// Query: Récupérer un template par slug
export const getBySlug = query({
  args: {
    token: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    return await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Mutation: Mettre à jour un template
export const update = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
    subject: v.string(),
    htmlContent: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const template = await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!template) {
      throw new Error("Template non trouvé");
    }

    await ctx.db.patch(template._id, {
      subject: args.subject,
      htmlContent: args.htmlContent,
      name: args.name ?? template.name,
      description: args.description ?? template.description,
      isActive: args.isActive ?? template.isActive,
      updatedAt: Date.now(),
      updatedBy: user._id,
    });

    return { success: true };
  },
});

// Mutation: Initialiser les templates par défaut
export const seedDefaults = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const now = Date.now();

    for (const template of DEFAULT_TEMPLATES) {
      const existing = await ctx.db
        .query("emailTemplates")
        .withIndex("by_slug", (q) => q.eq("slug", template.slug))
        .first();

      if (!existing) {
        await ctx.db.insert("emailTemplates", {
          ...template,
          htmlContent: getDefaultHtmlContent(template.slug),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true, message: "Templates initialisés" };
  },
});

// Mutation: Réinitialiser un template à sa valeur par défaut
export const resetToDefault = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const template = await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!template) {
      throw new Error("Template non trouvé");
    }

    const defaultTemplate = DEFAULT_TEMPLATES.find((t) => t.slug === args.slug);
    if (!defaultTemplate) {
      throw new Error("Pas de template par défaut pour ce slug");
    }

    await ctx.db.patch(template._id, {
      subject: defaultTemplate.subject,
      htmlContent: getDefaultHtmlContent(args.slug),
      updatedAt: Date.now(),
      updatedBy: user._id,
    });

    return { success: true };
  },
});

// Query interne: Récupérer un template par slug (sans auth pour les actions internes)
export const getTemplateBySlug = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!template || !template.isActive) {
      // Retourner le template par défaut si non trouvé ou inactif
      const defaultTemplate = DEFAULT_TEMPLATES.find((t) => t.slug === args.slug);
      if (defaultTemplate) {
        return {
          ...defaultTemplate,
          htmlContent: getDefaultHtmlContent(args.slug),
          isActive: true,
        };
      }
      return null;
    }

    return template;
  },
});
