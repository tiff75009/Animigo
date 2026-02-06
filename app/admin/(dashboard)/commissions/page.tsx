"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import {
  Percent,
  User,
  Briefcase,
  Building2,
  Loader2,
  Check,
  Save,
  AlertCircle,
  Calculator,
  Info,
  TrendingUp,
  Clock,
  CreditCard,
} from "lucide-react";

// Types de commissions
const COMMISSION_TYPES = [
  {
    id: "particulier",
    label: "Particulier",
    description: "Annonceurs particuliers (non professionnels)",
    icon: User,
    color: "blue",
    defaultRate: 15,
  },
  {
    id: "micro_entrepreneur",
    label: "Micro-entrepreneur",
    description: "Auto-entrepreneurs et micro-entreprises (pas de TVA)",
    icon: Briefcase,
    color: "purple",
    defaultRate: 12,
  },
  {
    id: "professionnel",
    label: "Professionnel",
    description: "Entreprises (SARL, SAS, EURL, etc.)",
    icon: Building2,
    color: "green",
    defaultRate: 10,
  },
] as const;

const colorClasses = {
  blue: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/30",
    accent: "bg-blue-500",
    light: "text-blue-300",
  },
  purple: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/30",
    accent: "bg-purple-500",
    light: "text-purple-300",
  },
  green: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500/30",
    accent: "bg-green-500",
    light: "text-green-300",
  },
};

export default function CommissionsPage() {
  const { token } = useAdminAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États pour les commissions
  const [commissions, setCommissions] = useState({
    particulier: 15,
    micro_entrepreneur: 12,
    professionnel: 10,
  });

  // États pour tarification & horaires
  const [workdayHours, setWorkdayHours] = useState(8);
  const [dayStartTime, setDayStartTime] = useState("07:00");
  const [dayEndTime, setDayEndTime] = useState("21:00");

  // États pour TVA et frais Stripe
  const [vatRate, setVatRate] = useState(20);
  const [stripeFeeRate, setStripeFeeRate] = useState(3);

  // Query pour récupérer les commissions actuelles
  const currentCommissions = useQuery(
    api.admin.commissions.getCommissions,
    token ? { token } : "skip"
  );

  // Queries pour configs, TVA et frais Stripe
  const allConfigs = useQuery(
    api.admin.config.getAllConfigs,
    token ? { token } : "skip"
  );
  const vatRateData = useQuery(
    api.admin.commissions.getVatRateAdmin,
    token ? { token } : "skip"
  );
  const stripeFeeRateData = useQuery(
    api.admin.commissions.getStripeFeeRateAdmin,
    token ? { token } : "skip"
  );

  // Mutation pour sauvegarder
  const updateAllCommissions = useMutation(api.admin.commissions.updateAllCommissions);
  const updateConfig = useMutation(api.admin.config.updateConfig);
  const updateVatRateMutation = useMutation(api.admin.commissions.updateVatRate);
  const updateStripeFeeRateMutation = useMutation(api.admin.commissions.updateStripeFeeRate);

  // Charger les commissions existantes
  useEffect(() => {
    if (currentCommissions) {
      setCommissions({
        particulier: currentCommissions.particulier ?? 15,
        micro_entrepreneur: currentCommissions.micro_entrepreneur ?? 12,
        professionnel: currentCommissions.professionnel ?? 10,
      });
    }
  }, [currentCommissions]);

  // Charger les configs tarification
  useEffect(() => {
    if (allConfigs) {
      for (const config of allConfigs) {
        switch (config.key) {
          case "workday_hours":
            setWorkdayHours(parseInt(config.value, 10) || 8);
            break;
          case "day_start_time":
            setDayStartTime(config.value || "07:00");
            break;
          case "day_end_time":
            setDayEndTime(config.value || "21:00");
            break;
        }
      }
    }
  }, [allConfigs]);

  // Charger les taux de TVA et frais Stripe
  useEffect(() => {
    if (vatRateData?.rate !== undefined) {
      setVatRate(vatRateData.rate);
    }
  }, [vatRateData]);

  useEffect(() => {
    if (stripeFeeRateData?.rate !== undefined) {
      setStripeFeeRate(stripeFeeRateData.rate);
    }
  }, [stripeFeeRateData]);

  const handleCommissionChange = (
    type: keyof typeof commissions,
    value: number
  ) => {
    // Limiter entre 0 et 50
    const clampedValue = Math.min(50, Math.max(0, value));
    setCommissions((prev) => ({
      ...prev,
      [type]: clampedValue,
    }));
    setError(null);
  };

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      await updateAllCommissions({
        token,
        commissions,
      });

      // Sauvegarder tarification & horaires
      const configsToSave = [
        { key: "workday_hours", value: workdayHours.toString() },
        { key: "day_start_time", value: dayStartTime },
        { key: "day_end_time", value: dayEndTime },
      ];
      for (const config of configsToSave) {
        await updateConfig({ token, key: config.key, value: config.value });
      }

      // Sauvegarder TVA et frais Stripe
      await updateVatRateMutation({ token, rate: vatRate });
      await updateStripeFeeRateMutation({ token, rate: stripeFeeRate });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Erreur:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  // Calcul exemple pour visualisation
  const calculateExample = (rate: number, amount: number) => {
    const commission = Math.round((amount * rate) / 100);
    const announcerReceives = amount - commission;
    return { commission, announcerReceives };
  };

  const exampleAmount = 5000; // 50€ en centimes

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Percent className="w-8 h-8 text-primary" />
          Gestion des commissions
        </h1>
        <p className="text-slate-400 mt-1">
          Configurez les taux de commission appliqués sur chaque réservation
        </p>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3"
      >
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium">Comment fonctionnent les commissions ?</p>
          <p className="mt-1 text-blue-300/80">
            La commission est prélevée sur le montant total de la réservation. Elle est
            calculée en fonction du statut de l&apos;annonceur (particulier, micro-entrepreneur
            ou professionnel). Le montant de la commission sera affiché au client lors de
            la réservation pour une transparence totale.
          </p>
        </div>
      </motion.div>

      {/* Commission Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {COMMISSION_TYPES.map((type, index) => {
          const colors = colorClasses[type.color];
          const Icon = type.icon;
          const rate = commissions[type.id as keyof typeof commissions];
          const example = calculateExample(rate, exampleAmount);

          return (
            <motion.div
              key={type.id}
              className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {/* Header */}
              <div className={`p-4 ${colors.bg} border-b ${colors.border}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${colors.bg} rounded-lg`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{type.label}</h3>
                    <p className="text-xs text-slate-400">{type.description}</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Rate Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Taux de commission
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={0}
                      max={50}
                      step={0.5}
                      value={rate}
                      onChange={(e) =>
                        handleCommissionChange(
                          type.id as keyof typeof commissions,
                          parseFloat(e.target.value)
                        )
                      }
                      className={`flex-1 accent-${type.color}-500`}
                      style={{
                        accentColor:
                          type.color === "blue"
                            ? "#3b82f6"
                            : type.color === "purple"
                            ? "#a855f7"
                            : "#22c55e",
                      }}
                    />
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={rate}
                        onChange={(e) =>
                          handleCommissionChange(
                            type.id as keyof typeof commissions,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className={`w-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-center font-bold ${colors.text} focus:outline-none focus:border-${type.color}-500`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Example Calculation */}
                <div className={`p-4 ${colors.bg} rounded-lg border ${colors.border}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className={`w-4 h-4 ${colors.text}`} />
                    <span className="text-sm font-medium text-slate-300">
                      Exemple pour une réservation de 50,00 €
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Commission Animigo</span>
                      <span className={`font-semibold ${colors.text}`}>
                        {(example.commission / 100).toFixed(2).replace(".", ",")} €
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">L&apos;annonceur reçoit</span>
                      <span className="font-semibold text-white">
                        {(example.announcerReceives / 100).toFixed(2).replace(".", ",")} €
                      </span>
                    </div>
                  </div>
                </div>

                {/* Default indicator */}
                {rate === type.defaultRate && (
                  <p className="mt-3 text-xs text-slate-500 text-center">
                    Taux par défaut : {type.defaultRate}%
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Récapitulatif</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COMMISSION_TYPES.map((type) => {
            const rate = commissions[type.id as keyof typeof commissions];
            const colors = colorClasses[type.color];
            return (
              <div
                key={type.id}
                className="flex items-center justify-between p-4 bg-slate-800 rounded-lg"
              >
                <span className="text-slate-300">{type.label}</span>
                <span className={`text-xl font-bold ${colors.text}`}>{rate}%</span>
              </div>
            );
          })}
        </div>

        {/* Warning if rates are very different */}
        {Math.max(...Object.values(commissions)) -
          Math.min(...Object.values(commissions)) >
          10 && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">
              L&apos;écart entre les taux de commission est important (plus de 10 points).
              Assurez-vous que cela correspond à votre stratégie commerciale.
            </p>
          </div>
        )}
      </motion.div>

      {/* Tarification & Horaires */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Tarification & Horaires</h3>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Durée d&apos;une journée de travail
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={4}
                max={10}
                value={workdayHours}
                onChange={(e) => setWorkdayHours(Number(e.target.value))}
                className="flex-1 accent-purple-500"
              />
              <div className="w-16 px-3 py-2 bg-slate-800 rounded-lg text-center font-semibold text-purple-400">
                {workdayHours}h
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Demi-journée : {Math.round(workdayHours / 2)}h (calculée automatiquement)
            </p>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Horaires de journée (garde)
            </label>
            <p className="text-xs text-slate-500 mb-4">
              Définit quand commence et finit une journée pour les services de garde.
              La période nocturne (garde de nuit) commence après l&apos;heure de fin.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Début de journée</label>
                <input
                  type="time"
                  value={dayStartTime}
                  onChange={(e) => setDayStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Fin de journée</label>
                <input
                  type="time"
                  value={dayEndTime}
                  onChange={(e) => setDayEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
              <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded">
                Nuit : {dayEndTime} → {dayStartTime}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <Clock className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-purple-300">
              Ces valeurs sont utilisées pour le calcul des tarifs de tous les annonceurs.
              Les gardes de nuit sont facturées entre {dayEndTime} et {dayStartTime}.
            </p>
          </div>
        </div>
      </motion.div>

      {/* TVA et Frais Stripe */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* TVA sur les commissions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900 rounded-xl border border-slate-800 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Percent className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">TVA sur les commissions</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Taux de TVA applicable
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={0.5}
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <div className="w-20 px-3 py-2 bg-slate-800 rounded-lg text-center font-semibold text-emerald-400">
                  {vatRate}%
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                La TVA est appliquée sur le montant des commissions facturées aux clients.
              </p>
            </div>
            <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <Percent className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-300">
                <p className="font-medium mb-1">Exemple de calcul :</p>
                <p>Prix annonceur : 40€ | Commission 15% : 6€ | <strong>TVA {vatRate}% : {(6 * vatRate / 100).toFixed(2)}€</strong></p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Frais Stripe */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-slate-900 rounded-xl border border-slate-800 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <CreditCard className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Intégration Stripe</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Taux de prélèvement Stripe
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.1}
                  value={stripeFeeRate}
                  onChange={(e) => setStripeFeeRate(Number(e.target.value))}
                  className="flex-1 accent-indigo-500"
                />
                <div className="w-20 px-3 py-2 bg-slate-800 rounded-lg text-center font-semibold text-indigo-400">
                  {stripeFeeRate}%
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Les frais Stripe sont calculés sur le montant HT de la réservation (hors commission, hors TVA).
              </p>
            </div>
            <div className="flex items-start gap-2 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
              <CreditCard className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-300">
                <p className="font-medium mb-1">Exemple de calcul complet :</p>
                <p>Prix annonceur : 40€</p>
                <p>+ Commission 15% : 6€</p>
                <p>+ TVA {vatRate}% sur commission : {(6 * vatRate / 100).toFixed(2)}€</p>
                <p>+ Frais Stripe {stripeFeeRate}% : {(40 * stripeFeeRate / 100).toFixed(2)}€</p>
                <p className="font-bold mt-1">= Total client : {(40 + 6 + (6 * vatRate / 100) + (40 * stripeFeeRate / 100)).toFixed(2)}€</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </motion.div>
      )}

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-4"
      >
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSaving ? "Sauvegarde en cours..." : "Sauvegarder les modifications"}
        </button>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-green-400"
          >
            <Check className="w-5 h-5" />
            <span>Modifications enregistrées</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
