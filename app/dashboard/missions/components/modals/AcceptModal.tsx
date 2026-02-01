"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Loader2, TrendingUp } from "lucide-react";
import type { ConvexMission } from "../../../components/mission-card";

function getFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}

interface AcceptModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: ConvexMission | null;
  onConfirm: () => Promise<void>;
}

export function AcceptModal({
  isOpen,
  onClose,
  mission,
  onConfirm,
}: AcceptModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Erreur lors de l'acceptation:", error);
      setIsProcessing(false);
    }
  };

  if (!isOpen || !mission) return null;

  const announcerEarnings = (mission.announcerEarnings ?? mission.amount * 0.85) / 100;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-secondary to-secondary/80">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Accepter la mission</h2>
              <motion.button
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isSuccess ? (
              <motion.div
                className="text-center py-8"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-secondary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Mission acceptée !</h3>
                <p className="text-text-light">
                  Le client sera notifié de votre acceptation.
                </p>
              </motion.div>
            ) : (
              <>
                {/* Résumé mission */}
                <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">
                      {mission.animal.emoji}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{getFirstName(mission.clientName)}</p>
                      <p className="text-sm text-text-light">{mission.serviceName}</p>
                    </div>
                  </div>
                  {mission.variantName && (
                    <p className="text-sm text-text-light mb-2">
                      Prestation : <span className="font-medium text-foreground">{mission.variantName}</span>
                    </p>
                  )}
                </div>

                {/* Revenus */}
                <div className="bg-gradient-to-r from-secondary/10 to-accent/10 rounded-2xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-secondary" />
                      <span className="font-semibold text-foreground">Vos revenus</span>
                    </div>
                    <p className="text-2xl font-bold text-secondary">{announcerEarnings.toFixed(2).replace(".", ",")} €</p>
                  </div>
                </div>

                {/* Avertissement */}
                <div className="flex items-start gap-2 p-3 bg-accent/10 rounded-xl mb-6">
                  <AlertCircle className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    En acceptant, vous vous engagez à réaliser cette prestation aux dates convenues.
                  </p>
                </div>

                {/* Boutons */}
                <div className="flex gap-3">
                  <motion.button
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-foreground rounded-xl font-semibold"
                    onClick={onClose}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isProcessing}
                  >
                    Annuler
                  </motion.button>
                  <motion.button
                    className="flex-1 py-3 px-4 bg-secondary hover:bg-secondary/90 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-secondary/20"
                    onClick={handleConfirm}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Confirmer
                      </>
                    )}
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
