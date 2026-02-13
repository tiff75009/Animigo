"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CreditCard,
  MessageCircle,
  Loader2,
  Ban,
} from "lucide-react";

interface ActionButtonsProps {
  mission: any;
  isPaid: boolean;
  canCancel: boolean;
  isContacting: boolean;
  onContact: () => void;
  onOpenCancel: () => void;
}

export function ActionButtons({
  mission,
  isPaid,
  canCancel,
  isContacting,
  onContact,
  onOpenCancel,
}: ActionButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="flex gap-3"
    >
      <Link
        href="/client/reservations"
        className="flex-1 py-3.5 text-center bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
      >
        Retour
      </Link>
      {mission.status === "pending_confirmation" && (
        <Link
          href={`/client/paiement/${mission.id}`}
          className="flex-1 py-3.5 text-center bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <CreditCard className="w-5 h-5" />
          Payer
        </Link>
      )}
      {isPaid && (
        <button
          onClick={onContact}
          disabled={isContacting}
          className="flex-1 py-3.5 text-center bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isContacting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <MessageCircle className="w-5 h-5" />
              Contacter
            </>
          )}
        </button>
      )}
      {canCancel && (
        <button
          onClick={onOpenCancel}
          className="flex-1 py-3.5 text-center border-2 border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <Ban className="w-5 h-5" />
          Annuler
        </button>
      )}
    </motion.div>
  );
}
