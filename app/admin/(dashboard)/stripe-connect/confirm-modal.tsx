"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  loading,
  icon: Icon,
  iconBg,
  iconColor,
  btnColor,
  title,
  confirmLabel = "Supprimer",
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  btnColor: string;
  title: string;
  confirmLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 ${iconBg} rounded-full flex items-center justify-center`}
              >
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>
            <div className="mb-6">{children}</div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium text-white ${btnColor} rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2`}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                {loading ? "..." : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
