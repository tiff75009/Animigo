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
  Loader2,
  Check,
  Save,
  Upload,
  ImageIcon,
  Trash2,
  Building2,
} from "lucide-react";
import { uploadToCloudinary } from "@/app/lib/cloudinary";
import Image from "next/image";

export default function ParametresPage() {
  const { token } = useAdminAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // États pour les paramètres généraux
  const [siteName, setSiteName] = useState("Animigo");
  const [contactEmail, setContactEmail] = useState("contact@animigo.fr");

  // États pour les notifications
  const [notifNewUsers, setNotifNewUsers] = useState(true);
  const [notifReports, setNotifReports] = useState(true);

  // États pour la sécurité
  const [emailVerification, setEmailVerification] = useState(true);
  const [admin2FA, setAdmin2FA] = useState(false);

  // États pour le logo du site
  const [siteLogo, setSiteLogo] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // États pour les champs entreprise éditables
  const COMPANY_FIELDS = [
    { key: "companyName", label: "Raison sociale" },
    { key: "legalForm", label: "Forme juridique" },
    { key: "companyAddress", label: "Adresse du siège" },
    { key: "companyPostalCode", label: "Code postal" },
    { key: "companyCity", label: "Ville" },
    { key: "activityCode", label: "Code NAF/APE" },
    { key: "activityLabel", label: "Libellé activité" },
    { key: "companyCreationDate", label: "Date de création" },
    { key: "capital", label: "Capital social (activé par défaut)" },
  ] as const;

  const [companyEditableFields, setCompanyEditableFields] = useState<Record<string, boolean>>({
    companyName: false, companyAddress: false, companyPostalCode: false,
    companyCity: false, activityCode: false, activityLabel: false,
    companyCreationDate: false, capital: true, legalForm: false,
  });

  // Queries
  const allConfigs = useQuery(
    api.admin.config.getAllConfigs,
    token ? { token } : "skip"
  );
  const cloudinaryConfig = useQuery(api.config.getCloudinaryConfig);
  const companyEditableFieldsConfig = useQuery(api.admin.config.getCompanyEditableFields);

  // Mutations
  const updateConfig = useMutation(api.admin.config.updateConfig);
  const updateCompanyEditableFieldsMutation = useMutation(api.admin.config.updateCompanyEditableFields);

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
          case "site_logo":
            setSiteLogo(config.value || null);
            break;
        }
      }
    }
  }, [allConfigs]);

  // Charger la config des champs entreprise éditables
  useEffect(() => {
    if (companyEditableFieldsConfig) {
      setCompanyEditableFields(companyEditableFieldsConfig);
    }
  }, [companyEditableFieldsConfig]);

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
      const configsToSave = [
        { key: "site_name", value: siteName },
        { key: "contact_email", value: contactEmail },
        { key: "notif_new_users", value: notifNewUsers.toString() },
        { key: "notif_reports", value: notifReports.toString() },
        { key: "email_verification", value: emailVerification.toString() },
        { key: "admin_2fa", value: admin2FA.toString() },
      ];

      for (const config of configsToSave) {
        await updateConfig({
          token,
          key: config.key,
          value: config.value,
        });
      }

      // Sauvegarder les champs entreprise éditables
      await updateCompanyEditableFieldsMutation({
        token,
        fields: companyEditableFields as {
          companyName: boolean; companyAddress: boolean; companyPostalCode: boolean;
          companyCity: boolean; activityCode: boolean; activityLabel: boolean;
          companyCreationDate: boolean; capital: boolean; legalForm: boolean;
        },
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
          <Settings className="w-8 h-8 text-primary" />
          Paramètres
        </h1>
        <p className="text-slate-400 mt-1">
          Configuration générale de la plateforme
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General Settings */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
          transition={{ delay: 0.1 }}
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
          className="bg-slate-900 rounded-xl p-6 border border-slate-800 md:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Sécurité</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Company Editable Fields */}
        <motion.div
          className="bg-slate-900 rounded-xl p-6 border border-slate-800 md:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Champs entreprise éditables</h2>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Contrôlez quels champs les pros peuvent modifier. SIRET, type et TVA ne sont jamais modifiables.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {COMPANY_FIELDS.map((field) => (
              <label
                key={field.key}
                className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-750 transition-colors"
              >
                <span className="text-slate-300 text-sm">{field.label}</span>
                <input
                  type="checkbox"
                  checked={companyEditableFields[field.key] ?? false}
                  onChange={(e) =>
                    setCompanyEditableFields((prev) => ({
                      ...prev,
                      [field.key]: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500"
                />
              </label>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Spacer pour le bouton fixe */}
      <div className="h-24" />

      {/* Barre de sauvegarde fixe en bas */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 px-8 py-4 z-50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-slate-400 text-sm hidden sm:block">
            N&apos;oubliez pas d&apos;enregistrer vos modifications
          </p>
          <div className="flex items-center gap-4">
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-green-400"
              >
                <Check className="w-5 h-5" />
                <span className="hidden sm:inline">Modifications enregistrées</span>
              </motion.div>
            )}
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-lg"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isSaving ? "Sauvegarde en cours..." : "Sauvegarder tout"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
