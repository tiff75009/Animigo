"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { cn } from "@/app/lib/utils";

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white rounded-2xl shadow-lg p-6", className)}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

// Password Section
function PasswordSection() {
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
  );
}

// Payment Section
function PaymentSection() {
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
  const [iban, setIban] = useState("FR76 •••• •••• •••• •••• •••• 847");

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

// Notifications Section
function NotificationsSection() {
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

export default function ParametresPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Paramètres
            </h1>
            <p className="text-text-light">
              Gérez vos préférences et informations de compte
            </p>
          </div>
        </div>
      </motion.div>

      {/* Sections */}
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <PasswordSection />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <PaymentSection />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <NotificationsSection />
        </motion.div>
      </div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-red-50 border border-red-200 rounded-2xl p-6"
      >
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
      </motion.div>
    </div>
  );
}
