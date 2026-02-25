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

export default http;
