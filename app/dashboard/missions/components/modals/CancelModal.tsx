"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}

export function CancelModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: CancelModalProps) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-100 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Annuler la mission</h3>
            <p className="text-sm text-text-light">Cette action est irréversible</p>
          </div>
        </div>

        <p className="text-text-light mb-4">
          Voulez-vous vraiment annuler cette mission ? Le client sera notifié et remboursé.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Raison de l&apos;annulation
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Expliquez pourquoi vous annulez cette mission..."
            className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground resize-none"
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <motion.button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-foreground rounded-xl font-semibold"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={isLoading}
          >
            Retour
          </motion.button>
          <motion.button
            onClick={() => onConfirm(reason)}
            disabled={isLoading || !reason.trim()}
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            whileHover={{ scale: isLoading ? 1 : 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Annulation...
              </>
            ) : (
              "Confirmer l'annulation"
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
