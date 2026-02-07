"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Mail, Loader2, RefreshCw, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";

function ConfirmerEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";
  const accountType = searchParams.get("type") || "";

  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const resendVerification = useAction(api.api.email.resendVerificationEmail);

  // Countdown pour le bouton renvoyer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (!email || countdown > 0) return;
    setIsResending(true);
    try {
      await resendVerification({ email });
      setResent(true);
      setCountdown(60);
      setTimeout(() => setResent(false), 3000);
    } catch {
      // Silently fail
    } finally {
      setIsResending(false);
    }
  };

  const dashboardUrl = accountType === "utilisateur" ? "/client" : "/dashboard";

  // Masquer partiellement l'email
  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + b.replace(/./g, "*") + c)
    : "";

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-10 h-10 text-white" />
              </div>
            </motion.div>
            <h1 className="text-2xl font-bold text-white">
              Vérifiez votre email
            </h1>
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            <p className="text-gray-600 mb-2">
              Un email de vérification a été envoyé à
            </p>
            <p className="font-semibold text-gray-900 text-lg mb-6">
              {maskedEmail || "votre adresse email"}
            </p>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
              <p className="text-sm text-amber-800">
                Cliquez sur le lien dans l&apos;email pour activer votre compte.
                Le lien expire dans <strong>24 heures</strong>.
              </p>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Pensez à vérifier vos spams si vous ne trouvez pas l&apos;email.
            </p>

            {/* Resend button */}
            <button
              onClick={handleResend}
              disabled={isResending || countdown > 0}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50 mb-4"
            >
              {isResending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : resent ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {resent
                ? "Email renvoyé !"
                : countdown > 0
                  ? `Renvoyer dans ${countdown}s`
                  : "Renvoyer l'email de vérification"}
            </button>

            {/* Continue anyway */}
            <Link
              href={dashboardUrl}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors"
            >
              Continuer vers mon espace
              <ArrowRight className="w-4 h-4" />
            </Link>

            <p className="text-xs text-gray-400 mt-4">
              Vous pourrez aussi vérifier votre email plus tard depuis vos paramètres.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ConfirmerEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <ConfirmerEmailContent />
    </Suspense>
  );
}
