"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical,
  Bell,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Calendar,
  CreditCard,
  Star,
  MessageCircle,
  User,
  Clock,
  Wallet,
} from "lucide-react";
import { useAdminAuth } from "@/app/hooks/useAdminAuth";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Zap, Database } from "lucide-react";

// Type pour les résultats de recherche utilisateur
type UserSearchResult = {
  _id: Id<"users">;
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
};

// Types de notifications disponibles
const notificationTypes = [
  {
    type: "new_mission",
    label: "Nouvelle mission",
    icon: Calendar,
    color: "bg-blue-500",
    defaultTitle: "Nouvelle demande !",
    defaultMessage: "Un client souhaite reserver vos services",
  },
  {
    type: "mission_accepted",
    label: "Mission acceptee",
    icon: CheckCircle,
    color: "bg-green-500",
    defaultTitle: "Demande acceptee !",
    defaultMessage: "Votre demande a ete acceptee par le prestataire",
  },
  {
    type: "mission_refused",
    label: "Mission refusee",
    icon: XCircle,
    color: "bg-red-500",
    defaultTitle: "Demande refusee",
    defaultMessage: "Le prestataire n'est pas disponible",
  },
  {
    type: "mission_completed",
    label: "Mission terminee",
    icon: CheckCircle,
    color: "bg-green-500",
    defaultTitle: "Mission terminee !",
    defaultMessage: "La mission s'est bien deroulee",
  },
  {
    type: "payment_captured",
    label: "Paiement recu",
    icon: Wallet,
    color: "bg-emerald-500",
    defaultTitle: "Paiement recu !",
    defaultMessage: "Vous avez recu un paiement de 50,00 EUR",
  },
  {
    type: "review_received",
    label: "Nouvel avis",
    icon: Star,
    color: "bg-yellow-500",
    defaultTitle: "Nouvel avis !",
    defaultMessage: "Un client vous a laisse un avis 5 etoiles",
  },
  {
    type: "new_message",
    label: "Nouveau message",
    icon: MessageCircle,
    color: "bg-blue-500",
    defaultTitle: "Nouveau message",
    defaultMessage: "Vous avez recu un nouveau message",
  },
  {
    type: "welcome",
    label: "Bienvenue",
    icon: User,
    color: "bg-purple-500",
    defaultTitle: "Bienvenue sur Animigo !",
    defaultMessage: "Votre compte a ete cree avec succes",
  },
  {
    type: "reminder",
    label: "Rappel",
    icon: Clock,
    color: "bg-orange-500",
    defaultTitle: "Rappel",
    defaultMessage: "Vous avez une mission demain",
  },
  {
    type: "system",
    label: "Systeme",
    icon: Bell,
    color: "bg-gray-500",
    defaultTitle: "Notification systeme",
    defaultMessage: "Ceci est une notification de test",
  },
];

export default function DevTestPage() {
  const { token } = useAdminAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [selectedType, setSelectedType] = useState(notificationTypes[0]);
  const [customTitle, setCustomTitle] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [useQStash, setUseQStash] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
  } | null>(null);

  // Rechercher les utilisateurs
  const users = useQuery(
    api.admin.users.searchUsers,
    token && searchQuery.length >= 2 ? { token, query: searchQuery } : "skip"
  );

  const createNotification = useMutation(
    api.notifications.mutations.createTestNotification
  );
  const sendViaQStash = useAction(
    api.notifications.actions.sendTestNotificationViaQStash
  );

  const handleSendNotification = async () => {
    if (!token || !selectedUserId) return;

    setSending(true);
    setResult(null);

    const payload = {
      adminToken: token,
      userId: selectedUserId,
      type: selectedType.type,
      title: customTitle || selectedType.defaultTitle,
      message: customMessage || selectedType.defaultMessage,
      linkUrl: linkUrl || undefined,
    };

    try {
      if (useQStash) {
        // Envoyer via QStash (flow complet)
        console.log("Sending via QStash:", payload);
        const qstashResult = await sendViaQStash(payload);
        console.log("QStash result:", qstashResult);

        if (qstashResult.success) {
          setResult({
            success: true,
            message: `Notification envoyee via QStash !`,
            messageId: qstashResult.messageId,
          });
        } else {
          setResult({
            success: false,
            message: qstashResult.error || "Erreur QStash",
          });
        }
      } else {
        // Envoyer directement via Convex
        console.log("Sending via Convex direct:", payload);
        const convexResult = await createNotification(payload);
        console.log("Convex result:", convexResult);

        setResult({
          success: true,
          message: `Notification "${selectedType.label}" envoyee (Convex direct)`,
        });
      }

      // Reset form
      setCustomTitle("");
      setCustomMessage("");
      setLinkUrl("");
    } catch (error) {
      console.error("Error creating notification:", error);
      setResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Erreur lors de l'envoi",
      });
    } finally {
      setSending(false);
    }
  };

  const selectedUser = users?.find((u: UserSearchResult) => u._id === selectedUserId);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <FlaskConical className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Dev Test</h1>
        </div>
        <p className="text-slate-400">
          Outils de test pour le developpement - Envoi de notifications
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section gauche: Selection utilisateur + type */}
        <div className="space-y-6">
          {/* Recherche utilisateur */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Selectionner un utilisateur
            </h2>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou email..."
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Resultats de recherche */}
            {users && users.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {users.map((user: UserSearchResult) => (
                  <button
                    key={user._id}
                    onClick={() => setSelectedUserId(user._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      selectedUserId === user._id
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {user.firstName?.charAt(0)}
                      {user.lastName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm opacity-70 truncate">{user.email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-700">
                      {user.accountType}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && users?.length === 0 && (
              <p className="text-slate-400 text-center py-4">
                Aucun utilisateur trouve
              </p>
            )}

            {searchQuery.length < 2 && (
              <p className="text-slate-500 text-center py-4 text-sm">
                Tapez au moins 2 caracteres pour rechercher
              </p>
            )}
          </div>

          {/* Selection type de notification */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              Type de notification
            </h2>

            <div className="grid grid-cols-2 gap-2">
              {notificationTypes.map((notifType) => {
                const Icon = notifType.icon;
                const isSelected = selectedType.type === notifType.type;

                return (
                  <button
                    key={notifType.type}
                    onClick={() => setSelectedType(notifType)}
                    className={`flex items-center gap-2 p-3 rounded-lg transition-colors text-left ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${notifType.color}`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">{notifType.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section droite: Formulaire + envoi */}
        <div className="space-y-6">
          {/* Toggle QStash / Convex direct */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Mode d'envoi
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setUseQStash(false)}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                  !useQStash
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Database className="w-4 h-4" />
                <span className="text-sm font-medium">Convex direct</span>
              </button>
              <button
                onClick={() => setUseQStash(true)}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-colors ${
                  useQStash
                    ? "bg-yellow-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Via QStash</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {useQStash
                ? "La notification passera par QStash → API → Convex (test du flow complet)"
                : "La notification sera créée directement dans Convex (plus rapide)"
              }
            </p>
          </div>

          {/* Formulaire personnalise */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-4">
              Personnaliser le message
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Titre (optionnel)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={selectedType.defaultTitle}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Message (optionnel)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={selectedType.defaultMessage}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  URL de redirection (optionnel)
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="/client/reservations"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Resume + Bouton envoi */}
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-4">Resume</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Destinataire:</span>
                <span className="text-white font-medium">
                  {selectedUser
                    ? `${selectedUser.firstName} ${selectedUser.lastName}`
                    : "Non selectionne"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Type:</span>
                <span className="text-white font-medium">
                  {selectedType.label}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Titre:</span>
                <span className="text-white font-medium truncate max-w-[200px]">
                  {customTitle || selectedType.defaultTitle}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Mode:</span>
                <span className={`font-medium ${useQStash ? "text-yellow-400" : "text-blue-400"}`}>
                  {useQStash ? "QStash" : "Convex direct"}
                </span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSendNotification}
              disabled={!selectedUserId || sending}
              className={`w-full flex items-center justify-center gap-2 py-3 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors ${
                useQStash
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  {useQStash ? <Zap className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                  {useQStash ? "Envoyer via QStash" : "Envoyer la notification"}
                </>
              )}
            </motion.button>

            {/* Resultat */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-4 rounded-lg ${
                  result.success
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-sm">{result.message}</span>
                </div>
                {result.messageId && (
                  <p className="text-xs text-slate-400 mt-2 ml-8">
                    Message ID: <code className="text-yellow-400">{result.messageId}</code>
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
