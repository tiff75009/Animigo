"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Lock,
  Bell,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Shield,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";

type TabType = "profil" | "securite" | "notifications";

export default function ParametresPage() {
  const { user } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const [activeTab, setActiveTab] = useState<TabType>("profil");

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "profil", label: "Profil", icon: <User className="w-5 h-5" /> },
    { id: "securite", label: "Sécurité", icon: <Lock className="w-5 h-5" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-gray-500 mt-1">Gérez votre compte et vos préférences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-white text-foreground shadow-sm"
                : "text-gray-500 hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {activeTab === "profil" && <ProfilTab user={user} token={token} />}
        {activeTab === "securite" && <SecuriteTab token={token} />}
        {activeTab === "notifications" && <NotificationsTab />}
      </div>
    </div>
  );
}

// Tab Profil
function ProfilTab({ user, token }: { user: { firstName: string; lastName: string; email: string } | null; token: string | null }) {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Informations personnelles</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-primary font-medium text-sm hover:underline"
        >
          {isEditing ? "Annuler" : "Modifier"}
        </button>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Prénom</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            ) : (
              <p className="text-foreground font-medium">{user?.firstName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Nom</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            ) : (
              <p className="text-foreground font-medium">{user?.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-gray-400" />
            <p className="text-foreground">{user?.email}</p>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
              Vérifié
            </span>
          </div>
        </div>

        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="pt-4 border-t border-gray-100"
          >
            <button className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors">
              Enregistrer
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Tab Sécurité
function SecuriteTab({ token }: { token: string | null }) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const changePassword = useMutation(api.auth.session.changePassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (passwords.new !== passwords.confirm) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas" });
      return;
    }

    if (passwords.new.length < 8) {
      setMessage({ type: "error", text: "Le mot de passe doit contenir au moins 8 caractères" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await changePassword({
        token,
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });

      if (result.success) {
        setMessage({ type: "success", text: "Mot de passe modifié avec succès" });
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        setMessage({ type: "error", text: result.error || "Une erreur est survenue" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Une erreur est survenue" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password strength
  const getPasswordStrength = (password: string) => {
    if (!password) return { level: 0, label: "", color: "" };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const levels = [
      { level: 0, label: "", color: "" },
      { level: 1, label: "Faible", color: "bg-red-500" },
      { level: 2, label: "Moyen", color: "bg-yellow-500" },
      { level: 3, label: "Bon", color: "bg-blue-500" },
      { level: 4, label: "Fort", color: "bg-green-500" },
    ];
    return levels[strength];
  };

  const strength = getPasswordStrength(passwords.new);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Changer de mot de passe</h2>
        <p className="text-sm text-gray-500">Assurez-vous d'utiliser un mot de passe unique et sécurisé</p>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
        {/* Mot de passe actuel */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Mot de passe actuel
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? "text" : "password"}
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-foreground"
            >
              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Nouveau mot de passe */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-foreground"
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {passwords.new && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i <= strength.level ? strength.color : "bg-gray-200"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">Force : {strength.label}</p>
            </div>
          )}
        </div>

        {/* Confirmer */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Confirmer le nouveau mot de passe
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {passwords.confirm && passwords.new !== passwords.confirm && (
            <p className="mt-1 text-sm text-red-500">Les mots de passe ne correspondent pas</p>
          )}
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-3 rounded-xl flex items-center gap-2",
              message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}
          >
            {message.type === "success" ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {message.text}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !passwords.current || !passwords.new || !passwords.confirm}
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Changer le mot de passe
        </button>
      </form>

      {/* Zone de danger */}
      <div className="pt-6 border-t border-gray-100">
        <div className="flex items-start gap-4 p-4 bg-red-50 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-700">Zone de danger</h3>
            <p className="text-sm text-red-600 mt-1">
              La suppression de votre compte est irréversible et entraînera la perte de toutes vos données.
            </p>
            <button className="mt-3 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
              Supprimer mon compte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Notifications
function NotificationsTab() {
  const [notifications, setNotifications] = useState({
    email: {
      reservations: true,
      messages: true,
      promotions: false,
    },
    push: {
      reservations: true,
      messages: true,
      promotions: false,
    },
  });

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors",
        enabled ? "bg-primary" : "bg-gray-200"
      )}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
        animate={{ left: enabled ? 24 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Préférences de notifications</h2>
        <p className="text-sm text-gray-500">Choisissez comment vous souhaitez être informé</p>
      </div>

      {/* Email */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-foreground">Email</h3>
        </div>

        <div className="pl-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Réservations</p>
              <p className="text-sm text-gray-500">Confirmations, rappels, modifications</p>
            </div>
            <ToggleSwitch
              enabled={notifications.email.reservations}
              onChange={() => setNotifications({
                ...notifications,
                email: { ...notifications.email, reservations: !notifications.email.reservations }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Messages</p>
              <p className="text-sm text-gray-500">Nouveaux messages des pet-sitters</p>
            </div>
            <ToggleSwitch
              enabled={notifications.email.messages}
              onChange={() => setNotifications({
                ...notifications,
                email: { ...notifications.email, messages: !notifications.email.messages }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Promotions</p>
              <p className="text-sm text-gray-500">Offres spéciales et actualités</p>
            </div>
            <ToggleSwitch
              enabled={notifications.email.promotions}
              onChange={() => setNotifications({
                ...notifications,
                email: { ...notifications.email, promotions: !notifications.email.promotions }
              })}
            />
          </div>
        </div>
      </div>

      {/* Push */}
      <div className="space-y-4 pt-6 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-gray-400" />
          <h3 className="font-medium text-foreground">Notifications push</h3>
        </div>

        <div className="pl-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Réservations</p>
              <p className="text-sm text-gray-500">Alertes en temps réel</p>
            </div>
            <ToggleSwitch
              enabled={notifications.push.reservations}
              onChange={() => setNotifications({
                ...notifications,
                push: { ...notifications.push, reservations: !notifications.push.reservations }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Messages</p>
              <p className="text-sm text-gray-500">Notification immédiate des nouveaux messages</p>
            </div>
            <ToggleSwitch
              enabled={notifications.push.messages}
              onChange={() => setNotifications({
                ...notifications,
                push: { ...notifications.push, messages: !notifications.push.messages }
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
