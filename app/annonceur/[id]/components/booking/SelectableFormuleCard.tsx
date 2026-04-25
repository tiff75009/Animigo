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
  announcerFirstName?: string; // Prénom de l'annonceur pour le badge "Chez [prénom]"
  dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both"; // Chiens catégorisés acceptés
  isAnnouncer?: boolean;
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
  announcerFirstName,
  dogCategoryAcceptance,
  isAnnouncer = false,
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
      whileHover={{ scale: isAnnouncer ? 1 : 1.005 }}
      whileTap={{ scale: isAnnouncer ? 1 : 0.995 }}
      onClick={isAnnouncer ? undefined : onSelect}
      className="w-full p-[18px] text-left relative overflow-hidden transition-all"
      style={{
        borderRadius: 14,
        border: `1px solid ${isSelected ? "#1f3a33" : "#ece9e1"}`,
        background: isSelected ? "#f5f9f6" : "#fff",
        boxShadow: isSelected
          ? "0 8px 24px rgba(31,58,51,0.08)"
          : showAttentionPulse
            ? "0 6px 18px rgba(30,30,28,0.04)"
            : "none",
        cursor: isAnnouncer ? "default" : "pointer",
      }}
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

      {/* En-tête: Titre + Prix */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-[15px] font-semibold tracking-[-0.01em]"
              style={{ color: isSelected ? "#1f3a33" : "#1f1f1d" }}
            >
              {formule.name}
            </p>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#1f3a33" }}
              >
                <Check className="w-2.5 h-2.5 text-white" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Prix */}
        <div className="sm:text-right flex-shrink-0">
          {totalPrice ? (
            <div className="flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-0">
              <p className="text-[17px] font-semibold text-[#1f1f1d]">
                {formatPriceWithCommission(totalPrice, commissionRate)}€
                <span className="text-[11px] font-normal text-[#9c9484] ml-1">total</span>
              </p>
              <p className="text-[11px] text-[#6d6d68] sm:mt-0.5">
                {formatPriceWithCommission(formulePrice, commissionRate)}€/{formuleUnit} × {formule.duration || 60}min
                {formule.numberOfSessions && formule.numberOfSessions > 1 && ` × ${formule.numberOfSessions}`}
              </p>
            </div>
          ) : (
            <p className="text-[17px] font-semibold text-[#1f1f1d]">
              {formatPriceWithCommission(formulePrice, commissionRate)}€
              {formuleUnit && <span className="text-[11px] font-normal text-[#6d6d68]"> / {formuleUnit}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Description */}
      {formule.description && (
        <p className="text-[13px] text-[#4a4a46] leading-[1.5] mt-1.5 line-clamp-2">
          {formule.description}
        </p>
      )}

      {/* Pills outline (style cards de recherche) */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {formule.sessionType === "collective" ? (
          <FormulePill>
            <Users className="w-2.5 h-2.5" /> Collectif{formule.maxAnimalsPerSession ? ` · ${formule.maxAnimalsPerSession} max` : ""}
          </FormulePill>
        ) : (
          <FormulePill>
            <User className="w-2.5 h-2.5" /> Individuel
          </FormulePill>
        )}
        {formule.serviceLocation && (
          <FormulePill>
            {formule.serviceLocation === "announcer_home" && <><Home className="w-2.5 h-2.5" /> Chez {announcerFirstName || "le pro"}</>}
            {formule.serviceLocation === "client_home" && <><MapPin className="w-2.5 h-2.5" /> À domicile</>}
            {formule.serviceLocation === "both" && <><Home className="w-2.5 h-2.5" /> Flexible</>}
          </FormulePill>
        )}
        {formule.duration && (
          <FormulePill>
            <Timer className="w-2.5 h-2.5" /> {formule.duration} min
          </FormulePill>
        )}
        {formule.numberOfSessions && formule.numberOfSessions > 1 && (
          <FormulePill>
            <Calendar className="w-2.5 h-2.5" /> {formule.numberOfSessions} séances
          </FormulePill>
        )}
        {formule.sessionInterval && formule.numberOfSessions && formule.numberOfSessions > 1 && (
          <FormulePill>
            <Clock className="w-2.5 h-2.5" />
            {formule.sessionInterval === 7 ? "1/semaine" :
              formule.sessionInterval === 14 ? "1/2 sem." :
                formule.sessionInterval === 30 ? "1/mois" :
                  `${formule.sessionInterval}j min`}
          </FormulePill>
        )}
        {isGarde && allowOvernightStay && overnightPrice && overnightPrice > 0 && (
          <FormulePill>
            <Moon className="w-2.5 h-2.5" /> Nuit +{formatPriceWithCommission(overnightPrice, commissionRate)}€
          </FormulePill>
        )}
      </div>

      {/* Animaux acceptés - emoji compact */}
      {formule.animalTypes && formule.animalTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {formule.animalTypes.map((animal) => (
            <span
              key={animal}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-[#3a3a38]"
              style={{ border: "1px solid #dfdcd4" }}
            >
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

      {/* Restrictions chiens */}
      {formule.animalTypes?.includes("chien") && (() => {
        const dogSizes = formule.acceptedDogSizes || ["small", "medium", "large"];
        const dogCategory = formule.dogCategoryAcceptance || dogCategoryAcceptance || "none";
        const allSizes = dogSizes.length === 3;

        return (
          <div className="flex flex-wrap gap-1.5 mt-2 items-center">
            <span className="text-[10px] text-[#9c9484]">🐕</span>
            {allSizes ? (
              <FormulePill tone="success">Toutes tailles</FormulePill>
            ) : (
              <>
                {dogSizes.includes("small") && <FormulePill tone="success">Petit</FormulePill>}
                {dogSizes.includes("medium") && <FormulePill>Moyen</FormulePill>}
                {dogSizes.includes("large") && <FormulePill>Grand</FormulePill>}
              </>
            )}
            <FormulePill tone={dogCategory === "none" ? "default" : "success"}>
              {dogCategory === "none" && "Cat. non acceptées"}
              {dogCategory === "cat1" && "✓ Cat. 1"}
              {dogCategory === "cat2" && "✓ Cat. 2"}
              {dogCategory === "both" && "✓ Cat. 1 & 2"}
            </FormulePill>
          </div>
        );
      })()}

      {/* Objectifs / Activités */}
      {formule.objectives && formule.objectives.length > 0 && (
        <div className="mt-3 pt-3 relative z-10" style={{ borderTop: "1px solid #f1ede3" }}>
          <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1.5">
            <Target className="w-2.5 h-2.5" />
            {isGarde ? "Activités proposées" : "Objectifs"}
          </p>
          <div className="space-y-1">
            {formule.objectives.map((objective, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[12px] text-[#4a4a46]">
                <span className="flex-shrink-0 mt-0.5">{objective.icon}</span>
                <span className="leading-[1.5]">{objective.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Caractéristiques incluses */}
      {formule.includedFeatures && formule.includedFeatures.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 relative z-10">
          {formule.includedFeatures.map((feature, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 text-[11px]"
              style={{ color: "#2f4a3f" }}
            >
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              <span>{feature}</span>
            </span>
          ))}
        </div>
      )}

      {/* Bouton Réserver - dark green pill */}
      {!isAnnouncer && (
        <div
          className="mt-4 pt-3 relative z-10"
          style={{ borderTop: "1px solid #f1ede3" }}
        >
          <div
            className="w-full py-2 px-4 rounded-full font-medium text-[12px] flex items-center justify-center gap-1.5 transition-opacity"
            style={{ background: "#1f3a33", color: "#f7f5ef" }}
          >
            {isSelected ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Formule sélectionnée
              </>
            ) : (
              "Réserver maintenant"
            )}
          </div>
        </div>
      )}

    </motion.button>
  );
}

function FormulePill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success";
}) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
      style={
        tone === "success"
          ? { border: "1px solid #cfdbd3", color: "#2f4a3f" }
          : { border: "1px solid #dfdcd4", color: "#3a3a38" }
      }
    >
      {children}
    </span>
  );
}
