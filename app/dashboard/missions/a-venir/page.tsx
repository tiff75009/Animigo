"use client";

import { motion } from "framer-motion";
import { Calendar, Euro, CalendarDays } from "lucide-react";
import { MissionCard } from "../../components/mission-card";
import { getMissionsByStatus } from "@/app/lib/dashboard-data";

export default function MissionsAVenirPage() {
  const missions = getMissionsByStatus("upcoming");
  const totalAmount = missions.reduce((sum, m) => sum + m.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Sort by start date
  const sortedMissions = [...missions].sort(
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
              {missions.length} mission{missions.length > 1 ? "s" : ""} planifiée{missions.length > 1 ? "s" : ""}
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
              <div className="p-2 bg-purple/20 rounded-xl">
                <CalendarDays className="w-5 h-5 text-purple" />
              </div>
              <div>
                <p className="text-sm text-text-light">À venir</p>
                <p className="text-2xl font-bold text-foreground">{missions.length}</p>
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
