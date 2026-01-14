"use client";

import { motion } from "framer-motion";
import { XCircle, Calendar, Euro } from "lucide-react";
import { MissionCard } from "../../components/mission-card";
import { getMissionsByStatus } from "@/app/lib/dashboard-data";

export default function MissionsRefuseesPage() {
  const missions = getMissionsByStatus("refused");
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
          <div className="p-3 bg-red-100 rounded-2xl">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Missions refusées
            </h1>
            <p className="text-text-light">
              {missions.length} mission{missions.length > 1 ? "s" : ""} refusée{missions.length > 1 ? "s" : ""}
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
              <div className="p-2 bg-red-100 rounded-xl">
                <Calendar className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Refusées</p>
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
                <p className="text-sm text-text-light">Montant refusé</p>
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
        className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3"
      >
        <span className="text-2xl">💡</span>
        <div>
          <p className="font-semibold text-blue-800">Conseil</p>
          <p className="text-sm text-blue-700">
            Il est normal de refuser certaines missions si elles ne correspondent pas à vos disponibilités ou vos compétences.
            Gardez un taux d&apos;acceptation raisonnable pour maintenir votre visibilité.
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
            <div className="text-6xl mb-4">👍</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Aucune mission refusée
            </h3>
            <p className="text-text-light">
              Vous n&apos;avez refusé aucune mission. Excellent travail !
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
