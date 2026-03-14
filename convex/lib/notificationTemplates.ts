import { Id } from "../_generated/dataModel";
import { queueNotification } from "./qstash";

// ============================================
// MISSIONS
// ============================================

/**
 * Notifier l'annonceur d'une nouvelle demande de mission
 */
export async function notifyNewMission(params: {
  announcerId: Id<"users">;
  clientName: string;
  animalName: string;
  serviceName: string;
  missionId: Id<"missions">;
}) {
  await queueNotification({
    userId: params.announcerId as string,
    type: "new_mission",
    title: "Nouvelle demande !",
    message: `${params.clientName} souhaite reserver "${params.serviceName}" pour ${params.animalName}`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: `/dashboard/missions?tab=pending_acceptance`,
  });
}

/**
 * Notifier le client que sa demande a été acceptée
 */
export async function notifyMissionAccepted(params: {
  clientId: Id<"users">;
  announcerName: string;
  serviceName: string;
  missionId: Id<"missions">;
}) {
  await queueNotification({
    userId: params.clientId as string,
    type: "mission_accepted",
    title: "Demande acceptee !",
    message: `${params.announcerName} a accepte votre demande pour "${params.serviceName}"`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: `/client/reservations`,
  });
}

/**
 * Notifier le client que sa demande a été refusée
 */
export async function notifyMissionRefused(params: {
  clientId: Id<"users">;
  announcerName: string;
  serviceName: string;
  reason?: string;
}) {
  await queueNotification({
    userId: params.clientId as string,
    type: "mission_refused",
    title: "Demande refusee",
    message: params.reason
      ? `${params.announcerName} a refuse : ${params.reason}`
      : `${params.announcerName} n'est pas disponible pour cette demande`,
    linkType: "mission",
  });
}

/**
 * Notifier l'annonceur que le client a confirmé et payé
 */
export async function notifyMissionConfirmed(params: {
  announcerId: Id<"users">;
  clientName: string;
  serviceName: string;
  startDate: string;
  missionId: Id<"missions">;
}) {
  await queueNotification({
    userId: params.announcerId as string,
    type: "mission_confirmed",
    title: "Reservation confirmee !",
    message: `${params.clientName} a confirme la mission "${params.serviceName}" du ${params.startDate}`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: `/dashboard/planning`,
  });
}

/**
 * Notifier qu'une mission a démarré
 */
export async function notifyMissionStarted(params: {
  userId: Id<"users">;
  otherPartyName: string;
  serviceName: string;
  missionId: Id<"missions">;
  isAnnouncer: boolean;
}) {
  await queueNotification({
    userId: params.userId as string,
    type: "mission_started",
    title: "Mission demarree !",
    message: `La mission "${params.serviceName}" avec ${params.otherPartyName} a commence`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: params.isAnnouncer ? `/dashboard/missions` : `/client/reservations`,
  });
}

/**
 * Notifier qu'une mission est terminée
 */
export async function notifyMissionCompleted(params: {
  userId: Id<"users">;
  otherPartyName: string;
  serviceName: string;
  missionId: Id<"missions">;
  isAnnouncer: boolean;
}) {
  await queueNotification({
    userId: params.userId as string,
    type: "mission_completed",
    title: "Mission terminee !",
    message: `La mission "${params.serviceName}" avec ${params.otherPartyName} est terminee`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: params.isAnnouncer ? `/dashboard/missions` : `/client/reservations`,
  });
}

/**
 * Notifier qu'une mission a été annulée
 */
export async function notifyMissionCancelled(params: {
  userId: Id<"users">;
  otherPartyName: string;
  serviceName: string;
  reason?: string;
  isAnnouncer: boolean;
}) {
  await queueNotification({
    userId: params.userId as string,
    type: "mission_cancelled",
    title: "Mission annulee",
    message: params.reason
      ? `La mission "${params.serviceName}" avec ${params.otherPartyName} a ete annulee : ${params.reason}`
      : `La mission "${params.serviceName}" avec ${params.otherPartyName} a ete annulee`,
    linkType: "mission",
    linkUrl: params.isAnnouncer ? `/dashboard/missions` : `/client/reservations`,
  });
}

// ============================================
// PAIEMENTS
// ============================================

/**
 * Notifier le client que son paiement a été pré-autorisé
 */
export async function notifyPaymentAuthorized(params: {
  clientId: Id<"users">;
  amount: number; // en centimes
  serviceName: string;
  missionId: Id<"missions">;
}) {
  const formattedAmount = (params.amount / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  await queueNotification({
    userId: params.clientId as string,
    type: "payment_authorized",
    title: "Paiement autorise",
    message: `${formattedAmount} ont ete reserves pour "${params.serviceName}"`,
    linkType: "payment",
    linkId: params.missionId as string,
    linkUrl: `/client/reservations`,
    metadata: { amount: params.amount },
  });
}

/**
 * Notifier l'annonceur que le paiement a été capturé
 */
export async function notifyPaymentCaptured(params: {
  announcerId: Id<"users">;
  clientName: string;
  amount: number; // en centimes
  missionId: Id<"missions">;
}) {
  const formattedAmount = (params.amount / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  await queueNotification({
    userId: params.announcerId as string,
    type: "payment_captured",
    title: "Paiement recu !",
    message: `${formattedAmount} recu de ${params.clientName}`,
    linkType: "payment",
    linkId: params.missionId as string,
    linkUrl: `/dashboard/revenus`,
    metadata: { amount: params.amount },
  });
}

/**
 * Notifier l'annonceur qu'un virement a été envoyé
 */
export async function notifyPayoutSent(params: {
  announcerId: Id<"users">;
  amount: number; // en centimes
}) {
  const formattedAmount = (params.amount / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  await queueNotification({
    userId: params.announcerId as string,
    type: "payout_sent",
    title: "Virement envoye !",
    message: `${formattedAmount} ont ete vires sur votre compte bancaire`,
    linkType: "payment",
    linkUrl: `/dashboard/revenus`,
    metadata: { amount: params.amount },
  });
}

// ============================================
// AVIS
// ============================================

/**
 * Notifier l'annonceur d'un nouvel avis
 */
export async function notifyReviewReceived(params: {
  announcerId: Id<"users">;
  clientName: string;
  rating: number;
}) {
  const stars = "★".repeat(params.rating) + "☆".repeat(5 - params.rating);

  await queueNotification({
    userId: params.announcerId as string,
    type: "review_received",
    title: "Nouvel avis !",
    message: `${params.clientName} vous a donne ${stars}`,
    linkType: "review",
    linkUrl: `/dashboard/avis`,
    metadata: { rating: params.rating },
  });
}

/**
 * Notifier l'annonceur que le client a validé la fin de mission
 */
export async function notifyMissionValidatedByClient(params: {
  announcerId: Id<"users">;
  clientName: string;
  serviceName: string;
  missionId: Id<"missions">;
}) {
  await queueNotification({
    userId: params.announcerId as string,
    type: "mission_completed",
    title: "Service validé !",
    message: `${params.clientName} a validé la fin du service "${params.serviceName}"`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: `/dashboard/missions`,
  });
}

/**
 * Notifier de l'auto-validation (annonceur + client)
 */
export async function notifyMissionAutoValidated(params: {
  announcerId: Id<"users">;
  clientId: Id<"users">;
  serviceName: string;
  missionId: Id<"missions">;
}) {
  // Notification annonceur
  await queueNotification({
    userId: params.announcerId as string,
    type: "mission_completed",
    title: "Service auto-validé",
    message: `Le service "${params.serviceName}" a été auto-validé après 48h`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: `/dashboard/missions`,
  });

  // Notification client
  await queueNotification({
    userId: params.clientId as string,
    type: "mission_completed",
    title: "Service terminé",
    message: `Le service "${params.serviceName}" est considéré comme terminé. Vous pouvez laisser un avis.`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: `/client/reservations/${params.missionId}`,
  });
}

/**
 * Notifier l'annonceur d'une réclamation ouverte
 */
export async function notifyDisputeOpened(params: {
  announcerId: Id<"users">;
  clientName: string;
  serviceName: string;
  reason: string;
  missionId: Id<"missions">;
}) {
  await queueNotification({
    userId: params.announcerId as string,
    type: "system",
    title: "Réclamation ouverte",
    message: `${params.clientName} a ouvert une réclamation pour "${params.serviceName}" : ${params.reason}`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: `/dashboard/missions`,
  });
}

// ============================================
// MESSAGES
// ============================================

/**
 * Notifier d'un nouveau message
 */
export async function notifyNewMessage(params: {
  userId: Id<"users">;
  senderName: string;
  preview: string;
  conversationId: string;
}) {
  await queueNotification({
    userId: params.userId as string,
    type: "new_message",
    title: "Nouveau message",
    message: `${params.senderName}: ${params.preview.substring(0, 100)}${params.preview.length > 100 ? "..." : ""}`,
    linkType: "message",
    linkId: params.conversationId,
    linkUrl: `/messages/${params.conversationId}`,
  });
}

// ============================================
// SYSTÈME
// ============================================

/**
 * Notifier un nouvel utilisateur avec un message de bienvenue
 */
export async function notifyWelcome(params: {
  userId: Id<"users">;
  firstName: string;
  isAnnouncer: boolean;
}) {
  await queueNotification({
    userId: params.userId as string,
    type: "welcome",
    title: `Bienvenue ${params.firstName} !`,
    message: params.isAnnouncer
      ? "Votre compte annonceur est cree. Completez votre profil pour recevoir des demandes."
      : "Votre compte est cree. Trouvez le prestataire ideal pour votre animal !",
    linkType: "settings",
    linkUrl: params.isAnnouncer ? `/dashboard/profil` : `/client/profil`,
  });
}

/**
 * Envoyer un rappel
 */
export async function notifyReminder(params: {
  userId: Id<"users">;
  title: string;
  message: string;
  linkUrl?: string;
}) {
  await queueNotification({
    userId: params.userId as string,
    type: "reminder",
    title: params.title,
    message: params.message,
    linkUrl: params.linkUrl,
  });
}

/**
 * Notifier un annonceur particulier d'une alerte de régularité
 */
export async function notifyRegularityAlert(params: {
  userId: Id<"users">;
  alertLevel: string;
  score: number;
  monthlyMissions: number;
  annualRevenue: number;
  consecutiveActiveMonths: number;
  uniqueClients: number;
}) {
  const levelMessages: Record<string, { title: string; message: string }> = {
    ok: {
      title: "Statut professionnel activé !",
      message: "Félicitations, votre compte est désormais professionnel. Vous pouvez continuer votre activité sereinement.",
    },
    attention: {
      title: "Activité en hausse",
      message: `Votre activité approche des seuils professionnels (score ${params.score}/4). Pensez à créer votre auto-entreprise.`,
    },
    warning: {
      title: "⚠️ Seuils professionnels atteints",
      message: `Votre activité dépasse les seuils légaux (score ${params.score}/4). Nous vous recommandons fortement de devenir auto-entrepreneur.`,
    },
    critical: {
      title: "⚠️ Action requise - Statut professionnel",
      message: `Votre activité nécessite un statut professionnel (score ${params.score}/4). Vous disposez de 30 jours pour régulariser votre situation.`,
    },
  };

  const info = levelMessages[params.alertLevel] || levelMessages.attention;

  await queueNotification({
    userId: params.userId as string,
    type: "system",
    title: info.title,
    message: info.message,
    linkUrl: "/dashboard/devenir-pro",
    metadata: {
      regularityAlert: true,
      alertLevel: params.alertLevel,
      score: params.score,
      monthlyMissions: params.monthlyMissions,
      annualRevenue: params.annualRevenue,
      consecutiveActiveMonths: params.consecutiveActiveMonths,
      uniqueClients: params.uniqueClients,
    },
  });
}

/**
 * Notification système générique
 */
export async function notifySystem(params: {
  userId: Id<"users">;
  title: string;
  message: string;
  linkUrl?: string;
}) {
  await queueNotification({
    userId: params.userId as string,
    type: "system",
    title: params.title,
    message: params.message,
    linkUrl: params.linkUrl,
  });
}

// ============================================
// FACTURES / REÇUS
// ============================================

/**
 * Notifier le client qu'une facture/reçu est disponible
 */
export async function sendInvoiceAvailableNotification(params: {
  userId: Id<"users">;
  missionId: Id<"missions">;
  invoiceId: Id<"invoices">;
  documentType: "invoice" | "receipt";
  invoiceNumber: string;
  serviceName: string;
}) {
  const isInvoice = params.documentType === "invoice";
  const docLabel = isInvoice ? "facture" : "reçu";

  await queueNotification({
    userId: params.userId as string,
    type: isInvoice ? "invoice_available" : "receipt_available",
    title: isInvoice ? "Facture disponible" : "Reçu disponible",
    message: `Votre ${docLabel} ${params.invoiceNumber} pour "${params.serviceName}" est disponible`,
    linkType: "payment",
    linkId: params.invoiceId as string,
    linkUrl: `/client/factures`,
  });
}

/**
 * Notifier le client que la prestation est terminée
 */
export async function sendServiceCompletedNotification(params: {
  userId: Id<"users">;
  missionId: Id<"missions">;
  announcerName: string;
  serviceName: string;
  startDate: string;
}) {
  await queueNotification({
    userId: params.userId as string,
    type: "mission_completed",
    title: "Prestation terminée",
    message: `La prestation "${params.serviceName}" avec ${params.announcerName} est terminée. Vous pouvez laisser un avis.`,
    linkType: "mission",
    linkId: params.missionId as string,
    linkUrl: `/client/reservations/${params.missionId}`,
  });
}
