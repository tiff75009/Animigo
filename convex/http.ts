import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Webhook Stripe pour gérer les événements de paiement
 * L'URL sera: https://your-convex-deployment.convex.site/stripe-webhook
 */
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("Webhook Stripe: Signature manquante");
      return new Response(JSON.stringify({ error: "Signature manquante" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Déléguer le traitement à une action Node.js
    try {
      const result = await ctx.runAction(
        internal.api.stripeWebhook.handleStripeWebhook,
        {
          body,
          signature,
        }
      );

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Erreur traitement webhook:", error);
      const message = error instanceof Error ? error.message : "Erreur interne";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

/**
 * Webhook Brevo pour le tracking email (delivered, opened, clicked, bounced, etc.)
 * URL: https://your-convex-deployment.convex.site/brevo-webhook?token=<secret>
 * Configurer dans Brevo Dashboard → Settings → Webhooks
 */
http.route({
  path: "/brevo-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Vérifier le token secret dans les query params
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Token manquant" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Vérifier le token contre la config
    const secret = await ctx.runQuery(internal.api.brevoWebhookInternal.getBrevoWebhookSecret);
    if (!secret || token !== secret) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();

      // Brevo peut envoyer un seul événement ou un tableau
      const events = Array.isArray(body) ? body : [body];

      for (const event of events) {
        const messageId = event["message-id"] || event.messageId || event.msg_id;
        if (!messageId) continue;

        await ctx.runMutation(internal.api.brevoWebhook.processBrevoEvent, {
          event: event.event || "",
          messageId: String(messageId),
          email: event.email || undefined,
          date: event.date || event.ts_event || undefined,
          reason: event.reason || event.error_relate_to || undefined,
          tag: event.tag || undefined,
        });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[Brevo Webhook] Error:", error);
      return new Response(JSON.stringify({ error: "Erreur interne" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
