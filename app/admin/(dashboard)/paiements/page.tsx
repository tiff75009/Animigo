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
  const [payoutMonthlyFeePercent, setPayoutMonthlyFeePercent] = useState(0);
  const [payoutPerMissionFeePercent, setPayoutPerMissionFeePercent] = useState(2);
  const [missionConfirmationHours, setMissionConfirmationHours] = useState(48);

  // États pour la politique d'annulation
  const [cancellationGracePeriodHours, setCancellationGracePeriodHours] = useState(24);
  const [cancellationThresholdHours, setCancellationThresholdHours] = useState(48);
  const [cancellation2ndAnnouncerPercent, setCancellation2ndAnnouncerPercent] = useState(50);
  const [cancellation3rdAnnouncerPercent, setCancellation3rdAnnouncerPercent] = useState(100);
  const [cancellationCounterPeriodMonths, setCancellationCounterPeriodMonths] = useState(12);
  const [lastMinuteThresholdHours, setLastMinuteThresholdHours] = useState(24);
  const [lastMinuteGraceHours, setLastMinuteGraceHours] = useState(6);

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
      setPayoutMonthlyFeePercent(payoutSettings.monthlyFeePercent);
      setPayoutPerMissionFeePercent(payoutSettings.perMissionFeePercent);
      setMissionConfirmationHours(payoutSettings.confirmationHours);
    }
  }, [payoutSettings]);

  // Charger les paramètres d'annulation
  useEffect(() => {
    if (cancellationSettings) {
      setCancellationGracePeriodHours(cancellationSettings.gracePeriodHours);
      setCancellationThresholdHours(cancellationSettings.thresholdHours);
      setCancellation2ndAnnouncerPercent(cancellationSettings.secondCancellationAnnouncerPercent);
      setCancellation3rdAnnouncerPercent(cancellationSettings.thirdCancellationAnnouncerPercent);
      setCancellationCounterPeriodMonths(cancellationSettings.counterPeriodMonths);
      setLastMinuteThresholdHours(cancellationSettings.lastMinuteThresholdHours);
      setLastMinuteGraceHours(cancellationSettings.lastMinuteGraceHours);
    }
  }, [cancellationSettings]);

  const handleSaveAll = async () => {
    if (!token) return;
    setIsSaving(true);
    setSaveSuccess(false);

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
        monthlyFeePercent: payoutMonthlyFeePercent,
        perMissionFeePercent: payoutPerMissionFeePercent,
        confirmationHours: missionConfirmationHours,
      });

      await updateCancellationSettings({
        token,
        gracePeriodHours: cancellationGracePeriodHours,
        thresholdHours: cancellationThresholdHours,
        secondCancellationAnnouncerPercent: cancellation2ndAnnouncerPercent,
        thirdCancellationAnnouncerPercent: cancellation3rdAnnouncerPercent,
        counterPeriodMonths: cancellationCounterPeriodMonths,
        lastMinuteThresholdHours,
        lastMinuteGraceHours,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
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
        {/* Délais d'acceptation */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Timer className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Délais d&apos;acceptation</h2>
          </div>

          <div className="space-y-6">
            {/* Toggle principal */}
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
              <div className="flex-1">
                <p className="text-slate-200 font-medium">Activer le système de délais</p>
                <p className="text-sm text-slate-400 mt-1">
                  Les annonceurs auront un temps limité pour accepter les demandes.
                  Passé ce délai, la mission sera automatiquement refusée.
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
                {/* Minimum réservation */}
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Réservation minimum à l&apos;avance
                  </label>
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
                  <p className="text-xs text-slate-500 mt-2">
                    Le client doit réserver au minimum ce délai avant le début de la prestation.
                  </p>
                </div>

                {/* Seuils d'intervalle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Seuil &quot;mission proche&quot;
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={1}
                        max={14}
                        value={intervalShortDays}
                        onChange={(e) => setIntervalShortDays(Number(e.target.value))}
                        className="flex-1 accent-cyan-500"
                      />
                      <div className="w-16 px-3 py-2 bg-slate-700 rounded-lg text-center font-semibold text-cyan-400">
                        {intervalShortDays}j
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Missions commençant dans moins de {intervalShortDays} jours
                    </p>
                  </div>

                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Seuil &quot;mission lointaine&quot;
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={14}
                        max={90}
                        value={intervalLongDays}
                        onChange={(e) => setIntervalLongDays(Number(e.target.value))}
                        className="flex-1 accent-cyan-500"
                      />
                      <div className="w-16 px-3 py-2 bg-slate-700 rounded-lg text-center font-semibold text-cyan-400">
                        {intervalLongDays}j
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Missions commençant dans plus de {intervalLongDays} jours
                    </p>
                  </div>
                </div>

                {/* Délais d'acceptation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <label className="block text-sm font-medium text-green-300 mb-3">
                      Délai mission proche
                    </label>
                    <div className="flex items-center gap-4">
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
                    <p className="text-xs text-green-400/70 mt-2">
                      &lt; {intervalShortDays} jours
                    </p>
                  </div>

                  <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <label className="block text-sm font-medium text-orange-300 mb-3">
                      Délai mission moyenne
                    </label>
                    <div className="flex items-center gap-4">
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
                    <p className="text-xs text-orange-400/70 mt-2">
                      {intervalShortDays} - {intervalLongDays} jours
                    </p>
                  </div>

                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <label className="block text-sm font-medium text-blue-300 mb-3">
                      Délai mission lointaine
                    </label>
                    <div className="flex items-center gap-4">
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
                    <p className="text-xs text-blue-400/70 mt-2">
                      &gt; {intervalLongDays} jours
                    </p>
                  </div>
                </div>

                {/* Tableau récapitulatif */}
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-cyan-400" />
                    <span className="font-medium text-slate-200">Règles actives</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700">
                          <th className="text-left py-2 px-3">Intervalle mission</th>
                          <th className="text-left py-2 px-3">Délai acceptation</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-300">
                        <tr className="border-b border-slate-700/50">
                          <td className="py-2 px-3">&lt; {intervalShortDays} jours</td>
                          <td className="py-2 px-3 text-green-400 font-medium">{formatHoursDisplay(deadlineShortHours)}</td>
                        </tr>
                        <tr className="border-b border-slate-700/50">
                          <td className="py-2 px-3">{intervalShortDays} - {intervalLongDays} jours</td>
                          <td className="py-2 px-3 text-orange-400 font-medium">{formatHoursDisplay(deadlineMediumHours)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">&gt; {intervalLongDays} jours</td>
                          <td className="py-2 px-3 text-blue-400 font-medium">{formatHoursDisplay(deadlineLongHours)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
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
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-blue-300">Mode mensuel</h3>
                <span className="ml-auto px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                  Virement groupé
                </span>
              </div>
              <p className="text-sm text-blue-300/70 mb-4">
                Tous les gains sont versés en une fois à une date fixe du mois.
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
                <div>
                  <label className="block text-xs text-blue-400 mb-2">Frais appliqués</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={0.5}
                      value={payoutMonthlyFeePercent}
                      onChange={(e) => setPayoutMonthlyFeePercent(Number(e.target.value))}
                      className="flex-1 accent-blue-500"
                    />
                    <div className="w-14 px-2 py-1.5 bg-blue-500/20 rounded-lg text-center font-semibold text-blue-400 text-sm">
                      {payoutMonthlyFeePercent}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mode 2 : Par mission */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-amber-300">Mode par mission</h3>
                <span className="ml-auto px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
                  Virement immédiat
                </span>
              </div>
              <p className="text-sm text-amber-300/70 mb-4">
                Chaque mission est versée individuellement dès que le client confirme.
              </p>
              <div>
                <label className="block text-xs text-amber-400 mb-2">Frais appliqués</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={payoutPerMissionFeePercent}
                    onChange={(e) => setPayoutPerMissionFeePercent(Number(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <div className="w-14 px-2 py-1.5 bg-amber-500/20 rounded-lg text-center font-semibold text-amber-400 text-sm">
                    {payoutPerMissionFeePercent}%
                  </div>
                </div>
              </div>
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
                        {payoutMonthlyFeePercent === 0 ? (
                          <span className="text-green-400">Gratuit</span>
                        ) : (
                          <span className="text-blue-400">{payoutMonthlyFeePercent}%</span>
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
                        {payoutPerMissionFeePercent === 0 ? (
                          <span className="text-green-400">Gratuit</span>
                        ) : (
                          <span className="text-amber-400">{payoutPerMissionFeePercent}%</span>
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
                {payoutMonthlyFeePercent === 0 && payoutPerMissionFeePercent > 0 && (
                  <> Le mode mensuel est gratuit, le mode par mission applique {payoutPerMissionFeePercent}% de frais.</>
                )}
                {payoutMonthlyFeePercent > 0 && payoutPerMissionFeePercent > 0 && (
                  <> Mode mensuel : {payoutMonthlyFeePercent}%, mode par mission : {payoutPerMissionFeePercent}%.</>
                )}
                {payoutMonthlyFeePercent === 0 && payoutPerMissionFeePercent === 0 && (
                  <> Les deux modes sont actuellement gratuits.</>
                )}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Politique d'annulation client */}
        <motion.div
          className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
            <Ban className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Politique d&apos;annulation client</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Délai de grâce post-paiement */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Délai de grâce post-paiement
                </label>
                <span className="text-sm font-mono text-blue-400">{cancellationGracePeriodHours}h</span>
              </div>
              <input
                type="range"
                min={1}
                max={72}
                value={cancellationGracePeriodHours}
                onChange={(e) => setCancellationGracePeriodHours(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Remboursement 100% si annulation dans les {cancellationGracePeriodHours}h suivant le paiement
              </p>
            </div>

            {/* Seuil avant début mission */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Seuil avant début de mission
                </label>
                <span className="text-sm font-mono text-blue-400">{cancellationThresholdHours}h</span>
              </div>
              <input
                type="range"
                min={1}
                max={168}
                value={cancellationThresholdHours}
                onChange={(e) => setCancellationThresholdHours(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Au-delà de {cancellationThresholdHours}h avant le début : remboursement total moins commission
              </p>
            </div>

            {/* % annonceur 2ème annulation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Part annonceur - 2ème annulation
                </label>
                <span className="text-sm font-mono text-orange-400">{cancellation2ndAnnouncerPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={cancellation2ndAnnouncerPercent}
                onChange={(e) => setCancellation2ndAnnouncerPercent(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                L&apos;annonceur conserve {cancellation2ndAnnouncerPercent}% de ses gains lors de la 2ème annulation (&lt;{cancellationThresholdHours}h)
              </p>
            </div>

            {/* % annonceur 3ème+ annulation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Part annonceur - 3ème+ annulation
                </label>
                <span className="text-sm font-mono text-red-400">{cancellation3rdAnnouncerPercent}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={cancellation3rdAnnouncerPercent}
                onChange={(e) => setCancellation3rdAnnouncerPercent(Number(e.target.value))}
                className="w-full accent-red-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                L&apos;annonceur conserve {cancellation3rdAnnouncerPercent}% de ses gains à partir de la 3ème annulation
              </p>
            </div>

            {/* Période compteur */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Période du compteur d&apos;annulations
                </label>
                <span className="text-sm font-mono text-purple-400">{cancellationCounterPeriodMonths} mois</span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                value={cancellationCounterPeriodMonths}
                onChange={(e) => setCancellationCounterPeriodMonths(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Le compteur d&apos;annulations est calculé sur {cancellationCounterPeriodMonths} mois glissants
              </p>
            </div>

            {/* Seuil réservation last-minute */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Seuil réservation last-minute
                </label>
                <span className="text-sm font-mono text-amber-400">{lastMinuteThresholdHours}h</span>
              </div>
              <input
                type="range"
                min={6}
                max={72}
                value={lastMinuteThresholdHours}
                onChange={(e) => setLastMinuteThresholdHours(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Si le client réserve moins de {lastMinuteThresholdHours}h avant le début, la grâce est réduite
              </p>
            </div>

            {/* Grâce réduite last-minute */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">
                  Grâce réduite last-minute
                </label>
                <span className="text-sm font-mono text-amber-400">{lastMinuteGraceHours}h</span>
              </div>
              <input
                type="range"
                min={1}
                max={24}
                value={lastMinuteGraceHours}
                onChange={(e) => setLastMinuteGraceHours(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Délai de grâce réduit à {lastMinuteGraceHours}h au lieu de {cancellationGracePeriodHours}h pour les réservations last-minute
              </p>
            </div>

            {/* Info box exemple */}
            <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div className="text-sm text-slate-300 space-y-1">
                  <p className="font-medium text-white">Exemple de calcul :</p>
                  <p>1ère annulation &lt;{cancellationThresholdHours}h : remboursement total moins commission plateforme</p>
                  <p>2ème annulation &lt;{cancellationThresholdHours}h : l&apos;annonceur conserve {cancellation2ndAnnouncerPercent}% de ses gains</p>
                  <p>3ème+ annulation &lt;{cancellationThresholdHours}h : l&apos;annonceur conserve {cancellation3rdAnnouncerPercent}% de ses gains</p>
                  <p className="text-amber-400">Réservation last-minute (&lt;{lastMinuteThresholdHours}h avant début) : grâce de {lastMinuteGraceHours}h seulement</p>
                </div>
              </div>
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
