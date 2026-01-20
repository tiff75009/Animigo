"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { XCircle, RefreshCw, Home, MessageCircle } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

function PaymentCancelledContent() {
  const searchParams = useSearchParams();
  const missionId = searchParams.get("mission") as Id<"missions"> | null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <XCircle className="w-12 h-12 text-orange-500" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-gray-900 mb-3"
      >
        Paiement annulé
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-gray-600 mb-6"
      >
        Vous avez annulé le processus de paiement. Votre réservation n'a pas
        été confirmée et aucun montant n'a été prélevé.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-amber-50 rounded-xl p-4 mb-6"
      >
        <p className="text-sm text-amber-700">
          <strong>Que faire maintenant ?</strong>
          <br />
          Le lien de paiement reste valide pendant 1 heure. Vous pouvez
          réessayer en cliquant sur le lien dans l'email que vous avez reçu.
          Passé ce délai, vous devrez contacter le prestataire pour une
          nouvelle demande.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col gap-3"
      >
        <Link
          href="/recherche"
          className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Trouver un autre prestataire
        </Link>
        <Link
          href="/messagerie"
          className="flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Contacter le support
        </Link>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 font-medium py-2"
        >
          <Home className="w-4 h-4" />
          Retour à l'accueil
        </Link>
      </motion.div>
    </motion.div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-500 border-t-transparent mx-auto" />
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}

export default function PaymentCancelledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <Suspense fallback={<LoadingFallback />}>
        <PaymentCancelledContent />
      </Suspense>
    </div>
  );
}
