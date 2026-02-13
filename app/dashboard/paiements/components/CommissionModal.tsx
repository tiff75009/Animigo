"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Info } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { commissionTiers } from "../types";

export function CommissionModal({
  isOpen,
  onClose,
  currentAmount,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentAmount: number;
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md rounded-2xl bg-white p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">
              Grille de commissions
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-text-light" />
            </button>
          </div>

          <div className="space-y-2">
            {commissionTiers.map((tier, index) => {
              const isCurrentTier =
                currentAmount >= tier.min && currentAmount <= tier.max;
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-4 py-3 transition-colors",
                    isCurrentTier
                      ? "bg-primary/10 ring-2 ring-primary/20"
                      : "bg-gray-50"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm",
                      isCurrentTier
                        ? "font-semibold text-primary"
                        : "text-text-light"
                    )}
                  >
                    {tier.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-bold",
                        isCurrentTier ? "text-primary" : "text-foreground"
                      )}
                    >
                      {tier.rate}%
                    </span>
                    {isCurrentTier && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                        Actuel
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-blue-50 p-4">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <p className="text-sm text-blue-700">
              Plus votre chiffre d&apos;affaires cumul&eacute; est &eacute;lev&eacute;, plus votre
              taux de commission diminue. Continuez &agrave; d&eacute;velopper votre activit&eacute; !
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
