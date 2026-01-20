"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import {
  MapPin,
  CreditCard,
  Building2,
  Eye,
  EyeOff,
  Save,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Mail,
  Globe,
} from "lucide-react";

interface ConfigItem {
  key: string;
  value: string;
  isSecret: boolean;
  environment: "development" | "production";
  updatedAt: number;
}

interface ConfigField {
  key: string;
  label: string;
  description: string;
  isSecret: boolean;
  placeholder: string;
}

interface IntegrationSection {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  docsUrl: string;
  fields: ConfigField[];
}

const integrations: IntegrationSection[] = [
  {
    id: "app_config",
    name: "Configuration Application",
    description: "URL et paramètres de l'application",
    icon: Globe,
    color: "bg-indigo-500",
    docsUrl: "#",
    fields: [
      {
        key: "app_url",
        label: "URL de l'application",
        description: "URL de base (ex: http://localhost:3000 en dev, https://animigo.fr en prod)",
        isSecret: false,
        placeholder: "http://localhost:3000",
      },
      {
        key: "app_environment",
        label: "Environnement",
        description: "development ou production",
        isSecret: false,
        placeholder: "development",
      },
    ],
  },
  {
    id: "google_maps",
    name: "Service Google",
    description: "API pour la géolocalisation et l'affichage des cartes",
    icon: MapPin,
    color: "bg-green-500",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    fields: [
      {
        key: "google_maps_api_key",
        label: "API Key",
        description: "Clé API Google Maps Platform",
        isSecret: true,
        placeholder: "AIza...",
      },
    ],
  },
  {
    id: "stripe",
    name: "Stripe Connect",
    description: "Paiements et gestion des comptes vendeurs",
    icon: CreditCard,
    color: "bg-purple-500",
    docsUrl: "https://dashboard.stripe.com/apikeys",
    fields: [
      {
        key: "stripe_public_key",
        label: "Clé publique",
        description: "Clé publique Stripe (pk_...)",
        isSecret: false,
        placeholder: "pk_test_...",
      },
      {
        key: "stripe_secret_key",
        label: "Clé secrète",
        description: "Clé secrète Stripe (sk_...)",
        isSecret: true,
        placeholder: "sk_test_...",
      },
      {
        key: "stripe_webhook_secret",
        label: "Secret Webhook",
        description: "Secret pour valider les webhooks Stripe",
        isSecret: true,
        placeholder: "whsec_...",
      },
    ],
  },
  {
    id: "societe",
    name: "Société.com",
    description: "Vérification des entreprises et SIRET",
    icon: Building2,
    color: "bg-blue-500",
    docsUrl: "https://www.societe.com/api",
    fields: [
      {
        key: "societe_api_key",
        label: "API Key",
        description: "Clé API Société.com",
        isSecret: true,
        placeholder: "Votre clé API",
      },
    ],
  },
  {
    id: "resend",
    name: "Resend",
    description: "Service d'envoi d'emails transactionnels",
    icon: Mail,
    color: "bg-rose-500",
    docsUrl: "https://resend.com/api-keys",
    fields: [
      {
        key: "resend_api_key",
        label: "API Key",
        description: "Clé API Resend (re_...)",
        isSecret: true,
        placeholder: "re_...",
      },
      {
        key: "resend_from_email",
        label: "Email expéditeur",
        description: "Adresse email d'envoi (doit être vérifiée sur Resend)",
        isSecret: false,
        placeholder: "noreply@votredomaine.com",
      },
      {
        key: "resend_from_name",
        label: "Nom expéditeur",
        description: "Nom affiché comme expéditeur des emails",
        isSecret: false,
        placeholder: "Animigo",
      },
    ],
  },
];

export default function IntegrationsPage() {
  const { token } = useAdminAuth();
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const configs = useQuery(
    api.admin.config.getAllConfigs,
    token ? { token } : "skip"
  );

  const updateConfig = useMutation(api.admin.config.updateConfig);

  const getConfigValue = (key: string) => {
    if (values[key] !== undefined) return values[key];
    const config = configs?.find((c: ConfigItem) => c.key === key);
    return config?.value || "";
  };

  const handleSave = async (key: string, isSecret: boolean) => {
    if (!token) return;

    setSaving((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: "" }));

    try {
      await updateConfig({
        token,
        key,
        value: values[key] || "",
        isSecret,
        environment: "development",
      });
      setSaved((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setSaved((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [key]: error instanceof Error ? error.message : "Erreur lors de la sauvegarde",
      }));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Intégrations API</h1>
        <p className="text-slate-400 mt-1">
          Configurez les clés API pour les services externes
        </p>
      </div>

      {/* Warning */}
      <motion.div
        className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-yellow-400 font-medium">Mode développement</p>
          <p className="text-yellow-400/80 text-sm mt-1">
            Ces configurations sont pour l&apos;environnement de développement.
            En production, utilisez des variables d&apos;environnement sécurisées.
          </p>
        </div>
      </motion.div>

      {/* Integrations */}
      <div className="space-y-6">
        {integrations.map((integration, index) => (
          <motion.div
            key={integration.id}
            className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`${integration.color} p-3 rounded-lg`}>
                    <integration.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {integration.name}
                    </h2>
                    <p className="text-slate-400 text-sm">
                      {integration.description}
                    </p>
                  </div>
                </div>
                <a
                  href={integration.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm transition-colors"
                >
                  Documentation
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Fields */}
            <div className="p-6 space-y-4">
              {integration.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {field.label}
                  </label>
                  <p className="text-slate-500 text-xs mb-2">
                    {field.description}
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        type={
                          field.isSecret && !showSecrets[field.key]
                            ? "password"
                            : "text"
                        }
                        value={getConfigValue(field.key)}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                        className="w-full px-4 py-2.5 pr-12 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
                      />
                      {field.isSecret && (
                        <button
                          type="button"
                          onClick={() => toggleShowSecret(field.key)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showSecrets[field.key] ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleSave(field.key, field.isSecret)}
                      disabled={saving[field.key]}
                      className={`px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                        saved[field.key]
                          ? "bg-green-500 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {saving[field.key] ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : saved[field.key] ? (
                        <>
                          <Check className="w-5 h-5" />
                          Sauvé
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Sauver
                        </>
                      )}
                    </button>
                  </div>
                  {errors[field.key] && (
                    <p className="text-red-400 text-sm mt-2">
                      {errors[field.key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
