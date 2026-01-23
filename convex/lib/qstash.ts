import { Client } from "@upstash/qstash";

// Types de notifications
export type NotificationType =
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

export type NotificationLinkType =
  | "mission"
  | "payment"
  | "profile"
  | "review"
  | "message"
  | "settings";

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkType?: NotificationLinkType;
  linkId?: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
}

// Client QStash (initialisé une fois)
let qstashClient: Client | null = null;

function getQStashClient(): Client {
  if (!qstashClient) {
    const token = process.env.QSTASH_TOKEN;
    if (!token) {
      throw new Error("QSTASH_TOKEN not configured");
    }
    qstashClient = new Client({ token });
  }
  return qstashClient;
}

/**
 * Envoyer une notification de manière asynchrone via QStash
 * La notification sera créée en background sans bloquer la mutation
 */
export async function queueNotification(
  payload: NotificationPayload
): Promise<{ messageId: string }> {
  const client = getQStashClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

  const response = await client.publishJSON({
    url: `${appUrl}/api/notifications/create`,
    body: payload,
    retries: 3,
  });

  return { messageId: response.messageId };
}

/**
 * Envoyer une notification avec un délai (pour les rappels)
 * @param payload - Contenu de la notification
 * @param delaySeconds - Délai en secondes avant l'envoi
 */
export async function queueDelayedNotification(
  payload: NotificationPayload,
  delaySeconds: number
): Promise<{ messageId: string }> {
  const client = getQStashClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

  const response = await client.publishJSON({
    url: `${appUrl}/api/notifications/create`,
    body: payload,
    delay: delaySeconds,
    retries: 3,
  });

  return { messageId: response.messageId };
}

/**
 * Envoyer une notification planifiée (cron)
 * @param payload - Contenu de la notification
 * @param cron - Expression cron (ex: "0 9 * * *" pour tous les jours à 9h)
 */
export async function scheduleNotification(
  payload: NotificationPayload,
  cron: string
): Promise<{ scheduleId: string }> {
  const client = getQStashClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

  const response = await client.schedules.create({
    destination: `${appUrl}/api/notifications/create`,
    body: JSON.stringify(payload),
    cron,
    retries: 3,
  });

  return { scheduleId: response.scheduleId };
}
