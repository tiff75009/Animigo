"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Euro,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { MissionCard, type ConvexMission } from "../../components/mission-card";

// Helper pour extraire le prénom
function getFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Accept Confirmation Modal
function AcceptModal({
  isOpen,
  onClose,
  mission,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  mission: ConvexMission | null;
  onConfirm: () => Promise<void>;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Erreur lors de l'acceptation:", error);
      setIsProcessing(false);
    }
  };

  if (!isOpen || !mission) return null;

  // Calcul des revenus
  const clientAmount = mission.amount / 100;
  const announcerEarnings = (mission.announcerEarnings ?? mission.amount * 0.85) / 100;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-secondary to-secondary/80">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Accepter la mission</h2>
              <motion.button
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isSuccess ? (
              <motion.div
                className="text-center py-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-secondary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Mission acceptée !</h3>
                <p className="text-text-light">
                  Le client sera notifié de votre acceptation.
                </p>
              </motion.div>
            ) : (
              <>
                {/* Résumé mission */}
                <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">
                      {mission.animal.emoji}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{getFirstName(mission.clientName)}</p>
                      <p className="text-sm text-text-light">{mission.serviceName}</p>
                    </div>
                  </div>
                  {mission.variantName && (
                    <p className="text-sm text-text-light mb-2">
                      Formule : <span className="font-medium text-foreground">{mission.variantName}</span>
                    </p>
                  )}
                </div>

                {/* Revenus */}
                <div className="bg-gradient-to-r from-secondary/10 to-accent/10 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-secondary" />
                    <span className="font-semibold text-foreground">Vos revenus</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-text-light">Prix client</p>
                      <p className="text-lg text-foreground">{clientAmount.toFixed(0)} €</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-text-light">Votre revenu</p>
                      <p className="text-2xl font-bold text-secondary">{announcerEarnings.toFixed(0)} €</p>
                    </div>
                  </div>
                </div>

                {/* Avertissement */}
                <div className="flex items-start gap-2 p-3 bg-accent/10 rounded-xl mb-6">
                  <AlertCircle className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    En acceptant, vous vous engagez à réaliser cette prestation aux dates convenues.
                  </p>
                </div>

                {/* Boutons */}
                <div className="flex gap-3">
                  <motion.button
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-foreground rounded-xl font-semibold"
                    onClick={onClose}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isProcessing}
                  >
                    Annuler
                  </motion.button>
                  <motion.button
                    className="flex-1 py-3 px-4 bg-secondary hover:bg-secondary/90 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-secondary/20"
                    onClick={handleConfirm}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Confirmer
                      </>
                    )}
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Refuse Confirmation Modal
function RefuseModal({
  isOpen,
  onClose,
  mission,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  mission: ConvexMission | null;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(reason);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setReason("");
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Erreur lors du refus:", error);
      setIsProcessing(false);
    }
  };

  if (!isOpen || !mission) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-primary to-primary/80">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Refuser la mission</h2>
              <motion.button
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isSuccess ? (
              <motion.div
                className="text-center py-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Mission refusée</h3>
                <p className="text-text-light">
                  Le client sera informé de votre décision.
                </p>
              </motion.div>
            ) : (
              <>
                {/* Résumé mission */}
                <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">
                      {mission.animal.emoji}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{getFirstName(mission.clientName)}</p>
                      <p className="text-sm text-text-light">{mission.serviceName}</p>
                    </div>
                  </div>
                </div>

                {/* Raison du refus */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Raison du refus (optionnel)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex: Indisponible sur ces dates..."
                    className="w-full p-3 border border-slate-200 rounded-xl resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Boutons */}
                <div className="flex gap-3">
                  <motion.button
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-foreground rounded-xl font-semibold"
                    onClick={onClose}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isProcessing}
                  >
                    Annuler
                  </motion.button>
                  <motion.button
                    className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    onClick={handleConfirm}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5" />
                        Refuser
                      </>
                    )}
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function MissionsAccepterPage() {
  const [token, setToken] = useState<string | null>(null);
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [refuseModalOpen, setRefuseModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<ConvexMission | null>(null);

  // Récupérer le token depuis localStorage
  useEffect(() => {
    const authToken = localStorage.getItem("auth_token");
    setToken(authToken);
  }, []);

  // Query Convex pour récupérer les missions en attente d'acceptation
  const convexMissions = useQuery(
    api.planning.missions.getMissionsByStatus,
    token ? { token, status: "pending_acceptance" as const } : "skip"
  ) as ConvexMission[] | undefined;

  // Récupérer les coordonnées de l'annonceur pour le calcul de distance
  const announcerData = useQuery(
    api.planning.missions.getAnnouncerCoordinates,
    token ? { token } : "skip"
  );

  // Mutations Convex
  const acceptMissionMutation = useMutation(api.planning.missions.acceptMission);
  const refuseMissionMutation = useMutation(api.planning.missions.refuseMission);

  const missions = convexMissions || [];
  const isLoading = token !== null && convexMissions === undefined;

  // Calcul des revenus totaux potentiels
  const totalEarnings = missions.reduce((sum, m) => {
    const earnings = m.announcerEarnings ?? Math.round(m.amount * 0.85);
    return sum + earnings;
  }, 0);

  const formatCurrency = (amountInCents: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amountInCents / 100);
  };

  const handleAcceptClick = (missionId: string) => {
    const mission = missions.find((m) => m.id === missionId);
    if (mission) {
      setSelectedMission(mission);
      setAcceptModalOpen(true);
    }
  };

  const handleRefuseClick = (missionId: string) => {
    const mission = missions.find((m) => m.id === missionId);
    if (mission) {
      setSelectedMission(mission);
      setRefuseModalOpen(true);
    }
  };

  const handleAcceptConfirm = async () => {
    if (selectedMission && token) {
      await acceptMissionMutation({
        token,
        missionId: selectedMission.id,
      });
    }
  };

  const handleRefuseConfirm = async (reason: string) => {
    if (selectedMission && token) {
      await refuseMissionMutation({
        token,
        missionId: selectedMission.id,
        reason: reason || undefined,
      });
    }
  };

  // Afficher un loader pendant le chargement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-light">Chargement des missions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-accent/20 rounded-2xl">
            <HelpCircle className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Missions à accepter
            </h1>
            <p className="text-text-light">
              {missions.length} demande{missions.length > 1 ? "s" : ""} en attente de votre réponse
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {missions.length > 0 && (
        <motion.div
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="w-4 h-4 text-accent" />
              <span className="text-sm text-text-light">En attente</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{missions.length}</p>
          </div>
          <div className="bg-gradient-to-r from-secondary/10 to-accent/10 rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-2 mb-1">
              <Euro className="w-4 h-4 text-secondary" />
              <span className="text-sm text-text-light">Revenus potentiels</span>
            </div>
            <p className="text-2xl font-bold text-secondary">{formatCurrency(totalEarnings)}</p>
          </div>
        </motion.div>
      )}

      {/* Mission Cards */}
      {missions.length === 0 ? (
        <motion.div
          className="bg-white rounded-2xl p-8 shadow-md text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-text-light" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Aucune mission en attente
          </h3>
          <p className="text-text-light">
            Vous n'avez pas de nouvelles demandes de mission pour le moment.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {missions.map((mission, index) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
            >
              <MissionCard
                mission={mission}
                showActions={true}
                onAccept={handleAcceptClick}
                onRefuse={handleRefuseClick}
                announcerCoordinates={announcerData?.coordinates}
                token={token}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AcceptModal
        isOpen={acceptModalOpen}
        onClose={() => setAcceptModalOpen(false)}
        mission={selectedMission}
        onConfirm={handleAcceptConfirm}
      />

      <RefuseModal
        isOpen={refuseModalOpen}
        onClose={() => setRefuseModalOpen(false)}
        mission={selectedMission}
        onConfirm={handleRefuseConfirm}
      />
    </div>
  );
}
