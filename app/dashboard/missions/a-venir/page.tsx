"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Euro, CalendarDays, Loader2, X, AlertTriangle, MessageSquare } from "lucide-react";
import { MissionCard } from "../../components/mission-card";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import type { FunctionReturnType } from "convex/server";

type MissionType = FunctionReturnType<typeof api.planning.missions.getMissionsByStatus>[number];

// Modal de confirmation d'annulation
function CancelModal({
  isOpen,
  onClose,
  onConfirm,
  missionId,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  missionId: string;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
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
        className="bg-white rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-100 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Annuler la mission</h3>
            <p className="text-sm text-text-light">Cette action est irréversible</p>
          </div>
        </div>

        <p className="text-text-light mb-4">
          Voulez-vous vraiment annuler cette mission ? Le client sera notifié et remboursé.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Raison de l&apos;annulation
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Expliquez pourquoi vous annulez cette mission..."
            className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground resize-none"
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <motion.button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-foreground rounded-xl font-semibold"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={isLoading}
          >
            Retour
          </motion.button>
          <motion.button
            onClick={() => onConfirm(reason)}
            disabled={isLoading || !reason.trim()}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            whileHover={{ scale: isLoading ? 1 : 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Annulation...
              </>
            ) : (
              "Confirmer l'annulation"
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function MissionsAVenirPage() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Query Convex pour les missions "upcoming"
  const missions = useQuery(
    api.planning.missions.getMissionsByStatus,
    token ? { token, status: "upcoming" } : "skip"
  );

  // Query pour les coordonnées de l'annonceur (pour le calcul de distance)
  const announcerData = useQuery(
    api.planning.missions.getAnnouncerCoordinates,
    token ? { token } : "skip"
  );

  // Mutation pour annuler une mission
  const cancelMission = useMutation(api.planning.missions.cancelMission);

  const isLoading = authLoading || missions === undefined;

  const formatCurrency = (amount: number) => {
    // Convertir centimes en euros
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const handleContact = (missionId: string) => {
    // Rediriger vers la messagerie avec le client
    router.push(`/dashboard/messagerie?mission=${missionId}`);
  };

  const handleCancelClick = (missionId: string) => {
    setSelectedMissionId(missionId);
    setCancelModalOpen(true);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!selectedMissionId || !token) return;

    setIsCancelling(true);
    try {
      await cancelMission({
        token,
        missionId: selectedMissionId as Id<"missions">,
        reason,
      });
      setCancelModalOpen(false);
      setSelectedMissionId(null);
    } catch (error) {
      console.error("Erreur lors de l'annulation:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading || !missions) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple mx-auto mb-4" />
          <p className="text-text-light">Chargement des missions...</p>
        </div>
      </div>
    );
  }

  // missions est garanti défini ici grâce à la vérification ci-dessus
  const missionsList = missions;
  let totalAmount = 0;
  for (const m of missionsList) {
    totalAmount += m.announcerEarnings ?? m.amount * 0.85;
  }

  // Sort by start date
  const sortedMissions = [...missionsList].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-purple/20 rounded-2xl">
            <Calendar className="w-6 h-6 text-purple" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Missions à venir
            </h1>
            <p className="text-text-light">
              {missionsList.length} mission{missionsList.length > 1 ? "s" : ""} planifiée{missionsList.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {missionsList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple/20 rounded-xl">
                <CalendarDays className="w-5 h-5 text-purple" />
              </div>
              <div>
                <p className="text-sm text-text-light">À venir</p>
                <p className="text-2xl font-bold text-foreground">{missionsList.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Euro className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-text-light">Revenus prévus</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-purple/10 border border-purple/30 rounded-2xl p-4 flex items-start gap-3"
      >
        <span className="text-2xl">📅</span>
        <div>
          <p className="font-semibold text-purple">Préparez-vous</p>
          <p className="text-sm text-purple/80">
            Consultez les détails de chaque mission pour bien vous préparer à accueillir les animaux.
          </p>
        </div>
      </motion.div>

      {/* Mission List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {sortedMissions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-md text-center">
            <div className="text-6xl mb-4">📆</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Aucune mission planifiée
            </h3>
            <p className="text-text-light">
              Vous n&apos;avez pas de mission à venir. Acceptez de nouvelles demandes pour remplir votre planning !
            </p>
          </div>
        ) : (
          sortedMissions.map((mission: MissionType, index: number) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <MissionCard
                mission={mission}
                announcerCoordinates={announcerData?.coordinates}
                token={token}
                onContact={handleContact}
                onCancel={handleCancelClick}
              />
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Modal d'annulation */}
      <AnimatePresence>
        {cancelModalOpen && selectedMissionId && (
          <CancelModal
            isOpen={cancelModalOpen}
            onClose={() => {
              setCancelModalOpen(false);
              setSelectedMissionId(null);
            }}
            onConfirm={handleCancelConfirm}
            missionId={selectedMissionId}
            isLoading={isCancelling}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
