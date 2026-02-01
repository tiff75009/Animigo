"use client";

import { useState, useEffect } from "react";
import { cn } from "@/app/lib/utils";
import { Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface DeadlineCountdownProps {
  deadline: number; // Timestamp de la deadline
  bookedAt?: number; // Timestamp de la réservation (pour calcul pourcentage)
  className?: string;
  compact?: boolean; // Mode compact pour la carte
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  percent: number;
}

function calculateTimeRemaining(
  deadline: number,
  bookedAt?: number
): TimeRemaining {
  const now = Date.now();
  const remaining = Math.max(0, deadline - now);

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Calculer le pourcentage restant
  let percent = 100;
  if (bookedAt && deadline > bookedAt) {
    const totalDuration = deadline - bookedAt;
    percent = Math.max(0, Math.min(100, (remaining / totalDuration) * 100));
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs: remaining,
    percent,
  };
}

type UrgencyLevel = "normal" | "warning" | "urgent";

function getUrgencyLevel(percent: number, totalMs: number): UrgencyLevel {
  // Urgence basée sur le temps absolu (moins de 2h)
  const twoHoursMs = 2 * 60 * 60 * 1000;
  if (totalMs < twoHoursMs) {
    return "urgent";
  }

  // Sinon basée sur le pourcentage
  if (percent > 50) return "normal";
  if (percent > 20) return "warning";
  return "urgent";
}

const urgencyStyles = {
  normal: {
    bg: "bg-secondary/10",
    text: "text-secondary",
    border: "border-secondary/30",
    progressBg: "bg-secondary/20",
    progressFill: "bg-secondary",
    icon: Clock,
  },
  warning: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-300",
    progressBg: "bg-orange-200",
    progressFill: "bg-orange-500",
    icon: Clock,
  },
  urgent: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-300",
    progressBg: "bg-red-200",
    progressFill: "bg-red-500",
    icon: AlertTriangle,
  },
};

export function DeadlineCountdown({
  deadline,
  bookedAt,
  className,
  compact = false,
}: DeadlineCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(deadline, bookedAt)
  );

  useEffect(() => {
    // Mise à jour chaque seconde
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(deadline, bookedAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, bookedAt]);

  // Si le délai est expiré
  if (timeRemaining.totalMs <= 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg",
          "bg-red-100 text-red-700",
          className
        )}
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">Délai expiré</span>
      </div>
    );
  }

  const urgency = getUrgencyLevel(timeRemaining.percent, timeRemaining.totalMs);
  const styles = urgencyStyles[urgency];
  const Icon = styles.icon;

  // Format du temps
  let timeDisplay: string;
  if (timeRemaining.days > 0) {
    timeDisplay = `${timeRemaining.days}j ${timeRemaining.hours}h`;
  } else if (timeRemaining.hours > 0) {
    timeDisplay = `${timeRemaining.hours}h ${timeRemaining.minutes}m`;
  } else if (timeRemaining.minutes > 0) {
    timeDisplay = `${timeRemaining.minutes}m ${timeRemaining.seconds}s`;
  } else {
    timeDisplay = `${timeRemaining.seconds}s`;
  }

  // Mode compact (pour la carte)
  if (compact) {
    return (
      <motion.div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg border",
          styles.bg,
          styles.text,
          styles.border,
          urgency === "urgent" && "animate-pulse",
          className
        )}
        initial={{ scale: 0.95 }}
        animate={{
          scale: urgency === "urgent" ? [1, 1.02, 1] : 1,
        }}
        transition={{
          duration: urgency === "urgent" ? 0.5 : 0,
          repeat: urgency === "urgent" ? Infinity : 0,
        }}
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold tabular-nums">{timeDisplay}</span>
        {urgency === "urgent" && timeRemaining.totalMs < 2 * 60 * 60 * 1000 && (
          <span className="text-[10px] font-bold uppercase tracking-wide bg-red-200 px-1 rounded">
            URGENT
          </span>
        )}
      </motion.div>
    );
  }

  // Mode complet (avec barre de progression)
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className={cn("flex items-center gap-2", styles.text)}>
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">Délai pour accepter</span>
        </div>
        <div className={cn("flex items-center gap-2", styles.text)}>
          <span className="text-sm font-bold tabular-nums">{timeDisplay}</span>
          {urgency === "urgent" && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 bg-red-500 text-white rounded">
              URGENT
            </span>
          )}
        </div>
      </div>

      {/* Barre de progression */}
      <div className={cn("h-2 rounded-full overflow-hidden", styles.progressBg)}>
        <motion.div
          className={cn("h-full rounded-full", styles.progressFill)}
          initial={{ width: "100%" }}
          animate={{ width: `${timeRemaining.percent}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Message contextuel */}
      {urgency === "urgent" && (
        <p className="text-xs text-red-600 font-medium">
          Répondez rapidement ou la demande sera automatiquement refusée.
        </p>
      )}
      {urgency === "warning" && (
        <p className="text-xs text-orange-600">
          Le temps presse, pensez à répondre bientôt.
        </p>
      )}
    </div>
  );
}

// Export du hook pour utilisation externe
export function useDeadlineCountdown(deadline: number, bookedAt?: number) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(deadline, bookedAt)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(deadline, bookedAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, bookedAt]);

  return {
    ...timeRemaining,
    isExpired: timeRemaining.totalMs <= 0,
    urgency: getUrgencyLevel(timeRemaining.percent, timeRemaining.totalMs),
  };
}
