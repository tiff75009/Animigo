"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  loadStripe,
  StripeElementsOptions,
  Appearance,
} from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { Stripe } from "@stripe/stripe-js";
import {
  CreditCard,
  Shield,
  Clock,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Lock,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Stripe promise (lazy loaded)
let stripePromise: Promise<any> | null = null;

function getStripePromise(publicKey: string) {
  if (!stripePromise) {
    stripePromise = loadStripe(publicKey);
  }
  return stripePromise;
}

// Checkout form component
function CheckoutForm({
  missionId,
  amount,
  token,
  paymentIntentId,
  onSuccess,
}: {
  missionId: string;
  amount: number;
  token: string;
  paymentIntentId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mutation pour confirmer le paiement côté Convex
  const confirmPaymentSuccess = useMutation(api.api.stripeClient.confirmPaymentSuccess);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Une erreur est survenue");
      setIsProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/client/paiement/${missionId}/succes`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Le paiement a échoué");
      setIsProcessing(false);
    } else if (paymentIntent && (paymentIntent.status === "requires_capture" || paymentIntent.status === "succeeded")) {
      // Pré-autorisation réussie - mettre à jour le statut côté Convex
      try {
        await confirmPaymentSuccess({
          token,
          missionId: missionId as Id<"missions">,
          paymentIntentId: paymentIntent.id,
          paymentStatus: paymentIntent.status,
        });
        console.log("Paiement confirmé côté Convex");
      } catch (err) {
        console.error("Erreur confirmation Convex:", err);
        // On continue quand même car le paiement Stripe a réussi
      }
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Informations de paiement
          </h3>
        </div>

        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      <motion.button
        type="submit"
        disabled={!stripe || isProcessing}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl font-semibold text-lg shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Traitement en cours...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            Payer {(amount / 100).toFixed(2)} €
          </>
        )}
      </motion.button>

      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <Shield className="w-4 h-4" />
        <span>Paiement sécurisé par Stripe</span>
      </div>
    </form>
  );
}

// Success view
function SuccessView() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <CheckCircle className="w-10 h-10 text-green-600" />
      </motion.div>
      <h2 className="text-2xl font-bold text-foreground mb-3">
        Paiement confirmé !
      </h2>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        Votre paiement a été pré-autorisé avec succès. Les fonds seront prélevés
        à la fin de la prestation.
      </p>
      <Link
        href="/client/reservations"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
      >
        Voir mes réservations
      </Link>
    </motion.div>
  );
}

// Main payment page
export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const missionId = params.missionId as string;
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  // Get Stripe public key
  const stripePublicKey = useQuery(api.api.stripeClient.getPublicKey);

  // Get payment info
  const paymentInfo = useQuery(
    api.api.stripeClient.getPaymentInfo,
    token && missionId
      ? { token, missionId: missionId as Id<"missions"> }
      : "skip"
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!token) {
      router.push("/connexion");
    }
  }, [token, router]);

  // Loading state
  if (!stripePublicKey || !paymentInfo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500">Chargement...</p>
        </motion.div>
      </div>
    );
  }

  // Payment already paid - redirect to success page
  if (paymentInfo.payment?.status === "authorized") {
    router.push(`/client/paiement/${missionId}/succes`);
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500">Redirection...</p>
        </motion.div>
      </div>
    );
  }

  // Payment not found
  if (!paymentInfo.payment) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Paiement non trouvé
          </h2>
          <p className="text-gray-500 mb-6">
            Ce lien de paiement n'est plus valide ou a expiré.
          </p>
          <Link
            href="/client/reservations"
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux réservations
          </Link>
        </motion.div>
      </div>
    );
  }

  // Payment is being prepared (clientSecret not yet available)
  if (!paymentInfo.payment.clientSecret) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Préparation du paiement...
          </h2>
          <p className="text-gray-500">
            Veuillez patienter quelques secondes
          </p>
        </motion.div>
      </div>
    );
  }

  // Check if payment expired
  if (paymentInfo.payment.expiresAt < Date.now()) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Lien de paiement expiré
          </h2>
          <p className="text-gray-500 mb-6">
            Ce lien de paiement a expiré. Veuillez contacter le support pour
            obtenir un nouveau lien.
          </p>
          <Link
            href="/client/reservations"
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux réservations
          </Link>
        </motion.div>
      </div>
    );
  }

  // Success view
  if (paymentSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <SuccessView />
      </div>
    );
  }

  // Stripe Elements appearance
  const appearance: Appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: "#FF6B6B",
      colorBackground: "#ffffff",
      colorText: "#1e293b",
      colorDanger: "#ef4444",
      fontFamily: '"Inter", system-ui, sans-serif',
      borderRadius: "12px",
      spacingUnit: "4px",
    },
    rules: {
      ".Input": {
        border: "1px solid #e2e8f0",
        boxShadow: "none",
        padding: "12px 16px",
      },
      ".Input:focus": {
        border: "2px solid #FF6B6B",
        boxShadow: "0 0 0 4px rgba(255, 107, 107, 0.1)",
      },
      ".Label": {
        fontWeight: "500",
        marginBottom: "8px",
      },
      ".Tab": {
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
      },
      ".Tab--selected": {
        border: "2px solid #FF6B6B",
        backgroundColor: "rgba(255, 107, 107, 0.05)",
      },
    },
  };

  const options: StripeElementsOptions = {
    clientSecret: paymentInfo.payment.clientSecret,
    appearance,
    locale: "fr",
  };

  // Format dates
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Link
          href="/client/reservations"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Finaliser votre réservation
        </h1>
        <p className="text-gray-500 mt-2">
          Confirmez votre paiement pour réserver votre prestation
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Payment form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3"
        >
          <Elements stripe={getStripePromise(stripePublicKey)} options={options}>
            <CheckoutForm
              missionId={missionId}
              amount={paymentInfo.payment.amount}
              token={token || ""}
              paymentIntentId={paymentInfo.payment.paymentIntentId || ""}
              onSuccess={() => setPaymentSuccess(true)}
            />
          </Elements>
        </motion.div>

        {/* Order summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-8">
            <h3 className="text-lg font-semibold text-foreground mb-6">
              Récapitulatif
            </h3>

            {/* Service info */}
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {paymentInfo.mission.serviceName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatDate(paymentInfo.mission.startDate)}
                    {paymentInfo.mission.startDate !==
                      paymentInfo.mission.endDate &&
                      ` - ${formatDate(paymentInfo.mission.endDate)}`}
                  </p>
                </div>
              </div>

              {paymentInfo.announcer && (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    {paymentInfo.announcer.profileImage ? (
                      <Image
                        src={paymentInfo.announcer.profileImage}
                        alt={paymentInfo.announcer.firstName}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {paymentInfo.announcer.firstName}{" "}
                      {paymentInfo.announcer.lastName}
                    </p>
                    <p className="text-sm text-gray-500">Pet-sitter</p>
                  </div>
                </div>
              )}

              {paymentInfo.animal && (
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <span className="text-2xl">
                    {getAnimalEmoji(paymentInfo.animal.type)}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">
                      {paymentInfo.animal.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {paymentInfo.animal.breed || paymentInfo.animal.type}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 my-6" />

            {/* Total */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-gray-600">Total à payer</span>
              <span className="text-2xl font-bold text-foreground">
                {(paymentInfo.payment.amount / 100).toFixed(2)} €
              </span>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Paiement sécurisé
                  </p>
                  <p className="text-xs text-blue-700">
                    Les fonds sont bloqués mais ne seront prélevés qu'à la fin
                    de la prestation. En cas d'annulation, vous serez
                    intégralement remboursé.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Helper function
function getAnimalEmoji(type: string): string {
  const emojis: Record<string, string> = {
    chien: "🐕",
    chat: "🐱",
    oiseau: "🐦",
    rongeur: "🐹",
    reptile: "🦎",
    poisson: "🐠",
    cheval: "🐴",
    nac: "🐾",
    autre: "🐾",
  };
  return emojis[type?.toLowerCase()] || "🐾";
}
