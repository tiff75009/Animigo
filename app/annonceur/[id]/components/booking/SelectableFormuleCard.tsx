"use client";

import { Check, Clock, Calendar, CheckCircle2, Target, Users, User, Timer, Home, MapPin, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import type { FormuleData } from "../types";
import { formatPriceWithCommission, getFormuleBestPrice } from "./pricing";

interface SelectableFormuleCardProps {
  formule: FormuleData;
  isSelected: boolean;
  isGarde: boolean;
  commissionRate: number;
  onSelect: () => void;
  showAttentionPulse?: boolean;
  animationDelay?: number;
  allowOvernightStay?: boolean;
  overnightPrice?: number;
}

// Calculer le prix total avec durée et nombre de séances
function calculateTotalPrice(
  hourlyPrice: number,
  duration: number | undefined,
  numberOfSessions: number | undefined
): number {
  const durationHours = (duration || 60) / 60;
  const sessions = numberOfSessions || 1;
  return Math.round(hourlyPrice * durationHours * sessions);
}

export default function SelectableFormuleCard({
  formule,
  isSelected,
  isGarde,
  commissionRate,
  onSelect,
  showAttentionPulse = false,
  animationDelay = 0,
  allowOvernightStay,
  overnightPrice,
}: SelectableFormuleCardProps) {
  const { price: formulePrice, unit: formuleUnit } = getFormuleBestPrice(formule, isGarde);

  // Calculer le prix total si plusieurs séances ou durée différente de 60min
  const hasMultipleSessions = formule.numberOfSessions && formule.numberOfSessions > 1;
  const hasDifferentDuration = formule.duration && formule.duration !== 60;
  const showTotalPrice = (hasMultipleSessions || hasDifferentDuration) && formuleUnit === "heure";
  const totalPrice = showTotalPrice
    ? calculateTotalPrice(formulePrice, formule.duration, formule.numberOfSessions)
    : null;

  return (
    <motion.button
      initial={showAttentionPulse ? { opacity: 0.8, y: 5 } : false}
      animate={showAttentionPulse ? {
        opacity: 1,
        y: 0,
        scale: [1, 1.01, 1],
      } : { opacity: 1, y: 0 }}
      transition={{
        opacity: { duration: 0.3, delay: animationDelay },
        y: { duration: 0.3, delay: animationDelay },
        scale: {
          duration: 1.5,
          repeat: Infinity,
          delay: animationDelay + 0.5,
          ease: "easeInOut"
        },
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={cn(
        "w-full p-4 rounded-xl transition-all text-left relative overflow-hidden",
        "border-2",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : showAttentionPulse
            ? "border-primary/30 bg-gradient-to-r from-gray-50 to-primary/5 hover:bg-primary/10 hover:border-primary/50"
            : "border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-200"
      )}
    >
      {/* Shimmer effect when attention pulse is active */}
      {showAttentionPulse && !isSelected && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: animationDelay + 1,
            ease: "easeInOut",
            repeatDelay: 3,
          }}
        />
      )}

      {/* En-tête: Titre + Prix - layout responsive */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn(
              "font-semibold text-base",
              isSelected ? "text-primary" : "text-gray-900"
            )}>
              {formule.name}
            </p>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0"
              >
                <Check className="w-3 h-3 text-white" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Prix - aligné à droite sur desktop, en dessous sur mobile */}
        <div className="sm:text-right flex-shrink-0">
          {totalPrice ? (
            <div className="flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-0">
              <p className={cn(
                "text-lg font-bold",
                isSelected ? "text-primary" : "text-primary"
              )}>
                {formatPriceWithCommission(totalPrice, commissionRate)}€
                <span className="text-xs font-normal text-gray-400 ml-1">total</span>
              </p>
              <p className="text-xs text-gray-500 sm:mt-0.5">
                {formatPriceWithCommission(formulePrice, commissionRate)}€/{formuleUnit} × {formule.duration || 60}min
                {formule.numberOfSessions && formule.numberOfSessions > 1 && ` × ${formule.numberOfSessions}`}
              </p>
            </div>
          ) : (
            <p className={cn(
              "text-lg font-bold",
              isSelected ? "text-primary" : "text-primary"
            )}>
              {formatPriceWithCommission(formulePrice, commissionRate)}€
              {formuleUnit && <span className="text-sm font-medium text-gray-500">/{formuleUnit}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {formule.description && (
        <p className="text-sm text-gray-500 mt-2">{formule.description}</p>
      )}

      {/* Badges: Type de séance, lieu, durée, séances */}
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {/* Type de séance */}
        {formule.sessionType === "collective" ? (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full font-medium">
            <Users className="w-3 h-3" />
            Collectif{formule.maxAnimalsPerSession ? ` (${formule.maxAnimalsPerSession} max)` : ""}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">
            <User className="w-3 h-3" />
            Individuel
          </span>
        )}
        {/* Lieu de prestation */}
        {formule.serviceLocation && (
          <span className={cn(
            "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium",
            formule.serviceLocation === "announcer_home" && "bg-primary/10 text-primary",
            formule.serviceLocation === "client_home" && "bg-secondary/10 text-secondary",
            formule.serviceLocation === "both" && "bg-purple-100 text-purple-600"
          )}>
            {formule.serviceLocation === "announcer_home" && <><Home className="w-3 h-3" /> Chez le pro</>}
            {formule.serviceLocation === "client_home" && <><MapPin className="w-3 h-3" /> À domicile</>}
            {formule.serviceLocation === "both" && <><Home className="w-2.5 h-2.5" /><MapPin className="w-2.5 h-2.5" /> Flexible</>}
          </span>
        )}
        {/* Durée */}
        {formule.duration && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {formule.duration} min
          </span>
        )}
        {/* Nombre de séances */}
        {formule.numberOfSessions && formule.numberOfSessions > 1 && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">
            <Calendar className="w-3 h-3" />
            {formule.numberOfSessions} séances
          </span>
        )}
        {/* Intervalle entre séances */}
        {formule.sessionInterval && formule.numberOfSessions && formule.numberOfSessions > 1 && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
            <Timer className="w-3 h-3" />
            {formule.sessionInterval === 7 ? "1/semaine" :
             formule.sessionInterval === 14 ? "1/2 sem." :
             formule.sessionInterval === 30 ? "1/mois" :
             `${formule.sessionInterval}j min`}
          </span>
        )}
        {/* Garde de nuit acceptée */}
        {isGarde && allowOvernightStay && overnightPrice && overnightPrice > 0 && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full font-medium">
            <Moon className="w-3 h-3" />
            Nuit dispo +{formatPriceWithCommission(overnightPrice, commissionRate)}€
          </span>
        )}
      </div>

      {/* Animaux acceptés */}
      {formule.animalTypes && formule.animalTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {formule.animalTypes.map((animal) => (
            <span key={animal} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              {animal === "chien" ? "🐕 Chien" :
               animal === "chat" ? "🐈 Chat" :
               animal === "lapin" ? "🐰 Lapin" :
               animal === "rongeur" ? "🐹 Rongeur" :
               animal === "oiseau" ? "🦜 Oiseau" :
               animal === "poisson" ? "🐠 Poisson" :
               animal === "reptile" ? "🦎 Reptile" :
               animal === "nac" ? "🐾 NAC" :
               animal}
            </span>
          ))}
        </div>
      )}

      {/* Objectifs / Activités proposées */}
      {formule.objectives && formule.objectives.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-200/50 relative z-10">
          <p className="flex items-center gap-1 text-xs font-medium text-purple-700 mb-1.5">
            <Target className="w-3 h-3" />
            {isGarde ? "Activités proposées" : "Objectifs de la prestation"}
          </p>
          <div className="space-y-1.5">
            {formule.objectives.map((objective, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="flex-shrink-0 mt-0.5">{objective.icon}</span>
                <span className="leading-relaxed">{objective.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Caractéristiques incluses */}
      {formule.includedFeatures && formule.includedFeatures.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 relative z-10">
          {formule.includedFeatures.map((feature, idx) => (
            <span key={idx} className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              <span>{feature}</span>
            </span>
          ))}
        </div>
      )}
    </motion.button>
  );
}
