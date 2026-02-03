"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import type { ConvexMission } from "../../../components/mission-card";

function getFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}

interface RefuseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mission: ConvexMission | null;
  onConfirm: (reason: string) => Promise<void>;
}

export function RefuseModal({
  isOpen,
  onClose,
  mission,
  onConfirm,
}: RefuseModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(reason);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setReason("");
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Erreur lors du refus:", error);
      setIsProcessing(false);
    }
  };

  if (!isOpen || !mission) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="presentation"
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="refuse-modal-title"
          aria-describedby="refuse-modal-description"
          className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-primary to-primary/80">
            <div className="flex items-center justify-between">
              <h2 id="refuse-modal-title" className="text-xl font-bold text-white">Refuser la mission</h2>
              <motion.button
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                onClick={onClose}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Fermer la modale"
              >
                <X className="w-5 h-5 text-white" aria-hidden="true" />
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
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Mission refusée</h3>
                <p className="text-text-light">
                  Le client sera informé de votre décision.
                </p>
              </motion.div>
            ) : (
              <>
                {/* Résumé mission */}
                <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">
                      {mission.animal.emoji}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{getFirstName(mission.clientName)}</p>
                      <p className="text-sm text-text-light">{mission.serviceName}</p>
                    </div>
                  </div>
                </div>

                {/* Raison du refus */}
                <div className="mb-4">
                  <label id="refuse-modal-description" className="block text-sm font-medium text-foreground mb-2">
                    Raison du refus (optionnel)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex: Indisponible sur ces dates..."
                    className="w-full p-3 border border-slate-200 rounded-xl resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
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
                    className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
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
                        <X className="w-5 h-5" />
                        Refuser
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
