"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import {
  Loader2,
  Check,
  Save,
  Timer,
  CreditCard,
  Banknote,
  Calendar,
  Zap,
  Info,
  Ban,
} from "lucide-react";

// Helper pour formater les heures en jours/heures
const formatHoursDisplay = (hours: number): string => {
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days}j`;
    return `${days}j ${remainingHours}h`;
  }
  return `${hours}h`;
};

export default function PaiementsPage() {
  const { token } = useAdminAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // États pour les délais d'acceptation
  const [deadlineEnabled, setDeadlineEnabled] = useState(true);
  const [intervalShortDays, setIntervalShortDays] = useState(7);
  const [intervalLongDays, setIntervalLongDays] = useState(30);
  const [deadlineShortHours, setDeadlineShortHours] = useState(12);
  const [deadlineMediumHours, setDeadlineMediumHours] = useState(36);
  const [deadlineLongHours, setDeadlineLongHours] = useState(168);
  const [minimumBookingAdvanceHours, setMinimumBookingAdvanceHours] = useState(24);

  // États pour les délais de paiement
  const [paymentDeadlineEnabled, setPaymentDeadlineEnabled] = useState(true);
  const [paymentDeadlineHours, setPaymentDeadlineHours] = useState(48);

  // États pour les versements annonceurs
  const [payoutScheduledDay, setPayoutScheduledDay] = useState(25);
  const [stripeFeeRate, setStripeFeeRate] = useState(3); // lecture seule ici, modifié dans /admin/commissions
  const [missionConfirmationHours, setMissionConfirmationHours] = useState(48);
  const [scheduledModeEnabled, setScheduledModeEnabled] = useState(true);
  const [instantModeEnabled, setInstantModeEnabled] = useState(true);

  // États pour la politique d'annulation (refonte 2026 : seuils unifiés + 3ème/4ème distincts)
  const [cancellationThresholdHours, setCancellationThresholdHours] = useState(36);
  const [cancellation3rdAnnouncerPercent, setCancellation3rdAnnouncerPercent] = useState(50);
  const [cancellation4thAnnouncerPercent, setCancellation4thAnnouncerPercent] = useState(100);
  const [cancellationCounterPeriodMonths, setCancellationCounterPeriodMonths] = useState(12);

  // Queries
  const deadlineSettings = useQuery(
    api.admin.config.getAcceptanceDeadlineSettings,
    token ? { token } : "skip"
  );
  const paymentDeadlineSettings = useQuery(
    api.admin.config.getPaymentDeadlineSettings,
    token ? { token } : "skip"
  );
  const payoutSettings = useQuery(
    api.admin.config.getPayoutSettings,
    token ? { token } : "skip"
  );
  const cancellationSettings = useQuery(
    api.admin.config.getCancellationSettings,
    token ? { token } : "skip"
  );

  // Mutations
  const updateDeadlineSettings = useMutation(api.admin.config.updateAcceptanceDeadlineSettings);
  const updatePaymentDeadlineSettings = useMutation(api.admin.config.updatePaymentDeadlineSettings);
  const updatePayoutSettings = useMutation(api.admin.config.updatePayoutSettings);
  const updateCancellationSettings = useMutation(api.admin.config.updateCancellationSettings);

  // Charger les paramètres de délais d'acceptation
  useEffect(() => {
    if (deadlineSettings) {
      setDeadlineEnabled(deadlineSettings.enabled);
      setIntervalShortDays(deadlineSettings.intervalShortDays);
      setIntervalLongDays(deadlineSettings.intervalLongDays);
      setDeadlineShortHours(deadlineSettings.deadlineShortHours);
      setDeadlineMediumHours(deadlineSettings.deadlineMediumHours);
      setDeadlineLongHours(deadlineSettings.deadlineLongHours);
      setMinimumBookingAdvanceHours(deadlineSettings.minimumBookingAdvanceHours);
    }
  }, [deadlineSettings]);

  // Charger les paramètres de délais de paiement
  useEffect(() => {
    if (paymentDeadlineSettings) {
      setPaymentDeadlineEnabled(paymentDeadlineSettings.enabled);
      setPaymentDeadlineHours(paymentDeadlineSettings.hours);
    }
  }, [paymentDeadlineSettings]);

  // Charger les paramètres de versements annonceurs
  useEffect(() => {
    if (payoutSettings) {
      setPayoutScheduledDay(payoutSettings.scheduledDay);
      setStripeFeeRate(payoutSettings.stripeFeeRate ?? 3);
      setMissionConfirmationHours(payoutSettings.confirmationHours);
      setScheduledModeEnabled(payoutSettings.scheduledModeEnabled ?? true);
      setInstantModeEnabled(payoutSettings.instantModeEnabled ?? true);
    }
  }, [payoutSettings]);

  // Charger les paramètres d'annulation
  useEffect(() => {
    if (cancellationSettings) {
      setCancellationThresholdHours(cancellationSettings.thresholdHours);
      setCancellation3rdAnnouncerPercent(cancellationSettings.thirdCancellationAnnouncerPercent);
      setCancellation4thAnnouncerPercent(cancellationSettings.fourthCancellationAnnouncerPercent);
      setCancellationCounterPeriodMonths(cancellationSettings.counterPeriodMonths);
    }
  }, [cancellationSettings]);

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveAll = async () => {
    if (!token) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await updateDeadlineSettings({
        token,
        enabled: deadlineEnabled,
        intervalShortDays,
        intervalLongDays,
        deadlineShortHours,
        deadlineMediumHours,
        deadlineLongHours,
        minimumBookingAdvanceHours,
      });

      await updatePaymentDeadlineSettings({
        token,
        enabled: paymentDeadlineEnabled,
        hours: paymentDeadlineHours,
      });

      await updatePayoutSettings({
        token,
        scheduledDay: payoutScheduledDay,
        confirmationHours: missionConfirmationHours,
        scheduledModeEnabled,
        instantModeEnabled,
      });

      await updateCancellationSettings({
        token,
        thresholdHours: cancellationThresholdHours,
        thirdCancellationAnnouncerPercent: cancellation3rdAnnouncerPercent,
        fourthCancellationAnnouncerPercent: cancellation4thAnnouncerPercent,
        counterPeriodMonths: cancellationCounterPeriodMonths,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      // Extraire le message ConvexError si disponible (sinon fallback générique)
      const msg =
        error?.data?.message ||
        (typeof error?.data === "string" ? error.data : null) ||
        error?.message ||
        "Erreur inconnue lors de la sauvegarde";
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-primary" />
          Paiements & Délais
        </h1>
        <p className="text-slate-400 mt-1">
          Configurez les délais d&apos;acceptation, de paiement, les versements annonceurs et la politique d&apos;annulation
        </p>
      </div>

      <div className="space-y-8">
        {/* Délai de réponse annonceur */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Timer className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Délai de réponse annonceur</h2>
          </div>
          <p className="text-sm text-slate-400 mb-6">
            Quand un client réserve un service, l&apos;annonceur reçoit une notification (email + push).
            Il dispose d&apos;un délai limité pour accepter ou refuser. Passé ce délai, la réservation est <span className="text-red-400 font-medium">automatiquement refusée</span> et le client est prévenu.
          </p>

          <div className="space-y-6">
            {/* Toggle principal */}
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
              <div className="flex-1">
                <p className="text-slate-200 font-medium">Activer l&apos;auto-refus</p>
                <p className="text-sm text-slate-400 mt-1">
                  Si désactivé, les annonceurs ont un temps illimité pour répondre.
                </p>
              </div>
              <button
                onClick={() => setDeadlineEnabled(!deadlineEnabled)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  deadlineEnabled ? "bg-cyan-500" : "bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform flex items-center justify-center ${
                    deadlineEnabled ? "left-7" : "left-1"
                  }`}
                >
                  {deadlineEnabled && <Check className="w-4 h-4 text-cyan-500" />}
                </span>
              </button>
            </div>

            {deadlineEnabled && (
              <>
                {/* Minimum réservation à l'avance (côté client) */}
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Réservation minimum à l&apos;avance
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Le client ne peut pas réserver si la mission commence dans moins de ce délai.
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={12}
                      max={72}
                      step={1}
                      value={minimumBookingAdvanceHours}
                      onChange={(e) => setMinimumBookingAdvanceHours(Number(e.target.value))}
                      className="flex-1 accent-cyan-500"
                    />
                    <div className="w-20 px-3 py-2 bg-slate-700 rounded-lg text-center font-semibold text-cyan-400">
                      {formatHoursDisplay(minimumBookingAdvanceHours)}
                    </div>
                  </div>
                </div>

                {/* 3 niveaux unifiés : chaque bloc = plage de dates + délai + slider seuil */}
                <div className="space-y-4">
                  {/* Niveau 1 : Mission urgente */}
                  <div className="p-5 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      <h3 className="text-sm font-semibold text-green-300">Mission urgente</h3>
                      <span className="ml-auto text-[11px] text-green-400/70">
                        0 → {intervalShortDays - 1}j
                      </span>
                    </div>
                    <p className="text-xs text-green-400/60 mb-4">
                      La mission commence bientôt, l&apos;annonceur doit répondre rapidement.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">
                          S&apos;applique si la mission commence dans moins de...
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={1}
                            max={Math.max(1, intervalLongDays - 1)}
                            value={intervalShortDays}
                            onChange={(e) => setIntervalShortDays(Number(e.target.value))}
                            className="flex-1 accent-green-500"
                          />
                          <div className="w-16 px-3 py-2 bg-green-500/20 rounded-lg text-center font-semibold text-green-400">
                            {intervalShortDays}j
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">
                          L&apos;annonceur a ce délai pour accepter ou refuser
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={1}
                            max={48}
                            value={deadlineShortHours}
                            onChange={(e) => setDeadlineShortHours(Number(e.target.value))}
                            className="flex-1 accent-green-500"
                          />
                          <div className="w-16 px-3 py-2 bg-green-500/20 rounded-lg text-center font-semibold text-green-400">
                            {formatHoursDisplay(deadlineShortHours)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Niveau 2 : Mission normale (plage déduite : entre urgente et lointaine) */}
                  <div className="p-5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                      <h3 className="text-sm font-semibold text-orange-300">Mission normale</h3>
                      <span className="ml-auto text-[11px] text-orange-400/70">
                        {intervalShortDays} → {intervalLongDays}j
                      </span>
                    </div>
                    <p className="text-xs text-orange-400/60 mb-4">
                      Plage automatique entre &quot;urgente&quot; et &quot;lointaine&quot; — délai de réponse standard.
                    </p>
                    <div>
                      <label className="block text-xs text-slate-400 mb-2">
                        L&apos;annonceur a ce délai pour accepter ou refuser
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={12}
                          max={96}
                          value={deadlineMediumHours}
                          onChange={(e) => setDeadlineMediumHours(Number(e.target.value))}
                          className="flex-1 accent-orange-500"
                        />
                        <div className="w-16 px-3 py-2 bg-orange-500/20 rounded-lg text-center font-semibold text-orange-400">
                          {formatHoursDisplay(deadlineMediumHours)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Niveau 3 : Mission lointaine */}
                  <div className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                      <h3 className="text-sm font-semibold text-blue-300">Mission lointaine</h3>
                      <span className="ml-auto text-[11px] text-blue-400/70">
                        {intervalLongDays + 1}j et +
                      </span>
                    </div>
                    <p className="text-xs text-blue-400/60 mb-4">
                      La mission est loin, l&apos;annonceur a plus de temps pour répondre.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">
                          S&apos;applique si la mission commence dans plus de...
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={Math.max(intervalShortDays + 1, 2)}
                            max={90}
                            value={intervalLongDays}
                            onChange={(e) => setIntervalLongDays(Number(e.target.value))}
                            className="flex-1 accent-blue-500"
                          />
                          <div className="w-16 px-3 py-2 bg-blue-500/20 rounded-lg text-center font-semibold text-blue-400">
                            {intervalLongDays}j
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">
                          L&apos;annonceur a ce délai pour accepter ou refuser
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={24}
                            max={336}
                            step={12}
                            value={deadlineLongHours}
                            onChange={(e) => setDeadlineLongHours(Number(e.target.value))}
                            className="flex-1 accent-blue-500"
                          />
                          <div className="w-16 px-3 py-2 bg-blue-500/20 rounded-lg text-center font-semibold text-blue-400">
                            {formatHoursDisplay(deadlineLongHours)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exemple concret */}
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-cyan-400" />
                    <span className="font-medium text-slate-200">Exemple concret</span>
                  </div>
                  <div className="text-sm text-slate-300 space-y-2">
                    <p>
                      Un client réserve une garde de chien qui commence <span className="text-green-400 font-medium">dans 3 jours</span> (mission urgente) →
                      l&apos;annonceur a <span className="text-green-400 font-medium">{formatHoursDisplay(deadlineShortHours)}</span> pour accepter.
                    </p>
                    <p>
                      Un client réserve un service qui commence <span className="text-orange-400 font-medium">dans 2 semaines</span> (mission normale) →
                      l&apos;annonceur a <span className="text-orange-400 font-medium">{formatHoursDisplay(deadlineMediumHours)}</span> pour accepter.
                    </p>
                    <p>
                      Un client réserve un service qui commence <span className="text-blue-400 font-medium">dans 2 mois</span> (mission lointaine) →
                      l&apos;annonceur a <span className="text-blue-400 font-medium">{formatHoursDisplay(deadlineLongHours)}</span> pour accepter.
                    </p>
                    <p className="text-red-400 text-xs mt-2">
                      Si l&apos;annonceur ne répond pas dans le délai, la réservation est automatiquement refusée.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <Timer className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-cyan-300">
                    L&apos;annonceur et le client voient un compteur à rebours dans leur dashboard. Le système vérifie automatiquement toutes les 15 minutes si le délai est dépassé.
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Délais de paiement */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <CreditCard className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Délais de paiement</h2>
          </div>

          <div className="space-y-6">
            {/* Toggle principal */}
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
              <div className="flex-1">
                <p className="text-slate-200 font-medium">Activer le délai de paiement</p>
                <p className="text-sm text-slate-400 mt-1">
                  Les clients auront un temps limité pour payer après acceptation.
                  Passé ce délai, la réservation sera automatiquement annulée.
                </p>
              </div>
              <button
                onClick={() => setPaymentDeadlineEnabled(!paymentDeadlineEnabled)}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  paymentDeadlineEnabled ? "bg-orange-500" : "bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform flex items-center justify-center ${
                    paymentDeadlineEnabled ? "left-7" : "left-1"
                  }`}
                >
                  {paymentDeadlineEnabled && <Check className="w-4 h-4 text-orange-500" />}
                </span>
              </button>
            </div>

            {paymentDeadlineEnabled && (
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Durée pour payer après acceptation
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={12}
                    max={96}
                    step={12}
                    value={paymentDeadlineHours}
                    onChange={(e) => setPaymentDeadlineHours(Number(e.target.value))}
                    className="flex-1 accent-orange-500"
                  />
                  <div className="w-20 px-3 py-2 bg-slate-700 rounded-lg text-center font-semibold text-orange-400">
                    {formatHoursDisplay(paymentDeadlineHours)}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Le client doit payer dans ce délai après que l&apos;annonceur ait accepté sa demande.
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <CreditCard className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-300">
                {paymentDeadlineEnabled
                  ? `Les réservations non payées dans les ${formatHoursDisplay(paymentDeadlineHours)} seront automatiquement annulées.`
                  : "Le délai de paiement est désactivé. Les clients peuvent payer à tout moment."
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* Versements annonceurs */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Banknote className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Versements annonceurs</h2>
          </div>

          <div className="space-y-6">
            {/* Délai de confirmation client */}
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Délai de confirmation client
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={12}
                  max={168}
                  step={12}
                  value={missionConfirmationHours}
                  onChange={(e) => setMissionConfirmationHours(Number(e.target.value))}
                  className="flex-1 accent-green-500"
                />
                <div className="w-20 px-3 py-2 bg-slate-700 rounded-lg text-center font-semibold text-green-400">
                  {formatHoursDisplay(missionConfirmationHours)}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Après la fin de la mission, le client a ce délai pour confirmer. Passé ce délai, la mission est auto-confirmée.
              </p>
            </div>

            {/* Mode 1 : Mensuel */}
            <div className={`p-4 border rounded-lg transition-opacity ${scheduledModeEnabled ? "bg-blue-500/10 border-blue-500/30" : "bg-slate-800/30 border-slate-700 opacity-60"}`}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className={`w-5 h-5 ${scheduledModeEnabled ? "text-blue-400" : "text-slate-500"}`} />
                <h3 className={`font-semibold ${scheduledModeEnabled ? "text-blue-300" : "text-slate-400"}`}>Mode mensuel</h3>
                <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${scheduledModeEnabled ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-400"}`}>
                  Virement groupé
                </span>
                {/* Toggle activation */}
                <button
                  type="button"
                  onClick={() => setScheduledModeEnabled((v) => !v)}
                  disabled={!instantModeEnabled && scheduledModeEnabled}
                  title={!instantModeEnabled && scheduledModeEnabled ? "Au moins un mode doit rester actif" : ""}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${scheduledModeEnabled ? "bg-blue-500" : "bg-slate-600"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${scheduledModeEnabled ? "translate-x-5" : "translate-x-1"}`} />
                </button>
              </div>
              <p className={`text-sm mb-4 ${scheduledModeEnabled ? "text-blue-300/70" : "text-slate-500"}`}>
                {scheduledModeEnabled
                  ? "Tous les gains sont versés en une fois à une date fixe du mois."
                  : "Mode désactivé — les annonceurs ne peuvent plus le choisir et le cron mensuel est neutralisé."}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-blue-400 mb-2">Jour du virement</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={28}
                      value={payoutScheduledDay}
                      onChange={(e) => setPayoutScheduledDay(Number(e.target.value))}
                      className="flex-1 accent-blue-500"
                    />
                    <div className="w-14 px-2 py-1.5 bg-blue-500/20 rounded-lg text-center font-semibold text-blue-400 text-sm">
                      {payoutScheduledDay}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mode 2 : Par mission */}
            <div className={`p-4 border rounded-lg transition-opacity ${instantModeEnabled ? "bg-amber-500/10 border-amber-500/30" : "bg-slate-800/30 border-slate-700 opacity-60"}`}>
              <div className="flex items-center gap-2 mb-4">
                <Zap className={`w-5 h-5 ${instantModeEnabled ? "text-amber-400" : "text-slate-500"}`} />
                <h3 className={`font-semibold ${instantModeEnabled ? "text-amber-300" : "text-slate-400"}`}>Mode par mission</h3>
                <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${instantModeEnabled ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-400"}`}>
                  Virement immédiat
                </span>
                <button
                  type="button"
                  onClick={() => setInstantModeEnabled((v) => !v)}
                  disabled={!scheduledModeEnabled && instantModeEnabled}
                  title={!scheduledModeEnabled && instantModeEnabled ? "Au moins un mode doit rester actif" : ""}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${instantModeEnabled ? "bg-amber-500" : "bg-slate-600"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${instantModeEnabled ? "translate-x-5" : "translate-x-1"}`} />
                </button>
              </div>
              <p className={`text-sm mb-4 ${instantModeEnabled ? "text-amber-300/70" : "text-slate-500"}`}>
                {instantModeEnabled
                  ? "Chaque mission est versée individuellement dès que le client confirme."
                  : "Mode désactivé — les annonceurs sur ce mode bascule automatiquement en mensuel."}
              </p>
            </div>

            {/* Note centralisation des frais */}
            <div className="p-3 bg-slate-800/40 border border-slate-700 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400">
                Les frais retenus à l&apos;annonceur sur chaque virement (mensuel ou par mission) suivent
                le <strong className="text-slate-200">Taux de prélèvement Stripe</strong> configuré dans{" "}
                <a href="/admin/commissions" className="text-indigo-400 hover:text-indigo-300 underline">
                  /admin/commissions
                </a>
                .
              </p>
            </div>

            {/* Récapitulatif */}
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-green-400" />
                <span className="font-medium text-slate-200">Récapitulatif des modes</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700">
                      <th className="text-left py-2 px-3">Mode</th>
                      <th className="text-left py-2 px-3">Délai de versement</th>
                      <th className="text-left py-2 px-3">Frais</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-slate-700/50">
                      <td className="py-2 px-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        Mensuel
                      </td>
                      <td className="py-2 px-3">Le {payoutScheduledDay} de chaque mois</td>
                      <td className="py-2 px-3 font-medium">
                        {stripeFeeRate === 0 ? (
                          <span className="text-green-400">Gratuit</span>
                        ) : (
                          <span className="text-blue-400">{stripeFeeRate}%</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        Par mission
                      </td>
                      <td className="py-2 px-3">Après confirmation client</td>
                      <td className="py-2 px-3 font-medium">
                        {stripeFeeRate === 0 ? (
                          <span className="text-green-400">Gratuit</span>
                        ) : (
                          <span className="text-amber-400">{stripeFeeRate}%</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Banknote className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-300">
                Les annonceurs choisissent leur mode de versement dans leurs paramètres.
                {stripeFeeRate === 0 ? (
                  <> Aucun frais retenu (taux Stripe à 0%).</>
                ) : (
                  <> Frais retenus : {stripeFeeRate}% (taux Stripe configuré dans /admin/commissions).</>
                )}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Politique d'annulation client */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Ban className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Politique d&apos;annulation client</h2>
          </div>

          <div className="space-y-6">
            {/* Rappel principe */}
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <p className="text-sm text-cyan-200 leading-relaxed">
                <strong>Règle principale :</strong> au-delà du seuil défini ci-dessous, le client peut être remboursé selon
                son historique. En-dessous, aucun remboursement (l&apos;annonceur a bloqué son créneau, la plateforme conserve les frais).
              </p>
            </div>

            {/* Seuil critique */}
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <label className="block text-sm font-medium text-cyan-300 mb-3">
                Seuil critique avant début de mission
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={6}
                  max={168}
                  value={cancellationThresholdHours}
                  onChange={(e) => setCancellationThresholdHours(Number(e.target.value))}
                  className="flex-1 accent-cyan-500"
                />
                <div className="w-16 px-3 py-2 bg-cyan-500/20 rounded-lg text-center font-semibold text-cyan-400">
                  {formatHoursDisplay(cancellationThresholdHours)}
                </div>
              </div>
              <p className="text-xs text-cyan-400/70 mt-2">
                Si la mission est <strong>réservée</strong> ou <strong>annulée</strong> à moins de
                {" "}{cancellationThresholdHours}h du début → aucun remboursement.
              </p>
            </div>

            {/* Pénalité 3ème+ annulation (1ère et 2ème toujours remboursées hors frais) */}
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-200">
                <strong>1ère et 2ème annulation</strong> : le client est remboursé intégralement, sauf les frais
                de service et Stripe (toujours conservés par la plateforme).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <label className="block text-sm font-medium text-orange-300 mb-3">
                  Part annonceur — 3ème annulation
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cancellation3rdAnnouncerPercent}
                    onChange={(e) => setCancellation3rdAnnouncerPercent(Number(e.target.value))}
                    className="flex-1 accent-orange-500"
                  />
                  <div className="w-16 px-3 py-2 bg-orange-500/20 rounded-lg text-center font-semibold text-orange-400">
                    {cancellation3rdAnnouncerPercent}%
                  </div>
                </div>
                <p className="text-xs text-orange-400/70 mt-2">
                  3ème annulation : annonceur conserve {cancellation3rdAnnouncerPercent}%, client remboursé à {100 - cancellation3rdAnnouncerPercent}% (hors frais).
                </p>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <label className="block text-sm font-medium text-red-300 mb-3">
                  Part annonceur — 4ème annulation et au-delà
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cancellation4thAnnouncerPercent}
                    onChange={(e) => setCancellation4thAnnouncerPercent(Number(e.target.value))}
                    className="flex-1 accent-red-500"
                  />
                  <div className="w-16 px-3 py-2 bg-red-500/20 rounded-lg text-center font-semibold text-red-400">
                    {cancellation4thAnnouncerPercent}%
                  </div>
                </div>
                <p className="text-xs text-red-400/70 mt-2">
                  4ème annulation et + : annonceur conserve {cancellation4thAnnouncerPercent}%, client remboursé à {100 - cancellation4thAnnouncerPercent}% (hors frais).
                </p>
              </div>
            </div>

            {/* Compteur */}
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <label className="block text-sm font-medium text-purple-300 mb-3">
                Période du compteur d&apos;annulations
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={cancellationCounterPeriodMonths}
                  onChange={(e) => setCancellationCounterPeriodMonths(Number(e.target.value))}
                  className="flex-1 accent-purple-500"
                />
                <div className="w-20 px-3 py-2 bg-purple-500/20 rounded-lg text-center font-semibold text-purple-400">
                  {cancellationCounterPeriodMonths} mois
                </div>
              </div>
              <p className="text-xs text-purple-400/70 mt-2">
                Le nombre d&apos;annulations du client est compté sur {cancellationCounterPeriodMonths} mois glissants
                (au-delà, ses anciennes annulations ne pénalisent plus).
              </p>
            </div>

            {/* Note séances collectives */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-200">
                <strong>Séances collectives</strong> : la politique d&apos;annulation est définie par chaque annonceur dans
                <span className="text-blue-300"> /dashboard/parametres → menu Annulation</span>.
                Cette page admin ne couvre que les missions individuelles.
              </p>
            </div>

            {/* Tableau récapitulatif */}
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-4 h-4 text-red-400" />
                <span className="font-medium text-slate-200">Règles d&apos;annulation actives (missions individuelles)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700">
                      <th className="text-left py-2 px-3">Situation</th>
                      <th className="text-left py-2 px-3">Remboursement client</th>
                      <th className="text-left py-2 px-3">Part annonceur</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-slate-700/50">
                      <td className="py-2 px-3 text-amber-400">
                        Réservation faite ≤{cancellationThresholdHours}h avant début
                      </td>
                      <td className="py-2 px-3 text-amber-400 font-medium">Aucun</td>
                      <td className="py-2 px-3 text-amber-400 font-medium">100%</td>
                    </tr>
                    <tr className="border-b border-slate-700/50">
                      <td className="py-2 px-3 text-amber-400">
                        Annulation à ≤{cancellationThresholdHours}h du début
                      </td>
                      <td className="py-2 px-3 text-amber-400 font-medium">Aucun</td>
                      <td className="py-2 px-3 text-amber-400 font-medium">100%</td>
                    </tr>
                    <tr className="border-b border-slate-700/50">
                      <td className="py-2 px-3 text-green-400">
                        1ère &amp; 2ème annulation (&gt;{cancellationThresholdHours}h du début)
                      </td>
                      <td className="py-2 px-3 text-green-400 font-medium">Total − frais</td>
                      <td className="py-2 px-3 text-slate-500">0%</td>
                    </tr>
                    <tr className="border-b border-slate-700/50">
                      <td className="py-2 px-3 text-orange-400">
                        3ème annulation (&gt;{cancellationThresholdHours}h du début)
                      </td>
                      <td className="py-2 px-3 text-orange-400 font-medium">{100 - cancellation3rdAnnouncerPercent}% − frais</td>
                      <td className="py-2 px-3 text-orange-400 font-medium">{cancellation3rdAnnouncerPercent}%</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-red-400">
                        4ème+ annulation (&gt;{cancellationThresholdHours}h du début)
                      </td>
                      <td className="py-2 px-3 text-red-400 font-medium">{cancellation4thAnnouncerPercent < 100 ? `${100 - cancellation4thAnnouncerPercent}% − frais` : "Aucun"}</td>
                      <td className="py-2 px-3 text-red-400 font-medium">{cancellation4thAnnouncerPercent}%</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-[11px] text-slate-500 mt-2">
                  Dans tous les cas où le client n&apos;est pas remboursé intégralement, la plateforme conserve les frais
                  de service et les frais Stripe.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <Ban className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">
                Le compteur d&apos;annulations se calcule sur {cancellationCounterPeriodMonths} mois glissants.
                Au-delà du seuil critique de {cancellationThresholdHours}h, la pénalité progresse selon le nombre d&apos;annulations
                déjà effectuées par le client sur la période.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Spacer pour le bouton fixe */}
      <div className="h-20" />

      {/* Bouton de sauvegarde flottant */}
      <motion.div
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 bg-green-500/15 text-green-400 rounded-xl backdrop-blur-sm border border-green-500/20 text-sm font-medium"
          >
            <Check className="w-4 h-4" />
            Enregistré
          </motion.div>
        )}
        {saveError && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-md px-4 py-3 bg-red-500/15 text-red-300 rounded-xl backdrop-blur-sm border border-red-500/30 text-sm"
          >
            <p className="font-semibold mb-1">❌ Échec sauvegarde</p>
            <p className="text-red-200/90 text-xs">{saveError}</p>
          </motion.div>
        )}
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSaving ? "Sauvegarde..." : "Sauvegarder tout"}
        </button>
      </motion.div>
    </div>
  );
}
