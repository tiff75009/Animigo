"use client";

import { motion } from "framer-motion";
import { CheckCircle, Euro, Calendar, TrendingUp } from "lucide-react";
import { MissionCard } from "../../components/mission-card";
import { getMissionsByStatus } from "@/app/lib/dashboard-data";

export default function MissionsTermineesPage() {
  const missions = getMissionsByStatus("completed");
  const totalAmount = missions.reduce((sum, m) => sum + m.amount, 0);
  const paidAmount = missions
    .filter((m) => m.paymentStatus === "paid")
    .reduce((sum, m) => sum + m.amount, 0);
  const pendingAmount = totalAmount - paidAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Sort by end date (most recent first)
  const sortedMissions = [...missions].sort(
    (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-green-100 rounded-2xl">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Missions terminées
            </h1>
            <p className="text-text-light">
              {missions.length} mission{missions.length > 1 ? "s" : ""} terminée{missions.length > 1 ? "s" : ""}
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
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Terminées</p>
                <p className="text-2xl font-bold text-foreground">{missions.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-text-light">Total gagné</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <Euro className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">Encaissé</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-xl">
                <Euro className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">À encaisser</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Info banner */}
      {pendingAmount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3"
        >
          <span className="text-2xl">💰</span>
          <div>
            <p className="font-semibold text-orange-800">Paiements en attente</p>
            <p className="text-sm text-orange-700">
              Vous avez {formatCurrency(pendingAmount)} à encaisser. Les paiements sont généralement traités sous 48h.
            </p>
          </div>
        </motion.div>
      )}

      {/* Mission List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {sortedMissions.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-md text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Aucune mission terminée
            </h3>
            <p className="text-text-light">
              Vous n&apos;avez pas encore terminé de mission. Vos missions complétées apparaîtront ici.
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
