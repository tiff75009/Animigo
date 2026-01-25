"use client";

import { motion } from "framer-motion";
import { CalendarClock, Euro, Calendar, MessageSquare, Loader2 } from "lucide-react";
import { MissionCard } from "../../components/mission-card";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { useRouter } from "next/navigation";
import type { FunctionReturnType } from "convex/server";

type MissionType = FunctionReturnType<typeof api.planning.missions.getMissionsByStatus>[number];

export default function MissionsEnCoursPage() {
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Query Convex pour les missions "in_progress"
  const missions = useQuery(
    api.planning.missions.getMissionsByStatus,
    token ? { token, status: "in_progress" } : "skip"
  );

  // Query pour les coordonnées de l'annonceur
  const announcerData = useQuery(
    api.planning.missions.getAnnouncerCoordinates,
    token ? { token } : "skip"
  );

  const isLoading = authLoading || missions === undefined;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const handleContact = (missionId: string) => {
    router.push(`/dashboard/messagerie?mission=${missionId}`);
  };

  if (isLoading || !missions) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-blue-100 rounded-2xl">
            <CalendarClock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Missions en cours
            </h1>
            <p className="text-text-light">
              {missionsList.length} mission{missionsList.length > 1 ? "s" : ""} actuellement en cours
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
              <div className="p-2 bg-blue-100 rounded-xl">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">En cours</p>
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
                <p className="text-sm text-text-light">Montant total</p>
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
        className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3"
      >
        <span className="text-2xl">📸</span>
        <div>
          <p className="font-semibold text-blue-800">Gardez le contact</p>
          <p className="text-sm text-blue-700">
            N&apos;oubliez pas d&apos;envoyer des photos et nouvelles aux propriétaires pour les rassurer !
          </p>
        </div>
      </motion.div>

      {/* Quick actions */}
      {missionsList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17 }}
          className="flex gap-3"
        >
          <motion.button
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <MessageSquare className="w-4 h-4" />
            Messagerie
          </motion.button>
        </motion.div>
      )}

      {/* Mission List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {missionsList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-md text-center">
            <div className="text-6xl mb-4">🏖️</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Pas de mission en cours
            </h3>
            <p className="text-text-light">
              Vous n&apos;avez pas de mission active pour le moment. Consultez vos missions à venir !
            </p>
          </div>
        ) : (
          missionsList.map((mission: MissionType, index: number) => (
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
              />
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
