"use client";

import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  Calendar,
  Sparkles,
  Users,
  User,
  MapPin,
  Home,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import {
  formatPrice,
  formatDateShort,
  getDaysUntilMission,
  type AuthorizedPayment,
} from "../types";

export function MissionPaymentCard({
  mission,
}: {
  mission: AuthorizedPayment;
}) {
  const daysUntil = getDaysUntilMission(mission.startDate);
  const isToday = daysUntil === 0;
  const isSoon = daysUntil > 0 && daysUntil <= 3;
  const isInProgress = mission.status === "in_progress";
  const isCompleted = mission.status === "completed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] transition-all hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)]",
        isCompleted && "ring-2 ring-green-200 ring-offset-1"
      )}
    >
      {/* Banniere statut */}
      {isCompleted ? (
        <div
          className={cn(
            "px-4 py-2.5",
            mission.readyForPayout
              ? "bg-gradient-to-r from-purple-500 to-indigo-500"
              : "bg-gradient-to-r from-green-500 to-emerald-500"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                <CheckCircle className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">
                {mission.readyForPayout
                  ? "\u00C0 encaisser"
                  : "Mission termin\u00E9e"}
              </span>
            </div>
            {mission.clientConfirmedAt ? (
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">
                Confirm\u00E9e par le client
              </span>
            ) : mission.autoConfirmedAt ? (
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">
                Auto-confirm\u00E9e
              </span>
            ) : (
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur">
                En attente de confirmation
              </span>
            )}
          </div>
        </div>
      ) : isInProgress ? (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">En cours</span>
          </div>
        </div>
      ) : isToday ? (
        <div className="bg-gradient-to-r from-primary to-orange-500 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <Clock className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">
              Commence aujourd&apos;hui
            </span>
          </div>
        </div>
      ) : isSoon ? (
        <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur">
              <Calendar className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">
              J-{daysUntil}
            </span>
          </div>
        </div>
      ) : null}

      <div className="p-4">
        {/* En-tete */}
        <div className="mb-4 flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/5 to-primary/15 text-2xl ring-2 ring-white shadow-sm">
              {mission.animal?.emoji || "\uD83D\uDC3E"}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-foreground">
                  {mission.serviceName}
                </h3>
                <p className="mt-0.5 text-sm text-text-light">
                  {mission.animal?.name || "Animal"} &bull; {mission.clientName}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-xl font-bold text-green-600">
                  +{formatPrice(mission.announcerEarnings)}
                </p>
                <p className="text-xs text-text-light">vous recevrez</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ligne d'infos */}
        <div className="-mx-1 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-gray-50/80 px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Dates</p>
              <p className="text-sm font-semibold text-foreground">
                {formatDateShort(mission.startDate)}
                {mission.startDate !== mission.endDate &&
                  ` - ${formatDateShort(mission.endDate)}`}
              </p>
            </div>
          </div>

          <div className="hidden h-8 w-px bg-gray-200 sm:block" />

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg shadow-sm",
                mission.serviceLocation === "client_home"
                  ? "bg-teal-50"
                  : "bg-indigo-50"
              )}
            >
              {mission.serviceLocation === "client_home" ? (
                <Home className="h-4 w-4 text-teal-600" />
              ) : (
                <MapPin className="h-4 w-4 text-indigo-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Lieu</p>
              <p className="text-sm font-semibold text-foreground">
                {mission.serviceLocation === "client_home"
                  ? "\u00C0 domicile"
                  : "Chez vous"}
              </p>
            </div>
          </div>

          <div className="hidden h-8 w-px bg-gray-200 sm:block" />

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg shadow-sm",
                mission.sessionType === "collective"
                  ? "bg-blue-50"
                  : "bg-amber-50"
              )}
            >
              {mission.sessionType === "collective" ? (
                <Users className="h-4 w-4 text-blue-600" />
              ) : (
                <User className="h-4 w-4 text-amber-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Format</p>
              <p className="text-sm font-semibold text-foreground">
                {mission.sessionType === "collective"
                  ? "Collectif"
                  : "Individuel"}
              </p>
            </div>
          </div>
        </div>

        {/* Badge statut paiement */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
            <CheckCircle className="h-3.5 w-3.5" />
            Paiement confirm&eacute;
          </span>
          <span className="text-xs text-text-light">
            Montant client : {formatPrice(mission.amount)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
