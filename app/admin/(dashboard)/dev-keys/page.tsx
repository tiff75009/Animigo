"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { motion } from "framer-motion";
import { Key, Plus, Trash2, Copy, Check, Circle, Code, Eye, EyeOff, RefreshCw, Loader2, ShieldAlert } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

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

interface DevKey {
  id: Id<"devKeys">;
  name: string;
  key: string;
  isActive: boolean;
  createdAt: number;
  revokedAt?: number | null;
  isOnline: boolean;
  onlineSince: number | null;
  lastSeen: number | null;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `il y a ${days}j`;
  if (hours > 0) return `il y a ${hours}h`;
  if (minutes > 0) return `il y a ${minutes}min`;
  return "à l'instant";
}

function formatDuration(startTimestamp: number): string {
  const diff = Date.now() - startTimestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
  }
  return `${minutes}min`;
}

export default function DevKeysPage() {
  const { token } = useAdminAuth();
  const [newDevName, setNewDevName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // États pour le secret API interne
  const [internalApiSecret, setInternalApiSecret] = useState("");
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [envCopied, setEnvCopied] = useState(false);
  const [isGeneratingSecret, setIsGeneratingSecret] = useState(false);

  const devKeys = useQuery(
    api.admin.devPresence.getAllDevKeys,
    token ? { token } : "skip"
  );

  // Query pour configs (secret API interne)
  const allConfigs = useQuery(
    api.admin.config.getAllConfigs,
    token ? { token } : "skip"
  );

  const createKey = useMutation(api.admin.devPresence.createDevKey);
  const revokeKey = useMutation(api.admin.devPresence.revokeDevKey);
  const updateConfig = useMutation(api.admin.config.updateConfig);

  // Charger le secret API interne
  useEffect(() => {
    if (allConfigs) {
      const secretConfig = allConfigs.find((c: { key: string; value: string }) => c.key === "internal_api_secret");
      if (secretConfig) {
        setInternalApiSecret(secretConfig.value);
      }
    }
  }, [allConfigs]);

  const handleGenerateSecret = async () => {
    if (!token) return;
    setIsGeneratingSecret(true);
    try {
      const newSecret = generateSecret(64);
      setInternalApiSecret(newSecret);
      await updateConfig({ token, key: "internal_api_secret", value: newSecret });
    } catch (error) {
      console.error("Erreur lors de la génération du secret:", error);
    } finally {
      setIsGeneratingSecret(false);
    }
  };

  const handleCopyApiSecret = async () => {
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

  const handleCreate = async () => {
    if (!token || !newDevName.trim()) return;
    setIsCreating(true);
    try {
      const result = await createKey({ token, devName: newDevName.trim() });
      setNewKey(result.key);
      setNewDevName("");
    } catch (error) {
      console.error("Erreur création clé:", error);
    }
    setIsCreating(false);
  };

  const handleCopy = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(`NEXT_PUBLIC_DEV_KEY=${newKey}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevoke = async (devKeyId: Id<"devKeys">) => {
    if (!token) return;
    if (confirm("Voulez-vous révoquer cette clé ? Le développeur sera déconnecté.")) {
      await revokeKey({ token, devKeyId });
    }
  };

  const toggleKeyVisibility = (keyId: Id<"devKeys">) => {
    const id = String(keyId);
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleCopyExistingKey = async (key: string, keyId: Id<"devKeys">) => {
    await navigator.clipboard.writeText(`NEXT_PUBLIC_DEV_KEY=${key}`);
    setCopiedKeyId(String(keyId));
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const isKeyVisible = (keyId: Id<"devKeys">) => visibleKeys.has(String(keyId));

  const onlineCount = devKeys?.filter((dk: DevKey) => dk.isOnline).length ?? 0;
  const activeCount = devKeys?.filter((dk: DevKey) => dk.isActive).length ?? 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Code className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Clés Développeur</h1>
        </div>
        <p className="text-slate-400">
          Gérez les clés de présence pour voir qui développe en temps réel
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          className="bg-slate-900 rounded-xl p-5 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-slate-400 text-sm">En ligne</p>
          <p className="text-2xl font-bold text-emerald-400">{onlineCount}</p>
        </motion.div>
        <motion.div
          className="bg-slate-900 rounded-xl p-5 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-slate-400 text-sm">Clés actives</p>
          <p className="text-2xl font-bold text-blue-400">{activeCount}</p>
        </motion.div>
        <motion.div
          className="bg-slate-900 rounded-xl p-5 border border-slate-800"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-slate-400 text-sm">Total clés</p>
          <p className="text-2xl font-bold text-white">{devKeys?.length ?? 0}</p>
        </motion.div>
      </div>

      {/* Formulaire création */}
      <motion.div
        className="bg-slate-900 rounded-xl p-6 border border-slate-800 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-400" />
          Créer une nouvelle clé
        </h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={newDevName}
            onChange={(e) => setNewDevName(e.target.value)}
            placeholder="Nom du développeur (ex: Thomas)"
            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          <button
            onClick={handleCreate}
            disabled={!newDevName.trim() || isCreating}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors font-medium"
          >
            <Key className="w-4 h-4" />
            {isCreating ? "Création..." : "Générer la clé"}
          </button>
        </div>

        {/* Affichage de la clé nouvellement créée */}
        {newKey && (
          <motion.div
            className="mt-4 p-4 bg-emerald-900/30 border border-emerald-700/50 rounded-lg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <p className="text-emerald-400 text-sm mb-2 font-medium">
              Clé créée ! Copiez-la pour la partager au développeur :
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-slate-800 rounded-lg text-sm text-white font-mono break-all border border-slate-700">
                NEXT_PUBLIC_DEV_KEY={newKey}
              </code>
              <button
                onClick={handleCopy}
                className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                title="Copier"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Copy className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Ajoutez cette ligne dans le fichier <code className="text-emerald-400">.env.local</code> du développeur
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Liste des clés */}
      <motion.div
        className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Toutes les clés</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Développeur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Clé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Créée le
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Session / Dernière activité
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {devKeys?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Aucune clé créée. Générez une première clé pour commencer.
                  </td>
                </tr>
              )}
              {devKeys?.map((dk: DevKey) => (
                <tr
                  key={dk.id}
                  className={`${!dk.isActive ? "opacity-50" : ""} hover:bg-slate-800/30 transition-colors`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Circle
                        className={`w-3 h-3 ${
                          dk.isOnline
                            ? "fill-emerald-400 text-emerald-400 animate-pulse"
                            : dk.isActive
                              ? "fill-slate-500 text-slate-500"
                              : "fill-red-500 text-red-500"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          dk.isOnline
                            ? "text-emerald-400"
                            : dk.isActive
                              ? "text-slate-400"
                              : "text-red-400"
                        }`}
                      >
                        {dk.isOnline ? "En ligne" : dk.isActive ? "Hors ligne" : "Révoquée"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white font-medium">{dk.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-1 rounded max-w-[200px] truncate">
                        {isKeyVisible(dk.id) ? (dk.key || "Clé non disponible") : "••••••••••••••••"}
                      </code>
                      <button
                        onClick={() => toggleKeyVisibility(dk.id)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        title={isKeyVisible(dk.id) ? "Masquer la clé" : "Afficher la clé"}
                      >
                        {isKeyVisible(dk.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCopyExistingKey(dk.key, dk.id)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition-colors"
                        title="Copier la clé"
                      >
                        {copiedKeyId === String(dk.id) ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {new Date(dk.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {dk.isOnline && dk.onlineSince ? (
                      <span className="text-emerald-400">
                        En ligne depuis {formatDuration(dk.onlineSince)}
                      </span>
                    ) : dk.lastSeen ? (
                      <span className="text-slate-400">
                        {formatRelativeTime(dk.lastSeen)}
                      </span>
                    ) : (
                      <span className="text-slate-500">Jamais connecté</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {dk.isActive && (
                      <button
                        onClick={() => handleRevoke(dk.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Révoquer la clé"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Instructions */}
      <motion.div
        className="mt-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-blue-400 font-medium mb-2">Comment ça marche ?</h3>
        <ol className="text-slate-400 text-sm space-y-1 list-decimal list-inside">
          <li>Créez une clé pour chaque développeur</li>
          <li>Le développeur ajoute <code className="text-blue-400 bg-slate-800 px-1 rounded">NEXT_PUBLIC_DEV_KEY=xxx</code> dans son <code className="text-blue-400">.env.local</code></li>
          <li>Quand il lance <code className="text-blue-400 bg-slate-800 px-1 rounded">bun dev</code>, il apparaît en ligne ici</li>
          <li>Après 2 minutes sans activité, il passe hors ligne</li>
        </ol>
      </motion.div>

      {/* Secret API Interne */}
      <motion.div
        className="mt-6 bg-slate-900 rounded-xl p-6 border border-slate-800"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Key className="w-5 h-5 text-orange-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Secret API Interne</h2>
        </div>
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">
            Ce secret est utilisé pour sécuriser la communication entre les actions Convex et l&apos;API Next.js
            (nécessaire pour le système de paiement Stripe sur Convex self-hosted).
          </p>

          {internalApiSecret ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showApiSecret ? "text" : "password"}
                    value={internalApiSecret}
                    readOnly
                    className="w-full px-4 py-2.5 pr-20 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm"
                  />
                  <button
                    onClick={() => setShowApiSecret(!showApiSecret)}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title={showApiSecret ? "Masquer" : "Afficher"}
                  >
                    {showApiSecret ? (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <button
                    onClick={handleCopyApiSecret}
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

              <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
                <code className="flex-1 text-orange-400 text-sm font-mono truncate">
                  INTERNAL_API_SECRET={showApiSecret ? internalApiSecret : "••••••••••••••••"}
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
              Attention : régénérer un secret invalidera l&apos;ancien. Vous devrez mettre à jour votre fichier .env.local.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
