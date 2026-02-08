"use client";

import { useState, useEffect } from "react";
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
  AlertCircle,
  Check,
  Loader2,
  FileCheck,
  Info,
} from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";

type TabType = "profil" | "securite" | "notifications" | "sap";

export default function ParametresPage() {
  const { user } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const [activeTab, setActiveTab] = useState<TabType>("profil");

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "profil", label: "Profil", icon: <User className="w-5 h-5" /> },
    { id: "securite", label: "Sécurité", icon: <Lock className="w-5 h-5" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-5 h-5" /> },
    { id: "sap", label: "Éligibilité SAP", icon: <FileCheck className="w-5 h-5" /> },
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
        {activeTab === "sap" && <SapEligibilityTab token={token} />}
      </div>
    </div>
  );
}

// Tab Profil
function ProfilTab({ user, token }: { user: { firstName: string; lastName: string; email: string; username?: string } | null; token: string | null }) {
  const updateUserInfo = useMutation(api.auth.username.updateUserInfo);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: "",
    username: user?.username || "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState(formData.username);

  // Sync user data
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: "",
        username: user.username || "",
      });
      setDebouncedUsername(user.username || "");
    }
  }, [user]);

  // Debounce username
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(formData.username);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.username]);

  // Username check
  const usernameCheck = useQuery(
    api.auth.username.checkUsernameAvailability,
    debouncedUsername.trim().length >= 3 && debouncedUsername !== (user?.username || "")
      ? { username: debouncedUsername.trim() }
      : "skip"
  );

  const usernameIsOwn = debouncedUsername === (user?.username || "");
  const usernameIsValid = formData.username.trim().length >= 3 && (usernameIsOwn || usernameCheck?.available === true);
  const usernameIsTaken = formData.username.trim().length >= 3 && !usernameIsOwn && usernameCheck?.available === false && !usernameCheck?.error;

  const handleUsernameChange = (value: string) => {
    setFormData({ ...formData, username: value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30) });
  };

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    setError("");
    try {
      await updateUserInfo({
        sessionToken: token,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        ...(formData.username.trim().length >= 3 ? { username: formData.username.trim() } : {}),
      });
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

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

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-1">Nom d&apos;utilisateur</label>
          {isEditing ? (
            <div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">@</div>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="jeandupont"
                  maxLength={30}
                  className={cn(
                    "w-full pl-8 pr-10 py-2.5 border rounded-xl focus:outline-none focus:ring-2",
                    usernameIsValid
                      ? "border-green-300 focus:ring-green-200"
                      : usernameIsTaken
                      ? "border-red-300 focus:ring-red-200"
                      : "border-gray-200 focus:ring-primary/20 focus:border-primary"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameIsValid && <Check className="w-4 h-4 text-green-500" />}
                  {usernameIsTaken && <AlertCircle className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              {usernameIsTaken && (
                <p className="text-xs text-red-500 mt-1">
                  Ce nom est déjà pris{usernameCheck?.suggestion ? `. Essayez : ${usernameCheck.suggestion}` : ""}
                </p>
              )}
            </div>
          ) : (
            <p className="text-foreground font-medium">
              {user?.username ? `@${user.username}` : <span className="text-gray-400 italic">Non défini</span>}
            </p>
          )}
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            Modifications enregistrées
          </motion.div>
        )}

        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="pt-4 border-t border-gray-100"
          >
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
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
      await changePassword({
        token,
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });

      setMessage({ type: "success", text: "Mot de passe modifié avec succès" });
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
      setMessage({ type: "error", text: errorMessage });
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

// Tab Éligibilité SAP
function SapEligibilityTab({ token }: { token: string | null }) {
  const sapEligibility = useQuery(
    api.sap.eligibility.getClientSapEligibility,
    token ? { sessionToken: token } : "skip"
  );
  const updateEligibility = useMutation(api.sap.eligibility.updateClientSapEligibility);

  const [eligibility, setEligibility] = useState<"none" | "elderly_dependent" | "disabled">("none");
  const [attested, setAttested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (sapEligibility) {
      setEligibility((sapEligibility.sapEligibility as "none" | "elderly_dependent" | "disabled") ?? "none");
      setAttested(sapEligibility.sapEligibilityAttested ?? false);
    }
  }, [sapEligibility]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setErrorMsg("");
    try {
      await updateEligibility({
        sessionToken: token,
        sapEligibility: eligibility,
        sapEligibilityAttested: attested,
      });
      setSuccessMsg("Éligibilité SAP mise à jour");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Erreur lors de la sauvegarde");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Éligibilité SAP</h2>
        <p className="text-sm text-gray-500 mt-1">Services à la Personne - Avantage fiscal</p>
      </div>

      {/* Encart informatif */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700 space-y-2">
            <p className="font-medium">Qu&apos;est-ce que l&apos;éligibilité SAP ?</p>
            <p>
              Si vous êtes une <strong>personne âgée dépendante</strong> ou une <strong>personne en situation de handicap</strong>, vous pouvez bénéficier d&apos;un taux de TVA réduit à <strong>10%</strong> (au lieu de 20%) sur les services de garde et promenade d&apos;animaux réalisés par un prestataire déclaré SAP.
            </p>
            <p>
              Vous bénéficiez également d&apos;un <strong>crédit d&apos;impôt de 50%</strong> sur ces prestations.
            </p>
          </div>
        </div>
      </div>

      {/* Sélection de la situation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Votre situation
        </label>
        <div className="space-y-3">
          <label className={cn(
            "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors",
            eligibility === "none" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
          )}>
            <input
              type="radio"
              name="sap-eligibility"
              checked={eligibility === "none"}
              onChange={() => { setEligibility("none"); setAttested(false); }}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <div>
              <p className="font-medium text-gray-800">Non éligible</p>
              <p className="text-sm text-gray-500">Je ne suis pas dans une situation de dépendance</p>
            </div>
          </label>

          <label className={cn(
            "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors",
            eligibility === "elderly_dependent" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
          )}>
            <input
              type="radio"
              name="sap-eligibility"
              checked={eligibility === "elderly_dependent"}
              onChange={() => setEligibility("elderly_dependent")}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <div>
              <p className="font-medium text-gray-800">Personne âgée dépendante</p>
              <p className="text-sm text-gray-500">Bénéficiaire de l&apos;APA ou en perte d&apos;autonomie</p>
            </div>
          </label>

          <label className={cn(
            "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors",
            eligibility === "disabled" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
          )}>
            <input
              type="radio"
              name="sap-eligibility"
              checked={eligibility === "disabled"}
              onChange={() => setEligibility("disabled")}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <div>
              <p className="font-medium text-gray-800">Personne en situation de handicap</p>
              <p className="text-sm text-gray-500">Titulaire d&apos;une carte d&apos;invalidité ou de la PCH</p>
            </div>
          </label>
        </div>
      </div>

      {/* Attestation sur l'honneur */}
      {eligibility !== "none" && (
        <div className="border-t pt-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">
              J&apos;atteste sur l&apos;honneur être dans la situation déclarée ci-dessus. Je comprends que cette déclaration engage ma responsabilité et que toute fausse déclaration pourra entraîner des poursuites.
            </span>
          </label>
        </div>
      )}

      {/* Messages */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      {/* Bouton sauvegarder */}
      <button
        onClick={handleSave}
        disabled={saving || (eligibility !== "none" && !attested)}
        className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
        Sauvegarder
      </button>
    </div>
  );
}
