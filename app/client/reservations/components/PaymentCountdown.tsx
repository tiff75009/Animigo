"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface PaymentCountdownProps {
  deadline: number; // Timestamp de la deadline
  className?: string;
}

export function PaymentCountdown({ deadline, className }: PaymentCountdownProps) {
  const [remaining, setRemaining] = useState(() => deadline - Date.now());

  useEffect(() => {
    // Mettre à jour toutes les minutes
    const interval = setInterval(() => {
      setRemaining(deadline - Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, [deadline]);

  // Si délai dépassé
  if (remaining <= 0) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 text-xs text-red-600 font-medium",
        className
      )}>
        <AlertTriangle className="w-3.5 h-3.5" />
        Délai expiré
      </div>
    );
  }

  // Calculer heures et minutes
  const totalMinutes = Math.floor(remaining / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Déterminer le niveau d'urgence
  const isUrgent = hours < 6;
  const isWarning = hours < 24;

  // Formater l'affichage
  let displayText: string;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    displayText = remainingHours > 0
      ? `${days}j ${remainingHours}h pour payer`
      : `${days}j pour payer`;
  } else if (hours > 0) {
    displayText = `${hours}h${minutes.toString().padStart(2, "0")} pour payer`;
  } else {
    displayText = `${minutes} min pour payer`;
  }

  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs font-medium",
      isUrgent ? "text-red-600" : isWarning ? "text-orange-600" : "text-gray-500",
      className
    )}>
      <Clock className={cn(
        "w-3.5 h-3.5",
        isUrgent && "animate-pulse"
      )} />
      {displayText}
    </div>
  );
}

// Composant compact pour les listes
export function PaymentCountdownBadge({ deadline, className }: PaymentCountdownProps) {
  const [remaining, setRemaining] = useState(() => deadline - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(deadline - Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, [deadline]);

  // Si délai dépassé
  if (remaining <= 0) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700",
        className
      )}>
        <AlertTriangle className="w-3 h-3" />
        Expiré
      </span>
    );
  }

  const totalMinutes = Math.floor(remaining / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const isUrgent = hours < 6;
  const isWarning = hours < 24;

  // Format court
  let displayText: string;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    displayText = `${days}j`;
  } else if (hours > 0) {
    displayText = `${hours}h${minutes.toString().padStart(2, "0")}`;
  } else {
    displayText = `${minutes}min`;
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      isUrgent
        ? "bg-red-100 text-red-700"
        : isWarning
          ? "bg-orange-100 text-orange-700"
          : "bg-gray-100 text-gray-600",
      className
    )}>
      <Clock className="w-3 h-3" />
      {displayText}
    </span>
  );
}
