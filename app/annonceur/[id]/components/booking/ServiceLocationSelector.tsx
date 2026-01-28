"use client";

import React, { useEffect } from "react";
import { Home, MapPin, MousePointerClick, Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";

interface ServiceLocationSelectorProps {
  serviceLocation: "announcer_home" | "client_home" | "both";
  selectedLocation: "announcer_home" | "client_home" | null;
  onSelect: (location: "announcer_home" | "client_home") => void;
  isRangeMode?: boolean; // Mode garde - toujours afficher les deux options
  announcerFirstName?: string; // Prénom de l'annonceur pour "Chez [prénom]"
}

export default function ServiceLocationSelector({
  serviceLocation,
  selectedLocation,
  onSelect,
  isRangeMode = false,
  announcerFirstName,
}: ServiceLocationSelectorProps) {
  // Si le service n'accepte qu'un seul lieu, auto-sélectionner
  useEffect(() => {
    if (serviceLocation === "announcer_home" && selectedLocation !== "announcer_home") {
      onSelect("announcer_home");
    } else if (serviceLocation === "client_home" && selectedLocation !== "client_home") {
      onSelect("client_home");
    }
  }, [serviceLocation, selectedLocation, onSelect]);

  // Si un seul lieu est possible, afficher en lecture seule (auto-coché)
  if (serviceLocation !== "both") {
    const isAnnouncerHome = serviceLocation === "announcer_home";
    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary bg-primary/5">
          <div className="p-2.5 rounded-lg bg-primary/10">
            {isAnnouncerHome ? (
              <Home className="w-5 h-5 text-primary" />
            ) : (
              <MapPin className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium text-primary">
              {isAnnouncerHome
                ? `Chez ${announcerFirstName || "le pet-sitter"}`
                : "À mon domicile"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {isAnnouncerHome
                ? "Vous déposez votre animal"
                : "Le pet-sitter se déplace"}
            </p>
          </div>
          <div className="p-1.5 rounded-full bg-primary">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    );
  }

  const hasSelection = selectedLocation !== null;

  return (
    <motion.div
      className={cn(
        "bg-white rounded-2xl p-5 border-2 transition-colors duration-300 relative overflow-hidden",
        hasSelection
          ? "border-gray-100"
          : "border-blue-400/50"
      )}
      animate={!hasSelection ? {
        boxShadow: [
          "0 0 0 0 rgba(59, 130, 246, 0)",
          "0 0 0 8px rgba(59, 130, 246, 0.15)",
          "0 0 0 0 rgba(59, 130, 246, 0)",
        ],
      } : {}}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Subtle gradient overlay when no selection */}
      {!hasSelection && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-blue-50/50 pointer-events-none" />
      )}

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className={cn(
              "p-2 rounded-lg transition-colors duration-300",
              hasSelection ? "bg-blue-50" : "bg-blue-100"
            )}>
              <MapPin className={cn(
                "w-5 h-5 transition-colors duration-300",
                hasSelection ? "text-blue-600" : "text-blue-500"
              )} />
            </span>
            Lieu de la prestation
          </h3>

          {/* Indicator when no selection */}
          {!hasSelection && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 text-sm text-blue-600 font-medium"
            >
              <MousePointerClick className="w-4 h-4" />
              <span className="hidden sm:inline">Choisissez un lieu</span>
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Chez le pet-sitter */}
          <motion.button
            initial={!hasSelection ? { opacity: 0.9, y: 3 } : false}
            animate={!hasSelection ? {
              opacity: 1,
              y: 0,
              scale: [1, 1.01, 1],
            } : { opacity: 1, y: 0 }}
            transition={{
              opacity: { duration: 0.3 },
              y: { duration: 0.3 },
              scale: {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              },
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect("announcer_home")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden",
              selectedLocation === "announcer_home"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : !hasSelection
                  ? "border-blue-300/50 bg-gradient-to-r from-gray-50 to-blue-50/30 hover:bg-blue-50/50 hover:border-blue-400/50"
                  : "border-gray-200 hover:border-gray-300"
            )}
          >
            {/* Shimmer effect */}
            {!hasSelection && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 3,
                }}
              />
            )}
            <div className="flex items-center gap-3 relative z-10">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  selectedLocation === "announcer_home"
                    ? "bg-primary/10"
                    : "bg-gray-100"
                )}
              >
                <Home
                  className={cn(
                    "w-5 h-5",
                    selectedLocation === "announcer_home"
                      ? "text-primary"
                      : "text-gray-500"
                  )}
                />
              </div>
              <div>
                <p
                  className={cn(
                    "font-medium",
                    selectedLocation === "announcer_home"
                      ? "text-primary"
                      : "text-gray-900"
                  )}
                >
                  Chez {announcerFirstName || "le pet-sitter"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Vous déposez votre animal
                </p>
              </div>
            </div>
          </motion.button>

          {/* À domicile */}
          <motion.button
            initial={!hasSelection ? { opacity: 0.9, y: 3 } : false}
            animate={!hasSelection ? {
              opacity: 1,
              y: 0,
              scale: [1, 1.01, 1],
            } : { opacity: 1, y: 0 }}
            transition={{
              opacity: { duration: 0.3, delay: 0.1 },
              y: { duration: 0.3, delay: 0.1 },
              scale: {
                duration: 1.5,
                repeat: Infinity,
                delay: 0.2,
                ease: "easeInOut"
              },
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect("client_home")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden",
              selectedLocation === "client_home"
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : !hasSelection
                  ? "border-blue-300/50 bg-gradient-to-r from-gray-50 to-blue-50/30 hover:bg-blue-50/50 hover:border-blue-400/50"
                  : "border-gray-200 hover:border-gray-300"
            )}
          >
            {/* Shimmer effect */}
            {!hasSelection && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: 0.5,
                  ease: "easeInOut",
                  repeatDelay: 3,
                }}
              />
            )}
            <div className="flex items-center gap-3 relative z-10">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  selectedLocation === "client_home"
                    ? "bg-primary/10"
                    : "bg-gray-100"
                )}
              >
                <MapPin
                  className={cn(
                    "w-5 h-5",
                    selectedLocation === "client_home"
                      ? "text-primary"
                      : "text-gray-500"
                  )}
                />
              </div>
              <div>
                <p
                  className={cn(
                    "font-medium",
                    selectedLocation === "client_home"
                      ? "text-primary"
                      : "text-gray-900"
                  )}
                >
                  À mon domicile
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Le pet-sitter se déplace
                </p>
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
