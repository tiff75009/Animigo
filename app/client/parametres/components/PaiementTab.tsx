"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  AlertCircle,
  Check,
  Loader2,
  Shield,
  Star,
  Trash2,
  Plus,
} from "lucide-react";
import {
  loadStripe,
  Appearance,
} from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";

interface PaiementTabProps {
  token: string | null;
}

// Stripe promise (lazy loaded)
let stripePromiseSettings: ReturnType<typeof loadStripe> | null = null;
function getStripePromiseSettings(publicKey: string) {
  if (!stripePromiseSettings) {
    stripePromiseSettings = loadStripe(publicKey);
  }
  return stripePromiseSettings;
}

// Formulaire d'ajout de carte
function AddCardForm({ clientSecret, onSuccess, onCancel }: { clientSecret: string; onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Une erreur est survenue");
      setIsProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Erreur lors de l'enregistrement de la carte");
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
          ) : (
            <><CreditCard className="w-4 h-4" /> Enregistrer la carte</>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

// Icône de marque de carte
function CardBrandIcon({ brand }: { brand: string }) {
  const brands: Record<string, { label: string; color: string }> = {
    visa: { label: "VISA", color: "text-blue-600" },
    mastercard: { label: "MC", color: "text-orange-500" },
    amex: { label: "AMEX", color: "text-blue-500" },
    discover: { label: "DISC", color: "text-orange-600" },
  };
  const b = brands[brand.toLowerCase()] || { label: brand.toUpperCase(), color: "text-gray-500" };
  return (
    <div className={cn("w-12 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold", b.color)}>
      {b.label}
    </div>
  );
}

export function PaiementTab({ token }: PaiementTabProps) {
  const savedCards = useQuery(
    api.api.savedCards.getSavedCards,
    token ? { token } : "skip"
  );
  const setupIntentStatus = useQuery(
    api.api.savedCards.getSetupIntentStatus,
    token ? { token } : "skip"
  );
  const stripePublicKey = useQuery(api.api.stripeClient.getPublicKey);

  const initiateAddCard = useMutation(api.api.savedCards.initiateAddCard);
  const setDefaultCard = useMutation(api.api.savedCards.setDefaultCard);
  const deleteCard = useMutation(api.api.savedCards.deleteCard);
  const clearSetupIntent = useMutation(api.api.savedCards.clearSetupIntent);

  const [showAddForm, setShowAddForm] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const handleInitiateAdd = async () => {
    if (!token) return;
    setIsInitiating(true);
    try {
      await initiateAddCard({ token });
      setShowAddForm(true);
    } catch (err) {
      console.error("Erreur initiation ajout carte:", err);
    } finally {
      setIsInitiating(false);
    }
  };

  const handleAddSuccess = async () => {
    setShowAddForm(false);
    if (token) {
      await clearSetupIntent({ token });
    }
    setSuccessMsg("Carte enregistrée avec succès !");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleCancelAdd = async () => {
    setShowAddForm(false);
    if (token) {
      await clearSetupIntent({ token });
    }
  };

  const handleSetDefault = async (cardId: string) => {
    if (!token) return;
    try {
      await setDefaultCard({ token, cardId: cardId as any });
    } catch (err) {
      console.error("Erreur changement carte par défaut:", err);
    }
  };

  const handleDelete = async (cardId: string) => {
    if (!token) return;
    setDeletingId(cardId);
    try {
      await deleteCard({ token, cardId: cardId as any });
    } catch (err) {
      console.error("Erreur suppression carte:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const clientSecret = setupIntentStatus?.clientSecret;

  const appearance: Appearance = {
    theme: "stripe",
    variables: {
      colorPrimary: "#FF6B6B",
      colorBackground: "#ffffff",
      colorText: "#1e293b",
      fontFamily: '"Inter", system-ui, sans-serif',
      borderRadius: "12px",
    },
    rules: {
      ".Input": { border: "1px solid #e2e8f0", boxShadow: "none", padding: "12px 16px" },
      ".Input:focus": { border: "2px solid #FF6B6B", boxShadow: "0 0 0 4px rgba(255, 107, 107, 0.1)" },
    },
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Cartes bancaires</h2>
          <p className="text-sm text-gray-500 mt-1">Gérez vos moyens de paiement</p>
        </div>
        {!showAddForm && (
          <button
            onClick={handleInitiateAdd}
            disabled={isInitiating}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isInitiating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Ajouter une carte
          </button>
        )}
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm"
        >
          <Check className="w-4 h-4" /> {successMsg}
        </motion.div>
      )}

      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-gray-50 rounded-2xl p-6 border border-gray-200"
        >
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Nouvelle carte
          </h3>

          {clientSecret && stripePublicKey ? (
            <Elements
              stripe={getStripePromiseSettings(stripePublicKey)}
              options={{ clientSecret, appearance, locale: "fr" }}
            >
              <AddCardForm
                clientSecret={clientSecret}
                onSuccess={handleAddSuccess}
                onCancel={handleCancelAdd}
              />
            </Elements>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
              <span className="text-gray-500">Préparation du formulaire...</span>
            </div>
          )}
        </motion.div>
      )}

      {savedCards === undefined ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : savedCards.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium text-foreground mb-1">Aucune carte enregistrée</p>
          <p className="text-sm">Ajoutez une carte pour simplifier vos futurs paiements</p>
        </div>
      ) : (
        <div className="space-y-3">
          {savedCards.map((card: { id: string; brand: string; last4: string; expMonth: number; expYear: number; isDefault: boolean }) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-colors",
                card.isDefault ? "border-primary/30 bg-primary/5" : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-center gap-4">
                <CardBrandIcon brand={card.brand} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      •••• {card.last4}
                    </span>
                    {card.isDefault && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                        Par défaut
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Exp. {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!card.isDefault && (
                  <button
                    onClick={() => handleSetDefault(card.id)}
                    className="p-2 text-gray-400 hover:text-primary rounded-lg hover:bg-primary/5 transition-colors"
                    title="Définir par défaut"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(card.id)}
                  disabled={deletingId === card.id}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Supprimer"
                >
                  {deletingId === card.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
        <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">Paiement sécurisé</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Vos informations de carte sont chiffrées et stockées de manière sécurisée par Stripe. Nous ne conservons jamais votre numéro de carte complet.
          </p>
        </div>
      </div>
    </div>
  );
}
