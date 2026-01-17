"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Lock,
  CreditCard,
  Bell,
  Eye,
  EyeOff,
  Check,
  Plus,
  Trash2,
  Smartphone,
  Mail,
  MessageSquare,
  Calendar,
  Euro,
  Star,
  AlertCircle,
  Shield,
  User,
  Clock,
  Calculator,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Types
type TabId = "information" | "paiement" | "notification" | "planning";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const tabs: Tab[] = [
  { id: "information", label: "Information", icon: User },
  { id: "paiement", label: "Paiement", icon: CreditCard },
  { id: "notification", label: "Notification", icon: Bell },
  { id: "planning", label: "Planning", icon: Calendar },
];

// Toggle Switch Component
function ToggleSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative w-12 h-6 rounded-full transition-colors",
        enabled ? "bg-primary" : "bg-gray-300"
      )}
    >
      <motion.div
        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md"
        animate={{ x: enabled ? 24 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

// Section Card Component
function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-white rounded-2xl shadow-lg p-6", className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// Information Tab (Password)
function InformationTab() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (newPassword && newPassword === confirmPassword) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const passwordStrength = () => {
    if (newPassword.length === 0) return null;
    if (newPassword.length < 6) return { label: "Faible", color: "bg-red-500", width: "33%" };
    if (newPassword.length < 10) return { label: "Moyen", color: "bg-orange-500", width: "66%" };
    return { label: "Fort", color: "bg-green-500", width: "100%" };
  };

  const strength = passwordStrength();

  return (
    <div className="space-y-6">
      <SectionCard title="Modifier le mot de passe" icon={Lock}>
        <div className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-foreground"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {/* Password Strength */}
            {strength && (
              <div className="mt-2">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full", strength.color)}
                    initial={{ width: 0 }}
                    animate={{ width: strength.width }}
                  />
                </div>
                <p className={cn("text-xs mt-1", strength.color.replace("bg-", "text-"))}>
                  Force : {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Confirmer le nouveau mot de passe
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  "w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground pr-12",
                  confirmPassword && newPassword !== confirmPassword && "ring-2 ring-red-500"
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          {/* Save Button */}
          <motion.button
            onClick={handleSave}
            disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
            className={cn(
              "w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2",
              saved
                ? "bg-green-500 text-white"
                : "bg-primary text-white hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
            )}
            whileHover={{ scale: saved ? 1 : 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {saved ? (
              <>
                <Check className="w-5 h-5" />
                Mot de passe modifié
              </>
            ) : (
              "Modifier le mot de passe"
            )}
          </motion.button>
        </div>
      </SectionCard>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-red-700 mb-2">Zone de danger</h3>
        <p className="text-sm text-red-600 mb-4">
          Ces actions sont irréversibles. Procédez avec précaution.
        </p>
        <div className="flex flex-wrap gap-3">
          <motion.button
            className="px-4 py-2 border border-red-300 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Désactiver mon compte
          </motion.button>
          <motion.button
            className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Supprimer mon compte
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// Payment Tab
function PaymentTab() {
  const [cards, setCards] = useState([
    {
      id: "card1",
      type: "visa",
      last4: "4242",
      expiry: "12/25",
      isDefault: true,
    },
  ]);
  const [showAddCard, setShowAddCard] = useState(false);
  const iban = "FR76 •••• •••• •••• •••• •••• 847";

  const cardIcons: { [key: string]: string } = {
    visa: "💳",
    mastercard: "💳",
  };

  const handleDeleteCard = (cardId: string) => {
    setCards(cards.filter((c) => c.id !== cardId));
  };

  const handleSetDefault = (cardId: string) => {
    setCards(cards.map((c) => ({ ...c, isDefault: c.id === cardId })));
  };

  return (
    <SectionCard title="Coordonnées de paiement" icon={CreditCard}>
      <div className="space-y-6">
        {/* Bank Account (IBAN) */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Euro className="w-4 h-4 text-primary" />
            Compte bancaire (réception des paiements)
          </h3>
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-text-light">IBAN</p>
              <p className="font-mono text-foreground">{iban}</p>
            </div>
            <motion.button
              className="px-4 py-2 text-primary font-medium hover:bg-primary/10 rounded-lg transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Modifier
            </motion.button>
          </div>
          <p className="text-xs text-text-light mt-2 flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Vos coordonnées bancaires sont sécurisées et chiffrées
          </p>
        </div>

        {/* Saved Cards */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Cartes enregistrées (paiement des services)
          </h3>

          {cards.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <p className="text-text-light">Aucune carte enregistrée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className={cn(
                    "bg-gray-50 rounded-xl p-4 flex items-center justify-between",
                    card.isDefault && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cardIcons[card.type]}</span>
                    <div>
                      <p className="font-medium text-foreground">
                        •••• •••• •••• {card.last4}
                      </p>
                      <p className="text-sm text-text-light">Expire {card.expiry}</p>
                    </div>
                    {card.isDefault && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                        Par défaut
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!card.isDefault && (
                      <motion.button
                        onClick={() => handleSetDefault(card.id)}
                        className="px-3 py-1 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Définir par défaut
                      </motion.button>
                    )}
                    <motion.button
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Card Button */}
          <motion.button
            onClick={() => setShowAddCard(!showAddCard)}
            className="mt-3 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-text-light hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Plus className="w-5 h-5" />
            Ajouter une carte
          </motion.button>

          {/* Add Card Form */}
          {showAddCard && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 p-4 bg-gray-50 rounded-xl space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Numéro de carte
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Date d&apos;expiration
                  </label>
                  <input
                    type="text"
                    placeholder="MM/AA"
                    className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    CVC
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <motion.button
                  onClick={() => setShowAddCard(false)}
                  className="flex-1 py-3 bg-gray-200 text-foreground rounded-xl font-semibold"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Annuler
                </motion.button>
                <motion.button
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Ajouter
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}

// Notification Tab
function NotificationTab() {
  const [notifications, setNotifications] = useState({
    email: {
      newMission: true,
      messages: true,
      reviews: true,
      payments: true,
      newsletter: false,
    },
    push: {
      newMission: true,
      messages: true,
      reviews: false,
      payments: true,
      reminders: true,
    },
    sms: {
      newMission: false,
      urgentMessages: true,
      payments: false,
    },
  });

  const updateNotification = (
    channel: "email" | "push" | "sms",
    key: string,
    value: boolean
  ) => {
    setNotifications((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [key]: value,
      },
    }));
  };

  const notificationItems = {
    email: [
      { key: "newMission", label: "Nouvelles demandes de mission", icon: Calendar },
      { key: "messages", label: "Nouveaux messages", icon: MessageSquare },
      { key: "reviews", label: "Nouveaux avis", icon: Star },
      { key: "payments", label: "Paiements et factures", icon: Euro },
      { key: "newsletter", label: "Newsletter et actualités", icon: Mail },
    ],
    push: [
      { key: "newMission", label: "Nouvelles demandes de mission", icon: Calendar },
      { key: "messages", label: "Nouveaux messages", icon: MessageSquare },
      { key: "reviews", label: "Nouveaux avis", icon: Star },
      { key: "payments", label: "Paiements reçus", icon: Euro },
      { key: "reminders", label: "Rappels de missions", icon: AlertCircle },
    ],
    sms: [
      { key: "newMission", label: "Nouvelles demandes urgentes", icon: Calendar },
      { key: "urgentMessages", label: "Messages urgents", icon: MessageSquare },
      { key: "payments", label: "Confirmations de paiement", icon: Euro },
    ],
  };

  return (
    <SectionCard title="Notifications" icon={Bell}>
      <div className="space-y-8">
        {/* Email Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Notifications par email</h3>
          </div>
          <div className="space-y-3">
            {notificationItems.email.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-text-light" />
                  <span className="text-foreground">{item.label}</span>
                </div>
                <ToggleSwitch
                  enabled={notifications.email[item.key as keyof typeof notifications.email]}
                  onChange={(value) => updateNotification("email", item.key, value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Notifications push</h3>
          </div>
          <div className="space-y-3">
            {notificationItems.push.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-text-light" />
                  <span className="text-foreground">{item.label}</span>
                </div>
                <ToggleSwitch
                  enabled={notifications.push[item.key as keyof typeof notifications.push]}
                  onChange={(value) => updateNotification("push", item.key, value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* SMS Notifications */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Notifications SMS</h3>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-700">
              Les SMS sont réservés aux notifications urgentes. Des frais peuvent s&apos;appliquer.
            </p>
          </div>
          <div className="space-y-3">
            {notificationItems.sms.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-text-light" />
                  <span className="text-foreground">{item.label}</span>
                </div>
                <ToggleSwitch
                  enabled={notifications.sms[item.key as keyof typeof notifications.sms]}
                  onChange={(value) => updateNotification("sms", item.key, value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// Planning Tab - Simplified
function PlanningTab() {
  // Get token from localStorage
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("session_token"));
  }, []);

  // Fetch user preferences from backend
  const preferences = useQuery(
    api.services.preferences.getPreferences,
    token ? { token } : "skip"
  );

  // Fetch global workday config from admin
  const workdayConfig = useQuery(api.admin.config.getWorkdayConfig);

  const updatePreferences = useMutation(api.services.preferences.updatePlanningPreferences);

  // Workday config from admin (read-only for users)
  const workdayHours = workdayConfig?.workdayHours ?? 8;
  const halfDayHours = workdayConfig?.halfDayHours ?? 4;

  // Local state for user preferences
  const [acceptReservationsFrom, setAcceptReservationsFrom] = useState("08:00");
  const [acceptReservationsTo, setAcceptReservationsTo] = useState("20:00");
  const [billingMode, setBillingMode] = useState<"round_up" | "exact">("round_up");
  const [roundUpThreshold, setRoundUpThreshold] = useState(2);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync local state with backend preferences
  useEffect(() => {
    if (preferences) {
      setAcceptReservationsFrom(preferences.acceptReservationsFrom ?? "08:00");
      setAcceptReservationsTo(preferences.acceptReservationsTo ?? "20:00");
      setBillingMode(preferences.billingMode ?? "round_up");
      setRoundUpThreshold(preferences.roundUpThreshold ?? 2);
    }
  }, [preferences]);

  const handleSave = async () => {
    if (!token) return;

    setSaving(true);
    try {
      await updatePreferences({
        token,
        acceptReservationsFrom,
        acceptReservationsTo,
        billingMode,
        roundUpThreshold,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  // Example overflow hours (user can see how billing works)
  const [exampleOverflow, setExampleOverflow] = useState(3);

  // Calculate example billing
  const calculateExample = () => {
    const effectiveThreshold = Math.min(roundUpThreshold, halfDayHours);

    if (billingMode === "exact") {
      if (exampleOverflow === 0) {
        return `1 journée (${workdayHours}h)`;
      }
      return `1 journée (${workdayHours}h) + ${exampleOverflow}h supplémentaires facturées au tarif horaire`;
    } else {
      if (exampleOverflow === 0) {
        return `1 journée (${workdayHours}h)`;
      }
      if (exampleOverflow >= effectiveThreshold) {
        const halfDaysNeeded = Math.ceil(exampleOverflow / halfDayHours);
        if (halfDaysNeeded === 1) {
          return `1 journée et demie (${workdayHours + halfDayHours}h facturées)`;
        } else if (halfDaysNeeded === 2) {
          return `2 journées (${workdayHours * 2}h facturées)`;
        } else {
          return `1 journée + ${halfDaysNeeded} demi-journées (${workdayHours + halfDayHours * halfDaysNeeded}h facturées)`;
        }
      }
      return `1 journée (${workdayHours}h) + ${exampleOverflow}h supplémentaires`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Availability Hours */}
      <SectionCard title="Horaires de disponibilité" icon={Clock}>
        <div className="space-y-4">
          <p className="text-sm text-text-light">
            Définissez les horaires pendant lesquels vous acceptez les réservations.
            Les clients ne pourront pas réserver en dehors de ces créneaux.
          </p>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              J&apos;accepte les réservations de
            </label>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={acceptReservationsFrom}
                onChange={(e) => setAcceptReservationsFrom(e.target.value)}
                className="px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="text-text-light">à</span>
              <input
                type="time"
                value={acceptReservationsTo}
                onChange={(e) => setAcceptReservationsTo(e.target.value)}
                className="px-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Info about global workday config */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-text-light flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-gray-400" />
              Journée de travail : <span className="font-semibold text-foreground">{workdayHours}h</span>
              {" / "}
              Demi-journée : <span className="font-semibold text-foreground">{halfDayHours}h</span>
            </p>
            <p className="text-xs text-text-light mt-1">
              Ces valeurs sont définies par la plateforme pour le calcul des tarifs.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Billing Mode */}
      <SectionCard title="Mode de facturation" icon={Calculator}>
        <div className="space-y-6">
          <p className="text-sm text-text-light">
            Choisissez comment facturer les dépassements d&apos;horaires.
          </p>

          {/* Billing Mode Options */}
          <div className="space-y-3">
            <motion.button
              onClick={() => setBillingMode("round_up")}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-colors",
                billingMode === "round_up"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              )}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                  billingMode === "round_up" ? "border-primary bg-primary" : "border-gray-300"
                )}>
                  {billingMode === "round_up" && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className="font-semibold text-foreground">Arrondir à la demi-journée</p>
                  <p className="text-sm text-text-light mt-1">
                    Si le dépassement atteint le seuil, facturer une demi-journée ou journée complète.
                  </p>
                </div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => setBillingMode("exact")}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-colors",
                billingMode === "exact"
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              )}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                  billingMode === "exact" ? "border-primary bg-primary" : "border-gray-300"
                )}>
                  {billingMode === "exact" && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className="font-semibold text-foreground">Facturer les heures exactes</p>
                  <p className="text-sm text-text-light mt-1">
                    Facturer le tarif journée + les heures supplémentaires au tarif horaire.
                  </p>
                </div>
              </div>
            </motion.button>
          </div>

          {/* Round Up Threshold (only if round_up mode) */}
          {billingMode === "round_up" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="block text-sm font-medium text-foreground mb-2">
                Seuil d&apos;arrondi (heures)
              </label>
              <p className="text-xs text-text-light mb-3">
                Si le dépassement est supérieur ou égal à ce seuil, arrondir à la demi-journée supérieure.
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={Math.max(halfDayHours, 2)}
                  value={Math.min(roundUpThreshold, halfDayHours)}
                  onChange={(e) => setRoundUpThreshold(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <div className="w-20 px-3 py-2 bg-gray-100 rounded-lg text-center font-semibold text-primary">
                  {Math.min(roundUpThreshold, halfDayHours)}h
                </div>
              </div>
            </motion.div>
          )}

          {/* Example */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Exemple de facturation
            </h4>

            {/* Interactive example */}
            <div className="mb-3">
              <label className="block text-xs text-blue-700 mb-2">
                Simuler une réservation : 1 journée + heures supplémentaires
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={halfDayHours * 2}
                  value={exampleOverflow}
                  onChange={(e) => setExampleOverflow(Number(e.target.value))}
                  className="flex-1 accent-blue-600"
                />
                <div className="w-16 px-2 py-1 bg-blue-100 rounded text-center text-sm font-semibold text-blue-800">
                  +{exampleOverflow}h
                </div>
              </div>
            </div>

            <div className="bg-blue-100/50 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                Réservation de <span className="font-semibold">{workdayHours + exampleOverflow} heures</span> ({workdayHours}h + {exampleOverflow}h) :
              </p>
              <p className="text-sm text-blue-800 font-medium mt-1">
                <ChevronRight className="w-4 h-4 inline" /> {calculateExample()}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Save Button */}
      <motion.button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "w-full py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2",
          saved
            ? "bg-green-500 text-white"
            : "bg-primary text-white hover:bg-primary/90 disabled:bg-gray-300"
        )}
        whileHover={{ scale: saved ? 1 : 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {saved ? (
          <>
            <Check className="w-5 h-5" />
            Préférences enregistrées
          </>
        ) : saving ? (
          "Enregistrement..."
        ) : (
          "Enregistrer les préférences"
        )}
      </motion.button>
    </div>
  );
}

// Main Page Component
export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState<TabId>("information");

  const renderTab = () => {
    switch (activeTab) {
      case "information":
        return <InformationTab />;
      case "paiement":
        return <PaymentTab />;
      case "notification":
        return <NotificationTab />;
      case "planning":
        return <PlanningTab />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      {/* Sidebar */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="lg:w-64 flex-shrink-0"
      >
        <div className="bg-white rounded-2xl shadow-lg p-4 sticky top-4">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Paramètres</h1>
          </div>

          <nav className="space-y-1">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-gray-100"
                )}
                whileHover={{ scale: activeTab === tab.id ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </motion.button>
            ))}
          </nav>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
