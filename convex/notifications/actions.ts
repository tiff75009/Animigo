import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

// Types
type NotificationType =
  | "new_mission"
  | "mission_accepted"
  | "mission_refused"
  | "mission_confirmed"
  | "mission_started"
  | "mission_completed"
  | "mission_cancelled"
  | "payment_authorized"
  | "payment_captured"
  | "payout_sent"
  | "review_received"
  | "new_message"
  | "welcome"
  | "reminder"
  | "system";

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
}

// Type de retour explicite
type ActionResult = {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
};

// ============================================
// ACTIONS DE NOTIFICATION AUTOMATIQUES
// ============================================

/**
 * Helper: Envoyer une notification via QStash ou fallback direct en local
 */
async function sendNotificationWithFallback(
  ctx: any,
  qstashConfig: { token: string | null; appUrl: string | null },
  payload: NotificationPayload
): Promise<ActionResult> {
  const appUrl = qstashConfig.appUrl || "http://localhost:3000";
  const isLocalhost = appUrl.includes("localhost") || appUrl.includes("127.0.0.1");

  // Si localhost ou pas de token QStash, créer la notification directement
  if (isLocalhost || !qstashConfig.token) {
    console.log("Mode local détecté - création directe de la notification");
    try {
      await ctx.runMutation(internal.notifications.mutations.createFromWebhook, {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        linkUrl: payload.linkUrl,
      });
      console.log(`Notification ${payload.type} créée directement`);
      return { success: true, message: "Notification créée directement (mode local)" };
    } catch (error) {
      console.error("Erreur création notification directe:", error);
      return { success: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
    }
  }

  // Sinon, utiliser QStash
  try {
    const destinationUrl = `${appUrl}/api/notifications/create`;
    const response = await fetch(`https://qstash.upstash.io/v2/publish/${destinationUrl}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${qstashConfig.token}`,
        "Content-Type": "application/json",
        "Upstash-Retries": "3",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`QStash error (${payload.type}):`, response.status, errorText);

      // Fallback: créer la notification directement si QStash échoue
      console.log("QStash a échoué - fallback création directe");
      await ctx.runMutation(internal.notifications.mutations.createFromWebhook, {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        linkUrl: payload.linkUrl,
      });
      return { success: true, message: "Notification créée via fallback" };
    }

    const result = await response.json();
    console.log(`Notification ${payload.type} envoyée via QStash:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`Erreur envoi notification ${payload.type}:`, error);
    return { success: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
  }
}

/**
 * Envoyer une notification de nouvelle mission à l'annonceur
 * Appelée après création d'une mission (finalizeBooking)
 */
export const sendNewMissionNotification = action({
  args: {
    announcerId: v.id("users"),
    clientName: v.string(),
    animalName: v.string(),
    serviceName: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args): Promise<ActionResult> => {
    const qstashConfig = await ctx.runQuery(internal.notifications.queries.getQStashConfig);

    const payload: NotificationPayload = {
      userId: args.announcerId,
      type: "new_mission",
      title: "Nouvelle demande !",
      message: `${args.clientName} souhaite réserver "${args.serviceName}" pour ${args.animalName}`,
      linkUrl: "/dashboard/missions/accepter",
    };

    return sendNotificationWithFallback(ctx, qstashConfig, payload);
  },
});

/**
 * Envoyer une notification au client que sa mission a été acceptée
 * Appelée après acceptation par l'annonceur (acceptMission)
 */
export const sendMissionAcceptedNotification = action({
  args: {
    clientId: v.id("users"),
    announcerName: v.string(),
    serviceName: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args): Promise<ActionResult> => {
    const qstashConfig = await ctx.runQuery(internal.notifications.queries.getQStashConfig);

    const payload: NotificationPayload = {
      userId: args.clientId,
      type: "mission_accepted",
      title: "Demande acceptée !",
      message: `${args.announcerName} a accepté votre demande pour "${args.serviceName}"`,
      linkUrl: "/client/reservations",
    };

    return sendNotificationWithFallback(ctx, qstashConfig, payload);
  },
});

/**
 * Envoyer une notification de mission confirmée à l'annonceur
 * Appelée après paiement autorisé (markPaymentAuthorized)
 */
export const sendMissionConfirmedNotification = action({
  args: {
    announcerId: v.id("users"),
    clientName: v.string(),
    serviceName: v.string(),
    startDate: v.string(),
    missionId: v.id("missions"),
  },
  handler: async (ctx, args): Promise<ActionResult> => {
    const qstashConfig = await ctx.runQuery(internal.notifications.queries.getQStashConfig);

    // Formater la date
    const [year, month, day] = args.startDate.split("-");
    const formattedDate = `${day}/${month}/${year}`;

    const payload: NotificationPayload = {
      userId: args.announcerId,
      type: "mission_confirmed",
      title: "Réservation confirmée !",
      message: `${args.clientName} a confirmé la mission "${args.serviceName}" du ${formattedDate}`,
      linkUrl: "/dashboard/planning",
    };

    return sendNotificationWithFallback(ctx, qstashConfig, payload);
  },
});

/**
 * Envoyer une notification de paiement capturé à l'annonceur
 * Appelée après capture du paiement (markPaymentCaptured)
 */
export const sendPaymentCapturedNotification = action({
  args: {
    announcerId: v.id("users"),
    clientName: v.string(),
    amount: v.number(), // en centimes
    missionId: v.id("missions"),
  },
  handler: async (ctx, args): Promise<ActionResult> => {
    const qstashConfig = await ctx.runQuery(internal.notifications.queries.getQStashConfig);

    // Formater le montant
    const formattedAmount = (args.amount / 100).toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
    });

    const payload: NotificationPayload = {
      userId: args.announcerId,
      type: "payment_captured",
      title: "Paiement reçu !",
      message: `${formattedAmount} reçu de ${args.clientName}`,
      linkUrl: "/dashboard/paiements",
    };

    return sendNotificationWithFallback(ctx, qstashConfig, payload);
  },
});

// ============================================
// ACTIONS DE TEST
// ============================================

// Envoyer une notification de test via QStash (pour tester le flow complet)
export const sendTestNotificationViaQStash = action({
  args: {
    adminToken: v.string(),
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    linkUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ActionResult> => {
    // Vérifier que c'est un admin
    const authCheck = await ctx.runQuery(internal.notifications.queries.checkAdminForAction, {
      token: args.adminToken,
    });

    if (!authCheck.success) {
      return { success: false, error: authCheck.error };
    }

    // Récupérer la config QStash depuis la base de données
    const qstashConfig = await ctx.runQuery(internal.notifications.queries.getQStashConfig);

    if (!qstashConfig.token) {
      return {
        success: false,
        error: "QStash token non configuré. Configurez-le dans Admin > Intégrations.",
      };
    }

    const payload: NotificationPayload = {
      userId: args.userId,
      type: args.type as NotificationType,
      title: args.title,
      message: args.message,
      linkUrl: args.linkUrl,
    };

    const appUrl = qstashConfig.appUrl || "http://localhost:3000";

    try {
      // Appel direct à l'API QStash via fetch (sans le client Node.js)
      const destinationUrl = `${appUrl}/api/notifications/create`;
      const response = await fetch(`https://qstash.upstash.io/v2/publish/${destinationUrl}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${qstashConfig.token}`,
          "Content-Type": "application/json",
          "Upstash-Retries": "3",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("QStash API error:", response.status, errorText);
        return {
          success: false,
          error: `QStash error ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json();

      return {
        success: true,
        messageId: result.messageId,
        message: "Notification envoyée via QStash",
      };
    } catch (error) {
      console.error("QStash error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur QStash inconnue",
      };
    }
  },
});
