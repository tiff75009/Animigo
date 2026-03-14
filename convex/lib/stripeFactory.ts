// @ts-nocheck
import Stripe from "stripe";

const STRIPE_API_VERSION = "2024-12-18.acacia";

/**
 * Crée une instance Stripe avec la version d'API centralisée.
 * Utilisé par toutes les actions Stripe du projet.
 */
export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });
}

/**
 * Récupère la clé secrète Stripe depuis systemConfig.
 * À utiliser dans les mutations/queries Convex.
 */
export async function getStripeSecretKey(db: any): Promise<string | null> {
  const config = await db
    .query("systemConfig")
    .withIndex("by_key", (q: any) => q.eq("key", "stripe_secret_key"))
    .first();
  return config?.value || null;
}

/**
 * Récupère la clé publique Stripe depuis systemConfig.
 */
export async function getStripePublicKey(db: any): Promise<string | null> {
  const config = await db
    .query("systemConfig")
    .withIndex("by_key", (q: any) => q.eq("key", "stripe_public_key"))
    .first();
  return config?.value || null;
}

/**
 * Récupère le secret webhook Stripe depuis systemConfig.
 */
export async function getStripeWebhookSecret(db: any): Promise<string | null> {
  const config = await db
    .query("systemConfig")
    .withIndex("by_key", (q: any) => q.eq("key", "stripe_webhook_secret"))
    .first();
  return config?.value || null;
}

/**
 * Récupère les détails de la carte depuis un charge Stripe.
 */
export async function getChargeCardDetails(
  stripe: Stripe,
  chargeId: string
): Promise<{ brand: string | null; last4: string | null }> {
  try {
    const charge = await stripe.charges.retrieve(chargeId);
    return {
      brand: charge.payment_method_details?.card?.brand || null,
      last4: charge.payment_method_details?.card?.last4 || null,
    };
  } catch {
    return { brand: null, last4: null };
  }
}
