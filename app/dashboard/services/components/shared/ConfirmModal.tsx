"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-foreground/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-xl",
                        variant === "danger" ? "bg-red-100" : "bg-amber-100"
                      )}
                    >
                      <AlertTriangle
                        className={cn(
                          "w-5 h-5",
                          variant === "danger" ? "text-red-500" : "text-amber-500"
                        )}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-text-light hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <p className="text-text-light">{message}</p>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-foreground/10 bg-foreground/[0.02] flex items-center justify-end gap-3">
                <motion.button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2.5 text-text-light hover:text-foreground font-medium rounded-xl transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {cancelLabel}
                </motion.button>
                <motion.button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={cn(
                    "px-5 py-2.5 text-white font-medium rounded-xl transition-colors",
                    variant === "danger"
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-amber-500 hover:bg-amber-600",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  {isLoading ? "Suppression..." : confirmLabel}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
