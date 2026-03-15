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
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getAuthToken } from "@/app/lib/authToken";
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
  Star,
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

// Checkout form component (nouvelle carte)
function CheckoutForm({
  missionId,
  amount,
  token,
  paymentIntentId,
  onSuccess,
  saveCard,
  onSaveCardChange,
}: {
  missionId: string;
  amount: number;
  token: string;
  paymentIntentId: string;
  onSuccess: () => void;
  saveCard: boolean;
  onSaveCardChange: (v: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [awaitingSaveReady, setAwaitingSaveReady] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth < 768 ||
          /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Mutations
  const confirmPaymentSuccess = useMutation(api.api.stripeClient.confirmPaymentSuccess);
  const preparePaymentForSave = useMutation(api.api.savedCards.preparePaymentForSave);
  const clearSetupIntent = useMutation(api.api.savedCards.clearSetupIntent);
  const triggerSaveCard = useMutation(api.api.savedCards.triggerSaveCardAfterPayment);

  // Query réactive : active uniquement quand on attend le flag SAVE_CARD_READY
  const setupStatus = useQuery(
    api.api.savedCards.getSetupIntentStatus,
    awaitingSaveReady && token ? { token } : "skip"
  );

  // Timeout : si le flag n'arrive pas en 15s, procéder sans sauvegarde
  useEffect(() => {
    if (!awaitingSaveReady) return;
    const timeout = setTimeout(() => {
      console.warn("Timeout atteint pour SAVE_CARD_READY, paiement sans sauvegarde carte");
      setAwaitingSaveReady(false);
      setSaveCardFailed(true);
    }, 15000);
    return () => clearTimeout(timeout);
  }, [awaitingSaveReady]);

  // State pour indiquer si la sauvegarde carte a échoué (on procède quand même au paiement)
  const [saveCardFailed, setSaveCardFailed] = useState(false);

  // Quand le timeout déclenche saveCardFailed, faire le paiement sans sauvegarde
  useEffect(() => {
    if (!saveCardFailed || !stripe || !elements) return;

    const proceedWithoutSave = async () => {
      try {
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
          try {
            await confirmPaymentSuccess({
              token,
              missionId: missionId as Id<"missions">,
              paymentIntentId: paymentIntent.id,
              paymentStatus: paymentIntent.status,
            });
          } catch (err) {
            console.error("Erreur confirmation Convex:", err);
          }
          onSuccess();
        }
      } catch (err) {
        console.error("Erreur paiement (sans sauvegarde):", err);
        setError("Une erreur est survenue lors du paiement");
        setIsProcessing(false);
      } finally {
        setSaveCardFailed(false);
      }
    };

    proceedWithoutSave();
  }, [saveCardFailed, stripe, elements]);

  // Quand le PI est prêt (flag SAVE_CARD_READY ou SAVE_CARD_ERROR), lancer le paiement Stripe
  useEffect(() => {
    if (!awaitingSaveReady || !stripe || !elements) return;
    if (!setupStatus?.clientSecret) return;

    // SAVE_CARD_ERROR → procéder sans sauvegarde
    if (setupStatus.clientSecret === "SAVE_CARD_ERROR") {
      console.warn("Erreur préparation sauvegarde carte, paiement sans sauvegarde");
      clearSetupIntent({ token }).catch(() => {});
      setAwaitingSaveReady(false);
      setSaveCardFailed(true);
      return;
    }

    if (setupStatus.clientSecret !== "SAVE_CARD_READY") return;

    const proceedWithPayment = async () => {
      try {
        // Nettoyer le flag en base
        await clearSetupIntent({ token });

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
          try {
            await confirmPaymentSuccess({
              token,
              missionId: missionId as Id<"missions">,
              paymentIntentId: paymentIntent.id,
              paymentStatus: paymentIntent.status,
            });
          } catch (err) {
            console.error("Erreur confirmation Convex:", err);
          }
          // Sauvegarder la carte directement (sans dépendre du webhook)
          try {
            await triggerSaveCard({ token, missionId: missionId as Id<"missions"> });
            console.log("Sauvegarde carte déclenchée après paiement");
          } catch (err) {
            console.error("Erreur déclenchement sauvegarde carte:", err);
          }
          onSuccess();
        }
      } catch (err) {
        console.error("Erreur paiement:", err);
        setError("Une erreur est survenue lors du paiement");
        setIsProcessing(false);
      } finally {
        setAwaitingSaveReady(false);
      }
    };

    proceedWithPayment();
  }, [awaitingSaveReady, setupStatus?.clientSecret, stripe, elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Valider le formulaire Stripe Elements en premier
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Une erreur est survenue");
      setIsProcessing(false);
      return;
    }

    // Si l'utilisateur veut sauvegarder la carte, préparer le PI d'abord
    if (saveCard) {
      try {
        await preparePaymentForSave({
          token,
          missionId: missionId as Id<"missions">,
        });
        // Activer le polling réactif — le useEffect ci-dessus lancera le paiement
        // dès que le backend aura fini de mettre à jour le PI
        setAwaitingSaveReady(true);
        return;
      } catch (err) {
        console.error("Erreur préparation sauvegarde carte:", err);
        // Continuer le paiement sans sauvegarde en cas d'erreur
      }
    }

    // Paiement direct (sans sauvegarde de carte)
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
      try {
        await confirmPaymentSuccess({
          token,
          missionId: missionId as Id<"missions">,
          paymentIntentId: paymentIntent.id,
          paymentStatus: paymentIntent.status,
        });
      } catch (err) {
        console.error("Erreur confirmation Convex:", err);
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
            wallets: {
              applePay: isMobile ? "auto" : "never",
              googlePay: isMobile ? "auto" : "never",
            },
          }}
        />

        {/* Checkbox enregistrer la carte */}
        <label className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 cursor-pointer">
          <input
            type="checkbox"
            checked={saveCard}
            onChange={(e) => onSaveCardChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-600">
            Enregistrer cette carte pour mes prochains paiements
          </span>
        </label>
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

// Sélecteur de cartes sauvegardées
function SavedCardSelector({
  cards,
  selectedCardId,
  onSelect,
  onUseNew,
}: {
  cards: { id: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault: boolean }[];
  selectedCardId: string | null;
  onSelect: (cardId: string) => void;
  onUseNew: () => void;
}) {
  const brandLabels: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Choisir un moyen de paiement
        </h3>
      </div>

      <div className="space-y-2">
        {cards.map((card) => (
          <label
            key={card.id}
            className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
              selectedCardId === card.id
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="saved-card"
              checked={selectedCardId === card.id}
              onChange={() => onSelect(card.id)}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-7 bg-gray-100 rounded flex items-center justify-center text-xs font-bold text-gray-600">
                {(brandLabels[card.brand.toLowerCase()] || card.brand).slice(0, 4).toUpperCase()}
              </div>
              <div>
                <span className="font-medium text-foreground">
                  •••• {card.last4}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  Exp. {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                </span>
              </div>
            </div>
            {card.isDefault && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium flex items-center gap-1">
                <Star className="w-3 h-3" /> Par défaut
              </span>
            )}
          </label>
        ))}

        {/* Option nouvelle carte */}
        <button
          onClick={onUseNew}
          className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors w-full text-left"
        >
          <div className="w-4 h-4" />
          <CreditCard className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Utiliser une nouvelle carte</span>
        </button>
      </div>
    </div>
  );
}

// Composant paiement par carte sauvegardée (wrappé dans Elements pour accès à useStripe)
function SavedCardPayment({
  cards,
  selectedCardId,
  onSelect,
  onUseNew,
  missionId,
  token,
  amount,
  clientSecret,
  paymentIntentId,
  onSuccess,
  onFallbackToNew,
}: {
  cards: { id: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault: boolean }[];
  selectedCardId: string | null;
  onSelect: (cardId: string) => void;
  onUseNew: () => void;
  missionId: string;
  token: string;
  amount: number;
  clientSecret: string;
  paymentIntentId: string;
  onSuccess: () => void;
  onFallbackToNew: (errorMsg: string) => void;
}) {
  const stripe = useStripe();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payWithSavedCard = useMutation(api.api.savedCards.payWithSavedCard);
  const confirmPaymentSuccess = useMutation(api.api.stripeClient.confirmPaymentSuccess);

  const handlePay = async () => {
    if (!token || !selectedCardId || !stripe) return;
    setIsProcessing(true);
    setError(null);

    try {
      const result = await payWithSavedCard({
        token,
        missionId: missionId as Id<"missions">,
        savedCardId: selectedCardId as Id<"savedPaymentMethods">,
      });

      if (result.status === "processing" && result.clientSecret) {
        // Polling du PaymentIntent via Stripe.js
        const maxAttempts = 10;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((r) => setTimeout(r, 2000));

          const { paymentIntent } = await stripe.retrievePaymentIntent(result.clientSecret);
          if (!paymentIntent) continue;

          if (paymentIntent.status === "succeeded" || paymentIntent.status === "requires_capture") {
            // Confirmer côté Convex
            try {
              await confirmPaymentSuccess({
                token,
                missionId: missionId as Id<"missions">,
                paymentIntentId: paymentIntent.id,
                paymentStatus: paymentIntent.status,
              });
            } catch (err) {
              console.error("Erreur confirmation Convex:", err);
            }
            onSuccess();
            return;
          }

          if (paymentIntent.status === "requires_action") {
            // Gérer 3D Secure
            const { error: actionError } = await stripe.handleNextAction({
              clientSecret: result.clientSecret,
            });

            if (actionError) {
              // 3DS échoué → fallback vers nouvelle carte
              const selectedCard = cards.find((c) => c.id === selectedCardId);
              const last4 = selectedCard?.last4 || "****";
              onFallbackToNew(
                `L'authentification 3D Secure a échoué pour votre carte •••• ${last4}. Veuillez utiliser une autre carte.`
              );
              return;
            }

            // 3DS réussi → re-vérifier le statut
            const { paymentIntent: piAfter3ds } = await stripe.retrievePaymentIntent(result.clientSecret);
            if (piAfter3ds && (piAfter3ds.status === "succeeded" || piAfter3ds.status === "requires_capture")) {
              try {
                await confirmPaymentSuccess({
                  token,
                  missionId: missionId as Id<"missions">,
                  paymentIntentId: piAfter3ds.id,
                  paymentStatus: piAfter3ds.status,
                });
              } catch (err) {
                console.error("Erreur confirmation Convex après 3DS:", err);
              }
              onSuccess();
              return;
            }

            if (piAfter3ds && ["requires_payment_method", "canceled"].includes(piAfter3ds.status)) {
              const selectedCard = cards.find((c) => c.id === selectedCardId);
              const last4 = selectedCard?.last4 || "****";
              onFallbackToNew(
                `Le paiement avec votre carte •••• ${last4} a été refusé. Veuillez utiliser une autre carte.`
              );
              return;
            }
            // Sinon continuer le polling
            continue;
          }

          if (["requires_payment_method", "canceled"].includes(paymentIntent.status)) {
            // Paiement refusé → fallback
            const selectedCard = cards.find((c) => c.id === selectedCardId);
            const last4 = selectedCard?.last4 || "****";
            onFallbackToNew(
              `Le paiement avec votre carte •••• ${last4} a été refusé. Veuillez utiliser une autre carte.`
            );
            return;
          }
        }

        // Timeout polling → fallback
        onFallbackToNew(
          "Le paiement n'a pas pu être confirmé dans le temps imparti. Veuillez réessayer avec une autre carte."
        );
      }
    } catch (err) {
      console.error("Erreur paiement carte sauvegardée:", err);
      const errorMsg = err instanceof Error ? err.message : "Erreur lors du paiement";
      setError(errorMsg);
      setIsProcessing(false);
    }
  };

  return (
    <>
      <SavedCardSelector
        cards={cards}
        selectedCardId={selectedCardId}
        onSelect={onSelect}
        onUseNew={onUseNew}
      />

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
        onClick={handlePay}
        disabled={!selectedCardId || isProcessing || !stripe}
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
    </>
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
  const [paymentMode, setPaymentMode] = useState<"saved" | "new">("saved");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  const [savedCardError, setSavedCardError] = useState<string | null>(null);

  const token = getAuthToken();

  // Get Stripe public key
  const stripePublicKey = useQuery(api.api.stripeClient.getPublicKey);

  // Get payment info
  const paymentInfo = useQuery(
    api.api.stripeClient.getPaymentInfo,
    token && missionId
      ? { token, missionId: missionId as Id<"missions"> }
      : "skip"
  );

  // Get saved cards
  const savedCards = useQuery(
    api.api.savedCards.getSavedCards,
    token ? { token } : "skip"
  );

  // Auto-select default card
  useEffect(() => {
    if (savedCards && savedCards.length > 0 && !selectedCardId) {
      const defaultCard = savedCards.find((c: { isDefault: boolean }) => c.isDefault);
      setSelectedCardId(defaultCard?.id || savedCards[0].id);
      setPaymentMode("saved");
    } else if (savedCards && savedCards.length === 0) {
      setPaymentMode("new");
    }
  }, [savedCards, selectedCardId]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!token) {
      router.push("/connexion");
    }
  }, [token, router]);

  // Redirect if payment already paid
  useEffect(() => {
    if (paymentInfo?.payment?.status === "authorized") {
      router.push(`/client/paiement/${missionId}/succes`);
    }
  }, [paymentInfo, missionId, router]);

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

  // Payment already paid - show loading while redirecting
  if (paymentInfo.payment?.status === "authorized") {
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
          className="lg:col-span-3 space-y-6"
        >
          {/* Sélecteur de cartes sauvegardées */}
          {savedCards && savedCards.length > 0 && paymentMode === "saved" && (
            <Elements stripe={getStripePromise(stripePublicKey)} options={options}>
              <SavedCardPayment
                cards={savedCards}
                selectedCardId={selectedCardId}
                onSelect={(id) => {
                  setSelectedCardId(id);
                  setPaymentMode("saved");
                }}
                onUseNew={() => setPaymentMode("new")}
                missionId={missionId}
                token={token || ""}
                amount={paymentInfo.payment.amount}
                clientSecret={paymentInfo.payment.clientSecret}
                paymentIntentId={paymentInfo.payment.paymentIntentId || ""}
                onSuccess={() => setPaymentSuccess(true)}
                onFallbackToNew={(errorMsg) => {
                  setSavedCardError(errorMsg);
                  setPaymentMode("new");
                  setSaveCard(true);
                }}
              />
            </Elements>
          )}

          {/* Formulaire nouvelle carte */}
          {(paymentMode === "new" || !savedCards || savedCards.length === 0) && (
            <>
              {savedCardError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{savedCardError}</p>
                    <p className="text-xs text-amber-600 mt-1">
                      Veuillez utiliser une autre carte ci-dessous.
                    </p>
                  </div>
                </motion.div>
              )}
              {savedCards && savedCards.length > 0 && (
                <button
                  onClick={() => {
                    setPaymentMode("saved");
                    setSavedCardError(null);
                  }}
                  className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Utiliser une carte enregistrée
                </button>
              )}
              <Elements stripe={getStripePromise(stripePublicKey)} options={options}>
                <CheckoutForm
                  missionId={missionId}
                  amount={paymentInfo.payment.amount}
                  token={token || ""}
                  paymentIntentId={paymentInfo.payment.paymentIntentId || ""}
                  onSuccess={() => setPaymentSuccess(true)}
                  saveCard={saveCard}
                  onSaveCardChange={setSaveCard}
                />
              </Elements>
            </>
          )}
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

            {/* Détail des prix */}
            <div className="space-y-3 mb-6">
              {/* Prix du service : HT + TVA si applicable */}
              {paymentInfo.mission.announcerEarnings != null && (
                <>
                  {paymentInfo.mission.vatRate != null && paymentInfo.mission.vatRate > 0 ? (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Prestation HT</span>
                        <span className="text-foreground">
                          {(
                            (paymentInfo.mission.announcerEarnings * 100) /
                            (100 + paymentInfo.mission.vatRate) /
                            100
                          ).toFixed(2)}{" "}
                          €
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-1.5">
                          TVA ({paymentInfo.mission.vatRate}%)
                          {paymentInfo.mission.isSapApplied && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
                              SAP
                            </span>
                          )}
                        </span>
                        <span className="text-foreground">
                          {(
                            (paymentInfo.mission.announcerEarnings *
                              paymentInfo.mission.vatRate) /
                            (100 + paymentInfo.mission.vatRate) /
                            100
                          ).toFixed(2)}{" "}
                          €
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Prix du service</span>
                      <span className="text-foreground">
                        {(paymentInfo.mission.announcerEarnings / 100).toFixed(2)} €
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Commission plateforme */}
              {paymentInfo.mission.platformFee != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Commission{" "}
                    {paymentInfo.mission.commissionRate != null && (
                      <span className="text-gray-400">
                        ({paymentInfo.mission.commissionRate}%)
                      </span>
                    )}
                  </span>
                  <span className="text-foreground">
                    {(paymentInfo.mission.platformFee / 100).toFixed(2)} €
                  </span>
                </div>
              )}

              {/* Frais de paiement */}
              {paymentInfo.mission.stripeFee != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    Frais de paiement{" "}
                    {paymentInfo.mission.stripeFeeRate != null && (
                      <span className="text-gray-400">
                        ({paymentInfo.mission.stripeFeeRate}%)
                      </span>
                    )}
                  </span>
                  <span className="text-foreground">
                    {(paymentInfo.mission.stripeFee / 100).toFixed(2)} €
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">
                    {(paymentInfo.payment.amount / 100).toFixed(2)} €
                  </span>
                </div>
              </div>
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
