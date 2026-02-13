"use client";

import { motion } from "framer-motion";
import { Calendar, Sun, Moon } from "lucide-react";
import { SessionsList } from "../../../components/sessions-list";

interface SessionsDateCardProps {
  mission: any;
  formatDateShort: (dateStr: string) => string;
}

export function SessionsDateCard({ mission, formatDateShort }: SessionsDateCardProps) {
  const isMultiSession = mission.sessions && mission.sessions.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
    >
      {isMultiSession && mission.sessions ? (
        <>
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Vos séances
            <span className="text-sm font-normal text-gray-500">
              ({mission.sessions.length} séances)
            </span>
          </h3>
          <SessionsList
            sessions={mission.sessions}
            sessionType={mission.sessionType}
            numberOfSessions={mission.numberOfSessions}
          />
        </>
      ) : (
        <>
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Dates et horaires
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Sun className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">Début</p>
                <p className="font-semibold text-foreground text-sm">
                  {formatDateShort(mission.startDate)}
                  {mission.startTime && ` • ${mission.startTime}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Moon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-orange-600 font-medium">Fin</p>
                <p className="font-semibold text-foreground text-sm">
                  {formatDateShort(mission.endDate)}
                  {mission.endTime && ` • ${mission.endTime}`}
                </p>
              </div>
            </div>
          </div>

          {mission.includeOvernightStay && mission.overnightNights && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 mt-3">
              <Moon className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="font-medium text-indigo-700 text-sm">
                  Garde de nuit incluse
                </p>
                <p className="text-xs text-indigo-600">
                  {mission.overnightNights} nuit
                  {mission.overnightNights > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
