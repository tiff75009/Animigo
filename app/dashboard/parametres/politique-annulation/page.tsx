"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Ban, Save, Loader2, Check, Info } from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function PolitiqueAnnulationPage() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const [commissionPercent, setCommissionPercent] = useState(0);
  const [refundMode, setRefundMode] = useState<"per_session" | "percentage_remaining">("per_session");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const policy = useQuery(
    api.planning.cancellation.getAnnouncerCancellationPolicy,
    token ? { token } : "skip"
  );

  const updatePolicy = useMutation(
    api.planning.cancellation.updateAnnouncerCancellationPolicy
  );

  useEffect(() => {
    if (policy) {
      setCommissionPercent(policy.defaultCommissionPercent);
      setRefundMode(policy.refundMode as "per_session" | "percentage_remaining" || "per_session");
    }
  }, [policy]);

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await updatePolicy({
        token,
        defaultCommissionPercent: commissionPercent,
        refundMode,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Exemple de calcul multi-séance : 5 séances à 100€ (50000 cts), 3 effectuées
  const exTotalSessions = 5;
  const exPastSessions = 3;
  const exRemainingSessions = exTotalSessions - exPastSessions;
  const exTotalAmount = 50000; // 500€
  const exAmountPerSession = Math.round(exTotalAmount / exTotalSessions); // 10000 = 100€
  const exRemainingAmount = exAmountPerSession * exRemainingSessions; // 20000 = 200€

  const exRetained = refundMode === "percentage_remaining"
    ? Math.round(exRemainingAmount * (commissionPercent / 100))
    : 0;
  const exRefund = exRemainingAmount - exRetained;

  const formatPrice = (cents: number) => {
    const euros = Math.round(cents) / 100;
    return euros.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    });
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/parametres"
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Politique d&apos;annulation</h1>
          <p className="text-sm text-gray-500">
            Configurez votre politique en cas d&apos;annulation client
          </p>
        </div>
      </div>

      {/* Explication */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6"
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800 space-y-2">
            <p className="font-medium">Comment ça fonctionne ?</p>
            <p>
              Quand un client annule une réservation multi-séance ou collective en cours,
              vous pouvez choisir le pourcentage de vos gains à conserver.
            </p>
            <p>
              Pour les annulations de missions à venir, les conditions sont définies
              par la plateforme selon le délai avant le début et le nombre d&apos;annulations
              du client.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Sélecteur mode de remboursement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-50 rounded-xl">
            <Ban className="w-5 h-5 text-red-500" />
          </div>
          <p className="font-medium text-gray-900">Mode de remboursement</p>
        </div>

        <div className="space-y-3">
          <label
            className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${refundMode === "per_session" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
          >
            <input
              type="radio"
              name="refundMode"
              value="per_session"
              checked={refundMode === "per_session"}
              onChange={() => setRefundMode("per_session")}
              className="mt-0.5 accent-primary"
            />
            <div>
              <p className="font-medium text-gray-900">Remboursement par séance</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Les séances restantes sont intégralement remboursées au client (moins la commission plateforme).
              </p>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${refundMode === "percentage_remaining" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
          >
            <input
              type="radio"
              name="refundMode"
              value="percentage_remaining"
              checked={refundMode === "percentage_remaining"}
              onChange={() => setRefundMode("percentage_remaining")}
              className="mt-0.5 accent-primary"
            />
            <div>
              <p className="font-medium text-gray-900">Commission sur les séances restantes</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Vous conservez un pourcentage du montant des séances restantes.
              </p>
            </div>
          </label>
        </div>
      </motion.div>

      {/* Slider commission (uniquement en mode percentage_remaining) */}
      {refundMode === "percentage_remaining" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <label className="font-medium text-gray-900">
              Part conservée en cas d&apos;annulation
            </label>
            <span className="text-2xl font-bold text-primary">{commissionPercent}%</span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(Number(e.target.value))}
            className="w-full accent-primary h-2"
          />

          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>0% (rien conservé)</span>
            <span>100% (tout conservé)</span>
          </div>
        </motion.div>
      )}

      {/* Exemple de calcul */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6"
      >
        <p className="font-medium text-gray-900 mb-3">
          Exemple : {exTotalSessions} séances a {formatPrice(exAmountPerSession)}, {exPastSessions} effectuées
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Séances passées (non remboursables)</span>
            <span className="font-medium text-gray-500">{exPastSessions} x {formatPrice(exAmountPerSession)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Séances restantes</span>
            <span className="font-medium text-gray-900">{exRemainingSessions} x {formatPrice(exAmountPerSession)} = {formatPrice(exRemainingAmount)}</span>
          </div>

          {refundMode === "percentage_remaining" && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Montant conservé par vous ({commissionPercent}%)</span>
              <span className="font-medium text-green-600">{formatPrice(exRetained)}</span>
            </div>
          )}

          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-900">Remboursé au client</span>
              <span className="font-bold text-gray-900">{formatPrice(exRefund)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Save button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 bg-primary text-white rounded-2xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saveSuccess ? (
            <Check className="w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSaving ? "Sauvegarde..." : saveSuccess ? "Enregistré !" : "Enregistrer"}
        </button>
      </motion.div>
    </div>
  );
}
