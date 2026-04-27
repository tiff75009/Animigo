import { mutation, query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";

// Templates par défaut du système
const DEFAULT_TEMPLATES = [
  {
    slug: "verification",
    name: "Vérification d'email - Inscription",
    description: "Email envoyé après l'inscription pour vérifier l'adresse email",
    subject: "Confirmez votre adresse email - {{siteName}}",
    availableVariables: [
      { key: "firstName", description: "Prénom de l'utilisateur", example: "Jean" },
      { key: "verificationUrl", description: "Lien de vérification", example: "https://..." },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "expirationHours", description: "Heures avant expiration", example: "24" },
    ],
    isSystem: true,
  },
  {
    slug: "verification_reservation",
    name: "Vérification d'email - Réservation",
    description: "Email envoyé lors d'une réservation par un nouvel utilisateur",
    subject: "Confirmez votre email pour valider votre réservation - {{siteName}}",
    availableVariables: [
      { key: "firstName", description: "Prénom de l'utilisateur", example: "Jean" },
      { key: "verificationUrl", description: "Lien de vérification", example: "https://..." },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "expirationHours", description: "Heures avant expiration", example: "24" },
      { key: "serviceName", description: "Nom du service réservé", example: "Garde de chien" },
      { key: "announcerName", description: "Nom de l'annonceur", example: "Marie D." },
      { key: "startDate", description: "Date de début", example: "15/02/2025" },
      { key: "endDate", description: "Date de fin", example: "17/02/2025" },
      { key: "totalAmount", description: "Montant total", example: "150,00 €" },
    ],
    isSystem: true,
  },
  {
    slug: "welcome",
    name: "Bienvenue",
    description: "Email envoyé après la confirmation de l'email",
    subject: "Bienvenue sur {{siteName}} ! 🐾",
    availableVariables: [
      { key: "firstName", description: "Prénom de l'utilisateur", example: "Jean" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "dashboardUrl", description: "Lien vers le dashboard", example: "https://..." },
    ],
    isSystem: true,
  },
  {
    slug: "reservation_confirmed",
    name: "Réservation confirmée",
    description: "Email envoyé au client après confirmation de l'email (avec réservation)",
    subject: "Votre réservation est confirmée ! - {{siteName}}",
    availableVariables: [
      { key: "firstName", description: "Prénom du client", example: "Jean" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "announcerName", description: "Nom de l'annonceur", example: "Marie D." },
      { key: "startDate", description: "Date de début", example: "15/02/2025" },
      { key: "endDate", description: "Date de fin", example: "17/02/2025" },
      { key: "startTime", description: "Heure de début", example: "14:00" },
      { key: "animalName", description: "Nom de l'animal", example: "Max" },
      { key: "animalType", description: "Type d'animal", example: "Chien" },
      { key: "totalAmount", description: "Montant total", example: "150,00 €" },
      { key: "location", description: "Lieu de la prestation", example: "Paris 15ème" },
    ],
    isSystem: true,
  },
  {
    slug: "new_reservation_request",
    name: "Nouvelle demande de réservation",
    description: "Email envoyé à l'annonceur quand il reçoit une nouvelle demande",
    subject: "Nouvelle demande de réservation ! - {{siteName}}",
    availableVariables: [
      { key: "announcerFirstName", description: "Prénom de l'annonceur", example: "Marie" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "clientName", description: "Nom du client", example: "Jean D." },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "startDate", description: "Date de début", example: "15/02/2025" },
      { key: "endDate", description: "Date de fin", example: "17/02/2025" },
      { key: "animalName", description: "Nom de l'animal", example: "Max" },
      { key: "animalType", description: "Type d'animal", example: "Chien" },
      { key: "totalAmount", description: "Montant total", example: "150,00 €" },
      { key: "dashboardUrl", description: "Lien vers le dashboard", example: "https://..." },
    ],
    isSystem: true,
  },
  {
    slug: "reservation_accepted",
    name: "Réservation acceptée - Paiement requis",
    description: "Email envoyé au client quand l'annonceur accepte la réservation avec lien de paiement Stripe",
    subject: "Votre réservation a été acceptée - Finalisez le paiement ! - {{siteName}}",
    availableVariables: [
      { key: "firstName", description: "Prénom du client", example: "Jean" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "announcerName", description: "Nom de l'annonceur", example: "Marie D." },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "startDate", description: "Date de début", example: "15/02/2025" },
      { key: "endDate", description: "Date de fin", example: "17/02/2025" },
      { key: "animalName", description: "Nom de l'animal", example: "Max" },
      { key: "paymentUrl", description: "Lien de paiement Stripe", example: "https://checkout.stripe.com/..." },
      { key: "totalAmount", description: "Montant total", example: "150,00 €" },
      { key: "expirationTime", description: "Durée de validité du lien", example: "1 heure" },
    ],
    isSystem: true,
  },
  {
    slug: "mission_validated_by_client",
    name: "Service validé par le client",
    description: "Email envoyé à l'annonceur quand le client valide la fin du service",
    subject: "Le client a validé votre service - {{siteName}}",
    availableVariables: [
      { key: "announcerName", description: "Prénom de l'annonceur", example: "Marie" },
      { key: "clientName", description: "Nom du client", example: "Jean D." },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "animalName", description: "Nom de l'animal", example: "Rex" },
      { key: "startDate", description: "Date de début", example: "15/03/2025" },
      { key: "endDate", description: "Date de fin", example: "17/03/2025" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "reviewUrl", description: "Lien vers la page des avis", example: "https://animigo.fr/dashboard/avis" },
    ],
    isSystem: true,
  },
  {
    slug: "mission_auto_validated_announcer",
    name: "Auto-validation (annonceur)",
    description: "Email envoyé à l'annonceur lors de l'auto-validation 48h",
    subject: "Service considéré comme terminé - {{siteName}}",
    availableVariables: [
      { key: "announcerName", description: "Prénom de l'annonceur", example: "Marie" },
      { key: "clientName", description: "Nom du client", example: "Jean D." },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "startDate", description: "Date de début", example: "15/03/2025" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "dashboardUrl", description: "Lien vers le dashboard", example: "https://..." },
    ],
    isSystem: true,
  },
  {
    slug: "mission_auto_validated_client",
    name: "Auto-validation (client)",
    description: "Email envoyé au client lors de l'auto-validation 48h",
    subject: "Votre service est considéré comme terminé - {{siteName}}",
    availableVariables: [
      { key: "clientName", description: "Prénom du client", example: "Jean" },
      { key: "announcerName", description: "Nom de l'annonceur", example: "Marie D." },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "startDate", description: "Date de début", example: "15/03/2025" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "reviewUrl", description: "Lien pour laisser un avis", example: "https://..." },
    ],
    isSystem: true,
  },
  {
    slug: "dispute_opened",
    name: "Réclamation ouverte",
    description: "Email envoyé à l'annonceur quand un client ouvre une réclamation",
    subject: "Une réclamation a été ouverte - {{siteName}}",
    availableVariables: [
      { key: "announcerName", description: "Prénom de l'annonceur", example: "Marie" },
      { key: "clientName", description: "Nom du client", example: "Jean D." },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "reason", description: "Motif de la réclamation", example: "Service non réalisé" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
    ],
    isSystem: true,
  },
  {
    slug: "mission_cancelled_by_client",
    name: "Annulation par le client",
    description: "Email envoyé à l'annonceur quand un client annule sa réservation",
    subject: "Une réservation a été annulée - {{siteName}}",
    availableVariables: [
      { key: "announcerName", description: "Prénom de l'annonceur", example: "Marie" },
      { key: "clientName", description: "Nom du client", example: "Jean D." },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "animalName", description: "Nom de l'animal", example: "Rex" },
      { key: "startDate", description: "Date de début", example: "15/03/2025" },
      { key: "endDate", description: "Date de fin", example: "17/03/2025" },
      { key: "totalAmount", description: "Montant total payé", example: "150,00 €" },
      { key: "refundAmount", description: "Montant remboursé au client", example: "120,00 €" },
      { key: "announcerRetained", description: "Montant conservé par l'annonceur", example: "30,00 €" },
      { key: "cancellationReason", description: "Raison de l'annulation", example: "Changement de programme" },
      { key: "cancellationRule", description: "Règle d'annulation appliquée", example: "Remboursement intégral (dans les 24h après paiement)" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
    ],
    isSystem: true,
  },
  {
    slug: "mission_cancelled_by_client_confirmation",
    name: "Confirmation d'annulation (client)",
    description: "Email envoyé au client pour confirmer l'annulation de sa réservation",
    subject: "Votre réservation a été annulée - {{siteName}}",
    availableVariables: [
      { key: "clientName", description: "Prénom du client", example: "Jean" },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "animalName", description: "Nom de l'animal", example: "Rex" },
      { key: "startDate", description: "Date de début", example: "15/03/2025" },
      { key: "endDate", description: "Date de fin", example: "17/03/2025" },
      { key: "totalAmount", description: "Montant total payé", example: "150,00 €" },
      { key: "refundAmount", description: "Montant remboursé", example: "120,00 €" },
      { key: "platformFeeRetained", description: "Commission plateforme retenue", example: "15,00 €" },
      { key: "cancellationRule", description: "Règle d'annulation appliquée", example: "Remboursement intégral (dans les 24h après paiement)" },
      { key: "refundDelay", description: "Délai estimé du remboursement", example: "5-10 jours ouvrés" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
    ],
    isSystem: true,
  },
  {
    slug: "mission_auto_refused",
    name: "Auto-refus (délai acceptation dépassé)",
    description: "Email envoyé au client quand une réservation est auto-refusée car l'annonceur n'a pas répondu à temps",
    subject: "Votre réservation n'a pas été acceptée à temps - {{siteName}}",
    availableVariables: [
      { key: "clientName", description: "Prénom du client", example: "Jean" },
      { key: "announcerName", description: "Nom de l'annonceur", example: "Marie D." },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "startDate", description: "Date de début", example: "15/03/2025" },
      { key: "endDate", description: "Date de fin", example: "17/03/2025" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "searchUrl", description: "Lien vers la recherche", example: "https://..." },
    ],
    isSystem: true,
  },
  {
    slug: "mission_auto_expired_client",
    name: "Expiration paiement (client)",
    description: "Email envoyé au client quand la réservation expire car le paiement n'a pas été effectué à temps",
    subject: "Votre réservation a expiré (paiement non effectué) - {{siteName}}",
    availableVariables: [
      { key: "clientName", description: "Prénom du client", example: "Jean" },
      { key: "announcerName", description: "Nom de l'annonceur", example: "Marie D." },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "startDate", description: "Date de début", example: "15/03/2025" },
      { key: "endDate", description: "Date de fin", example: "17/03/2025" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "searchUrl", description: "Lien vers la recherche", example: "https://..." },
    ],
    isSystem: true,
  },
  {
    slug: "mission_auto_expired_announcer",
    name: "Expiration paiement (annonceur)",
    description: "Email envoyé à l'annonceur quand la réservation expire car le client n'a pas payé à temps",
    subject: "Une réservation a expiré (paiement non effectué) - {{siteName}}",
    availableVariables: [
      { key: "announcerName", description: "Prénom de l'annonceur", example: "Marie" },
      { key: "clientName", description: "Nom du client", example: "Jean D." },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "startDate", description: "Date de début", example: "15/03/2025" },
      { key: "endDate", description: "Date de fin", example: "17/03/2025" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "dashboardUrl", description: "Lien vers le dashboard", example: "https://..." },
    ],
    isSystem: true,
  },
  {
    slug: "admin_refund_client",
    name: "Remboursement admin (client)",
    description: "Email envoyé au client lorsqu'un remboursement est effectué par l'admin",
    subject: "Votre remboursement a été effectué - {{siteName}}",
    availableVariables: [
      { key: "clientName", description: "Prénom du client", example: "Jean" },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "announcerName", description: "Nom du prestataire", example: "Marie D." },
      { key: "startDate", description: "Date de début", example: "15/03/2025" },
      { key: "endDate", description: "Date de fin", example: "17/03/2025" },
      { key: "refundAmount", description: "Montant remboursé", example: "150,00 €" },
      { key: "reason", description: "Raison du remboursement", example: "Service non conforme" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "reservationsUrl", description: "Lien vers les réservations", example: "https://..." },
    ],
    isSystem: true,
  },
  {
    slug: "account_deactivated",
    name: "Compte désactivé",
    description: "Email envoyé à l'annonceur lorsque son compte est désactivé par l'admin",
    subject: "Votre compte a été désactivé - {{siteName}}",
    availableVariables: [
      { key: "announcerName", description: "Prénom de l'annonceur", example: "Marie" },
      { key: "reason", description: "Raison de la désactivation", example: "Non-respect des conditions" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "supportEmail", description: "Email du support", example: "support@animigo.fr" },
    ],
    isSystem: true,
  },
  {
    slug: "payment_receipt",
    name: "Reçu de paiement",
    description: "Reçu envoyé au client après un paiement réussi. Le PDF du reçu est joint en pièce jointe et téléchargeable depuis /client/factures. Contient les mentions légales (escrow, intermédiation, Stripe) et le résumé du paiement.",
    subject: "✓ Paiement confirmé · {{serviceName}} · Reçu PDF en pièce jointe",
    availableVariables: [
      { key: "clientName", description: "Prénom du client", example: "Jean" },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "announcerName", description: "Nom du prestataire", example: "Marie D." },
      { key: "announcerStatus", description: "Statut du prestataire (Pro ou Particulier)", example: "Professionnel" },
      { key: "announcerCompany", description: "Nom entreprise (si pro)", example: "Marie Pet Services" },
      { key: "announcerSiret", description: "SIRET (si pro)", example: "123 456 789 00012" },
      { key: "startDate", description: "Date de début", example: "15/03/2025" },
      { key: "endDate", description: "Date de fin", example: "17/03/2025" },
      { key: "prestationHT", description: "Montant HT de la prestation", example: "125,00 €" },
      { key: "tvaRate", description: "Taux de TVA", example: "20" },
      { key: "tvaAmount", description: "Montant de la TVA", example: "25,00 €" },
      { key: "sapBadge", description: "Badge SAP si applicable", example: "(taux réduit SAP)" },
      { key: "commissionRate", description: "Taux de commission", example: "15" },
      { key: "commissionAmount", description: "Montant de la commission", example: "22,50 €" },
      { key: "stripeFeeRate", description: "Taux frais de paiement", example: "3" },
      { key: "stripeFeeAmount", description: "Montant frais de paiement", example: "5,18 €" },
      { key: "totalAmount", description: "Total TTC payé", example: "177,68 €" },
      { key: "paymentDate", description: "Date et heure du paiement", example: "10/02/2025 à 14h35" },
      { key: "paymentRef", description: "Référence du paiement", example: "pi_3Abc123..." },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "paymentMethod", description: "Moyen de paiement (marque + 4 derniers chiffres)", example: "Visa •••• 4242" },
      { key: "reservationsUrl", description: "Lien vers les réservations", example: "https://..." },
    ],
    isSystem: true,
  },
  {
    slug: "service_completed_invoice",
    name: "Facture suite à validation prestation",
    description: "Email envoyé au client après confirmation (manuelle ou auto) de la fin de prestation. La facture/reçu PDF est joint en pièce jointe. Déclenché par la mission validée par le client OU par auto-confirmation après le délai admin.",
    subject: "✓ Prestation terminée · Votre facture {{invoiceNumber}} en pièce jointe",
    availableVariables: [
      { key: "clientName", description: "Prénom du client", example: "Jean" },
      { key: "serviceName", description: "Nom du service", example: "Garde de chien" },
      { key: "announcerName", description: "Nom du prestataire", example: "Marie D." },
      { key: "invoiceNumber", description: "Numéro de la facture/reçu", example: "FA-2026-0042" },
      { key: "documentTypeLabel", description: "Type document (Facture / Reçu)", example: "Facture" },
      { key: "totalAmount", description: "Montant total TTC (formaté)", example: "90,00 €" },
      { key: "amountHT", description: "Montant HT (formaté, si TVA)", example: "75,00 €" },
      { key: "tva", description: "Montant TVA (formaté, si TVA)", example: "15,00 €" },
      { key: "vatRate", description: "Taux TVA appliqué", example: "20" },
      { key: "startDate", description: "Date de début prestation", example: "15/03/2026" },
      { key: "endDate", description: "Date de fin prestation", example: "17/03/2026" },
      { key: "validationType", description: "Type de validation (Confirmée par vous / Auto-confirmée)", example: "Confirmée par vous" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "reservationsUrl", description: "Lien vers les réservations client", example: "https://..." },
      { key: "facturesUrl", description: "Lien vers /client/factures", example: "https://..." },
    ],
    isSystem: true,
  },
  {
    slug: "refund_confirmation",
    name: "Bon de remboursement",
    description: "Confirmation de remboursement envoyée au client après une annulation. Le PDF du bon de remboursement est joint en pièce jointe. Détaille le motif, les frais retenus et le délai bancaire estimé.",
    subject: "↩ Remboursement confirmé · {{refundAmount}} · {{serviceName}}",
    availableVariables: [
      { key: "clientName", description: "Prénom du client", example: "Jean" },
      { key: "serviceName", description: "Nom du service annulé", example: "Garde de chien" },
      { key: "refundAmount", description: "Montant remboursé (formaté)", example: "73,80 €" },
      { key: "originalAmount", description: "Montant payé initialement (formaté)", example: "90,00 €" },
      { key: "platformFeeRetained", description: "Frais de service retenus (formaté)", example: "13,50 €" },
      { key: "stripeFeeRetained", description: "Frais bancaires retenus (formaté)", example: "2,70 €" },
      { key: "announcerRetained", description: "Pénalité d'annulation conservée (formaté)", example: "0,00 €" },
      { key: "refundReason", description: "Motif du remboursement", example: "1ère annulation : remboursement intégral hors frais" },
      { key: "cancellationCount", description: "Niveau d'annulation", example: "1ère annulation" },
      { key: "cardBrand", description: "Marque de la CB de remboursement", example: "Visa" },
      { key: "cardLast4", description: "4 derniers chiffres CB", example: "•••• 4242" },
      { key: "transactionId", description: "ID transaction Stripe (paiement original)", example: "pi_3OqXyz1abc..." },
      { key: "refundStripeId", description: "ID remboursement Stripe", example: "re_3OqXyz1abc..." },
      { key: "refundDelay", description: "Délai bancaire estimé", example: "3 à 5 jours ouvrés" },
      { key: "refundReference", description: "Numéro de bon de remboursement", example: "REM-2026-0042" },
      { key: "siteName", description: "Nom du site", example: "Animigo" },
      { key: "reservationsUrl", description: "Lien vers les réservations", example: "https://..." },
    ],
    isSystem: true,
  },
];

// HTML par défaut pour les templates
const getDefaultHtmlContent = (slug: string): string => {
  const baseStyle = `
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; }
    .header p { margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; }
    .content { padding: 40px 30px; }
    .content h2 { margin: 0 0 20px 0; color: #1e293b; font-size: 24px; }
    .content p { margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6; }
    .btn { display: inline-block; background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px; }
    .footer { background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 0; color: #94a3b8; font-size: 12px; }
    .info-box { margin: 20px 0; padding: 20px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9; }
    .warning-box { margin: 20px 0; padding: 20px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b; }
  `;

  switch (slug) {
    case "verification":
      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyle}</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>🐾 {{siteName}}</h1>
      <p>La plateforme de garde d'animaux de confiance</p>
    </div>
    <div class="content">
      <h2>Bonjour {{firstName}} ! 👋</h2>
      <p>Merci de vous être inscrit(e) sur {{siteName}} ! Pour finaliser votre inscription et accéder à toutes les fonctionnalités, veuillez confirmer votre adresse email.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{verificationUrl}}" class="btn">✓ Confirmer mon email</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
      <p style="word-break: break-all;"><a href="{{verificationUrl}}" style="color: #FF6B6B; font-size: 13px;">{{verificationUrl}}</a></p>
      <div class="warning-box">
        <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ Ce lien expire dans {{expirationHours}} heures.</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "verification_reservation":
      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyle}</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>🐾 {{siteName}}</h1>
      <p>Confirmez votre email pour finaliser votre réservation</p>
    </div>
    <div class="content">
      <h2>Bonjour {{firstName}} ! 👋</h2>
      <p>Vous avez effectué une réservation sur {{siteName}}. Pour la valider, veuillez confirmer votre adresse email.</p>

      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Récapitulatif de votre réservation</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant :</strong> {{totalAmount}}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{verificationUrl}}" class="btn">✓ Confirmer et valider ma réservation</a>
      </div>

      <div class="warning-box">
        <p style="margin: 0; color: #92400e; font-size: 14px;">⚠️ Ce lien expire dans {{expirationHours}} heures. Sans confirmation, votre réservation sera annulée.</p>
      </div>
    </div>
    <div class="footer">
      <p>© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "welcome":
      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyle} .header { background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); }</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>🎉 Bienvenue !</h1>
    </div>
    <div class="content">
      <h2>Votre compte est confirmé, {{firstName}} !</h2>
      <p>Félicitations ! Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant profiter de toutes les fonctionnalités de {{siteName}}.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" class="btn" style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%);">Accéder à mon espace</a>
      </div>
    </div>
    <div class="footer">
      <p>© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "reservation_confirmed":
      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyle} .header { background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); }</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>✅ Réservation confirmée !</h1>
    </div>
    <div class="content">
      <h2>Félicitations {{firstName}} !</h2>
      <p>Votre email est maintenant vérifié et votre demande de réservation a été envoyée à {{announcerName}}. Vous recevrez une notification dès que votre réservation sera acceptée.</p>

      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Récapitulatif</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> {{animalName}} ({{animalType}})</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Lieu :</strong> {{location}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant total :</strong> {{totalAmount}}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" class="btn" style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%);">Voir ma réservation</a>
      </div>

      <p style="font-size: 14px; color: #64748b;">Une fois acceptée par le prestataire, vous recevrez un lien de paiement pour finaliser votre réservation.</p>
    </div>
    <div class="footer">
      <p>© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "new_reservation_request":
      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyle} .header { background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); }</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>🔔 Nouvelle réservation !</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{announcerFirstName}} !</h2>
      <p>Vous avez reçu une nouvelle demande de réservation de la part de {{clientName}}.</p>

      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Détails de la demande</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> {{animalName}} ({{animalType}})</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant :</strong> {{totalAmount}}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" class="btn" style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);">Voir et répondre</a>
      </div>

      <p style="font-size: 14px; color: #64748b;">Répondez rapidement pour offrir une bonne expérience à vos clients !</p>
    </div>
    <div class="footer">
      <p>© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "reservation_accepted":
      return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyle} .header { background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); }</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>🎉 Bonne nouvelle !</h1>
      <p>Votre réservation a été acceptée</p>
    </div>
    <div class="content">
      <h2>Bonjour {{firstName}} !</h2>
      <p>{{announcerName}} a accepté votre demande de réservation. Pour confirmer définitivement votre prestation, veuillez procéder au paiement sécurisé.</p>

      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">📋 Récapitulatif</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> {{animalName}}</p>
        <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold; color: #0369a1;">Montant : {{totalAmount}}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{paymentUrl}}" class="btn" style="background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%);">💳 Procéder au paiement</a>
      </div>

      <div class="warning-box">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          ⏰ <strong>Important :</strong> Ce lien expire dans {{expirationTime}}. Passé ce délai, vous devrez contacter {{announcerName}} pour une nouvelle demande.
        </p>
      </div>

      <div style="margin-top: 20px; padding: 15px; background-color: #ecfdf5; border-radius: 12px;">
        <p style="margin: 0; color: #065f46; font-size: 14px;">
          🔒 <strong>Paiement sécurisé :</strong> Vos fonds seront réservés (non débités) jusqu'à la réalisation de la prestation. Vous pourrez confirmer la fin de prestation pour déclencher le paiement définitif. Si vous ne confirmez pas sous 48h après la fin, le paiement sera automatiquement finalisé.
        </p>
      </div>
    </div>
    <div class="footer">
      <p>© 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "mission_validated_by_client":
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${baseStyle} .header { background: linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%); }</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>&#10004; Service validé !</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{announcerName}},</h2>
      <p>{{clientName}} a confirmé la fin de votre service <strong>"{{serviceName}}"</strong> pour <strong>{{animalName}}</strong>.</p>
      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">Détails de la prestation</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Client :</strong> {{clientName}}</p>
      </div>
      <p>Le versement sera effectué selon votre mode de paiement configuré. Le client peut désormais laisser un avis sur votre prestation.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{reviewUrl}}" style="display: inline-block; background-color: #4ECDC4; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-weight: bold; font-size: 16px;">Voir les avis</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "mission_auto_validated_announcer":
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${baseStyle}</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>⏰ Auto-validation</h1>
      <p>Service considéré comme terminé</p>
    </div>
    <div class="content">
      <h2>Bonjour {{announcerName}},</h2>
      <p>Le délai de validation de 48h étant écoulé, le service "{{serviceName}}" avec {{clientName}} du {{startDate}} est considéré comme terminé et validé automatiquement.</p>
      <p>Le versement sera effectué selon votre mode de paiement configuré.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" class="btn">Voir mon dashboard</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "mission_auto_validated_client":
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${baseStyle}</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>⏰ Service terminé</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{clientName}},</h2>
      <p>Le délai de validation de 48h étant écoulé, le service "{{serviceName}}" avec {{announcerName}} du {{startDate}} est considéré comme terminé.</p>
      <p>Vous pouvez encore laisser un avis sur votre expérience :</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{reviewUrl}}" class="btn">Laisser un avis</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "dispute_opened":
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${baseStyle}</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Réclamation ouverte</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{announcerName}},</h2>
      <p>{{clientName}} a ouvert une réclamation concernant le service "{{serviceName}}".</p>
      <div class="warning-box">
        <p style="margin: 0; font-weight: bold; color: #92400e;">Motif : {{reason}}</p>
      </div>
      <p>Notre équipe va examiner cette réclamation. Vous serez informé(e) de l'avancement.</p>
    </div>
    <div class="footer">
      <p>&copy; 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "mission_cancelled_by_client":
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${baseStyle}</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Réservation annulée</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{announcerName}},</h2>
      <p>{{clientName}} a annulé sa réservation pour "{{serviceName}}".</p>
      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">Détails de la réservation</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> {{animalName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant total :</strong> {{totalAmount}}</p>
      </div>
      <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5; border-radius: 12px; border-left: 4px solid #10b981;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #065f46;">Récapitulatif financier</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Remboursement client :</strong> {{refundAmount}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant conservé :</strong> {{announcerRetained}}</p>
      </div>
      <div style="margin: 20px 0; padding: 15px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0; color: #0369a1; font-size: 14px;"><strong>Règle appliquée :</strong> {{cancellationRule}}</p>
      </div>
      <div style="margin: 20px 0; padding: 20px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 5px 0; font-weight: bold; color: #92400e;">Raison :</p>
        <p style="margin: 0; color: #78350f;">{{cancellationReason}}</p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "mission_cancelled_by_client_confirmation":
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${baseStyle}</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Annulation confirmée</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{clientName}},</h2>
      <p>Votre réservation pour "{{serviceName}}" a bien été annulée.</p>
      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">Détails</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Animal :</strong> {{animalName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant total :</strong> {{totalAmount}}</p>
      </div>
      <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5; border-radius: 12px; border-left: 4px solid #10b981;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #065f46;">Remboursement</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Montant remboursé :</strong> {{refundAmount}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Commission retenue :</strong> {{platformFeeRetained}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Délai estimé :</strong> {{refundDelay}}</p>
      </div>
      <div style="margin: 20px 0; padding: 15px; background-color: #f0f9ff; border-radius: 12px; border-left: 4px solid #0ea5e9;">
        <p style="margin: 0; color: #0369a1; font-size: 14px;"><strong>Règle appliquée :</strong> {{cancellationRule}}</p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "mission_auto_refused":
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${baseStyle}</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Réservation non acceptée</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{clientName}},</h2>
      <p>Malheureusement, votre réservation auprès de {{announcerName}} n'a pas été acceptée dans le délai imparti.</p>
      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">Détails de la réservation</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
      </div>
      <div class="warning-box">
        <p style="margin: 0; color: #92400e; font-size: 14px;">Le prestataire n'a pas répondu à votre demande dans le délai prévu. La réservation a été automatiquement annulée.</p>
      </div>
      <p>Nous vous invitons à rechercher un autre prestataire disponible pour votre besoin.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{searchUrl}}" class="btn" style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);">Rechercher un prestataire</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "mission_auto_expired_client":
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${baseStyle}</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Réservation expirée</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{clientName}},</h2>
      <p>Votre réservation auprès de {{announcerName}} a expiré car le paiement n'a pas été effectué dans le délai imparti.</p>
      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">Détails de la réservation</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
      </div>
      <div class="warning-box">
        <p style="margin: 0; color: #92400e; font-size: 14px;">Le délai de paiement a expiré. La réservation a été automatiquement annulée.</p>
      </div>
      <p>Vous pouvez effectuer une nouvelle réservation si vous le souhaitez.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{searchUrl}}" class="btn" style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);">Rechercher un prestataire</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "mission_auto_expired_announcer":
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${baseStyle}</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Réservation expirée</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{announcerName}},</h2>
      <p>La réservation de {{clientName}} pour votre service "{{serviceName}}" a expiré car le paiement n'a pas été effectué dans le délai imparti.</p>
      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">Détails de la réservation</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Client :</strong> {{clientName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
      </div>
      <div class="warning-box">
        <p style="margin: 0; color: #92400e; font-size: 14px;">Le client n'a pas effectué le paiement dans le délai prévu. Les créneaux concernés sont de nouveau disponibles.</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{dashboardUrl}}" class="btn">Voir mon dashboard</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "admin_refund_client":
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${baseStyle} .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); }</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div class="header">
      <h1>Remboursement effectué</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{clientName}},</h2>
      <p>Un remboursement a été effectué sur votre réservation. Voici le détail :</p>
      <div class="info-box">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #0369a1;">Détails du service</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Service :</strong> {{serviceName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Prestataire :</strong> {{announcerName}}</p>
        <p style="margin: 5px 0; color: #475569;"><strong>Dates :</strong> Du {{startDate}} au {{endDate}}</p>
      </div>
      <div style="margin: 20px 0; padding: 20px; background-color: #ecfdf5; border-radius: 12px; border-left: 4px solid #10b981;">
        <p style="margin: 0 0 5px 0; font-weight: bold; color: #065f46; font-size: 18px;">Montant remboursé : {{refundAmount}}</p>
        <p style="margin: 0; color: #047857; font-size: 14px;">Le remboursement sera visible sur votre compte sous 5 à 10 jours ouvrés.</p>
      </div>
      <div style="margin: 20px 0; padding: 20px; background-color: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 5px 0; font-weight: bold; color: #92400e;">Raison :</p>
        <p style="margin: 0; color: #78350f;">{{reason}}</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{reservationsUrl}}" class="btn" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%);">Voir mes réservations</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "account_deactivated":
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${baseStyle}</style></head>
<body>
<div style="padding: 40px 20px; background-color: #f4f4f5;">
  <div class="container">
    <div style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 40px 30px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Compte désactivé</h1>
    </div>
    <div class="content">
      <h2>Bonjour {{announcerName}},</h2>
      <p>Nous vous informons que votre compte sur {{siteName}} a été désactivé par notre équipe d'administration.</p>
      <div style="margin: 20px 0; padding: 20px; background-color: #fef2f2; border-radius: 12px; border-left: 4px solid #DC2626;">
        <p style="margin: 0 0 5px 0; font-weight: bold; color: #991b1b;">Raison :</p>
        <p style="margin: 0; color: #7f1d1d;">{{reason}}</p>
      </div>
      <p>Tant que votre compte est désactivé, vous ne pourrez plus recevoir de réservations ni accéder à votre espace prestataire.</p>
      <p>Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez contester cette décision, veuillez contacter notre support :</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="mailto:{{supportEmail}}" style="display: inline-block; background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px;">Contacter le support</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; 2025 {{siteName}}. Tous droits réservés.</p>
    </div>
  </div>
</div>
</body>
</html>`;

    case "payment_receipt":
      // Refonte 2026 : design Animigo (vert foncé/crème), badge PAYÉ, PDF en PJ mis en avant,
      // mentions légales escrow + Stripe + intermédiation, suppression du tableau fiscal
      // (déplacé dans le PDF). CTA → /client/factures pour télécharger l'historique.
      return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Paiement confirmé</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#fcfaf4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;color:#1f1f1d;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfaf4;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece9e1;">
    <!-- HEADER : badge PAYÉ + montant -->
    <tr>
      <td style="padding:32px;background-color:#f5f9f6;border-bottom:1px solid #cfdbd3;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="left" style="vertical-align:top;">
              <span style="display:inline-block;padding:6px 14px;background-color:#10b981;color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:1px;border-radius:99px;">✓ PAIEMENT REÇU</span>
              <h1 style="margin:14px 0 0 0;color:#1f3a33;font-size:24px;font-weight:bold;letter-spacing:-0.5px;">Merci pour votre paiement</h1>
              <p style="margin:6px 0 0 0;color:#6d6d68;font-size:12px;">Réf. : <span style="font-family:'Courier New',monospace;color:#1f3a33;">{{paymentRef}}</span></p>
            </td>
            <td align="right" style="vertical-align:top;width:140px;">
              <p style="margin:0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Montant payé</p>
              <p style="margin:4px 0 0 0;color:#10b981;font-size:28px;font-weight:bold;">{{totalAmount}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Salutation -->
    <tr>
      <td style="padding:28px 32px 8px 32px;">
        <p style="margin:0;color:#1f1f1d;font-size:15px;line-height:1.5;">Bonjour <strong>{{clientName}}</strong>,</p>
        <p style="margin:12px 0 0 0;color:#6d6d68;font-size:14px;line-height:1.6;">Votre paiement de <strong style="color:#1f3a33;">{{totalAmount}}</strong> pour <strong style="color:#1f3a33;">{{serviceName}}</strong> a bien été reçu et sécurisé sur notre plateforme. Votre réservation est désormais confirmée.</p>
      </td>
    </tr>
    <!-- PDF en pièce jointe (mise en avant principale) -->
    <tr>
      <td style="padding:8px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;">
          <tr>
            <td style="padding:18px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;width:42px;font-size:24px;">📎</td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;color:#065f46;font-size:14px;font-weight:bold;">Votre reçu PDF est joint à cet email</p>
                    <p style="margin:4px 0 0 0;color:#047857;font-size:12.5px;line-height:1.5;">Téléchargeable à tout moment depuis votre espace personnel,<br/>section <strong>Mes factures › Reçus de paiement</strong></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Récap prestation -->
    <tr>
      <td style="padding:8px 32px;">
        <p style="margin:0 0 8px 0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Détail de la prestation</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfaf4;border:1px solid #ece9e1;border-radius:10px;">
          <tr>
            <td style="padding:14px 16px;">
              <p style="margin:0 0 6px 0;color:#1f1f1d;font-size:14px;font-weight:bold;">{{serviceName}}</p>
              <p style="margin:0;color:#6d6d68;font-size:13px;">📅 Du {{startDate}} au {{endDate}}</p>
              <p style="margin:6px 0 0 0;color:#6d6d68;font-size:13px;">👤 Prestataire : <strong style="color:#1f1f1d;">{{announcerName}}</strong> · {{announcerStatus}}</p>
              <p style="margin:4px 0 0 0;color:#9c9484;font-size:12px;">{{announcerCompany}}{{announcerSiret}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Récap paiement -->
    <tr>
      <td style="padding:8px 32px 16px 32px;">
        <p style="margin:0 0 8px 0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Détail du paiement</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfaf4;border:1px solid #ece9e1;border-radius:10px;">
          <tr>
            <td style="padding:14px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:4px 0;color:#9c9484;font-size:12.5px;width:140px;">Date du paiement</td>
                  <td style="padding:4px 0;color:#1f1f1d;font-size:13px;font-weight:600;text-align:right;">{{paymentDate}}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#9c9484;font-size:12.5px;">Mode de paiement</td>
                  <td style="padding:4px 0;color:#1f1f1d;font-size:13px;font-weight:600;text-align:right;">{{paymentMethod}}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0 4px 0;color:#9c9484;font-size:12.5px;border-top:1px solid #ece9e1;">Total payé</td>
                  <td style="padding:8px 0 4px 0;color:#10b981;font-size:15px;font-weight:bold;text-align:right;border-top:1px solid #ece9e1;">{{totalAmount}}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:8px 0 0 0;color:#9c9484;font-size:11px;line-height:1.5;font-style:italic;">Le détail comptable complet (HT, TVA, commission, frais Stripe) figure dans le reçu PDF joint à cet email.</p>
      </td>
    </tr>
    <!-- CTA principal -->
    <tr>
      <td align="center" style="padding:8px 32px 20px 32px;">
        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{reservationsUrl}}" style="height:48px;width:280px;v-text-anchor:middle;" arcsize="50%" fillcolor="#1f3a33" stroke="false"><v:textbox><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">Voir tous mes reçus</center></v:textbox></v:roundrect><![endif]-->
        <!--[if !mso]><!--><a href="{{reservationsUrl}}" style="display:inline-block;background-color:#1f3a33;color:#f7f5ef;text-decoration:none;padding:14px 32px;border-radius:99px;font-weight:bold;font-size:14px;letter-spacing:0.3px;">Voir tous mes reçus →</a><!--<![endif]-->
      </td>
    </tr>
    <!-- Mentions légales -->
    <tr>
      <td style="padding:16px 32px 8px 32px;border-top:1px solid #f1ede3;">
        <p style="margin:0 0 10px 0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Mentions légales</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
          <tr>
            <td style="padding:10px 14px;background-color:#f5f9f6;border-left:3px solid #1f3a33;border-radius:6px;">
              <p style="margin:0;color:#1f3a33;font-size:11.5px;line-height:1.5;"><strong>🔒 Fonds sécurisés :</strong> votre paiement est conservé sur le compte séquestre {{siteName}} jusqu'à confirmation de la réalisation du service par vos soins, puis reversé au prestataire conformément à nos CGV.</p>
            </td>
          </tr>
        </table>
        <p style="margin:8px 0;color:#9c9484;font-size:11px;line-height:1.6;">{{siteName}} agit en tant que <strong>plateforme de mise en relation</strong> entre les particuliers et les prestataires de services animaliers. Le présent document est un reçu de paiement et <strong>ne constitue pas une facture commerciale</strong>.</p>
        <p style="margin:8px 0;color:#9c9484;font-size:11px;line-height:1.6;">La facture comptable détaillée (avec TVA, mentions légales du prestataire) sera émise par votre prestataire une fois la prestation terminée.</p>
        <p style="margin:8px 0 0 0;color:#9c9484;font-size:11px;line-height:1.6;">Paiement sécurisé traité par <strong>Stripe Payments Europe Ltd</strong>, prestataire de services de paiement agréé.</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#fcfaf4;padding:24px 32px;border-top:1px solid #f1ede3;">
        <p style="margin:0;color:#1f3a33;font-size:13px;font-weight:600;">{{siteName}}</p>
        <p style="margin:6px 0 0 0;color:#9c9484;font-size:11px;">Plateforme de services animaliers</p>
        <p style="margin:12px 0 0 0;color:#cdc9c0;font-size:10px;">© 2026 {{siteName}}. Tous droits réservés.</p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

    case "service_completed_invoice":
      // Facture envoyée après validation prestation (manuelle ou auto-confirmation)
      // Palette vert/crème, badge ✓ TERMINÉE, PDF en PJ mis en avant.
      return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Prestation terminée — Facture</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#fcfaf4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;color:#1f1f1d;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfaf4;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece9e1;">
    <!-- HEADER -->
    <tr>
      <td style="padding:32px;background-color:#f5f9f6;border-bottom:1px solid #cfdbd3;">
        <span style="display:inline-block;padding:6px 14px;background-color:#10b981;color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:1px;border-radius:99px;">✓ PRESTATION TERMINÉE</span>
        <h1 style="margin:14px 0 0 0;color:#1f3a33;font-size:24px;letter-spacing:-0.5px;">Votre facture est disponible</h1>
        <p style="margin:6px 0 0 0;color:#6d6d68;font-size:12px;">{{documentTypeLabel}} N° <span style="font-family:'Courier New',monospace;color:#1f3a33;">{{invoiceNumber}}</span></p>
        <p style="margin:14px 0 0 0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Montant total payé</p>
        <p style="margin:4px 0 0 0;color:#10b981;font-size:28px;font-weight:bold;">{{totalAmount}}</p>
      </td>
    </tr>
    <!-- Salutation -->
    <tr>
      <td style="padding:28px 32px 8px 32px;">
        <p style="margin:0;color:#1f1f1d;font-size:15px;line-height:1.5;">Bonjour <strong>{{clientName}}</strong>,</p>
        <p style="margin:12px 0 0 0;color:#6d6d68;font-size:14px;line-height:1.6;">La prestation <strong style="color:#1f3a33;">{{serviceName}}</strong> avec <strong>{{announcerName}}</strong> a été marquée comme terminée ({{validationType}}).</p>
        <p style="margin:12px 0 0 0;color:#6d6d68;font-size:14px;line-height:1.6;">Votre {{documentTypeLabel}} est désormais disponible — elle est jointe à cet email et téléchargeable depuis votre espace.</p>
      </td>
    </tr>
    <!-- PDF en PJ -->
    <tr>
      <td style="padding:8px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;">
          <tr>
            <td style="padding:18px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;width:42px;font-size:24px;">📎</td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;color:#065f46;font-size:14px;font-weight:bold;">Votre {{documentTypeLabel}} PDF est jointe à cet email</p>
                    <p style="margin:4px 0 0 0;color:#047857;font-size:12.5px;line-height:1.5;">Téléchargeable à tout moment depuis<br/><strong>Mes factures</strong> dans votre espace client</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Détail prestation -->
    <tr>
      <td style="padding:8px 32px 16px 32px;">
        <p style="margin:0 0 8px 0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Détail de la prestation</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfaf4;border:1px solid #ece9e1;border-radius:10px;">
          <tr><td style="padding:14px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;width:140px;">Service</td><td style="padding:4px 0;color:#1f1f1d;font-size:13px;font-weight:600;text-align:right;">{{serviceName}}</td></tr>
              <tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;">Période</td><td style="padding:4px 0;color:#1f1f1d;font-size:13px;font-weight:600;text-align:right;">{{startDate}} → {{endDate}}</td></tr>
              <tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;">Prestataire</td><td style="padding:4px 0;color:#1f1f1d;font-size:13px;font-weight:600;text-align:right;">{{announcerName}}</td></tr>
              <tr><td style="padding:8px 0 4px 0;color:#9c9484;font-size:12.5px;border-top:1px solid #ece9e1;">Total TTC</td><td style="padding:8px 0 4px 0;color:#10b981;font-size:15px;font-weight:bold;text-align:right;border-top:1px solid #ece9e1;">{{totalAmount}}</td></tr>
            </table>
          </td></tr>
        </table>
      </td>
    </tr>
    <!-- CTA -->
    <tr>
      <td align="center" style="padding:8px 32px 20px 32px;">
        <a href="{{facturesUrl}}" style="display:inline-block;background-color:#1f3a33;color:#f7f5ef;text-decoration:none;padding:14px 32px;border-radius:99px;font-weight:bold;font-size:14px;letter-spacing:0.3px;">Voir mes factures →</a>
      </td>
    </tr>
    <!-- Mentions -->
    <tr>
      <td style="padding:16px 32px 8px 32px;border-top:1px solid #f1ede3;">
        <p style="margin:0 0 10px 0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">À noter</p>
        <p style="margin:8px 0;color:#9c9484;font-size:11px;line-height:1.6;">Cette facture est émise par votre prestataire <strong>{{announcerName}}</strong> via la plateforme {{siteName}}. Conservez-la pour vos archives comptables.</p>
        <p style="margin:8px 0 0 0;color:#9c9484;font-size:11px;line-height:1.6;">En cas de litige sur cette prestation, contactez notre support depuis votre espace client.</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#fcfaf4;padding:24px 32px;border-top:1px solid #f1ede3;">
        <p style="margin:0;color:#1f3a33;font-size:13px;font-weight:600;">{{siteName}}</p>
        <p style="margin:6px 0 0 0;color:#9c9484;font-size:11px;">Plateforme de services animaliers</p>
        <p style="margin:12px 0 0 0;color:#cdc9c0;font-size:10px;">© 2026 {{siteName}}. Tous droits réservés.</p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

    case "refund_confirmation":
      // Bon de remboursement (palette ambre/vert) — PDF en PJ + détail des frais retenus
      return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Remboursement confirmé</title>
<!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#fcfaf4;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;color:#1f1f1d;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfaf4;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ece9e1;">
    <!-- HEADER -->
    <tr>
      <td style="padding:32px;background-color:#fef3c7;border-bottom:1px solid #fde68a;">
        <span style="display:inline-block;padding:6px 14px;background-color:#f59e0b;color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:1px;border-radius:99px;">↩ REMBOURSEMENT</span>
        <h1 style="margin:14px 0 0 0;color:#78350f;font-size:24px;letter-spacing:-0.5px;">Bon de remboursement</h1>
        <p style="margin:6px 0 0 0;color:#92400e;font-size:12px;">Réf. : <span style="font-family:'Courier New',monospace;color:#78350f;">{{refundReference}}</span></p>
        <p style="margin:14px 0 0 0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Montant remboursé</p>
        <p style="margin:4px 0 0 0;color:#10b981;font-size:28px;font-weight:bold;">{{refundAmount}}</p>
      </td>
    </tr>
    <!-- Salutation -->
    <tr>
      <td style="padding:28px 32px 8px 32px;">
        <p style="margin:0;color:#1f1f1d;font-size:15px;line-height:1.5;">Bonjour <strong>{{clientName}}</strong>,</p>
        <p style="margin:12px 0 0 0;color:#6d6d68;font-size:14px;line-height:1.6;">Suite à l'annulation de votre réservation <strong style="color:#1f3a33;">{{serviceName}}</strong>, un remboursement de <strong style="color:#10b981;">{{refundAmount}}</strong> a été effectué sur votre carte bancaire d'origine.</p>
        <p style="margin:12px 0 0 0;color:#6d6d68;font-size:14px;line-height:1.6;">Le remboursement apparaîtra sur votre compte sous <strong>{{refundDelay}}</strong> selon votre banque.</p>
      </td>
    </tr>
    <!-- PDF en PJ -->
    <tr>
      <td style="padding:8px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;">
          <tr>
            <td style="padding:18px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;width:42px;font-size:24px;">📎</td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;color:#065f46;font-size:14px;font-weight:bold;">Votre bon de remboursement PDF est joint à cet email</p>
                    <p style="margin:4px 0 0 0;color:#047857;font-size:12.5px;line-height:1.5;">Document officiel détaillant le motif et les frais retenus</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Carte de remboursement -->
    <tr>
      <td style="padding:8px 32px;">
        <p style="margin:0 0 8px 0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Méthode de remboursement</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfaf4;border:1px solid #ece9e1;border-radius:10px;">
          <tr><td style="padding:14px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;width:55%;">Carte de remboursement</td><td style="padding:4px 0;color:#1f1f1d;font-size:13px;font-weight:600;text-align:right;">{{cardBrand}} {{cardLast4}}</td></tr>
              <tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;">Délai estimé</td><td style="padding:4px 0;color:#10b981;font-size:13px;font-weight:600;text-align:right;">{{refundDelay}}</td></tr>
              <tr><td style="padding:4px 0;color:#9c9484;font-size:11.5px;">Réf. paiement Stripe</td><td style="padding:4px 0;color:#475569;font-size:10.5px;font-family:'Courier New',monospace;text-align:right;">{{transactionId}}</td></tr>
              <tr><td style="padding:4px 0;color:#9c9484;font-size:11.5px;">Réf. remboursement Stripe</td><td style="padding:4px 0;color:#475569;font-size:10.5px;font-family:'Courier New',monospace;text-align:right;">{{refundStripeId}}</td></tr>
            </table>
          </td></tr>
        </table>
      </td>
    </tr>
    <!-- Détail du remboursement -->
    <tr>
      <td style="padding:8px 32px 16px 32px;">
        <p style="margin:0 0 8px 0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Détail du remboursement</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfaf4;border:1px solid #ece9e1;border-radius:10px;">
          <tr><td style="padding:14px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;width:140px;">Niveau d'annulation</td><td style="padding:4px 0;color:#1f1f1d;font-size:13px;font-weight:600;text-align:right;">{{cancellationCount}}</td></tr>
              <tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;">Montant payé initialement</td><td style="padding:4px 0;color:#1f1f1d;font-size:13px;font-weight:600;text-align:right;">{{originalAmount}}</td></tr>
              <tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;">Frais de service retenus</td><td style="padding:4px 0;color:#dc2626;font-size:13px;font-weight:600;text-align:right;">−{{platformFeeRetained}}</td></tr>
              <tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;">Frais bancaires retenus</td><td style="padding:4px 0;color:#dc2626;font-size:13px;font-weight:600;text-align:right;">−{{stripeFeeRetained}}</td></tr>
              <tr><td style="padding:4px 0;color:#9c9484;font-size:12.5px;">Pénalité d'annulation</td><td style="padding:4px 0;color:#dc2626;font-size:13px;font-weight:600;text-align:right;">−{{announcerRetained}}</td></tr>
              <tr><td style="padding:8px 0 4px 0;color:#9c9484;font-size:12.5px;border-top:1px solid #ece9e1;">Remboursement net</td><td style="padding:8px 0 4px 0;color:#10b981;font-size:15px;font-weight:bold;text-align:right;border-top:1px solid #ece9e1;">{{refundAmount}}</td></tr>
            </table>
          </td></tr>
        </table>
        <p style="margin:8px 0 0 0;color:#9c9484;font-size:11px;line-height:1.5;font-style:italic;">{{refundReason}}</p>
      </td>
    </tr>
    <!-- CTA -->
    <tr>
      <td align="center" style="padding:8px 32px 20px 32px;">
        <a href="{{reservationsUrl}}" style="display:inline-block;background-color:#1f3a33;color:#f7f5ef;text-decoration:none;padding:14px 32px;border-radius:99px;font-weight:bold;font-size:14px;letter-spacing:0.3px;">Voir mes réservations →</a>
      </td>
    </tr>
    <!-- Mentions légales -->
    <tr>
      <td style="padding:16px 32px 8px 32px;border-top:1px solid #f1ede3;">
        <p style="margin:0 0 10px 0;color:#9c9484;font-size:10px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Mentions légales</p>
        <p style="margin:8px 0;color:#9c9484;font-size:11px;line-height:1.6;">Conformément à nos Conditions Générales de Vente, les frais de service {{siteName}} et les frais de gestion bancaire sont conservés par la plateforme dans tous les cas d'annulation.</p>
        <p style="margin:8px 0 0 0;color:#9c9484;font-size:11px;line-height:1.6;">Remboursement traité par <strong>Stripe Payments Europe Ltd</strong>, prestataire de services de paiement agréé.</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="background-color:#fcfaf4;padding:24px 32px;border-top:1px solid #f1ede3;">
        <p style="margin:0;color:#1f3a33;font-size:13px;font-weight:600;">{{siteName}}</p>
        <p style="margin:6px 0 0 0;color:#9c9484;font-size:11px;">Plateforme de services animaliers</p>
        <p style="margin:12px 0 0 0;color:#cdc9c0;font-size:10px;">© 2026 {{siteName}}. Tous droits réservés.</p>
      </td>
    </tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

    default:
      return "";
  }
};

// Query: Récupérer tous les templates
export const getAll = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    return await ctx.db.query("emailTemplates").collect();
  },
});

// Query: Récupérer un template par slug
export const getBySlug = query({
  args: {
    token: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    return await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Mutation: Mettre à jour un template
export const update = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
    subject: v.string(),
    htmlContent: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const template = await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!template) {
      throw new Error("Template non trouvé");
    }

    const patch: Record<string, unknown> = {
      subject: args.subject,
      htmlContent: args.htmlContent,
      name: args.name ?? template.name,
      description: args.description ?? template.description,
      isActive: args.isActive ?? template.isActive,
      updatedAt: Date.now(),
      updatedBy: user._id,
    };

    await ctx.db.patch(template._id, patch);

    return { success: true };
  },
});

// Mutation: Initialiser les templates par défaut
export const seedDefaults = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const now = Date.now();

    for (const template of DEFAULT_TEMPLATES) {
      const existing = await ctx.db
        .query("emailTemplates")
        .withIndex("by_slug", (q) => q.eq("slug", template.slug))
        .first();

      if (!existing) {
        await ctx.db.insert("emailTemplates", {
          ...template,
          htmlContent: getDefaultHtmlContent(template.slug),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true, message: "Templates initialisés" };
  },
});

// Mutation: Réinitialiser un template à sa valeur par défaut
export const resetToDefault = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx, args.token);

    const template = await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!template) {
      throw new Error("Template non trouvé");
    }

    const defaultTemplate = DEFAULT_TEMPLATES.find((t) => t.slug === args.slug);
    if (!defaultTemplate) {
      throw new Error("Pas de template par défaut pour ce slug");
    }

    await ctx.db.patch(template._id, {
      subject: defaultTemplate.subject,
      htmlContent: getDefaultHtmlContent(args.slug),
      updatedAt: Date.now(),
      updatedBy: user._id,
    });

    return { success: true };
  },
});

// Query interne: Récupérer un template par slug (sans auth pour les actions internes)
export const getTemplateBySlug = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!template || !template.isActive) {
      // Retourner le template par défaut si non trouvé ou inactif
      const defaultTemplate = DEFAULT_TEMPLATES.find((t) => t.slug === args.slug);
      if (defaultTemplate) {
        return {
          ...defaultTemplate,
          htmlContent: getDefaultHtmlContent(args.slug),
          isActive: true,
        };
      }
      return null;
    }

    return template;
  },
});
