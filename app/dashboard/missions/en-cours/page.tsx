"use client";

import { motion } from "framer-motion";
import { CalendarClock, Euro, Calendar, MessageSquare } from "lucide-react";
import { MissionCard } from "../../components/mission-card";
import { getMissionsByStatus } from "@/app/lib/dashboard-data";

export default function MissionsEnCoursPage() {
  const missions = getMissionsByStatus("in_progress");
  const totalAmount = missions.reduce((sum, m) => sum + m.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

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
              {missions.length} mission{missions.length > 1 ? "s" : ""} actuellement en cours
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
              <div className="p-2 bg-blue-100 rounded-xl">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-text-light">En cours</p>
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
      {missions.length > 0 && (
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
        {missions.length === 0 ? (
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
          missions.map((mission, index) => (
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
