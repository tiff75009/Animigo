"use client";

import { Home, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";

interface ServiceLocationSelectorProps {
  serviceLocation: "announcer_home" | "client_home" | "both";
  selectedLocation: "announcer_home" | "client_home" | null;
  onSelect: (location: "announcer_home" | "client_home") => void;
}

export default function ServiceLocationSelector({
  serviceLocation,
  selectedLocation,
  onSelect,
}: ServiceLocationSelectorProps) {
  // Si le service est uniquement chez l'annonceur ou le client, pas besoin de sélection
  if (serviceLocation !== "both") {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="p-2 bg-blue-50 rounded-lg">
          <MapPin className="w-5 h-5 text-blue-600" />
        </span>
        Lieu de la prestation
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Chez le pet-sitter */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("announcer_home")}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-left",
            selectedLocation === "announcer_home"
              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-center gap-3">
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
                Chez le pet-sitter
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Vous déposez votre animal
              </p>
            </div>
          </div>
        </motion.button>

        {/* À domicile */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect("client_home")}
          className={cn(
            "p-4 rounded-xl border-2 transition-all text-left",
            selectedLocation === "client_home"
              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-center gap-3">
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
  );
}
