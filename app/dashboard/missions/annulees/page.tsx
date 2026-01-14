"use client";

import { motion } from "framer-motion";
import { Ban, Calendar, Euro } from "lucide-react";
import { MissionCard } from "../../components/mission-card";
import { getMissionsByStatus } from "@/app/lib/dashboard-data";

export default function MissionsAnnuleesPage() {
  const missions = getMissionsByStatus("cancelled");
  const totalAmount = missions.reduce((sum, m) => sum + m.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Sort by start date (most recent first)
  const sortedMissions = [...missions].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gray-100 rounded-2xl">
            <Ban className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Missions annulées
            </h1>
            <p className="text-text-light">
              {missions.length} mission{missions.length > 1 ? "s" : ""} annulée{missions.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {missions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-xl">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Annulées</p>
                <p className="text-2xl font-bold text-foreground">{missions.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-xl">
                <Euro className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-text-light">Montant perdu</p>
                <p className="text-2xl font-bold text-gray-500">{formatCurrency(totalAmount)}</p>
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
        className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-start gap-3"
      >
        <span className="text-2xl">ℹ️</span>
        <div>
          <p className="font-semibold text-gray-800">Annulations</p>
          <p className="text-sm text-gray-600">
            Ces missions ont été annulées par le propriétaire ou par vous-même.
            Les annulations tardives peuvent impacter votre classement.
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
            <div className="text-6xl mb-4">✨</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Aucune mission annulée
            </h3>
            <p className="text-text-light">
              Parfait ! Vous n&apos;avez aucune mission annulée dans votre historique.
            </p>
          </div>
        ) : (
          sortedMissions.map((mission, index) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <MissionCard mission={mission} />
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
