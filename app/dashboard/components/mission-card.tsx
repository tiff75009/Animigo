"use client";

import { cn } from "@/app/lib/utils";
import { motion } from "framer-motion";
import { Calendar, MapPin, Euro, Check, X, AlertTriangle, CheckCircle, Clock, XCircle, Users, Info } from "lucide-react";
import { type Mission, checkAvailabilityForDateRange, type AvailabilityStatus, mockUserProfile } from "@/app/lib/dashboard-data";

interface MissionCardProps {
  mission: Mission;
  showActions?: boolean;
  onAccept?: (id: string, increaseCapacity?: boolean) => void;
  onRefuse?: (id: string) => void;
}

const statusConfig = {
  completed: {
    label: "Terminée",
    color: "bg-green-100 text-green-700",
  },
  in_progress: {
    label: "En cours",
    color: "bg-blue-100 text-blue-700",
  },
  upcoming: {
    label: "À venir",
    color: "bg-purple/20 text-purple",
  },
  pending_acceptance: {
    label: "À accepter",
    color: "bg-accent/30 text-foreground",
  },
  pending_confirmation: {
    label: "En attente",
    color: "bg-orange-100 text-orange-700",
  },
  refused: {
    label: "Refusée",
    color: "bg-red-100 text-red-700",
  },
  cancelled: {
    label: "Annulée",
    color: "bg-gray-100 text-gray-700",
  },
};

const paymentConfig = {
  paid: {
    label: "Payé",
    color: "text-green-600",
  },
  pending: {
    label: "À encaisser",
    color: "text-orange-600",
  },
  not_due: {
    label: "Non dû",
    color: "text-text-light",
  },
};

const availabilityConfig: Record<AvailabilityStatus, {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  icon: typeof CheckCircle;
}> = {
  available: {
    label: "Vous êtes disponible",
    shortLabel: "Disponible",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    icon: CheckCircle,
  },
  partial: {
    label: "Disponibilité partielle",
    shortLabel: "Partiel",
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
    icon: Clock,
  },
  unavailable: {
    label: "Non disponible sur cette période",
    shortLabel: "Indisponible",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    icon: XCircle,
  },
  conflict: {
    label: "Conflit avec une autre mission",
    shortLabel: "Conflit",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    icon: AlertTriangle,
  },
};

export function MissionCard({
  mission,
  showActions = false,
  onAccept,
  onRefuse,
}: MissionCardProps) {
  const status = statusConfig[mission.status];
  const payment = paymentConfig[mission.paymentStatus];

  // Check availability for pending_acceptance missions
  const availabilityCheck = mission.status === "pending_acceptance"
    ? checkAvailabilityForDateRange(mission.startDate, mission.endDate, mission.id)
    : null;

  const availability = availabilityCheck ? availabilityConfig[availabilityCheck.status] : null;
  const AvailabilityIcon = availability?.icon;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <motion.div
      className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-2xl">
            {mission.clientAvatar}
          </div>
          <div>
            <p className="font-semibold text-foreground">{mission.clientName}</p>
            <p className="text-sm text-text-light flex items-center gap-1">
              <span>{mission.animal.emoji}</span>
              {mission.animal.name}
            </p>
          </div>
        </div>
        <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", status.color)}>
          {status.label}
        </span>
      </div>

      {/* Content Grid - Left info / Right price */}
      <div className="grid grid-cols-[1fr_auto] gap-4 mb-4">
        {/* Left - Service & Details */}
        <div className="space-y-3">
          <p className="font-medium text-foreground">{mission.service}</p>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-text-light">
              <Calendar className="w-4 h-4" />
              <span>
                {formatDate(mission.startDate)} - {formatDate(mission.endDate)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-light">
              <MapPin className="w-4 h-4" />
              <span>{mission.location}</span>
            </div>
          </div>
        </div>

        {/* Right - Price */}
        <div className="text-right flex flex-col justify-center">
          <p className="text-2xl font-bold text-primary">{mission.amount}€</p>
          <p className="text-xs text-text-light">TTC (TVA 20%)</p>
          <span className={cn("text-xs mt-1", payment.color)}>{payment.label}</span>
        </div>
      </div>

      {/* Availability Status for pending_acceptance */}
      {availabilityCheck && availability && AvailabilityIcon && (
        <div className={cn(
          "rounded-xl p-3 mb-4 border",
          availability.bgColor
        )}>
          <div className="flex items-start gap-2">
            <AvailabilityIcon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", availability.color)} />
            <div className="flex-1">
              <p className={cn("font-medium text-sm", availability.color)}>
                {availability.label}
              </p>
              {availabilityCheck.status === "partial" && (
                <p className="text-xs text-orange-600 mt-1">
                  {availabilityCheck.availableDays}/{availabilityCheck.totalDays} jours disponibles
                  {availabilityCheck.partialDays > 0 && `, ${availabilityCheck.partialDays} partiels`}
                </p>
              )}
              {availabilityCheck.status === "conflict" && availabilityCheck.conflictingMissions.length > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Mission en conflit : {availabilityCheck.conflictingMissions[0].service} ({formatDate(availabilityCheck.conflictingMissions[0].startDate)} - {formatDate(availabilityCheck.conflictingMissions[0].endDate)})
                </p>
              )}
              {availabilityCheck.status === "unavailable" && (
                <p className="text-xs text-red-600 mt-1">
                  Vérifiez votre calendrier de disponibilités
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Option to increase capacity when conflict */}
      {availabilityCheck?.status === "conflict" && showActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
          <div className="flex items-start gap-2">
            <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm text-blue-800">
                Augmenter votre capacité ?
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Capacité actuelle : <strong>{mockUserProfile.maxAnimals} animaux max</strong>
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Vous pouvez accepter cette mission en gardant un animal supplémentaire sur cette période.
              </p>
            </div>
          </div>
          <div className="mt-3 p-2 bg-blue-100 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                <strong>{mission.clientName}</strong> sera informé(e) avant paiement que vous avez accepté un animal supplémentaire pour cette période.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && mission.status === "pending_acceptance" && (
        <div className="pt-4 border-t border-foreground/10">
          {availabilityCheck?.status === "conflict" ? (
            <div className="space-y-2">
              <motion.button
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-500 text-white rounded-xl font-semibold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAccept?.(mission.id, true)}
              >
                <Users className="w-4 h-4" />
                Accepter avec capacité augmentée
              </motion.button>
              <motion.button
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-500 text-white rounded-xl font-semibold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onRefuse?.(mission.id)}
              >
                <X className="w-4 h-4" />
                Refuser
              </motion.button>
            </div>
          ) : (
            <div className="flex gap-2">
              <motion.button
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-500 text-white rounded-xl font-semibold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAccept?.(mission.id)}
              >
                <Check className="w-4 h-4" />
                Accepter
              </motion.button>
              <motion.button
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-red-500 text-white rounded-xl font-semibold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onRefuse?.(mission.id)}
              >
                <X className="w-4 h-4" />
                Refuser
              </motion.button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

interface MissionListProps {
  missions: Mission[];
  title: string;
  emoji: string;
  showActions?: boolean;
  maxItems?: number;
  viewAllHref?: string;
}

export function MissionList({
  missions,
  title,
  emoji,
  showActions = false,
  maxItems = 3,
  viewAllHref,
}: MissionListProps) {
  const displayedMissions = missions.slice(0, maxItems);

  if (missions.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-md">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <span>{emoji}</span>
          {title}
        </h3>
        <p className="text-text-light text-center py-8">Aucune mission</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span>{emoji}</span>
          {title}
          <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-sm rounded-full">
            {missions.length}
          </span>
        </h3>
        {viewAllHref && missions.length > maxItems && (
          <a
            href={viewAllHref}
            className="text-sm text-primary font-medium hover:underline"
          >
            Voir tout
          </a>
        )}
      </div>
      <div className="space-y-4">
        {displayedMissions.map((mission) => (
          <MissionCard key={mission.id} mission={mission} showActions={showActions} />
        ))}
      </div>
    </div>
  );
}
