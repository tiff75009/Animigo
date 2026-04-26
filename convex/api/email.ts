// @ts-nocheck
"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
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

// Helpers formatage centralisés
import { formatPrice, formatDate } from "../lib/formatting";

// ─── Email Provider Helper ───────────────────────────────────────────────
// Envoie un email via Resend.

interface EmailSendParams {
  to: string;
  from: string;
  subject: string;
  html: string;
  resendApiKey?: string;
}

interface EmailSendResult {
  success: boolean;
  id?: string;
  error?: string;
}

// Helper pour logger un email de manière non-bloquante (Convex self-hosted: ctx.runMutation peut échouer)
async function safeLogEmail(ctx: any, logData: {
  to: string;
  from: string;
  subject: string;
  template: string;
  status: string;
  resendId?: string;
}) {
  try {
    await ctx.runMutation(internal.api.emailInternal.logEmail, logData);
  } catch (e) {
    console.warn("[logEmail] Failed to log email (Convex self-hosted limitation):", e instanceof Error ? e.message.substring(0, 100) : e);
  }
}

interface EmailAttachment {
  filename: string;
  content: string; // base64
  contentType?: string; // ex: "application/pdf"
}

async function sendEmailViaProvider(params: EmailSendParams & { attachments?: EmailAttachment[] }): Promise<EmailSendResult> {
  const { to, from, subject, html, resendApiKey, attachments } = params;

  if (!resendApiKey) {
    return { success: false, error: "No email provider configured (Resend API key missing)" };
  }

  try {
    const body: any = {
      from,
      to: [to],
      subject,
      html,
    };
    if (attachments && attachments.length > 0) {
      // Format Resend : { filename, content (base64) }
      body.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
      }));
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`[Resend] Email sent to ${to}: id=${result.id}`);
      return { success: true, id: result.id };
    }

    const errorText = await response.text();
    console.error(`[Resend] Failed (${response.status}): ${errorText}`);
    return { success: false, error: `Resend error: ${response.status} - ${errorText}` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Resend] Exception: ${msg}`);
    return { success: false, error: msg };
  }
}

// Templates HTML par défaut (fallback si pas en base)
// Utilise des <table> pour compatibilité Outlook/desktop + fallback background-color pour les gradients
const DEFAULT_TEMPLATES: Record<string, { subject: string; html: string }> = {
  verification: {
    subject: "Confirmez votre adresse email - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Confirmez votre email</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td align="center" style="background-color:#FF6B6B;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">&#128062; {{siteName}}</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{firstName}} !</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Merci de vous etre inscrit(e) sur {{siteName}} ! Pour finaliser votre inscription, veuillez confirmer votre adresse email.
        </p>
        <!-- Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{verificationUrl}}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" fillcolor="#FF6B6B" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Confirmer mon email</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{verificationUrl}}" style="display:inline-block;background-color:#FF6B6B;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Confirmer mon email</a><!--<![endif]-->
            </td>
          </tr>
        </table>
        <!-- Warning -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:20px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;">
              <p style="margin:0;color:#92400e;font-size:14px;">Ce lien expire dans {{expirationHours}} heures.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  verification_reservation: {
    subject: "Confirmez votre email pour valider votre reservation - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Confirmez votre email - Reservation</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td align="center" style="background-color:#FF6B6B;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">&#128062; {{siteName}}</h1>
        <p style="margin:10px 0 0 0;color:#ffffff;font-size:14px;">Confirmez votre email pour finaliser votre reservation</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{firstName}} !</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Vous avez effectue une reservation sur {{siteName}}. Pour la valider, veuillez confirmer votre adresse email.
        </p>
        <!-- Recap -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#0369a1;">Recapitulatif de votre reservation</p>
              <p style="margin:5px 0;color:#475569;"><strong>Service :</strong> {{serviceName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Montant :</strong> {{totalAmount}}</p>
            </td>
          </tr>
        </table>
        <!-- Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{verificationUrl}}" style="height:52px;v-text-anchor:middle;width:340px;" arcsize="50%" fillcolor="#FF6B6B" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Confirmer et valider ma reservation</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{verificationUrl}}" style="display:inline-block;background-color:#FF6B6B;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Confirmer et valider ma reservation</a><!--<![endif]-->
            </td>
          </tr>
        </table>
        <!-- Warning -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:20px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;">
              <p style="margin:0;color:#92400e;font-size:14px;">Ce lien expire dans {{expirationHours}} heures. Sans confirmation, votre reservation sera annulee.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  welcome: {
    subject: "Bienvenue sur {{siteName}} !",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Bienvenue</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td align="center" style="background-color:#4ECDC4;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">Bienvenue !</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Votre compte est confirme, {{firstName}} !</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Felicitations ! Votre adresse email a ete verifiee avec succes. Vous pouvez maintenant profiter de toutes les fonctionnalites de {{siteName}}.
        </p>
        <!-- Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{dashboardUrl}}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" fillcolor="#4ECDC4" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Acceder a mon espace</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{dashboardUrl}}" style="display:inline-block;background-color:#4ECDC4;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Acceder a mon espace</a><!--<![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  reservation_confirmed: {
    subject: "Votre reservation est confirmee ! - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Reservation confirmee</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td align="center" style="background-color:#4ECDC4;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">Reservation confirmee !</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Felicitations {{firstName}} !</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Votre email est maintenant verifie et votre demande de reservation a ete envoyee a {{announcerName}}. Vous recevrez une notification des que votre reservation sera acceptee.
        </p>
        <!-- Recap -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#0369a1;">Recapitulatif</p>
              <p style="margin:5px 0;color:#475569;"><strong>Service :</strong> {{serviceName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Animal :</strong> {{animalName}} ({{animalType}})</p>
              <p style="margin:5px 0;color:#475569;"><strong>Lieu :</strong> {{location}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Montant total :</strong> {{totalAmount}}</p>
            </td>
          </tr>
        </table>
        <!-- Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{dashboardUrl}}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" fillcolor="#4ECDC4" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Voir ma reservation</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{dashboardUrl}}" style="display:inline-block;background-color:#4ECDC4;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Voir ma reservation</a><!--<![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  new_reservation_request: {
    subject: "Nouvelle demande de reservation ! - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Nouvelle reservation</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td align="center" style="background-color:#8B5CF6;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">Nouvelle reservation !</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{announcerFirstName}} !</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Vous avez recu une nouvelle demande de reservation de la part de {{clientName}}.
        </p>
        <!-- Details -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#0369a1;">Details de la demande</p>
              <p style="margin:5px 0;color:#475569;"><strong>Service :</strong> {{serviceName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Dates :</strong> {{dateRange}}</p>
              {{timeRangeHtml}}
              {{overnightHtml}}
              <p style="margin:5px 0;color:#475569;"><strong>Animal :</strong> {{animalName}} ({{animalType}})</p>
              <p style="margin:5px 0;color:#475569;"><strong>Lieu :</strong> {{location}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Montant :</strong> {{totalAmount}}</p>
            </td>
          </tr>
        </table>
        <!-- Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{dashboardUrl}}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" fillcolor="#8B5CF6" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Voir et repondre</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{dashboardUrl}}" style="display:inline-block;background-color:#8B5CF6;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Voir et repondre</a><!--<![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  reservation_accepted: {
    subject: "Votre reservation a ete acceptee - Finalisez le paiement ! - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Reservation acceptee</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td align="center" style="background:linear-gradient(135deg,#4ECDC4 0%,#44A08D 100%);padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">Bonne nouvelle !</h1>
        <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Votre reservation a ete acceptee</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{firstName}} !</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          {{announcerName}} a accepte votre demande de reservation. Pour confirmer definitivement votre prestation, veuillez proceder au paiement securise.
        </p>
        <!-- Details -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#0369a1;">Recapitulatif</p>
              <p style="margin:5px 0;color:#475569;"><strong>Service :</strong> {{serviceName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Animal :</strong> {{animalName}}</p>
              <p style="margin:10px 0 0 0;font-size:20px;font-weight:bold;color:#0369a1;">Montant : {{totalAmount}}</p>
            </td>
          </tr>
        </table>
        <!-- Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{paymentUrl}}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" fillcolor="#4ECDC4" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Proceder au paiement</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{paymentUrl}}" style="display:inline-block;background:linear-gradient(135deg,#4ECDC4 0%,#44A08D 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Proceder au paiement</a><!--<![endif]-->
            </td>
          </tr>
        </table>
        <!-- Warning -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:15px;background-color:#fef3c7;border-radius:12px;">
              <p style="margin:0;color:#92400e;font-size:14px;">&#9200; <strong>Important :</strong> Ce lien expire dans {{expirationTime}}. Passe ce delai, la reservation sera automatiquement annulee.</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:15px;background-color:#ecfdf5;border-radius:12px;">
              <p style="margin:0;color:#065f46;font-size:14px;">&#128274; <strong>Paiement securise :</strong> Votre paiement sera encaisse immediatement pour confirmer la reservation.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  mission_auto_refused: {
    subject: "Votre reservation n'a pas ete acceptee a temps - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Reservation non acceptee</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <tr>
      <td align="center" style="background-color:#EF4444;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">Reservation non acceptee</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{clientName}},</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Malheureusement, votre reservation aupres de {{announcerName}} n'a pas ete acceptee dans le delai imparti.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#0369a1;">Details de la reservation</p>
              <p style="margin:5px 0;color:#475569;"><strong>Service :</strong> {{serviceName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;">
              <p style="margin:0;color:#92400e;font-size:14px;">Le prestataire n'a pas repondu a votre demande dans le delai prevu. La reservation a ete automatiquement annulee.</p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Nous vous invitons a rechercher un autre prestataire disponible pour votre besoin.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{searchUrl}}" style="height:52px;v-text-anchor:middle;width:300px;" arcsize="50%" fillcolor="#FF6B6B" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Rechercher un prestataire</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{searchUrl}}" style="display:inline-block;background-color:#FF6B6B;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Rechercher un prestataire</a><!--<![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  mission_auto_expired_client: {
    subject: "Votre reservation a expire (paiement non effectue) - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Reservation expiree</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <tr>
      <td align="center" style="background-color:#EF4444;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">Reservation expiree</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{clientName}},</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Votre reservation aupres de {{announcerName}} a expire car le paiement n'a pas ete effectue dans le delai imparti.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#0369a1;">Details de la reservation</p>
              <p style="margin:5px 0;color:#475569;"><strong>Service :</strong> {{serviceName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;">
              <p style="margin:0;color:#92400e;font-size:14px;">Le delai de paiement a expire. La reservation a ete automatiquement annulee.</p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Vous pouvez effectuer une nouvelle reservation si vous le souhaitez.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{searchUrl}}" style="height:52px;v-text-anchor:middle;width:300px;" arcsize="50%" fillcolor="#FF6B6B" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Rechercher un prestataire</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{searchUrl}}" style="display:inline-block;background-color:#FF6B6B;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Rechercher un prestataire</a><!--<![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  mission_auto_expired_announcer: {
    subject: "Une reservation a expire (paiement non effectue) - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Reservation expiree</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <tr>
      <td align="center" style="background-color:#EF4444;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">Reservation expiree</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{announcerName}},</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          La reservation de {{clientName}} pour votre service "{{serviceName}}" a expire car le paiement n'a pas ete effectue dans le delai imparti.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#0369a1;">Details de la reservation</p>
              <p style="margin:5px 0;color:#475569;"><strong>Service :</strong> {{serviceName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Client :</strong> {{clientName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;">
              <p style="margin:0;color:#92400e;font-size:14px;">Le client n'a pas effectue le paiement dans le delai prevu. Les creneaux concernes sont de nouveau disponibles.</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{dashboardUrl}}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" fillcolor="#FF6B6B" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Voir mon dashboard</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{dashboardUrl}}" style="display:inline-block;background-color:#FF6B6B;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Voir mon dashboard</a><!--<![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  password_reset: {
    subject: "Reinitialisation de votre mot de passe - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Reinitialisation mot de passe</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td align="center" style="background-color:#FF6B6B;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">{{siteName}}</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{firstName}} !</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Vous avez demande (ou un administrateur a initie) la reinitialisation de votre mot de passe sur {{siteName}}.
        </p>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Cliquez sur le bouton ci-dessous pour creer un nouveau mot de passe :
        </p>
        <!-- Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{resetUrl}}" style="height:52px;v-text-anchor:middle;width:320px;" arcsize="50%" fillcolor="#FF6B6B" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Reinitialiser mon mot de passe</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{resetUrl}}" style="display:inline-block;background-color:#FF6B6B;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Reinitialiser mon mot de passe</a><!--<![endif]-->
            </td>
          </tr>
        </table>
        <!-- Warning -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:20px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;">
              <p style="margin:0;color:#92400e;font-size:14px;">Ce lien expire dans {{expirationHours}} heure(s). Si vous n'etes pas a l'origine de cette demande, ignorez cet email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  mission_cancelled_by_client: {
    subject: "Une réservation a été annulée - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Réservation annulée</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <tr>
      <td align="center" style="background-color:#EF4444;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">Réservation annulée</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{announcerName}},</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          {{clientName}} a annulé sa réservation pour "{{serviceName}}".
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#0369a1;">Détails de la réservation</p>
              <p style="margin:5px 0;color:#475569;"><strong>Animal :</strong> {{animalName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Montant total :</strong> {{totalAmount}}</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#ecfdf5;border-left:4px solid #10b981;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#065f46;">Récapitulatif financier</p>
              <p style="margin:5px 0;color:#475569;"><strong>Remboursement client :</strong> {{refundAmount}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Montant conservé :</strong> {{announcerRetained}}</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:15px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0;color:#0369a1;font-size:14px;"><strong>Règle appliquée :</strong> {{cancellationRule}}</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;">
              <p style="margin:0 0 5px 0;font-weight:bold;color:#92400e;">Raison :</p>
              <p style="margin:0;color:#78350f;">{{cancellationReason}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits réservés.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  mission_cancelled_by_client_confirmation: {
    subject: "Votre réservation a été annulée - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Annulation confirmée</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <tr>
      <td align="center" style="background-color:#EF4444;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">Annulation confirmée</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{clientName}},</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Votre réservation pour "{{serviceName}}" a bien été annulée.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#0369a1;">Détails</p>
              <p style="margin:5px 0;color:#475569;"><strong>Animal :</strong> {{animalName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Montant total :</strong> {{totalAmount}}</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#ecfdf5;border-left:4px solid #10b981;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#065f46;">Remboursement</p>
              <p style="margin:5px 0;color:#475569;"><strong>Montant remboursé :</strong> {{refundAmount}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Commission retenue :</strong> {{platformFeeRetained}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Délai estimé :</strong> {{refundDelay}}</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:15px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0;color:#0369a1;font-size:14px;"><strong>Règle appliquée :</strong> {{cancellationRule}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits réservés.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  mission_validated_by_client: {
    subject: "{{clientName}} a validé votre service - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Service validé</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td align="center" style="background-color:#4ECDC4;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">&#10004; Service validé !</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{announcerName}},</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          {{clientName}} a confirmé la fin de votre service <strong>"{{serviceName}}"</strong> pour <strong>{{animalName}}</strong>.
        </p>
        <!-- Détails -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#0369a1;">Détails de la prestation</p>
              <p style="margin:5px 0;color:#475569;font-size:14px;"><strong>Service :</strong> {{serviceName}}</p>
              <p style="margin:5px 0;color:#475569;font-size:14px;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
              <p style="margin:5px 0;color:#475569;font-size:14px;"><strong>Client :</strong> {{clientName}}</p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Le versement sera effectué selon votre mode de paiement configuré. Le client peut désormais laisser un avis sur votre prestation.
        </p>
        <!-- CTA Voir l'avis -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{reviewUrl}}" style="height:52px;width:250px;v-text-anchor:middle;" arcsize="50%" fillcolor="#4ECDC4" stroke="false"><v:textbox><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Voir les avis</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{reviewUrl}}" style="display:inline-block;background-color:#4ECDC4;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Voir les avis</a><!--<![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits réservés.</p>
        <p style="margin:5px 0 0 0;color:#94a3b8;font-size:11px;">{{siteName}} — Plateforme de mise en relation pour services animaliers</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  payment_receipt: {
    subject: "Votre reçu de paiement - {{serviceName}} - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Reçu de paiement</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td align="center" style="background-color:#4ECDC4;padding:40px 30px;">
        <!--[if mso]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:100px;"><v:fill type="gradient" color="#4ECDC4" color2="#44A08D" angle="135"/><v:textbox inset="0,0,0,0" style="v-text-anchor:middle;"><![endif]-->
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">Reçu de paiement</h1>
        <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Réf. {{paymentRef}}</p>
        <!--[if mso]></v:textbox></v:rect><![endif]-->
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{clientName}},</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">Votre paiement a bien été enregistré. Voici le détail de votre transaction.</p>
        <!-- Détails prestation -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#0369a1;">Détails de la prestation</p>
              <p style="margin:5px 0;color:#475569;font-size:14px;"><strong>Service :</strong> {{serviceName}}</p>
              <p style="margin:5px 0;color:#475569;font-size:14px;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
              <p style="margin:5px 0;color:#475569;font-size:14px;"><strong>Prestataire :</strong> {{announcerName}} — {{announcerStatus}}</p>
              <p style="margin:5px 0;color:#475569;font-size:14px;">{{announcerCompany}}{{announcerSiret}}</p>
              <p style="margin:5px 0;color:#475569;font-size:14px;"><strong>Date de paiement :</strong> {{paymentDate}}</p>
              <p style="margin:5px 0;color:#475569;font-size:14px;"><strong>Moyen de paiement :</strong> {{paymentMethod}}</p>
            </td>
          </tr>
        </table>
        <!-- Détail prix -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <tr>
            <td colspan="2" style="padding:15px 20px;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;">
              <p style="margin:0;font-weight:bold;color:#1e293b;font-size:16px;">Détail des prix</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 20px;color:#475569;font-size:14px;">Prestation HT</td>
            <td style="padding:10px 20px;color:#1e293b;font-size:14px;text-align:right;">{{prestationHT}}</td>
          </tr>
          <tr>
            <td style="padding:10px 20px;color:#475569;font-size:14px;">TVA ({{tvaRate}}%) {{sapBadge}}</td>
            <td style="padding:10px 20px;color:#1e293b;font-size:14px;text-align:right;">{{tvaAmount}}</td>
          </tr>
          <tr>
            <td style="padding:10px 20px;color:#475569;font-size:14px;">Commission plateforme ({{commissionRate}}%)</td>
            <td style="padding:10px 20px;color:#1e293b;font-size:14px;text-align:right;">{{commissionAmount}}</td>
          </tr>
          <tr>
            <td style="padding:10px 20px;color:#475569;font-size:14px;">Frais de paiement ({{stripeFeeRate}}%)</td>
            <td style="padding:10px 20px;color:#1e293b;font-size:14px;text-align:right;">{{stripeFeeAmount}}</td>
          </tr>
          <tr style="border-top:2px solid #e2e8f0;">
            <td style="padding:15px 20px;color:#1e293b;font-size:16px;font-weight:bold;background-color:#f0fdf4;">Total payé</td>
            <td style="padding:15px 20px;color:#1e293b;font-size:18px;font-weight:bold;text-align:right;background-color:#f0fdf4;">{{totalAmount}}</td>
          </tr>
        </table>
        <!-- PDF en pièce jointe + accès dashboard -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:18px 20px;background-color:#ecfdf5;border-left:4px solid #10b981;border-radius:8px;">
              <p style="margin:0 0 6px 0;font-weight:bold;color:#065f46;font-size:14px;">📎 Votre reçu PDF est joint à cet email</p>
              <p style="margin:0;color:#047857;font-size:13px;line-height:1.5;">Vous pouvez également le retrouver à tout moment dans votre espace personnel, section <strong>Mes factures &gt; Reçus de paiement</strong>.</p>
            </td>
          </tr>
        </table>
        <!-- Mention légale -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:15px 20px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;">
              <p style="margin:0;color:#92400e;font-size:13px;">Ce document est un reçu de paiement émis par {{siteName}}, plateforme intermédiaire de mise en relation. Il ne constitue pas une facture commerciale. La facture comptable sera émise par votre prestataire une fois la prestation terminée.</p>
            </td>
          </tr>
        </table>
        <!-- CTA -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{reservationsUrl}}" style="height:52px;width:250px;v-text-anchor:middle;" arcsize="50%" fillcolor="#4ECDC4" stroke="false"><v:textbox><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Télécharger mes reçus</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{reservationsUrl}}" style="display:inline-block;background-color:#4ECDC4;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Télécharger mes reçus</a><!--<![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits réservés.</p>
        <p style="margin:5px 0 0 0;color:#94a3b8;font-size:11px;">{{siteName}} — Plateforme de mise en relation pour services animaliers</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  admin_refund_client: {
    subject: "Votre remboursement a ete effectue - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Remboursement effectue</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td align="center" style="background-color:#10B981;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">Remboursement effectue</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{clientName}},</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Un remboursement a ete effectue sur votre reservation. Voici le detail :
        </p>
        <!-- Service info -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;">
              <p style="margin:0 0 10px 0;font-weight:bold;color:#0369a1;">Details du service</p>
              <p style="margin:5px 0;color:#475569;"><strong>Service :</strong> {{serviceName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
              <p style="margin:5px 0;color:#475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
            </td>
          </tr>
        </table>
        <!-- Refund amount -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#ecfdf5;border-left:4px solid #10b981;border-radius:8px;">
              <p style="margin:0 0 5px 0;font-weight:bold;color:#065f46;font-size:18px;">Montant rembourse : {{refundAmount}}</p>
              <p style="margin:0;color:#047857;font-size:14px;">Le remboursement sera visible sur votre compte sous 5 a 10 jours ouvres.</p>
            </td>
          </tr>
        </table>
        <!-- Reason -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;">
              <p style="margin:0 0 5px 0;font-weight:bold;color:#92400e;">Raison :</p>
              <p style="margin:0;color:#78350f;">{{reason}}</p>
            </td>
          </tr>
        </table>
        <!-- Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{reservationsUrl}}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" fillcolor="#10B981" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Voir mes reservations</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{reservationsUrl}}" style="display:inline-block;background-color:#10B981;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Voir mes reservations</a><!--<![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  account_deactivated: {
    subject: "Votre compte a ete desactive - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Compte desactive</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <tr>
      <td align="center" style="background-color:#DC2626;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">Compte desactive</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{announcerName}},</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Nous vous informons que votre compte sur {{siteName}} a ete desactive par notre equipe d'administration.
        </p>
        <!-- Reason -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#fef2f2;border-left:4px solid #DC2626;border-radius:8px;">
              <p style="margin:0 0 5px 0;font-weight:bold;color:#991b1b;">Raison :</p>
              <p style="margin:0;color:#7f1d1d;">{{reason}}</p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Tant que votre compte est desactive, vous ne pourrez plus recevoir de reservations ni acceder a votre espace prestataire.
        </p>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez contester cette decision, veuillez contacter notre support :
        </p>
        <!-- Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="mailto:{{supportEmail}}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" fillcolor="#6366F1" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Contacter le support</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="mailto:{{supportEmail}}" style="display:inline-block;background-color:#6366F1;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Contacter le support</a><!--<![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  invoice_available: {
    subject: "Votre facture {{invoiceNumber}} est disponible - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Facture disponible</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <tr>
      <td align="center" style="background-color:#FF6B6B;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">&#128062; {{siteName}}</h1>
        <p style="margin:10px 0 0 0;color:#ffffff;font-size:14px;">Votre facture est disponible</p>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{clientName}} !</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Votre facture <strong>{{invoiceNumber}}</strong> pour le service <strong>{{serviceName}}</strong> du {{missionDate}} est maintenant disponible.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{downloadUrl}}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" fillcolor="#FF6B6B" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Voir ma facture</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{downloadUrl}}" style="display:inline-block;background-color:#FF6B6B;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Voir ma facture</a><!--<![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  receipt_available: {
    subject: "Votre recu {{receiptNumber}} est disponible - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Recu disponible</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <tr>
      <td align="center" style="background-color:#4ECDC4;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">&#128062; {{siteName}}</h1>
        <p style="margin:10px 0 0 0;color:#ffffff;font-size:14px;">Votre recu est disponible</p>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{clientName}} !</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          Votre recu <strong>{{receiptNumber}}</strong> pour le service <strong>{{serviceName}}</strong> du {{missionDate}} est maintenant disponible.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{downloadUrl}}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" fillcolor="#4ECDC4" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Voir mon recu</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{downloadUrl}}" style="display:inline-block;background-color:#4ECDC4;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Voir mon recu</a><!--<![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`,
  },
  service_completed_confirmation: {
    subject: "Prestation terminee - {{serviceName}} - {{siteName}}",
    html: `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Prestation terminee</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:40px 20px;">
  <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
    <tr>
      <td align="center" style="background-color:#10B981;padding:40px 30px;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:bold;">&#128062; {{siteName}}</h1>
        <p style="margin:10px 0 0 0;color:#ffffff;font-size:14px;">Prestation terminee avec succes</p>
      </td>
    </tr>
    <tr>
      <td style="padding:40px 30px;">
        <h2 style="margin:0 0 20px 0;color:#1e293b;font-size:24px;">Bonjour {{clientName}} !</h2>
        <p style="margin:0 0 20px 0;color:#475569;font-size:16px;line-height:1.6;">
          La prestation <strong>{{serviceName}}</strong> avec <strong>{{announcerName}}</strong> pour <strong>{{petName}}</strong> du {{missionDate}} est maintenant terminee.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
          <tr>
            <td style="padding:20px;background-color:#f0fdf4;border-left:4px solid #10B981;border-radius:8px;">
              <p style="margin:0;color:#166534;font-size:14px;">Vous pouvez laisser un avis sur votre experience depuis votre espace client.</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:30px 0;">
              <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{reviewUrl}}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" fillcolor="#10B981" stroke="f"><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Laisser un avis</center></v:textbox></v:roundrect><![endif]-->
              <!--[if !mso]><!--><a href="{{reviewUrl}}" style="display:inline-block;background-color:#10B981;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-weight:bold;font-size:16px;">Laisser un avis</a><!--<![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f8fafc;padding:30px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; 2025 {{siteName}}. Tous droits reserves.</p>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
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
      endTime: v.optional(v.string()),
      animalName: v.optional(v.string()),
      location: v.optional(v.string()),
      totalAmount: v.number(),
    })),
    emailConfig: v.optional(v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    })),
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const apiKey = args.emailConfig?.apiKey || process.env.RESEND_API_KEY;
      const fromEmail = args.emailConfig?.fromEmail || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const fromName = args.emailConfig?.fromName || process.env.RESEND_FROM_NAME || "Animigo";

      if (!apiKey) {
        console.error("No email API key configured");
        return { success: false, error: "Email service not configured" };
      }

      const siteName = "Animigo";
      const appUrl = args.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const verificationUrl = `${appUrl}/verify-email?token=${args.token}`;

      const templateSlug = args.context === "reservation" ? "verification_reservation" : "verification";
      const template = getTemplate(templateSlug);

      if (!template) {
        return { success: false, error: "Template not found" };
      }

      const variables: Record<string, string | number> = {
        firstName: args.firstName,
        verificationUrl,
        siteName,
        expirationHours: 24,
      };

      if (args.reservationData) {
        variables.serviceName = args.reservationData.serviceName;
        variables.announcerName = args.reservationData.announcerName;
        variables.startDate = formatDate(args.reservationData.startDate);
        variables.endDate = formatDate(args.reservationData.endDate);
        variables.totalAmount = formatPrice(args.reservationData.totalAmount);
        if (args.reservationData.startTime) variables.startTime = args.reservationData.startTime;
        if (args.reservationData.animalName) variables.animalName = args.reservationData.animalName;
        if (args.reservationData.location) variables.location = args.reservationData.location;
      }

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);
      const fromStr = `${fromName} <${fromEmail}>`;

      const result = await sendEmailViaProvider({
        to: args.email,
        from: fromStr,
        subject,
        html,
        resendApiKey: apiKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      await safeLogEmail(ctx, {
        to: args.email,
        from: fromStr,
        subject,
        template: templateSlug,
        status: "sent",
        resendId: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send verification email:", error);
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
      startTime: v.optional(v.string()),
      endTime: v.optional(v.string()),
      animalName: v.optional(v.string()),
      animalType: v.optional(v.string()),
      location: v.optional(v.string()),
      includeOvernightStay: v.optional(v.boolean()),
      overnightNights: v.optional(v.number()),
      totalAmount: v.number(),
    }),
    // Config email passée depuis la mutation (contourne le bug ctx.runQuery sur self-hosted)
    emailConfig: v.optional(v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    })),
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("=== sendNewReservationRequestEmail START ===");

    try {
      // Utiliser la config passée en argument, sinon fallback sur env vars
      const apiKey = args.emailConfig?.apiKey || process.env.RESEND_API_KEY;
      const fromEmail = args.emailConfig?.fromEmail || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const fromName = args.emailConfig?.fromName || process.env.RESEND_FROM_NAME || "Animigo";

      if (!apiKey) {
        console.error("No Resend API key configured");
        return { success: false, error: "Email service not configured" };
      }

      const siteName = "Animigo";
      const appUrl = args.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const template = getTemplate("new_reservation_request");
      if (!template) {
        return { success: false, error: "Template not found" };
      }

      // Build date range string
      const startDateFormatted = formatDate(args.reservation.startDate);
      const endDateFormatted = formatDate(args.reservation.endDate);
      const dateRange = args.reservation.startDate === args.reservation.endDate
        ? `Le ${startDateFormatted}`
        : `Du ${startDateFormatted} au ${endDateFormatted}`;

      // Build time range HTML (conditionally)
      let timeRangeHtml = "";
      if (args.reservation.startTime) {
        const timeText = args.reservation.endTime
          ? `${args.reservation.startTime} → ${args.reservation.endTime}`
          : `à partir de ${args.reservation.startTime}`;
        timeRangeHtml = `<p style="margin: 5px 0; color: #475569;"><strong>Horaires :</strong> ${timeText}</p>`;
      }

      // Build overnight HTML (conditionally)
      let overnightHtml = "";
      if (args.reservation.includeOvernightStay && args.reservation.overnightNights && args.reservation.overnightNights > 0) {
        const nightsText = args.reservation.overnightNights > 1
          ? `${args.reservation.overnightNights} nuits`
          : "1 nuit";
        overnightHtml = `<p style="margin: 5px 0; color: #8B5CF6;"><strong>🌙 Garde de nuit incluse</strong> (${nightsText})</p>`;
      }

      const variables = {
        announcerFirstName: args.announcerFirstName,
        siteName,
        dashboardUrl: `${appUrl}/dashboard/missions?tab=pending_acceptance`,
        clientName: args.clientName,
        serviceName: args.reservation.serviceName,
        dateRange,
        timeRangeHtml,
        overnightHtml,
        animalName: args.reservation.animalName || "Animal",
        animalType: args.reservation.animalType || "",
        location: args.reservation.location || "Non précisé",
        totalAmount: formatPrice(args.reservation.totalAmount),
      };

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);

      console.log("Sending new reservation email to:", args.announcerEmail);

      const fromStr = `${fromName} <${fromEmail}>`;

      const result = await sendEmailViaProvider({
        to: args.announcerEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: apiKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      console.log("New reservation email sent successfully:", result);

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send new reservation request email:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  },
});

// Email au client quand l'annonceur accepte la réservation (avec lien de paiement)
export const sendReservationAcceptedEmail = internalAction({
  args: {
    clientEmail: v.string(),
    clientName: v.string(),
    announcerName: v.string(),
    serviceName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    animalName: v.optional(v.string()),
    amount: v.number(),
    missionId: v.id("missions"),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
    appUrl: v.optional(v.string()),
    paymentDeadlineHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";
      const appUrl = args.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const template = getTemplate("reservation_accepted");
      if (!template) {
        return { success: false, error: "Template not found" };
      }

      const deadlineHours = args.paymentDeadlineHours || 48;
      const expirationTime = deadlineHours >= 24
        ? `${Math.floor(deadlineHours / 24)} jour${Math.floor(deadlineHours / 24) > 1 ? "s" : ""}`
        : `${deadlineHours} heure${deadlineHours > 1 ? "s" : ""}`;

      const variables = {
        firstName: args.clientName.split(" ")[0],
        announcerName: args.announcerName,
        serviceName: args.serviceName,
        startDate: formatDate(args.startDate),
        endDate: formatDate(args.endDate),
        animalName: args.animalName || "",
        totalAmount: formatPrice(args.amount),
        paymentUrl: `${appUrl}/client/paiement/${args.missionId}`,
        expirationTime,
        siteName,
      };

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);
      const fromStr = `${fromName} <${fromEmail}>`;

      console.log("Sending reservation accepted email to:", args.clientEmail);

      const result = await sendEmailViaProvider({
        to: args.clientEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: args.emailConfig.apiKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      await safeLogEmail(ctx, {
        to: args.clientEmail,
        from: fromStr,
        subject,
        template: "reservation_accepted",
        status: "sent",
        resendId: result.id,
      });

      console.log("Reservation accepted email sent successfully:", result);
      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send reservation accepted email:", error);
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

    // Récupérer la config email
    const configs = await ctx.runQuery(internal.api.emailInternal.getEmailConfigs);

    const result = await ctx.runAction(internal.api.email.sendVerificationEmail, {
      userId: user._id,
      email: user.email,
      firstName: user.firstName,
      token,
      context: "registration",
      emailConfig: configs.apiKey ? {
        apiKey: configs.apiKey,
        fromEmail: configs.fromEmail || undefined,
        fromName: configs.fromName || undefined,
      } : undefined,
    });

    return result;
  },
});

// Note: verifyEmail a été déplacé vers convex/public/emailVerify.ts (mutation au lieu d'action)
// car ctx.runMutation échoue dans les actions sur Convex self-hosted

// Action interne pour envoyer un email de réinitialisation de mot de passe
export const sendPasswordResetEmail = internalAction({
  args: {
    userId: v.id("users"),
    email: v.string(),
    firstName: v.string(),
    token: v.string(),
    emailConfig: v.optional(v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    })),
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const apiKey = args.emailConfig?.apiKey || process.env.RESEND_API_KEY;
      const fromEmail = args.emailConfig?.fromEmail || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
      const fromName = args.emailConfig?.fromName || process.env.RESEND_FROM_NAME || "Animigo";

      if (!apiKey) {
        return { success: false, error: "Email service not configured" };
      }

      const siteName = "Animigo";
      const appUrl = args.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const resetUrl = `${appUrl}/reset-password?token=${args.token}`;

      const template = getTemplate("password_reset");
      if (!template) {
        return { success: false, error: "Template not found" };
      }

      const variables = {
        firstName: args.firstName,
        resetUrl,
        siteName,
        expirationHours: 1,
      };

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);
      const fromStr = `${fromName} <${fromEmail}>`;

      const result = await sendEmailViaProvider({
        to: args.email,
        from: fromStr,
        subject,
        html,
        resendApiKey: apiKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      await safeLogEmail(ctx, {
        to: args.email,
        from: fromStr,
        subject,
        template: "password_reset",
        status: "sent",
        resendId: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// ============================================
// EMAILS AUTO-ANNULATION RÉSERVATIONS
// ============================================

// Email au client quand la mission est auto-refusée (deadline acceptation dépassée)
export const sendMissionAutoRefusedEmail = internalAction({
  args: {
    clientEmail: v.string(),
    clientName: v.string(),
    announcerName: v.string(),
    serviceName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";
      const appUrl = args.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const template = getTemplate("mission_auto_refused");
      if (!template) {
        return { success: false, error: "Template not found" };
      }

      const variables = {
        clientName: args.clientName,
        announcerName: args.announcerName,
        serviceName: args.serviceName,
        startDate: formatDate(args.startDate),
        endDate: formatDate(args.endDate),
        siteName,
        searchUrl: `${appUrl}/recherche`,
      };

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);
      const fromStr = `${fromName} <${fromEmail}>`;

      const result = await sendEmailViaProvider({
        to: args.clientEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: args.emailConfig.apiKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      await safeLogEmail(ctx, {
        to: args.clientEmail,
        from: fromStr,
        subject,
        template: "mission_auto_refused",
        status: "sent",
        resendId: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send mission auto-refused email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Email au client quand le paiement expire
export const sendMissionAutoExpiredClientEmail = internalAction({
  args: {
    clientEmail: v.string(),
    clientName: v.string(),
    announcerName: v.string(),
    serviceName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";
      const appUrl = args.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const template = getTemplate("mission_auto_expired_client");
      if (!template) {
        return { success: false, error: "Template not found" };
      }

      const variables = {
        clientName: args.clientName,
        announcerName: args.announcerName,
        serviceName: args.serviceName,
        startDate: formatDate(args.startDate),
        endDate: formatDate(args.endDate),
        siteName,
        searchUrl: `${appUrl}/recherche`,
      };

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);
      const fromStr = `${fromName} <${fromEmail}>`;

      const result = await sendEmailViaProvider({
        to: args.clientEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: args.emailConfig.apiKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      await safeLogEmail(ctx, {
        to: args.clientEmail,
        from: fromStr,
        subject,
        template: "mission_auto_expired_client",
        status: "sent",
        resendId: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send mission auto-expired client email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Email à l'annonceur quand le paiement expire
export const sendMissionAutoExpiredAnnouncerEmail = internalAction({
  args: {
    announcerEmail: v.string(),
    announcerName: v.string(),
    clientName: v.string(),
    serviceName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";
      const appUrl = args.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const template = getTemplate("mission_auto_expired_announcer");
      if (!template) {
        return { success: false, error: "Template not found" };
      }

      const variables = {
        announcerName: args.announcerName,
        clientName: args.clientName,
        serviceName: args.serviceName,
        startDate: formatDate(args.startDate),
        endDate: formatDate(args.endDate),
        siteName,
        dashboardUrl: `${appUrl}/dashboard/missions`,
      };

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);
      const fromStr = `${fromName} <${fromEmail}>`;

      const result = await sendEmailViaProvider({
        to: args.announcerEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: args.emailConfig.apiKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      await safeLogEmail(ctx, {
        to: args.announcerEmail,
        from: fromStr,
        subject,
        template: "mission_auto_expired_announcer",
        status: "sent",
        resendId: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send mission auto-expired announcer email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

/**
 * Envoyer le reçu de paiement au client après un paiement réussi
 */
export const sendPaymentReceiptEmail = internalAction({
  args: {
    clientEmail: v.string(),
    clientName: v.string(),
    serviceName: v.string(),
    announcerName: v.string(),
    announcerStatus: v.string(),
    announcerCompany: v.string(),
    announcerSiret: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    announcerEarnings: v.number(),
    vatRate: v.number(),
    isSapApplied: v.boolean(),
    platformFee: v.number(),
    commissionRate: v.number(),
    stripeFee: v.number(),
    stripeFeeRate: v.number(),
    totalAmount: v.number(),
    paymentRef: v.string(),
    cardBrand: v.optional(v.string()),
    cardLast4: v.optional(v.string()),
    // Reçu PDF en pièce jointe (base64) — généré par generateClientReceipt
    pdfAttachmentBase64: v.optional(v.string()),
    pdfAttachmentFilename: v.optional(v.string()),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";
      const appUrl = args.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      // 1. Charger en priorité le template personnalisé depuis admin/templates-email (BDD)
      // 2. Fallback sur le template par défaut hardcodé si non trouvé en BDD
      let template: { subject: string; htmlContent: string } | null = null;
      try {
        const dbTemplate = await ctx.runQuery(internal.api.emailInternal.getEmailTemplate, {
          slug: "payment_receipt",
        });
        if (dbTemplate && dbTemplate.htmlContent) {
          template = {
            subject: dbTemplate.subject,
            htmlContent: dbTemplate.htmlContent,
          };
          console.log("[sendPaymentReceiptEmail] Template charge depuis BDD (admin/templates-email)");
        }
      } catch (e) {
        console.warn("[sendPaymentReceiptEmail] Erreur lecture template BDD, fallback sur defaut :", e);
      }
      if (!template) {
        const defaultTpl = getTemplate("payment_receipt");
        if (!defaultTpl) {
          return { success: false, error: "Template payment_receipt introuvable (BDD + defaut)" };
        }
        template = defaultTpl;
        console.log("[sendPaymentReceiptEmail] Template par defaut utilise (aucune personnalisation admin)");
      }

      // Calcul HT et TVA sur le prix du service uniquement
      const prestationHT = args.vatRate > 0
        ? Math.round((args.announcerEarnings * 100) / (100 + args.vatRate))
        : args.announcerEarnings;
      const tvaAmount = args.announcerEarnings - prestationHT;

      const now = new Date();
      const paymentDate = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} à ${String(now.getHours()).padStart(2, "0")}h${String(now.getMinutes()).padStart(2, "0")}`;

      // Formater le moyen de paiement
      const brandNames: Record<string, string> = {
        visa: "Visa",
        mastercard: "Mastercard",
        amex: "American Express",
        cb: "CB",
        cartes_bancaires: "CB",
      };
      const brandDisplay = args.cardBrand ? (brandNames[args.cardBrand] || args.cardBrand.toUpperCase()) : "Carte bancaire";
      const paymentMethod = args.cardLast4
        ? `${brandDisplay} - xxxx xxxx xxxx ${args.cardLast4}`
        : "Carte bancaire";

      const variables = {
        clientName: args.clientName,
        serviceName: args.serviceName,
        announcerName: args.announcerName,
        announcerStatus: args.announcerStatus,
        announcerCompany: args.announcerCompany ? `<strong>Entreprise :</strong> ${args.announcerCompany}<br/>` : "",
        announcerSiret: args.announcerSiret ? `<strong>SIRET :</strong> ${args.announcerSiret}` : "",
        startDate: formatDate(args.startDate),
        endDate: formatDate(args.endDate),
        prestationHT: formatPrice(prestationHT),
        tvaRate: String(args.vatRate),
        tvaAmount: formatPrice(tvaAmount),
        sapBadge: args.isSapApplied ? "(taux réduit SAP)" : "",
        commissionRate: String(args.commissionRate),
        commissionAmount: formatPrice(args.platformFee),
        stripeFeeRate: String(args.stripeFeeRate),
        stripeFeeAmount: formatPrice(args.stripeFee),
        totalAmount: formatPrice(args.totalAmount),
        paymentDate,
        paymentRef: args.paymentRef,
        paymentMethod,
        siteName,
        reservationsUrl: `${appUrl}/client/factures`,
      };

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);

      const fromStr = `${fromName} <${fromEmail}>`;

      // Construction des attachments : PDF du reçu si fourni
      const attachments: EmailAttachment[] = [];
      if (args.pdfAttachmentBase64) {
        attachments.push({
          filename: args.pdfAttachmentFilename || "recu-paiement-animigo.pdf",
          content: args.pdfAttachmentBase64,
          contentType: "application/pdf",
        });
      }

      const result = await sendEmailViaProvider({
        to: args.clientEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: args.emailConfig.apiKey,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      await safeLogEmail(ctx, {
        to: args.clientEmail,
        from: fromStr,
        subject,
        template: "payment_receipt",
        status: "sent",
        resendId: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send payment receipt email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Email à l'annonceur quand le client annule
export const sendCancellationAnnouncerEmail = internalAction({
  args: {
    announcerEmail: v.string(),
    announcerName: v.string(),
    clientName: v.string(),
    serviceName: v.string(),
    animalName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    totalAmount: v.number(),
    refundAmount: v.number(),
    announcerRetained: v.number(),
    cancellationReason: v.string(),
    cancellationRule: v.string(),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";

      const template = getTemplate("mission_cancelled_by_client");
      if (!template) {
        return { success: false, error: "Template not found" };
      }

      const variables = {
        announcerName: args.announcerName,
        clientName: args.clientName,
        serviceName: args.serviceName,
        animalName: args.animalName,
        startDate: formatDate(args.startDate),
        endDate: formatDate(args.endDate),
        totalAmount: formatPrice(args.totalAmount),
        refundAmount: formatPrice(args.refundAmount),
        announcerRetained: formatPrice(args.announcerRetained),
        cancellationReason: args.cancellationReason,
        cancellationRule: args.cancellationRule,
        siteName,
      };

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);

      const fromStr = `${fromName} <${fromEmail}>`;

      const result = await sendEmailViaProvider({
        to: args.announcerEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: args.emailConfig.apiKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      await safeLogEmail(ctx, {
        to: args.announcerEmail,
        from: fromStr,
        subject,
        template: "mission_cancelled_by_client",
        status: "sent",
        resendId: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send cancellation announcer email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Email au client pour confirmer l'annulation de sa réservation
export const sendCancellationClientEmail = internalAction({
  args: {
    clientEmail: v.string(),
    clientName: v.string(),
    serviceName: v.string(),
    animalName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    totalAmount: v.number(),
    refundAmount: v.number(),
    platformFeeRetained: v.number(),
    cancellationRule: v.string(),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";

      const template = getTemplate("mission_cancelled_by_client_confirmation");
      if (!template) {
        return { success: false, error: "Template not found" };
      }

      const variables = {
        clientName: args.clientName,
        serviceName: args.serviceName,
        animalName: args.animalName,
        startDate: formatDate(args.startDate),
        endDate: formatDate(args.endDate),
        totalAmount: formatPrice(args.totalAmount),
        refundAmount: formatPrice(args.refundAmount),
        platformFeeRetained: formatPrice(args.platformFeeRetained),
        cancellationRule: args.cancellationRule,
        refundDelay: "5-10 jours ouvrés",
        siteName,
      };

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);

      const fromStr = `${fromName} <${fromEmail}>`;

      const result = await sendEmailViaProvider({
        to: args.clientEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: args.emailConfig.apiKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      await safeLogEmail(ctx, {
        to: args.clientEmail,
        from: fromStr,
        subject,
        template: "mission_cancelled_by_client_confirmation",
        status: "sent",
        resendId: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send cancellation client email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Email à l'annonceur quand le client valide la fin de mission
export const sendMissionValidatedByClientEmail = internalAction({
  args: {
    announcerEmail: v.string(),
    announcerName: v.string(),
    clientName: v.string(),
    serviceName: v.string(),
    animalName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";
      const appUrl = args.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const template = getTemplate("mission_validated_by_client");
      if (!template) {
        return { success: false, error: "Template not found" };
      }

      const variables = {
        announcerName: args.announcerName,
        clientName: args.clientName,
        serviceName: args.serviceName,
        animalName: args.animalName,
        startDate: formatDate(args.startDate),
        endDate: formatDate(args.endDate),
        siteName,
        reviewUrl: `${appUrl}/dashboard/avis`,
      };

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);
      const fromStr = `${fromName} <${fromEmail}>`;

      const result = await sendEmailViaProvider({
        to: args.announcerEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: args.emailConfig.apiKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      await safeLogEmail(ctx, {
        to: args.announcerEmail,
        from: fromStr,
        subject,
        template: "mission_validated_by_client",
        status: "sent",
        resendId: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send mission validated by client email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Email au client quand l'admin effectue un remboursement
export const sendAdminRefundClientEmail = internalAction({
  args: {
    clientEmail: v.string(),
    clientName: v.string(),
    serviceName: v.string(),
    announcerName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    refundAmount: v.number(),
    reason: v.string(),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";
      const appUrl = args.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const template = getTemplate("admin_refund_client");
      if (!template) {
        return { success: false, error: "Template not found" };
      }

      const variables = {
        clientName: args.clientName,
        serviceName: args.serviceName,
        announcerName: args.announcerName,
        startDate: formatDate(args.startDate),
        endDate: formatDate(args.endDate),
        refundAmount: formatPrice(args.refundAmount),
        reason: args.reason,
        siteName,
        reservationsUrl: `${appUrl}/client/reservations`,
      };

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);
      const fromStr = `${fromName} <${fromEmail}>`;

      const result = await sendEmailViaProvider({
        to: args.clientEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: args.emailConfig.apiKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      await safeLogEmail(ctx, {
        to: args.clientEmail,
        from: fromStr,
        subject,
        template: "admin_refund_client",
        status: "sent",
        resendId: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send admin refund client email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// ─── Emails annulation PAR L'ANNONCEUR ─────────────────────────────────

// Email au client quand l'annonceur annule la mission
export const sendCancellationByAnnouncerClientEmail = internalAction({
  args: {
    clientEmail: v.string(),
    clientName: v.string(),
    announcerName: v.string(),
    serviceName: v.string(),
    animalName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    totalAmount: v.number(),
    refundAmount: v.number(),
    cancellationReason: v.string(),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";

      const subject = `Votre réservation a été annulée par le prestataire - ${siteName}`;
      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Réservation annulée</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Bonjour ${args.clientName},</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        ${args.announcerName} a annulé votre réservation pour "<strong>${args.serviceName}</strong>".
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">Détails</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> ${args.serviceName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> ${args.animalName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du ${formatDate(args.startDate)} au ${formatDate(args.endDate)}</p>
      </div>
      ${args.refundAmount > 0 ? `
      <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5; border-radius: 12px; border-left: 4px solid #10b981;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #065f46;">Remboursement intégral</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant remboursé :</strong> ${formatPrice(args.refundAmount)}</p>
        <p style="margin: 5px 0; color: #475569; font-size: 14px;">Le remboursement apparaîtra sur votre relevé sous 5-10 jours ouvrés.</p>
      </div>
      ` : ""}
      ${args.cancellationReason ? `
      <div style="margin: 20px 0; padding: 20px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 5px 0; font-weight: bold; color: #92400e;">Raison :</p>
        <p style="margin: 0; color: #78350f;">${args.cancellationReason}</p>
      </div>
      ` : ""}
      <p style="margin: 20px 0 0 0; color: #475569; font-size: 14px;">
        Nous vous invitons à rechercher un autre prestataire sur ${siteName}.
      </p>
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; 2025 ${siteName}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

      const fromStr = `${fromName} <${fromEmail}>`;
      const result = await sendEmailViaProvider({
        to: args.clientEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: args.emailConfig.apiKey,
      });

      await safeLogEmail(ctx, {
        to: args.clientEmail,
        from: fromStr,
        subject,
        template: "mission_cancelled_by_announcer_client",
        status: result.success ? "sent" : "failed",
        resendId: result.id,
        errorMessage: result.error,
      });

      return result;
    } catch (error) {
      console.error("Failed to send cancellation by announcer email to client:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Email de confirmation à l'annonceur quand il annule
export const sendCancellationByAnnouncerConfirmEmail = internalAction({
  args: {
    announcerEmail: v.string(),
    announcerName: v.string(),
    clientName: v.string(),
    serviceName: v.string(),
    animalName: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    cancellationReason: v.string(),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";

      const subject = `Confirmation d'annulation de votre réservation - ${siteName}`;
      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Annulation confirmée</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px;">Bonjour ${args.announcerName},</h2>
      <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
        Vous avez annulé la réservation de ${args.clientName} pour "<strong>${args.serviceName}</strong>".
        Le client sera remboursé intégralement.
      </p>
      <div style="margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">Détails</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> ${args.serviceName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> ${args.animalName}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du ${formatDate(args.startDate)} au ${formatDate(args.endDate)}</p>
      </div>
      ${args.cancellationReason ? `
      <div style="margin: 20px 0; padding: 20px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 5px 0; font-weight: bold; color: #92400e;">Votre raison :</p>
        <p style="margin: 0; color: #78350f;">${args.cancellationReason}</p>
      </div>
      ` : ""}
    </div>
    <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; 2025 ${siteName}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

      const fromStr = `${fromName} <${fromEmail}>`;
      const result = await sendEmailViaProvider({
        to: args.announcerEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: args.emailConfig.apiKey,
      });

      await safeLogEmail(ctx, {
        to: args.announcerEmail,
        from: fromStr,
        subject,
        template: "mission_cancelled_by_announcer_confirm",
        status: result.success ? "sent" : "failed",
        resendId: result.id,
        errorMessage: result.error,
      });

      return result;
    } catch (error) {
      console.error("Failed to send cancellation confirmation to announcer:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Email à l'annonceur quand son compte est désactivé
export const sendAccountDeactivatedEmail = internalAction({
  args: {
    announcerEmail: v.string(),
    announcerName: v.string(),
    reason: v.string(),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";

      const template = getTemplate("account_deactivated");
      if (!template) {
        return { success: false, error: "Template not found" };
      }

      const variables = {
        announcerName: args.announcerName,
        reason: args.reason,
        siteName,
        supportEmail: fromEmail,
      };

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);
      const fromStr = `${fromName} <${fromEmail}>`;

      const result = await sendEmailViaProvider({
        to: args.announcerEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: args.emailConfig.apiKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      await safeLogEmail(ctx, {
        to: args.announcerEmail,
        from: fromStr,
        subject,
        template: "account_deactivated",
        status: "sent",
        resendId: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send account deactivated email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});

// Email de disponibilité de facture/reçu
export const sendDocumentAvailableEmail = internalAction({
  args: {
    recipientEmail: v.string(),
    recipientName: v.string(),
    documentType: v.union(v.literal("invoice"), v.literal("receipt")),
    documentNumber: v.string(),
    serviceName: v.string(),
    missionDate: v.string(),
    emailConfig: v.object({
      apiKey: v.string(),
      fromEmail: v.optional(v.string()),
      fromName: v.optional(v.string()),
    }),
    appUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const fromEmail = args.emailConfig.fromEmail || "onboarding@resend.dev";
      const fromName = args.emailConfig.fromName || "Animigo";
      const siteName = "Animigo";
      const appUrl = args.appUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      const slug = args.documentType === "invoice" ? "invoice_available" : "receipt_available";
      const template = getTemplate(slug);
      if (!template) {
        return { success: false, error: "Template not found" };
      }

      const variables: Record<string, string | number | undefined> = {
        clientName: args.recipientName,
        serviceName: args.serviceName,
        missionDate: formatDate(args.missionDate),
        siteName,
        downloadUrl: `${appUrl}/client/factures`,
      };

      if (args.documentType === "invoice") {
        variables.invoiceNumber = args.documentNumber;
      } else {
        variables.receiptNumber = args.documentNumber;
      }

      const subject = replaceVariables(template.subject, variables);
      const html = replaceVariables(template.htmlContent, variables);
      const fromStr = `${fromName} <${fromEmail}>`;

      const result = await sendEmailViaProvider({
        to: args.recipientEmail,
        from: fromStr,
        subject,
        html,
        resendApiKey: args.emailConfig.apiKey,
      });

      if (!result.success) {
        throw new Error(result.error || "Email send failed");
      }

      await safeLogEmail(ctx, {
        to: args.recipientEmail,
        from: fromStr,
        subject,
        template: slug,
        status: "sent",
        resendId: result.id,
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error("Failed to send document available email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
});
