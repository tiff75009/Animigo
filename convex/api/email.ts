"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
// Removed: import { Resend } from "resend"; - using fetch directly instead
import { internal } from "../_generated/api";

// Helper pour remplacer les variables dans un template
function replaceVariables(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, String(value ?? ""));
  }
  return result;
}

// Helper pour formater un prix en euros
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

// Helper pour formater une date
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

// Templates HTML par défaut (fallback si pas en base)
const DEFAULT_TEMPLATES: Record<string, { subject: string; html: string }> = {
  verification: {
    subject: "Confirmez votre adresse email - {{siteName}}",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🐾 {{siteName}}</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Bonjour {{firstName}} ! 👋</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        Merci de vous être inscrit(e) sur {{siteName}} ! Pour finaliser votre inscription, veuillez confirmer votre adresse email.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{verificationUrl}}" style="display: inline-block; background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px;">✓ Confirmer mon email</a>
      </div>
      <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ Ce lien expire dans {{expirationHours}} heures.</p>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`,
  },
  verification_reservation: {
    subject: "Confirmez votre email pour valider votre réservation - {{siteName}}",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🐾 {{siteName}}</h1>
      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Confirmez votre email pour finaliser votre réservation</p>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Bonjour {{firstName}} ! 👋</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        Vous avez effectué une réservation sur {{siteName}}. Pour la valider, veuillez confirmer votre adresse email.
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Récapitulatif de votre réservation</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant :</strong> {{totalAmount}}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{verificationUrl}}" style="display: inline-block; background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px;">✓ Confirmer et valider ma réservation</a>
      </div>
      <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ Ce lien expire dans {{expirationHours}} heures. Sans confirmation, votre réservation sera annulée.</p>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`,
  },
  welcome: {
    subject: "Bienvenue sur {{siteName}} ! 🐾",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 Bienvenue !</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Votre compte est confirmé, {{firstName}} !</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        Félicitations ! Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant profiter de toutes les fonctionnalités de {{siteName}}.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" style="display: inline-block; background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px;">Accéder à mon espace</a>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`,
  },
  reservation_confirmed: {
    subject: "Votre réservation est confirmée ! - {{siteName}}",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">✅ Réservation confirmée !</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Félicitations {{firstName}} !</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        Votre email est maintenant vérifié et votre demande de réservation a été envoyée à {{announcerName}}. Vous recevrez une notification dès que votre réservation sera acceptée.
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Récapitulatif</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> {{animalName}} ({{animalType}})</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Lieu :</strong> {{location}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant total :</strong> {{totalAmount}}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" style="display: inline-block; background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px;">Voir ma réservation</a>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`,
  },
  new_reservation_request: {
    subject: "Nouvelle demande de réservation ! - {{siteName}}",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🔔 Nouvelle réservation !</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Bonjour {{announcerFirstName}} !</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        Vous avez reçu une nouvelle demande de réservation de la part de {{clientName}}.
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Détails de la demande</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> {{animalName}} ({{animalType}})</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant :</strong> {{totalAmount}}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px;">Voir et répondre</a>
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`,
  },
};

// Helper pour récupérer un template (utilise les templates par défaut - bypass database pour éviter le bug des appels internes)
function getTemplate(
  slug: string
): { subject: string; htmlContent: string } | null {
  // Utiliser uniquement les templates par défaut (contourne le bug ctx.runQuery)
  const defaultTemplate = DEFAULT_TEMPLATES[slug];
  if (defaultTemplate) {
    console.log(`Using default template for: ${slug}`);
    return {
      subject: defaultTemplate.subject,
      htmlContent: defaultTemplate.html,
    };
  }

  console.error(`Template not found: ${slug}`);
  return null;
}

// Action pour envoyer un email de vérification
export const sendVerificationEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    token: v.string(),
    context: v.optional(v.union(v.literal("registration"), v.literal("reservation"))),
    reservationData: v.optional(v.object({
      serviceName: v.string(),
      announcerName: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      startTime: v.optional(v.string()),
      animalName: v.optional(v.string()),
      location: v.optional(v.string()),
      totalAmount: v.number(),
    })),
    // Config email passée depuis la mutation (contourne le bug ctx.runQuery sur self-hosted)
    emailConfig: v.optional(v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    })),
    // URL de l'application passée depuis la mutation
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("=== sendVerificationEmail START ===");
    console.log("Args received:", { userId: args.userId, email: args.email, context: args.context });

    try {
      // Utiliser la config passée en argument, sinon fallback sur env vars
      const apiKey = args.emailConfig?.apiKey || process.env.RESEND_API_KEY;
      const fromEmail = args.emailConfig?.fromEmail || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const fromName = args.emailConfig?.fromName || process.env.RESEND_FROM_NAME || "Animigo";

      console.log("Email config:", {
        hasApiKey: !!apiKey,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + "..." : "none",
        fromEmail,
        fromName,
        source: args.emailConfig ? "from mutation args" : "from env vars",
      });

      if (!apiKey) {
        console.error("No API key configured (neither in args nor env vars)");
        return { success: false, error: "Email service not configured" };
      }

      // Valider le format de la clé API Resend (doit commencer par "re_")
      if (!apiKey.startsWith("re_")) {
        console.error("Invalid Resend API key format. Must start with 're_'");
        return { success: false, error: "Invalid API key format" };
      }
    const siteName = "Animigo";
    // Utiliser l'URL passée en argument (depuis la DB), sinon fallback sur env var, sinon localhost
    const appUrl = args.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${appUrl}/verify-email?token=${args.token}`;
    console.log("App URL source:", args.appUrl ? "from DB config" : (process.env.NEXT_PUBLIC_APP_URL ? "from env var" : "default localhost"));
    console.log("Verification URL:", verificationUrl);

    // Choisir le bon template selon le contexte
    const templateSlug = args.context === "reservation" ? "verification_reservation" : "verification";
    const template = getTemplate(templateSlug);

    if (!template) {
      console.error(`Template ${templateSlug} not found`);
      return { success: false, error: "Template not found" };
    }

    // Préparer les variables
    const variables: Record<string, string | number> = {
      firstName: args.firstName,
      verificationUrl,
      siteName,
      expirationHours: 24,
    };

    // Ajouter les variables de réservation si présentes
    if (args.reservationData) {
      variables.serviceName = args.reservationData.serviceName;
      variables.announcerName = args.reservationData.announcerName;
      variables.startDate = formatDate(args.reservationData.startDate);
      variables.endDate = formatDate(args.reservationData.endDate);
      variables.totalAmount = formatPrice(args.reservationData.totalAmount);
      if (args.reservationData.startTime) {
        variables.startTime = args.reservationData.startTime;
      }
      if (args.reservationData.animalName) {
        variables.animalName = args.reservationData.animalName;
      }
      if (args.reservationData.location) {
        variables.location = args.reservationData.location;
      }
    }

    const subject = replaceVariables(template.subject, variables);
    const html = replaceVariables(template.htmlContent, variables);

    console.log("Attempting to send email:", {
      to: args.email,
      from: `${fromName} <${fromEmail}>`,
      subject,
    });

    // Utiliser fetch directement au lieu du SDK Resend pour debug
    try {
      console.log("Making direct fetch to Resend API...");

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [args.email],
          subject,
          html,
        }),
      });

      console.log("Resend API response status:", response.status);

      const responseText = await response.text();
      console.log("Resend API response body:", responseText.substring(0, 500));

      if (!response.ok) {
        throw new Error(`Resend API error: ${response.status} - ${responseText}`);
      }

      const result = JSON.parse(responseText);
      console.log("Email sent successfully:", result);

      // Note: Email logging désactivé temporairement car ctx.runMutation échoue sur self-hosted
      // await ctx.runMutation(internal.api.emailInternal.logEmail, {...});

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send email:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Note: Email logging désactivé temporairement car ctx.runMutation échoue sur self-hosted
      // await ctx.runMutation(internal.api.emailInternal.logEmail, {...});

      console.error("Failed to send verification email:", error);
      return { success: false, error: errorMessage };
    }
    // Fin du try intérieur (fetch)
    } catch (outerError: unknown) {
      // Catch pour le try extérieur (configs, template, etc.)
      console.error("=== OUTER ERROR in sendVerificationEmail ===");
      console.error("Error type:", typeof outerError);
      console.error("Error:", String(outerError));
      throw outerError;
    }
  },
});

// Action pour envoyer un email de bienvenue (après vérification simple)
export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
  },
  handler: async (ctx, args) => {
    const configs = await ctx.runQuery(internal.api.emailInternal.getEmailConfigs);

    if (!configs.apiKey) {
      return { success: false, error: "Email service not configured" };
    }

    // Note: Pour les tests, utilisez onboarding@resend.dev ou un domaine vérifié
    const fromEmail = configs.fromEmail || "onboarding@resend.dev";
    const fromName = configs.fromName || "Animigo";
    const siteName = "Animigo";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const template = await getTemplate(ctx, "welcome");
    if (!template) {
      return { success: false, error: "Template not found" };
    }

    const variables = {
      firstName: args.firstName,
      siteName,
      dashboardUrl: `${appUrl}/dashboard`,
    };

    const subject = replaceVariables(template.subject, variables);
    const html = replaceVariables(template.htmlContent, variables);

    const resend = new Resend(configs.apiKey);

    try {
      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: args.email,
        subject,
        html,
      });

      await ctx.runMutation(internal.api.emailInternal.logEmail, {
        to: args.email,
        from: `${fromName} <${fromEmail}>`,
        subject,
        template: "welcome",
        status: "sent",
        resendId: result.data?.id,
      });

      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Action pour envoyer l'email de confirmation de réservation (au client)
export const sendReservationConfirmedEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    reservation: v.object({
      serviceName: v.string(),
      announcerName: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      startTime: v.optional(v.string()),
      animalName: v.optional(v.string()),
      animalType: v.optional(v.string()),
      location: v.optional(v.string()),
      totalAmount: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const configs = await ctx.runQuery(internal.api.emailInternal.getEmailConfigs);

    if (!configs.apiKey) {
      return { success: false, error: "Email service not configured" };
    }

    // Note: Pour les tests, utilisez onboarding@resend.dev ou un domaine vérifié
    const fromEmail = configs.fromEmail || "onboarding@resend.dev";
    const fromName = configs.fromName || "Animigo";
    const siteName = "Animigo";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const template = await getTemplate(ctx, "reservation_confirmed");
    if (!template) {
      return { success: false, error: "Template not found" };
    }

    const variables = {
      firstName: args.firstName,
      siteName,
      dashboardUrl: `${appUrl}/dashboard`,
      serviceName: args.reservation.serviceName,
      announcerName: args.reservation.announcerName,
      startDate: formatDate(args.reservation.startDate),
      endDate: formatDate(args.reservation.endDate),
      startTime: args.reservation.startTime || "",
      animalName: args.reservation.animalName || "Animal",
      animalType: args.reservation.animalType || "",
      location: args.reservation.location || "",
      totalAmount: formatPrice(args.reservation.totalAmount),
    };

    const subject = replaceVariables(template.subject, variables);
    const html = replaceVariables(template.htmlContent, variables);

    const resend = new Resend(configs.apiKey);

    try {
      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: args.email,
        subject,
        html,
      });

      await ctx.runMutation(internal.api.emailInternal.logEmail, {
        to: args.email,
        from: `${fromName} <${fromEmail}>`,
        subject,
        template: "reservation_confirmed",
        status: "sent",
        resendId: result.data?.id,
      });

      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send reservation confirmed email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Action pour envoyer la notification de nouvelle réservation (à l'annonceur)
export const sendNewReservationRequestEmail = internalAction({
  args: {
    announcerEmail: v.string(),
    announcerFirstName: v.string(),
    clientName: v.string(),
    reservation: v.object({
      serviceName: v.string(),
      startDate: v.string(),
      endDate: v.string(),
      animalName: v.optional(v.string()),
      animalType: v.optional(v.string()),
      totalAmount: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const configs = await ctx.runQuery(internal.api.emailInternal.getEmailConfigs);

    if (!configs.apiKey) {
      return { success: false, error: "Email service not configured" };
    }

    // Note: Pour les tests, utilisez onboarding@resend.dev ou un domaine vérifié
    const fromEmail = configs.fromEmail || "onboarding@resend.dev";
    const fromName = configs.fromName || "Animigo";
    const siteName = "Animigo";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const template = await getTemplate(ctx, "new_reservation_request");
    if (!template) {
      return { success: false, error: "Template not found" };
    }

    const variables = {
      announcerFirstName: args.announcerFirstName,
      siteName,
      dashboardUrl: `${appUrl}/dashboard/missions`,
      clientName: args.clientName,
      serviceName: args.reservation.serviceName,
      startDate: formatDate(args.reservation.startDate),
      endDate: formatDate(args.reservation.endDate),
      animalName: args.reservation.animalName || "Animal",
      animalType: args.reservation.animalType || "",
      totalAmount: formatPrice(args.reservation.totalAmount),
    };

    const subject = replaceVariables(template.subject, variables);
    const html = replaceVariables(template.htmlContent, variables);

    const resend = new Resend(configs.apiKey);

    try {
      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: args.announcerEmail,
        subject,
        html,
      });

      await ctx.runMutation(internal.api.emailInternal.logEmail, {
        to: args.announcerEmail,
        from: `${fromName} <${fromEmail}>`,
        subject,
        template: "new_reservation_request",
        status: "sent",
        resendId: result.data?.id,
      });

      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send new reservation request email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Action publique pour renvoyer l'email de vérification
export const resendVerificationEmail = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.api.emailInternal.getUserByEmail, {
      email: args.email.toLowerCase(),
    });

    if (!user) {
      return { success: false, error: "Utilisateur non trouvé" };
    }

    if (user.emailVerified) {
      return { success: false, error: "Email déjà vérifié" };
    }

    const token = await ctx.runMutation(internal.api.emailInternal.createVerificationToken, {
      userId: user._id,
      email: user.email,
      context: "registration",
    });

    const result = await ctx.runAction(internal.api.email.sendVerificationEmail, {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      token,
      context: "registration",
    });

    return result;
  },
});

// Note: verifyEmail a été déplacé vers convex/public/emailVerify.ts (mutation au lieu d'action)
// car ctx.runMutation échoue dans les actions sur Convex self-hosted
