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
  Globe,
  X,
  Trash2,
  Upload,
  ImageIcon,
} from "lucide-react";
import { Id, Doc } from "@/convex/_generated/dataModel";
import { uploadToCloudinary } from "@/app/lib/cloudinary";
import Image from "next/image";

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
  const [dayStartTime, setDayStartTime] = useState("07:00");
  const [dayEndTime, setDayEndTime] = useState("21:00");

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

  // États pour le logo du site
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // États pour le mode maintenance
  const [isTogglingMaintenance, setIsTogglingMaintenance] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [manualIpName, setManualIpName] = useState("");
  const [manualIpAddress, setManualIpAddress] = useState("");
  const [isAddingIp, setIsAddingIp] = useState(false);

  // Query pour récupérer toutes les configs
  const allConfigs = useQuery(
    api.admin.config.getAllConfigs,
    token ? { token } : "skip"
  );

  // Query pour vérifier si la modération est activée
  const isModerationEnabled = useQuery(api.admin.config.isServiceModerationEnabled);

  // Query pour le mode maintenance
  const isMaintenanceEnabled = useQuery(api.admin.config.isMaintenanceModeEnabled);
  const pendingVisitRequests = useQuery(
    api.maintenance.visitRequests.listPendingRequests,
    token ? { token } : "skip"
  );
  const approvedVisitRequests = useQuery(
    api.maintenance.visitRequests.listApprovedRequests,
    token ? { token } : "skip"
  );

  // Mutations
  const toggleModeration = useMutation(api.admin.config.toggleServiceModeration);
  const updateConfig = useMutation(api.admin.config.updateConfig);
  const regenerateAllSlugs = useMutation(api.admin.maintenance.regenerateAllSlugs);
  const toggleMaintenanceMode = useMutation(api.admin.config.toggleMaintenanceMode);
  const approveRequest = useMutation(api.maintenance.visitRequests.approveRequest);
  const rejectRequest = useMutation(api.maintenance.visitRequests.rejectRequest);
  const revokeAccess = useMutation(api.maintenance.visitRequests.revokeAccess);
  const addManualIp = useMutation(api.maintenance.visitRequests.addManualIp);

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
          case "day_start_time":
            setDayStartTime(config.value || "07:00");
            break;
          case "day_end_time":
            setDayEndTime(config.value || "21:00");
            break;
          case "internal_api_secret":
            setInternalApiSecret(config.value);
            break;
          case "site_logo":
            setSiteLogo(config.value || null);
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

  const handleToggleMaintenance = async () => {
    if (!token) return;
    setIsTogglingMaintenance(true);
    try {
      await toggleMaintenanceMode({
        token,
        enabled: !isMaintenanceEnabled,
      });
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsTogglingMaintenance(false);
    }
  };

  const handleApproveRequest = async (requestId: Id<"visitRequests">) => {
    if (!token) return;
    setProcessingRequestId(requestId);
    try {
      await approveRequest({ token, requestId });
    } catch (error) {
      console.error("Erreur lors de l'approbation:", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: Id<"visitRequests">) => {
    if (!token) return;
    setProcessingRequestId(requestId);
    try {
      await rejectRequest({ token, requestId });
    } catch (error) {
      console.error("Erreur lors du rejet:", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRevokeAccess = async (requestId: Id<"visitRequests">) => {
    if (!token) return;
    setProcessingRequestId(requestId);
    try {
      await revokeAccess({ token, requestId });
    } catch (error) {
      console.error("Erreur lors de la révocation:", error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleAddManualIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !manualIpName.trim() || !manualIpAddress.trim()) return;
    setIsAddingIp(true);
    try {
      await addManualIp({
        token,
        name: manualIpName.trim(),
        ipAddress: manualIpAddress.trim(),
      });
      setManualIpName("");
      setManualIpAddress("");
    } catch (error) {
      console.error("Erreur lors de l'ajout:", error);
    } finally {
      setIsAddingIp(false);
    }
  };

  // Query pour la config Cloudinary
  const cloudinaryConfig = useQuery(api.config.getCloudinaryConfig);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !cloudinaryConfig?.cloudName || !cloudinaryConfig?.apiKey) return;

    setIsUploadingLogo(true);
    try {
      const result = await uploadToCloudinary(
        file,
        {
          cloudName: cloudinaryConfig.cloudName,
          apiKey: cloudinaryConfig.apiKey,
          uploadPreset: cloudinaryConfig.uploadPreset,
        },
        { folder: "animigo/branding" }
      );

      if (result.success && result.url) {
        setSiteLogo(result.url);
        await updateConfig({
          token,
          key: "site_logo",
          value: result.url,
        });
      }
    } catch (error) {
      console.error("Erreur upload logo:", error);
    } finally {
      setIsUploadingLogo(false);
      // Reset le file input
      e.target.value = "";
    }
  };

  const handleDeleteLogo = async () => {
    if (!token) return;
    setSiteLogo(null);
    try {
      await updateConfig({
        token,
        key: "site_logo",
        value: "",
      });
    } catch (error) {
      console.error("Erreur suppression logo:", error);
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
        { key: "day_start_time", value: dayStartTime },
        { key: "day_end_time", value: dayEndTime },
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

        {/* Mode Maintenance */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.025 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Globe className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Mode Maintenance</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
              <div className="flex-1">
                <p className="text-slate-200 font-medium">Activer le mode maintenance</p>
                <p className="text-sm text-slate-400 mt-1">
                  Quand activé, seules les IPs approuvées peuvent accéder au site.
                  Les autres visiteurs voient une page "Bientôt disponible".
                </p>
              </div>
              <button
                onClick={handleToggleMaintenance}
                disabled={isTogglingMaintenance || isMaintenanceEnabled === undefined}
                className={`relative w-14 h-8 rounded-full transition-colors ${
                  isMaintenanceEnabled
                    ? "bg-emerald-500"
                    : "bg-slate-600"
                } ${isTogglingMaintenance ? "opacity-50" : ""}`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform flex items-center justify-center ${
                    isMaintenanceEnabled ? "left-7" : "left-1"
                  }`}
                >
                  {isTogglingMaintenance ? (
                    <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
                  ) : isMaintenanceEnabled ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : null}
                </span>
              </button>
            </div>

            {isMaintenanceEnabled && (
              <div className="flex items-start gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <Globe className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-300">
                  Le mode maintenance est activé. Le site affiche une page "Bientôt disponible"
                  aux visiteurs non approuvés.
                </p>
              </div>
            )}

            {/* Demandes en attente */}
            {pendingVisitRequests && pendingVisitRequests.length > 0 && (
              <div className="mt-4">
                <h3 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
                  <span>Demandes en attente</span>
                  <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                    {pendingVisitRequests.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {pendingVisitRequests.map((request: Doc<"visitRequests">) => (
                    <div
                      key={request._id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 font-medium truncate">
                          {request.name}
                        </p>
                        <p className="text-sm text-slate-400 font-mono">
                          {request.ipAddress}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleApproveRequest(request._id)}
                          disabled={processingRequestId === request._id}
                          className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Approuver"
                        >
                          {processingRequestId === request._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request._id)}
                          disabled={processingRequestId === request._id}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Rejeter"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingVisitRequests && pendingVisitRequests.length === 0 && (
              <p className="text-slate-500 text-sm italic">
                Aucune demande d'accès en attente.
              </p>
            )}

            {/* Ajouter une IP manuellement */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <h3 className="text-slate-200 font-medium mb-3">
                Ajouter une IP manuellement
              </h3>
              <form onSubmit={handleAddManualIp} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualIpName}
                    onChange={(e) => setManualIpName(e.target.value)}
                    placeholder="Nom"
                    className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    value={manualIpAddress}
                    onChange={(e) => setManualIpAddress(e.target.value)}
                    placeholder="Adresse IP"
                    className="flex-1 min-w-0 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAddingIp || !manualIpName.trim() || !manualIpAddress.trim()}
                  className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAddingIp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Ajout en cours...
                    </>
                  ) : (
                    "Ajouter"
                  )}
                </button>
              </form>
              <p className="text-xs text-slate-500 mt-2">
                Tu peux trouver ton IP sur{" "}
                <a
                  href="https://whatismyipaddress.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  whatismyipaddress.com
                </a>
              </p>
            </div>

            {/* IPs approuvées */}
            {approvedVisitRequests && approvedVisitRequests.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-700">
                <h3 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
                  <span>IPs approuvées</span>
                  <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                    {approvedVisitRequests.length}
                  </span>
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {approvedVisitRequests.map((request: Doc<"visitRequests">) => (
                    <div
                      key={request._id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 font-medium truncate">
                          {request.name}
                        </p>
                        <p className="text-sm text-slate-400 font-mono">
                          {request.ipAddress}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevokeAccess(request._id)}
                        disabled={processingRequestId === request._id}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 ml-4"
                        title="Révoquer l'accès"
                      >
                        {processingRequestId === request._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
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
            <h2 className="text-lg font-semibold text-white">Tarification & Horaires</h2>
          </div>
          <div className="space-y-6">
            {/* Durée journée */}
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

            {/* Horaires de journée (pour garde de nuit) */}
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
                  <label className="block text-xs text-slate-400 mb-1">
                    Début de journée
                  </label>
                  <input
                    type="time"
                    value={dayStartTime}
                    onChange={(e) => setDayStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Fin de journée
                  </label>
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
                  🌙 Nuit : {dayEndTime} → {dayStartTime}
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

            {/* Logo du site */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Logo du site
              </label>
              {siteLogo ? (
                <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg">
                  <div className="relative w-16 h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                    <Image
                      src={siteLogo}
                      alt="Logo du site"
                      width={64}
                      height={64}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">{siteLogo}</p>
                  </div>
                  <button
                    onClick={handleDeleteLogo}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    title="Supprimer le logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-slate-800 border border-dashed border-slate-600 rounded-lg">
                  <ImageIcon className="w-8 h-8 text-slate-500" />
                  <p className="text-sm text-slate-400">Aucun logo configuré</p>
                </div>
              )}
              <label className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium rounded-lg cursor-pointer transition-colors">
                {isUploadingLogo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {siteLogo ? "Changer le logo" : "Uploader un logo"}
                  </>
                )}
                <input
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,.webp"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-500 mt-2">
                Formats acceptés : SVG, PNG, JPG, WebP
              </p>
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
