"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Euro,
  Phone,
  CheckCircle,
  AlertCircle,
  XCircle,
  MessageSquare,
  Lock,
  Info,
  Star,
  Repeat,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { Mission, statusColors, statusLabels, formatPrice } from "./types";

// Extraire uniquement le code postal et la ville d'une adresse française
// Ex: "3 Rue de l'Abbé Gruet, 75001 Paris, France" → "75001 Paris"
function extractCityAndPostalCode(address: string): string {
  if (!address) return "Localisation non précisée";

  // Chercher le pattern "code postal + ville" (ex: "75001 Paris")
  const match = address.match(/(\d{5})\s+([A-Za-zÀ-ÿ'-]+(?:\s+[A-Za-zÀ-ÿ'-]+)*)/);
  if (match) {
    const postalCode = match[1];
    // Nettoyer la ville (enlever "France" ou autre pays si présent)
    let city = match[2].trim();
    if (city.toLowerCase().endsWith("france")) {
      city = city.replace(/,?\s*france$/i, "").trim();
    }
    return `${postalCode} ${city}`;
  }

  // Chercher juste un code postal
  const postalMatch = address.match(/\d{5}/);
  if (postalMatch) {
    return postalMatch[0];
  }

  return "Localisation non précisée";
}

interface MissionDetailModalProps {
  mission: Mission | null;
  onClose: () => void;
  onAccept?: (missionId: string) => Promise<void>;
  onRefuse?: (missionId: string, reason?: string) => Promise<void>;
  onCancel?: (missionId: string, reason: string) => Promise<void>;
  onComplete?: (missionId: string, notes?: string) => Promise<void>;
}

export function MissionDetailModal({
  mission,
  onClose,
  onAccept,
  onRefuse,
  onCancel,
  onComplete,
}: MissionDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showRefuseForm, setShowRefuseForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  if (!mission) return null;

  // Vérifier si les informations sensibles peuvent être affichées
  // (mission acceptée ET payée = status upcoming, in_progress ou completed)
  const canShowSensitiveInfo = ["upcoming", "in_progress", "completed"].includes(mission.status);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleAccept = async () => {
    if (!onAccept) return;
    setIsLoading(true);
    try {
      await onAccept(mission.id);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefuse = async () => {
    if (!onRefuse) return;
    setIsLoading(true);
    try {
      await onRefuse(mission.id, reason || undefined);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel || !reason) return;
    setIsLoading(true);
    try {
      await onCancel(mission.id, reason);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!onComplete) return;
    setIsLoading(true);
    try {
      await onComplete(mission.id, notes || undefined);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-3xl">
                {mission.animals && mission.animals.length > 1
                  ? mission.animals.map((a) => a.emoji).join("")
                  : mission.animal.emoji}
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">
                  {mission.serviceName}
                </h3>
                <p className="text-sm text-text-light">
                  {mission.animals && mission.animals.length > 1
                    ? mission.animals.map((a) => a.name).join(", ")
                    : `${mission.animal.name} (${mission.animal.type})`}
                </p>
                {mission.animalCount && mission.animalCount > 1 && (
                  <p className="text-xs text-primary font-medium">
                    {mission.animalCount} animaux
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-light" />
            </button>
          </div>

          {/* Status */}
          <div className="mb-4">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white",
                statusColors[mission.status]
              )}
            >
              {mission.status === "in_progress" && (
                <Clock className="w-3.5 h-3.5" />
              )}
              {mission.status === "completed" && (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              {mission.status === "pending_acceptance" && (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              {mission.status === "cancelled" && (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {statusLabels[mission.status]}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-text-light flex-shrink-0" />
              <div>
                <p className="text-foreground font-medium">
                  {formatDate(mission.startDate)}
                </p>
                {mission.startDate !== mission.endDate && (
                  <p className="text-text-light">
                    au {formatDate(mission.endDate)}
                  </p>
                )}
              </div>
            </div>

            {(mission.startTime || mission.endTime) && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-text-light flex-shrink-0" />
                <span className="text-foreground">
                  {mission.startTime || "09:00"} - {mission.endTime || "18:00"}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-text-light flex-shrink-0" />
              {mission.serviceLocation === "announcer_home" ? (
                <span className="text-secondary font-medium">Chez vous</span>
              ) : canShowSensitiveInfo ? (
                <span className="text-foreground">{mission.location}</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-foreground">{extractCityAndPostalCode(mission.location)}</span>
                  <span className="flex items-center gap-1 text-xs text-text-light bg-slate-100 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" />
                    Adresse masquée
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Euro className="w-4 h-4 text-text-light flex-shrink-0" />
              <span className="text-foreground font-semibold">
                {formatPrice(mission.serviceAmount ?? mission.amount)}
              </span>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  mission.paymentStatus === "paid"
                    ? "bg-green-100 text-green-700"
                    : mission.paymentStatus === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-600"
                )}
              >
                {mission.paymentStatus === "paid"
                  ? "Payé"
                  : mission.paymentStatus === "pending"
                    ? "En attente"
                    : "Non dû"}
              </span>
              {mission.isSapApplied && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  SAP
                </span>
              )}
            </div>
          </div>

          {/* Client */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-text-light mb-2">Client</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Afficher nom complet si infos sensibles visibles, sinon juste le prénom */}
                <p className="font-medium text-foreground">
                  {canShowSensitiveInfo ? mission.clientName : mission.clientName.split(" ")[0]}
                </p>
                {/* Badge historique client */}
                {mission.clientHistory && (
                  mission.clientHistory.isNewClient ? (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-purple/10 text-purple rounded-full text-[10px] font-medium">
                      <Star className="w-2.5 h-2.5" />
                      Nouveau
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">
                      <Repeat className="w-2.5 h-2.5" />
                      {mission.clientHistory.previousMissionsCount}x
                    </span>
                  )
                )}
              </div>
              {canShowSensitiveInfo && mission.clientPhone ? (
                <a
                  href={`tel:${mission.clientPhone}`}
                  className="flex items-center gap-1 text-primary text-sm"
                >
                  <Phone className="w-4 h-4" />
                  {mission.clientPhone}
                </a>
              ) : (
                <span className="flex items-center gap-1 text-xs text-text-light bg-slate-100 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" />
                  Masqué
                </span>
              )}
            </div>
          </div>

          {/* Info sur les données masquées */}
          {!canShowSensitiveInfo && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl mb-4">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                L'adresse exacte et le numéro de téléphone du client seront visibles une fois la mission acceptée et le paiement effectué.
              </p>
            </div>
          )}

          {/* Notes */}
          {mission.clientNotes && (
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-blue-700 mb-1">
                <MessageSquare className="w-4 h-4" />
                Note du client
              </div>
              <p className="text-sm text-blue-800">{mission.clientNotes}</p>
            </div>
          )}

          {mission.cancellationReason && (
            <div className="bg-red-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-700 font-medium mb-1">
                Raison de l'annulation
              </p>
              <p className="text-sm text-red-800">{mission.cancellationReason}</p>
            </div>
          )}

          {/* Refuse form */}
          {showRefuseForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <label className="text-sm font-medium text-foreground block mb-2">
                Raison du refus (optionnel)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                rows={2}
                placeholder="Indiquez pourquoi vous refusez cette mission..."
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowRefuseForm(false)}
                  className="flex-1 py-2 border rounded-lg text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRefuse}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Confirmer le refus
                </button>
              </div>
            </div>
          )}

          {/* Cancel form */}
          {showCancelForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <label className="text-sm font-medium text-foreground block mb-2">
                Raison de l'annulation *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                rows={2}
                placeholder="Indiquez pourquoi vous annulez cette mission..."
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowCancelForm(false)}
                  className="flex-1 py-2 border rounded-lg text-sm"
                >
                  Retour
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isLoading || !reason}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Confirmer l'annulation
                </button>
              </div>
            </div>
          )}

          {/* Actions based on status */}
          {!showRefuseForm && !showCancelForm && (
            <div className="space-y-2">
              {/* Pending acceptance */}
              {mission.status === "pending_acceptance" && onAccept && (
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => setShowRefuseForm(true)}
                    className="flex-1 py-3 border border-red-200 text-red-600 rounded-xl font-medium"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    Refuser
                  </motion.button>
                  <motion.button
                    onClick={handleAccept}
                    disabled={isLoading}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold disabled:opacity-50"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {isLoading ? "..." : "Accepter"}
                  </motion.button>
                </div>
              )}

              {/* Upcoming - can cancel */}
              {mission.status === "upcoming" && onCancel && (
                <motion.button
                  onClick={() => setShowCancelForm(true)}
                  className="w-full py-3 border border-red-200 text-red-600 rounded-xl font-medium"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Annuler la mission
                </motion.button>
              )}

              {/* In progress - can complete */}
              {mission.status === "in_progress" && onComplete && (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                    rows={2}
                    placeholder="Notes de fin de mission (optionnel)..."
                  />
                  <motion.button
                    onClick={handleComplete}
                    disabled={isLoading}
                    className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold disabled:opacity-50"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {isLoading ? "..." : "Marquer comme terminee"}
                  </motion.button>
                </div>
              )}

              {/* Close button for other statuses */}
              {(mission.status === "completed" ||
                mission.status === "cancelled" ||
                mission.status === "refused" ||
                mission.status === "pending_confirmation") && (
                <motion.button
                  onClick={onClose}
                  className="w-full py-3 bg-gray-100 text-foreground rounded-xl font-semibold"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Fermer
                </motion.button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
