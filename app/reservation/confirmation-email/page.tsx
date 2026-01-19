"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";

function ConfirmationEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-lg bg-white rounded-3xl shadow-xl p-8"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <Mail className="w-10 h-10 text-primary" />
        </motion.div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Vérifiez votre email
        </h1>

        {/* Description */}
        <p className="text-text-light mb-6">
          Pour finaliser votre réservation, veuillez confirmer votre adresse email.
          Nous avons envoyé un lien de vérification à :
        </p>

        {/* Email display */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <p className="font-semibold text-foreground break-all">{email}</p>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-blue-800">
            <strong>Important :</strong> Votre réservation sera envoyée à l&apos;annonceur
            uniquement après la vérification de votre email. Pensez à vérifier vos
            spams si vous ne trouvez pas l&apos;email.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors"
          >
            Accéder à mon espace
            <ArrowRight className="w-5 h-5" />
          </Link>

          <p className="text-sm text-text-light">
            Vous n&apos;avez pas reçu l&apos;email ?{" "}
            <Link
              href="/renvoyer-email"
              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Renvoyer
            </Link>
          </p>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-text-light">
            Le lien de vérification est valable pendant 24 heures.
            Votre compte a été créé et vous pouvez vous connecter dès maintenant.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function ConfirmationEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
          <div className="animate-pulse text-text-light">Chargement...</div>
        </div>
      }
    >
      <ConfirmationEmailContent />
    </Suspense>
  );
}
