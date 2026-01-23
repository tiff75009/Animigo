"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import {
  Settings,
  Bell,
  Shield,
  Database,
  Mail,
  ShieldAlert,
  Loader2,
  Check,
  Save,
  Clock,
  Key,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Wrench,
  Users,
} from "lucide-react";

// Fonction pour générer un secret aléatoire
function generateSecret(length: number = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export default function ParametresPage() {
  const { token } = useAdminAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // États pour les paramètres
  const [siteName, setSiteName] = useState("Animigo");
  const [contactEmail, setContactEmail] = useState("contact@animigo.fr");
  const [notifNewUsers, setNotifNewUsers] = useState(true);
  const [notifReports, setNotifReports] = useState(true);
  const [emailVerification, setEmailVerification] = useState(true);
  const [admin2FA, setAdmin2FA] = useState(false);
  const [emailFrom, setEmailFrom] = useState("noreply@animigo.fr");
  const [emailFromName, setEmailFromName] = useState("Animigo");
  const [workdayHours, setWorkdayHours] = useState(8);

  // États pour le secret API interne
  const [internalApiSecret, setInternalApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [envCopied, setEnvCopied] = useState(false);
  const [isGeneratingSecret, setIsGeneratingSecret] = useState(false);

  // États pour la régénération de slugs
  const [isRegeneratingSlugs, setIsRegeneratingSlugs] = useState(false);
  const [slugResult, setSlugResult] = useState<{
    total: number;
    updated: number;
    unchanged: number;
    errors: number;
  } | null>(null);

  // Query pour récupérer toutes les configs
  const allConfigs = useQuery(
    api.admin.config.getAllConfigs,
    token ? { token } : "skip"
  );

  // Query pour vérifier si la modération est activée
  const isModerationEnabled = useQuery(api.admin.config.isServiceModerationEnabled);

  // Mutations
  const toggleModeration = useMutation(api.admin.config.toggleServiceModeration);
  const updateConfig = useMutation(api.admin.config.updateConfig);
  const regenerateAllSlugs = useMutation(api.admin.maintenance.regenerateAllSlugs);

  // Charger les configs existantes
  useEffect(() => {
    if (allConfigs) {
      for (const config of allConfigs) {
        switch (config.key) {
          case "site_name":
            setSiteName(config.value);
            break;
          case "contact_email":
            setContactEmail(config.value);
            break;
          case "notif_new_users":
            setNotifNewUsers(config.value === "true");
            break;
          case "notif_reports":
            setNotifReports(config.value === "true");
            break;
          case "email_verification":
            setEmailVerification(config.value === "true");
            break;
          case "admin_2fa":
            setAdmin2FA(config.value === "true");
            break;
          case "email_from":
            setEmailFrom(config.value);
            break;
          case "email_from_name":
            setEmailFromName(config.value);
            break;
          case "workday_hours":
            setWorkdayHours(parseInt(config.value, 10) || 8);
            break;
          case "internal_api_secret":
            setInternalApiSecret(config.value);
            break;
        }
      }
    }
  }, [allConfigs]);

  const handleToggleModeration = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      await toggleModeration({
        token,
        enabled: !isModerationEnabled,
      });
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateSecret = async () => {
    if (!token) return;
    setIsGeneratingSecret(true);
    try {
      const newSecret = generateSecret(64);
      setInternalApiSecret(newSecret);
      // Sauvegarder immédiatement dans Convex
      await updateConfig({
        token,
        key: "internal_api_secret",
        value: newSecret,
      });
    } catch (error) {
      console.error("Erreur lors de la génération du secret:", error);
    } finally {
      setIsGeneratingSecret(false);
    }
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(internalApiSecret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    } catch (error) {
      console.error("Erreur lors de la copie:", error);
    }
  };

  const handleCopyEnv = async () => {
    try {
      await navigator.clipboard.writeText(`INTERNAL_API_SECRET=${internalApiSecret}`);
      setEnvCopied(true);
      setTimeout(() => setEnvCopied(false), 2000);
    } catch (error) {
      console.error("Erreur lors de la copie:", error);
    }
  };

  const handleRegenerateSlugs = async () => {
    if (!token) return;
    setIsRegeneratingSlugs(true);
    setSlugResult(null);
    try {
      const result = await regenerateAllSlugs({ token });
      setSlugResult({
        total: result.total,
        updated: result.updated,
        unchanged: result.unchanged,
        errors: result.errors,
      });
    } catch (error) {
      console.error("Erreur lors de la régénération des slugs:", error);
    } finally {
      setIsRegeneratingSlugs(false);
    }
  };

  const handleSaveAll = async () => {
    if (!token) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Sauvegarder tous les paramètres
      const configsToSave = [
        { key: "site_name", value: siteName },
        { key: "contact_email", value: contactEmail },
        { key: "notif_new_users", value: notifNewUsers.toString() },
        { key: "notif_reports", value: notifReports.toString() },
        { key: "email_verification", value: emailVerification.toString() },
        { key: "admin_2fa", value: admin2FA.toString() },
        { key: "email_from", value: emailFrom },
        { key: "email_from_name", value: emailFromName },
        { key: "workday_hours", value: workdayHours.toString() },
      ];

      for (const config of configsToSave) {
        await updateConfig({
          token,
          key: config.key,
          value: config.value,
        });
      }

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
        <h1 className="text-3xl font-bold text-white">Paramètres</h1>
        <p className="text-slate-400 mt-1">
          Configuration générale de la plateforme
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Moderation Settings - New Section */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Modération</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
              <div className="flex-1">
                <p className="text-slate-200 font-medium">Modération des services</p>
                <p className="text-sm text-slate-400 mt-1">
                  Quand activé, tous les nouveaux services et modifications devront
                  être approuvés avant publication.
                </p>
              </div>
              <button
                onClick={handleToggleModeration}
                disabled={isSaving || isModerationEnabled === undefined}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  isModerationEnabled
                    ? "bg-amber-500"
                    : "bg-slate-600"
                } ${isSaving ? "opacity-50" : ""}`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform flex items-center justify-center ${
                    isModerationEnabled ? "left-7" : "left-1"
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                  ) : isModerationEnabled ? (
                    <Check className="w-4 h-4 text-amber-500" />
                  ) : null}
                </span>
              </button>
            </div>
            {isModerationEnabled && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-300">
                  La modération systématique est activée. Tous les services passeront
                  en revue avant d'être publiés.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tarification Settings */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Tarification</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Durée d'une journée de travail
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
            <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <Clock className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-purple-300">
                Ces valeurs sont utilisées pour le calcul des tarifs de tous les annonceurs.
              </p>
            </div>
          </div>
        </motion.div>

        {/* General Settings */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Settings className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Général</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nom du site
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email de contact
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Bell className="w-5 h-5 text-yellow-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer">
              <span className="text-slate-300">Nouvelles inscriptions</span>
              <input
                type="checkbox"
                checked={notifNewUsers}
                onChange={(e) => setNotifNewUsers(e.target.checked)}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer">
              <span className="text-slate-300">Signalements</span>
              <input
                type="checkbox"
                checked={notifReports}
                onChange={(e) => setNotifReports(e.target.checked)}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
              />
            </label>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Sécurité</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer">
              <span className="text-slate-300">Vérification email obligatoire</span>
              <input
                type="checkbox"
                checked={emailVerification}
                onChange={(e) => setEmailVerification(e.target.checked)}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer">
              <span className="text-slate-300">2FA pour les admins</span>
              <input
                type="checkbox"
                checked={admin2FA}
                onChange={(e) => setAdmin2FA(e.target.checked)}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
              />
            </label>
          </div>
        </motion.div>

        {/* API Secret Interne */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800 md:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Key className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Secret API Interne</h2>
          </div>
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              Ce secret est utilisé pour sécuriser la communication entre les actions Convex et l'API Next.js
              (nécessaire pour le système de paiement Stripe sur Convex self-hosted).
            </p>

            {/* Secret actuel */}
            {internalApiSecret ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={internalApiSecret}
                      readOnly
                      className="w-full px-4 py-2.5 pr-20 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm"
                    />
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-700 rounded transition-colors"
                      title={showSecret ? "Masquer" : "Afficher"}
                    >
                      {showSecret ? (
                        <EyeOff className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={handleCopySecret}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-700 rounded transition-colors"
                      title="Copier le secret"
                    >
                      {secretCopied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Copier pour .env */}
                <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
                  <code className="flex-1 text-orange-400 text-sm font-mono truncate">
                    INTERNAL_API_SECRET={showSecret ? internalApiSecret : "••••••••••••••••"}
                  </code>
                  <button
                    onClick={handleCopyEnv}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    {envCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copier pour .env
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <Key className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-300">
                    Copiez cette ligne dans votre fichier <code className="bg-slate-800 px-1 rounded">.env.local</code> de Next.js.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-300">
                  Aucun secret configuré. Générez un secret pour activer le système de paiement intégré.
                </p>
              </div>
            )}

            {/* Bouton générer */}
            <button
              onClick={handleGenerateSecret}
              disabled={isGeneratingSecret}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isGeneratingSecret ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              {internalApiSecret ? "Régénérer un nouveau secret" : "Générer un secret"}
            </button>

            {internalApiSecret && (
              <p className="text-xs text-slate-500">
                Attention : régénérer un secret invalidera l'ancien. Vous devrez mettre à jour votre fichier .env.local.
              </p>
            )}
          </div>
        </motion.div>

        {/* Email */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800 md:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Mail className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Emails</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Expéditeur (From)
              </label>
              <input
                type="email"
                value={emailFrom}
                onChange={(e) => setEmailFrom(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nom d'expéditeur
              </label>
              <input
                type="text"
                value={emailFromName}
                onChange={(e) => setEmailFromName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Save Button */}
      <motion.div
        className="mt-8 flex items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
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

      {/* Maintenance */}
      <motion.div
        className="mt-8 bg-slate-900 rounded-xl p-6 border border-slate-800"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Wrench className="w-5 h-5 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Maintenance</h2>
          <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
            Temporaire
          </span>
        </div>

        <div className="space-y-4">
          {/* Régénération des slugs */}
          <div className="p-4 bg-slate-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-cyan-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-white font-medium">Régénérer les slugs utilisateurs</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Régénère les slugs URL au format <code className="bg-slate-700 px-1 rounded">prenom-ville</code> (ex: marie-paris, jean-lyon-2).
                  Les slugs seront mis à jour pour tous les utilisateurs avec leur ville de profil.
                </p>

                {slugResult && (
                  <div className={`mt-3 p-3 rounded-lg ${
                    slugResult.errors > 0
                      ? "bg-amber-500/10 border border-amber-500/30"
                      : "bg-green-500/10 border border-green-500/30"
                  }`}>
                    <p className={slugResult.errors > 0 ? "text-amber-300" : "text-green-300"}>
                      <strong>{slugResult.updated}</strong> slugs mis à jour, <strong>{slugResult.unchanged}</strong> inchangés sur <strong>{slugResult.total}</strong> utilisateurs.
                      {slugResult.errors > 0 && (
                        <span className="text-amber-400"> ({slugResult.errors} erreurs)</span>
                      )}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleRegenerateSlugs}
                  disabled={isRegeneratingSlugs}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {isRegeneratingSlugs ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Régénération en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Régénérer tous les slugs
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Coming Soon */}
      <motion.div
        className="mt-8 p-6 bg-slate-900/50 border border-dashed border-slate-700 rounded-xl text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Database className="w-8 h-8 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-400">
          Plus de paramètres à venir (sauvegarde, maintenance, logs...)
        </p>
      </motion.div>
    </div>
  );
}
