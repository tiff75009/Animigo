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
