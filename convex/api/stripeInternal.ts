// @ts-nocheck
/**
 * Barrel re-export pour rétrocompatibilité.
 * Les fonctions ont été déplacées dans des fichiers spécialisés :
 * - stripeConfig.ts : clés API et config
 * - stripePaymentCreate.ts : création de paiements
 * - stripePaymentLifecycle.ts : cycle de vie des paiements
 * - stripeRefund.ts : remboursements et queries
 * - stripeTransfer.ts : transferts et Connect
 * - stripeMaintenance.ts : crons et maintenance
 *
 * Les appelants utilisent `internal.api.stripeInternal.*` — ce barrel
 * maintient la compatibilité pendant la migration.
 */

// Config
export { getStripeSecretKey, getStripePublicKey, getStripeWebhookSecret, getAppUrl } from "./stripeConfig";

// Payment creation
export { createPaymentRecord, createPaymentIntentRecord, updatePaymentIntentDetails, updatePaymentIntentDetailsDirect } from "./stripePaymentCreate";

// Payment lifecycle
export { markPaymentAuthorized, markPaymentPaid, markPaymentCaptured, markPaymentCancelled, markSessionExpired } from "./stripePaymentLifecycle";

// Refund & queries
export { getPaymentByMission, getMissionPaymentData, markPaymentRefunded, updateRefundStatus } from "./stripeRefund";

// Transfer & Connect
export { markTransferCreated, updateConnectAccountStatus } from "./stripeTransfer";

// Maintenance & crons
export { getMissionsForAutoCapture, cleanupExpiredSessions, triggerAutoCapture } from "./stripeMaintenance";
