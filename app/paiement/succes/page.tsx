"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle, Calendar, ArrowRight, Home } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const missionId = searchParams.get("mission") as Id<"missions"> | null;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
    >
      {isLoading ? (
        <div className="py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-gray-600">Confirmation en cours...</p>
        </div>
      ) : (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-12 h-12 text-emerald-500" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-gray-900 mb-3"
          >
            Paiement confirmé !
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 mb-6"
          >
            Votre réservation est maintenant confirmée. Les fonds ont été
            pré-autorisés et seront débités à la fin de la prestation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-emerald-50 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center justify-center gap-2 text-emerald-700">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Prochaines étapes</span>
            </div>
            <ul className="mt-3 text-sm text-emerald-600 space-y-2 text-left">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>
                  Le prestataire va prendre contact avec vous pour confirmer
                  les détails
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>
                  À la fin de la prestation, confirmez que tout s'est bien
                  passé
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>
                  Le paiement sera alors finalisé automatiquement
                </span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-blue-50 rounded-xl p-4 mb-6"
          >
            <p className="text-sm text-blue-700">
              <strong>Bon à savoir :</strong> Vos fonds sont bloqués mais pas
              encore débités. Si vous ne confirmez pas la fin de prestation
              sous 48h après la date de fin, le paiement sera automatiquement
              finalisé.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col gap-3"
          >
            <Link
              href="/mes-reservations"
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Voir mes réservations
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 font-medium py-2"
            >
              <Home className="w-4 h-4" />
              Retour à l'accueil
            </Link>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mx-auto" />
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <Suspense fallback={<LoadingFallback />}>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}
