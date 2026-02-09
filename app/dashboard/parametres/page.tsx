"use client";

import { useState, useEffect, useRef } from "react";
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
  Banknote,
  Zap,
  Loader2,
  Building,
  MapPin,
  CalendarIcon,
  Info,
  Ban,
  FileCheck,
  Upload,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/app/lib/utils";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

// Types
type TabId = "information" | "paiement" | "notification" | "planning" | "sap";

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
  { id: "sap", label: "SAP", icon: FileCheck },
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

// Information Tab (Personal Info + Password)
function InformationTab() {
  // Token et session
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    setToken(localStorage.getItem("auth_token"));
  }, []);

  const sessionData = useQuery(
    api.auth.session.getSession,
    token ? { token } : "skip"
  );

  const updateUserInfo = useMutation(api.auth.username.updateUserInfo);

  // Personal info state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [personalInfoSaved, setPersonalInfoSaved] = useState(false);
  const [personalInfoSaving, setPersonalInfoSaving] = useState(false);
  const [personalInfoError, setPersonalInfoError] = useState("");

  // Sync session data
  useEffect(() => {
    if (sessionData?.user) {
      setFirstName(sessionData.user.firstName);
      setLastName(sessionData.user.lastName);
      setPhone(sessionData.user.phone || "");
      setUsername(sessionData.user.username || "");
      setDebouncedUsername(sessionData.user.username || "");
    }
  }, [sessionData]);

  // Debounce username check
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(username);
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  // Username availability check
  const usernameCheck = useQuery(
    api.auth.username.checkUsernameAvailability,
    debouncedUsername.trim().length >= 3 && debouncedUsername !== (sessionData?.user?.username || "")
      ? { username: debouncedUsername.trim() }
      : "skip"
  );

  const usernameIsOwn = debouncedUsername === (sessionData?.user?.username || "");
  const usernameIsValid = username.trim().length >= 3 && (usernameIsOwn || usernameCheck?.available === true);
  const usernameIsTaken = username.trim().length >= 3 && !usernameIsOwn && usernameCheck?.available === false && !usernameCheck?.error;

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
    setUsername(value);
  };

  const handleSavePersonalInfo = async () => {
    if (!token) return;
    setPersonalInfoSaving(true);
    setPersonalInfoError("");
    try {
      await updateUserInfo({
        sessionToken: token,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.replace(/\s/g, ""),
        ...(username.trim().length >= 3 ? { username: username.trim() } : {}),
      });
      setPersonalInfoSaved(true);
      setTimeout(() => setPersonalInfoSaved(false), 3000);
    } catch (error: unknown) {
      setPersonalInfoError(error instanceof Error ? error.message : "Erreur lors de la sauvegarde");
      setTimeout(() => setPersonalInfoError(""), 5000);
    } finally {
      setPersonalInfoSaving(false);
    }
  };

  // Password state
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saved, setSaved] = useState(false);

  const changePasswordMutation = useMutation(api.auth.session.changePassword);

  const handleSave = async () => {
    if (!token || !newPassword || newPassword !== confirmPassword) return;
    try {
      await changePasswordMutation({
        token,
        currentPassword,
        newPassword,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      // handled silently
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
      {/* Informations personnelles */}
      <SectionCard title="Informations personnelles" icon={User}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Prénom</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nom d&apos;utilisateur
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light">
                <span className="text-sm font-medium">@</span>
              </div>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="jeandupont"
                maxLength={30}
                className={cn(
                  "w-full pl-8 pr-10 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 text-foreground",
                  usernameIsValid
                    ? "ring-2 ring-green-500 focus:ring-green-500"
                    : usernameIsTaken
                    ? "ring-2 ring-red-500 focus:ring-red-500"
                    : "focus:ring-primary/50"
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
            {usernameIsValid && !usernameIsOwn && (
              <p className="text-xs text-green-600 mt-1">Disponible</p>
            )}
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Téléphone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl">
              <Mail className="w-4 h-4 text-text-light" />
              <span className="text-foreground">{sessionData?.user?.email}</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium ml-auto">
                Vérifié
              </span>
            </div>
          </div>

          {personalInfoError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {personalInfoError}
            </div>
          )}

          <motion.button
            onClick={handleSavePersonalInfo}
            disabled={personalInfoSaving}
            className={cn(
              "w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2",
              personalInfoSaved
                ? "bg-green-500 text-white"
                : "bg-primary text-white hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
            )}
            whileHover={{ scale: personalInfoSaved ? 1 : 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {personalInfoSaved ? (
              <>
                <Check className="w-5 h-5" />
                Modifications enregistrées
              </>
            ) : personalInfoSaving ? (
              "Enregistrement..."
            ) : (
              "Enregistrer les modifications"
            )}
          </motion.button>
        </div>
      </SectionCard>

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

// Payment Tab - Stripe Connect Custom avec Account Tokens
function PaymentTab() {
  // Get token from localStorage
  const [token, setToken] = useState<string | null>(null);
  const [stripeInstance, setStripeInstance] = useState<any>(null);

  useEffect(() => {
    setToken(localStorage.getItem("auth_token"));
  }, []);

  // Queries
  const stripeInfo = useQuery(
    api.api.stripeConnectQueries.getAnnouncerStripeInfo,
    token ? { sessionToken: token } : "skip"
  );

  const payoutSettings = useQuery(api.admin.config.getPayoutSettingsPublic);
  const stripePublicKey = useQuery(api.config.getStripePublicKey);

  // Charger Stripe.js
  useEffect(() => {
    if (stripePublicKey && !stripeInstance) {
      import("@stripe/stripe-js").then(({ loadStripe }) => {
        loadStripe(stripePublicKey).then(setStripeInstance);
      });
    }
  }, [stripePublicKey, stripeInstance]);

  // Mutations & Actions
  const updatePayoutMode = useMutation(api.api.stripeConnectQueries.updatePayoutMode);
  const saveStripeAccountResult = useMutation(api.api.stripeConnectQueries.saveStripeAccountResult);
  const clearStripeDataPublic = useMutation(api.api.stripeConnectQueries.clearStripeDataPublic);
  const updateStripeStatus = useMutation(api.api.stripeConnectQueries.updateStripeStatus);
  const createStripeAccountDirect = useAction(api.api.stripeConnect.createStripeAccountDirect);
  const deleteStripeAccount = useAction(api.api.stripeConnect.deleteStripeAccount);
  const updateStripeAccountProfile = useAction(api.api.stripeConnect.updateStripeAccountProfile);

  // Local state
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedPayoutMode, setSelectedPayoutMode] = useState<"scheduled" | "instant">("scheduled");

  // Form state for bank setup
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postalCode: "",
    iban: "",
  });

  // Sync payout mode with server
  useEffect(() => {
    if (stripeInfo?.payoutMode) {
      setSelectedPayoutMode(stripeInfo.payoutMode);
    }
  }, [stripeInfo?.payoutMode]);

  // Pré-remplir le formulaire avec les infos du compte quand on ouvre le formulaire
  const prevShowSetupForm = useRef(false);
  useEffect(() => {
    // Pré-remplir seulement quand on ouvre le formulaire (transition false -> true)
    if (showSetupForm && !prevShowSetupForm.current && stripeInfo) {
      setFormData({
        firstName: stripeInfo.firstName || "",
        lastName: stripeInfo.lastName || "",
        dobDay: "",
        dobMonth: "",
        dobYear: "",
        addressLine1: stripeInfo.address || "",
        addressLine2: "",
        city: stripeInfo.city || "",
        postalCode: stripeInfo.postalCode || "",
        iban: "",
      });
    }
    prevShowSetupForm.current = showSetupForm;
  }, [showSetupForm, stripeInfo]);

  // Handle payout mode change
  const handlePayoutModeChange = async (mode: "scheduled" | "instant") => {
    if (!token) return;
    setSelectedPayoutMode(mode);
    try {
      await updatePayoutMode({ sessionToken: token, payoutMode: mode });
      setSuccessMessage("Mode de versement mis à jour");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Erreur:", error);
      setErrorMessage("Erreur lors de la mise à jour");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  // Handle bank account setup with Stripe.js tokens
  const handleSetupBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !stripeInstance) {
      setErrorMessage("Stripe n'est pas chargé. Veuillez réessayer.");
      return;
    }

    // Validation basique
    if (!formData.firstName || !formData.lastName || !formData.iban) {
      setErrorMessage("Veuillez remplir tous les champs obligatoires");
      return;
    }

    // Validation IBAN format basique
    const ibanClean = formData.iban.replace(/\s/g, "").toUpperCase();
    if (ibanClean.length < 15 || ibanClean.length > 34) {
      setErrorMessage("Format IBAN invalide");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // 1. Créer le token account avec Stripe.js (pour plateformes FR)
      const accountResult = await stripeInstance.createToken("account", {
        business_type: "individual",
        individual: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          dob: {
            day: parseInt(formData.dobDay) || 1,
            month: parseInt(formData.dobMonth) || 1,
            year: parseInt(formData.dobYear) || 1990,
          },
          address: {
            line1: formData.addressLine1,
            line2: formData.addressLine2 || undefined,
            city: formData.city,
            postal_code: formData.postalCode,
            country: "FR",
          },
        },
        tos_shown_and_accepted: true,
      });

      if (accountResult.error) {
        throw new Error(accountResult.error.message);
      }

      // 2. Créer le token bank_account avec Stripe.js
      const bankResult = await stripeInstance.createToken("bank_account", {
        country: "FR",
        currency: "eur",
        account_holder_name: `${formData.firstName} ${formData.lastName}`,
        account_holder_type: "individual",
        account_number: ibanClean,
      });

      if (bankResult.error) {
        throw new Error(bankResult.error.message);
      }

      // 3. Construire l'URL du profil annonceur
      const profileUrl = stripeInfo?.userSlug
        ? `https://animigo.fr/annonceur/${stripeInfo.userSlug}`
        : stripeInfo?.userId
          ? `https://animigo.fr/annonceur/${stripeInfo.userId}`
          : undefined;

      // 4. Appeler l'action Stripe (crée le compte et ajoute le compte bancaire)
      const stripeResult = await createStripeAccountDirect({
        sessionToken: token,
        accountToken: accountResult.token.id,
        bankAccountToken: bankResult.token.id,
        profileUrl,
      });

      if (stripeResult.success) {
        // 4. Sauvegarder les résultats en base via mutation
        await saveStripeAccountResult({
          sessionToken: token,
          stripeAccountId: stripeResult.stripeAccountId,
          status: stripeResult.status,
          chargesEnabled: stripeResult.chargesEnabled,
          payoutsEnabled: stripeResult.payoutsEnabled,
          ibanLast4: stripeResult.ibanLast4,
        });

        setSuccessMessage("Compte bancaire configuré avec succès !");
        setShowSetupForm(false);
        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          dobDay: "",
          dobMonth: "",
          dobYear: "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          postalCode: "",
          iban: "",
        });
      }
    } catch (error: any) {
      console.error("Erreur setup:", error);
      setErrorMessage(error?.message || "Erreur lors de la configuration");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setSuccessMessage("");
        setErrorMessage("");
      }, 8000);
    }
  };

  // Format IBAN pour affichage
  const formatIban = (iban: string) => {
    return iban.replace(/(.{4})/g, "$1 ").trim();
  };

  // Handle update Stripe profile (ajouter l'URL du profil)
  const handleUpdateStripeProfile = async () => {
    if (!stripeInfo?.stripeAccountId || !token) return;

    // Construire l'URL du profil
    const profileUrl = stripeInfo?.userSlug
      ? `https://animigo.fr/annonceur/${stripeInfo.userSlug}`
      : stripeInfo?.userId
        ? `https://animigo.fr/annonceur/${stripeInfo.userId}`
        : "https://animigo.fr";

    setIsUpdatingProfile(true);
    setErrorMessage("");

    try {
      // 1. Mettre à jour sur Stripe
      const result = await updateStripeAccountProfile({
        stripeAccountId: stripeInfo.stripeAccountId,
        profileUrl,
      });

      // 2. Mettre à jour le statut dans Convex
      if (result.success) {
        await updateStripeStatus({
          sessionToken: token,
          status: result.status,
          chargesEnabled: result.chargesEnabled,
          payoutsEnabled: result.payoutsEnabled,
        });
      }

      setSuccessMessage(result.payoutsEnabled
        ? "Compte vérifié ! Les versements sont maintenant activés."
        : "Profil mis à jour ! Stripe va revalider votre compte."
      );
    } catch (error: any) {
      console.error("Erreur mise à jour profil:", error);
      setErrorMessage(error?.message || "Erreur lors de la mise à jour");
    } finally {
      setIsUpdatingProfile(false);
      setTimeout(() => {
        setSuccessMessage("");
        setErrorMessage("");
      }, 8000);
    }
  };

  // Handle delete Stripe account
  const handleDeleteStripeAccount = async () => {
    if (!token || !stripeInfo?.stripeAccountId) return;

    setIsDeleting(true);
    setErrorMessage("");

    try {
      // 1. Supprimer le compte Stripe via l'API
      await deleteStripeAccount({ stripeAccountId: stripeInfo.stripeAccountId });

      // 2. Effacer les données dans Convex
      await clearStripeDataPublic({ sessionToken: token });

      setSuccessMessage("Compte Stripe supprimé. Vous pouvez reconfigurer avec les bonnes données.");
      setShowDeleteConfirm(false);
    } catch (error: any) {
      console.error("Erreur suppression:", error);
      setErrorMessage(error?.message || "Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
      setTimeout(() => {
        setSuccessMessage("");
        setErrorMessage("");
      }, 8000);
    }
  };

  // Status badge
  const getStatusBadge = () => {
    if (!stripeInfo?.hasStripeAccount) return null;

    const status = stripeInfo.stripeAccountStatus;
    const configs: Record<string, { label: string; color: string }> = {
      verified: { label: "Vérifié", color: "bg-green-100 text-green-700" },
      pending: { label: "En attente", color: "bg-yellow-100 text-yellow-700" },
      restricted: { label: "Restreint", color: "bg-orange-100 text-orange-700" },
      disabled: { label: "Désactivé", color: "bg-red-100 text-red-700" },
    };

    const config = configs[status || "pending"] || configs.pending;
    return (
      <span className={cn("px-2 py-1 text-xs font-medium rounded-full", config.color)}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2"
        >
          <Check className="w-5 h-5" />
          {successMessage}
        </motion.div>
      )}

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2"
        >
          <AlertCircle className="w-5 h-5" />
          {errorMessage}
        </motion.div>
      )}

      {/* Compte bancaire */}
      <SectionCard title="Compte bancaire" icon={Banknote}>
        <div className="space-y-4">
          <p className="text-sm text-text-light">
            Configurez votre IBAN pour recevoir les versements de vos prestations.
          </p>

          {stripeInfo?.hasIban ? (
            // IBAN déjà configuré
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">IBAN configuré</p>
                    <p className="font-mono text-sm text-text-light">
                      {stripeInfo.ibanMasked ? formatIban(stripeInfo.ibanMasked) : `•••• •••• •••• ${stripeInfo.ibanLast4}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge()}
                  <motion.button
                    onClick={() => setShowSetupForm(true)}
                    className="px-4 py-2 text-primary font-medium hover:bg-primary/10 rounded-lg transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Modifier
                  </motion.button>
                </div>
              </div>

              {stripeInfo.payoutsEnabled ? (
                <p className="text-xs text-green-600 mt-3 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Versements activés - Vous pouvez recevoir des paiements
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-orange-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Versements en cours d&apos;activation - Vérification en cours
                  </p>

                  {/* Bouton pour compléter la vérification */}
                  <motion.button
                    onClick={handleUpdateStripeProfile}
                    disabled={isUpdatingProfile}
                    className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                    whileHover={{ scale: isUpdatingProfile ? 1 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isUpdatingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Compléter la vérification
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-xs text-red-600 hover:text-red-700 underline flex items-center gap-1"
                    whileHover={{ scale: 1.02 }}
                  >
                    <Trash2 className="w-3 h-3" />
                    Réinitialiser le compte (pour corriger les données)
                  </motion.button>
                </div>
              )}
            </div>
          ) : (
            // Pas d'IBAN configuré
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-orange-800">Configuration requise</p>
                  <p className="text-sm text-orange-700 mt-1">
                    Ajoutez vos coordonnées bancaires pour recevoir vos versements.
                  </p>
                  <motion.button
                    onClick={() => setShowSetupForm(true)}
                    className="mt-3 px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-4 h-4" />
                    Configurer mon compte bancaire
                  </motion.button>
                </div>
              </div>
            </div>
          )}

          {/* Dialog de confirmation de suppression */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-xl">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Réinitialiser le compte Stripe ?</h3>
                  </div>

                  <p className="text-sm text-text-light mb-4">
                    Cette action va supprimer votre compte Stripe Connect actuel. Vous pourrez ensuite reconfigurer avec les bonnes données de test.
                  </p>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                    <p className="text-xs text-amber-700">
                      <strong>Rappel des données de test :</strong><br />
                      • Date de naissance : <code className="bg-amber-100 px-1 rounded">01/01/1901</code><br />
                      • Adresse : <code className="bg-amber-100 px-1 rounded">address_full_match</code><br />
                      • IBAN : <code className="bg-amber-100 px-1 rounded">FR1420041010050500013M02606</code>
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <motion.button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-3 bg-gray-200 text-foreground rounded-xl font-semibold"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      disabled={isDeleting}
                    >
                      Annuler
                    </motion.button>
                    <motion.button
                      onClick={handleDeleteStripeAccount}
                      disabled={isDeleting}
                      className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                      whileHover={{ scale: isDeleting ? 1 : 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Suppression...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Supprimer
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulaire de configuration */}
          <AnimatePresence>
            {showSetupForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSetupBankAccount}
                className="bg-gray-50 rounded-xl p-6 space-y-6"
              >
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Informations bancaires
                </h3>

                {/* Identité */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-text-light" />
                    Identité du titulaire
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Prénom"
                      required
                      className="px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Nom"
                      required
                      className="px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    />
                  </div>
                </div>

                {/* Date de naissance */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-text-light" />
                    Date de naissance
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={formData.dobDay}
                      onChange={(e) => setFormData({ ...formData, dobDay: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                      placeholder="Jour"
                      required
                      className="px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-center"
                    />
                    <input
                      type="text"
                      value={formData.dobMonth}
                      onChange={(e) => setFormData({ ...formData, dobMonth: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                      placeholder="Mois"
                      required
                      className="px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-center"
                    />
                    <input
                      type="text"
                      value={formData.dobYear}
                      onChange={(e) => setFormData({ ...formData, dobYear: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      placeholder="Année"
                      required
                      className="px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground text-center"
                    />
                  </div>
                </div>

                {/* Adresse */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-text-light" />
                    Adresse
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.addressLine1}
                      onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                      placeholder="Adresse"
                      required
                      className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    />
                    <input
                      type="text"
                      value={formData.addressLine2}
                      onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                      placeholder="Complément d'adresse (optionnel)"
                      className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                        placeholder="Code postal"
                        required
                        className="px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                      />
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Ville"
                        required
                        className="px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* IBAN */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Building className="w-4 h-4 text-text-light" />
                    IBAN
                  </label>
                  <input
                    type="text"
                    value={formData.iban}
                    onChange={(e) => setFormData({ ...formData, iban: e.target.value.toUpperCase() })}
                    placeholder="FR76 1234 5678 9012 3456 7890 123"
                    required
                    className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground font-mono"
                  />
                  <p className="text-xs text-text-light mt-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Vos coordonnées bancaires sont sécurisées et chiffrées via Stripe
                  </p>
                </div>

                {/* CGU Stripe */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700 flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    En soumettant ce formulaire, vous acceptez les{" "}
                    <a
                      href="https://stripe.com/fr/legal/connect-account"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      Conditions d&apos;utilisation Stripe Connect
                    </a>
                    .
                  </p>
                </div>

                {/* Boutons */}
                <div className="flex gap-3">
                  <motion.button
                    type="button"
                    onClick={() => setShowSetupForm(false)}
                    className="flex-1 py-3 bg-gray-200 text-foreground rounded-xl font-semibold"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    Annuler
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Validation...
                      </>
                    ) : (
                      "Enregistrer"
                    )}
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </SectionCard>

      {/* Mode de versement */}
      {stripeInfo?.hasIban && (
        <SectionCard title="Mode de versement" icon={Euro}>
          <div className="space-y-4">
            <p className="text-sm text-text-light">
              Choisissez comment vous souhaitez recevoir vos paiements après confirmation des missions.
            </p>

            <div className="space-y-3">
              {/* Mode scheduled */}
              <motion.button
                type="button"
                onClick={() => handlePayoutModeChange("scheduled")}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-colors",
                  selectedPayoutMode === "scheduled"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                )}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                    selectedPayoutMode === "scheduled" ? "border-primary bg-primary" : "border-gray-300"
                  )}>
                    {selectedPayoutMode === "scheduled" && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <p className="font-semibold text-foreground">Virement mensuel</p>
                      {(payoutSettings?.monthlyFeePercent ?? 0) > 0 ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                          {payoutSettings?.monthlyFeePercent}% de frais
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Gratuit
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-light mt-1">
                      Vos gains sont versés le {payoutSettings?.scheduledDay || 25} de chaque mois
                    </p>
                  </div>
                </div>
              </motion.button>

              {/* Mode par mission */}
              <motion.button
                type="button"
                onClick={() => handlePayoutModeChange("instant")}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-colors",
                  selectedPayoutMode === "instant"
                    ? "border-primary bg-primary/5"
                    : "border-gray-200 hover:border-gray-300"
                )}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                    selectedPayoutMode === "instant" ? "border-primary bg-primary" : "border-gray-300"
                  )}>
                    {selectedPayoutMode === "instant" && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <p className="font-semibold text-foreground">Virement par mission</p>
                      {(payoutSettings?.perMissionFeePercent ?? 2) > 0 ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                          {payoutSettings?.perMissionFeePercent ?? 2}% de frais
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Gratuit
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-light mt-1">
                      Recevez vos gains après chaque mission confirmée par le client
                    </p>
                  </div>
                </div>
              </motion.button>
            </div>

            {/* Info box */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-text-light" />
                Comment ça marche ?
              </h4>
              <ul className="text-sm text-text-light space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  Le client paie lors de la réservation (fonds sécurisés sur Stripe)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  Après la mission, le client confirme ou c&apos;est auto-confirmé après {payoutSettings?.confirmationHours || 48}h
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  {selectedPayoutMode === "instant"
                    ? `Virement après confirmation${(payoutSettings?.perMissionFeePercent ?? 2) > 0 ? " (frais déduits)" : ""}`
                    : `Virement groupé le ${payoutSettings?.scheduledDay || 25} du mois${(payoutSettings?.monthlyFeePercent ?? 0) > 0 ? " (frais déduits)" : ""}`
                  }
                </li>
              </ul>
            </div>

            {/* Exemple de calcul selon le mode */}
            {(() => {
              const feePercent = selectedPayoutMode === "instant"
                ? (payoutSettings?.perMissionFeePercent ?? 2)
                : (payoutSettings?.monthlyFeePercent ?? 0);

              if (feePercent > 0) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      Exemple de calcul
                    </h4>
                    <div className="text-sm text-amber-700">
                      <p>Pour une prestation de <span className="font-semibold">50€</span> :</p>
                      <p className="mt-1">
                        Frais ({feePercent}%) : -{((50 * feePercent) / 100).toFixed(2)}€
                      </p>
                      <p className="font-semibold mt-1">
                        Vous recevez : {(50 - (50 * feePercent) / 100).toFixed(2)}€
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </SectionCard>
      )}
    </div>
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
    // Utiliser auth_token pour les utilisateurs connectés
    setToken(localStorage.getItem("auth_token"));
  }, []);

  // Fetch user preferences from backend
  const preferences = useQuery(
    api.services.preferences.getPreferences,
    token ? { token } : "skip"
  );

  // Fetch buffer settings from backend
  const bufferSettings = useQuery(
    api.services.preferences.getBufferSettings,
    token ? { token } : "skip"
  );

  // Fetch global workday config from admin
  const workdayConfig = useQuery(api.admin.config.getWorkdayConfig);

  const updatePreferences = useMutation(api.services.preferences.updatePlanningPreferences);
  const updateBuffers = useMutation(api.services.preferences.updateBufferSettings);

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
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Local state for buffer settings
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(0);

  // Sync local state with backend preferences
  useEffect(() => {
    if (preferences) {
      setAcceptReservationsFrom(preferences.acceptReservationsFrom ?? "08:00");
      setAcceptReservationsTo(preferences.acceptReservationsTo ?? "20:00");
      setBillingMode(preferences.billingMode ?? "round_up");
      setRoundUpThreshold(preferences.roundUpThreshold ?? 2);
    }
  }, [preferences]);

  // Sync buffer settings with backend
  useEffect(() => {
    if (bufferSettings) {
      setBufferBefore(bufferSettings.bufferBefore ?? 0);
      setBufferAfter(bufferSettings.bufferAfter ?? 0);
    }
  }, [bufferSettings]);

  const handleSave = async () => {
    if (!token) {
      setErrorMessage("Session expirée. Veuillez vous reconnecter.");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    setSaving(true);
    setErrorMessage("");
    try {
      // Sauvegarder les préférences de planning
      const prefsResult = await updatePreferences({
        token,
        acceptReservationsFrom,
        acceptReservationsTo,
        billingMode,
        roundUpThreshold,
      });

      // Sauvegarder les temps de préparation (buffers)
      const buffersResult = await updateBuffers({
        token,
        bufferBefore,
        bufferAfter,
      });

      // Récupérer le message du serveur
      const message = prefsResult?.message || buffersResult?.message || "Préférences enregistrées avec succès";
      setSuccessMessage(message);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setSuccessMessage("");
      }, 3000);
    } catch (error) {
      console.error("Failed to save preferences:", error);
      setErrorMessage(error instanceof Error ? error.message : "Erreur lors de la sauvegarde");
      setTimeout(() => setErrorMessage(""), 5000);
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

      {/* Buffer Settings */}
      <SectionCard title="Temps de préparation" icon={Clock}>
        <div className="space-y-4">
          <p className="text-sm text-text-light">
            Bloquez du temps avant et après vos services pour vous préparer ou vous déplacer.
            Ces créneaux seront automatiquement indisponibles pour les clients.
          </p>

          {/* Buffer Before */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Temps à bloquer avant chaque service
            </label>
            <p className="text-xs text-text-light mb-3">
              Ce temps vous permet de vous préparer avant l&apos;arrivée du client.
            </p>
            <div className="flex flex-wrap gap-2">
              {[0, 30, 60, 90].map((minutes) => (
                <motion.button
                  key={minutes}
                  onClick={() => setBufferBefore(minutes)}
                  className={cn(
                    "px-4 py-2 rounded-xl font-medium transition-colors",
                    bufferBefore === minutes
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-foreground hover:bg-gray-200"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {minutes === 0 ? "Aucun" : minutes < 60 ? `${minutes} min` : `${minutes / 60}h`}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Buffer After */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Temps à bloquer après chaque service
            </label>
            <p className="text-xs text-text-light mb-3">
              Ce temps vous permet de ranger, vous reposer ou vous déplacer vers le prochain client.
            </p>
            <div className="flex flex-wrap gap-2">
              {[0, 30, 60, 90].map((minutes) => (
                <motion.button
                  key={minutes}
                  onClick={() => setBufferAfter(minutes)}
                  className={cn(
                    "px-4 py-2 rounded-xl font-medium transition-colors",
                    bufferAfter === minutes
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-foreground hover:bg-gray-200"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {minutes === 0 ? "Aucun" : minutes < 60 ? `${minutes} min` : `${minutes / 60}h`}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Example */}
          {(bufferBefore > 0 || bufferAfter > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Exemple
              </h4>
              <p className="text-sm text-blue-700">
                Pour un service réservé de <span className="font-semibold">10h00 à 12h00</span> :
              </p>
              <p className="text-sm text-blue-800 font-medium mt-1">
                Période bloquée :{" "}
                <span className="bg-blue-100 px-2 py-0.5 rounded">
                  {(() => {
                    const startMinutes = 10 * 60 - bufferBefore;
                    const endMinutes = 12 * 60 + bufferAfter;
                    const startH = Math.floor(startMinutes / 60);
                    const startM = startMinutes % 60;
                    const endH = Math.floor(endMinutes / 60);
                    const endM = endMinutes % 60;
                    return `${startH}h${startM > 0 ? startM.toString().padStart(2, "0") : "00"} - ${endH}h${endM > 0 ? endM.toString().padStart(2, "0") : "00"}`;
                  })()}
                </span>
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Les créneaux de {bufferBefore > 0 && `${bufferBefore} min avant`}
                {bufferBefore > 0 && bufferAfter > 0 && " et "}
                {bufferAfter > 0 && `${bufferAfter} min après`}
                {" "}seront automatiquement indisponibles.
              </p>
            </div>
          )}
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

      {/* Politique d'annulation */}
      <SectionCard icon={Ban} title="Politique d'annulation">
        <p className="text-sm text-gray-500 mb-4">
          Configurez le montant conservé en cas d&apos;annulation client sur vos services multi-séance et collectifs
        </p>
        <Link
          href="/dashboard/parametres/politique-annulation"
          className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Ban className="w-5 h-5 text-red-500" />
            <span className="font-medium text-gray-700">Gérer ma politique d&apos;annulation</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </Link>
      </SectionCard>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {errorMessage}
        </div>
      )}

      {/* Save Button */}
      <motion.button
        type="button"
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
            {successMessage || "Préférences enregistrées"}
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
// ============================================
// ONGLET SAP (Services à la Personne)
// ============================================
function SapTab() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("auth_token"));
  }, []);

  // Queries
  const sapDeclaration = useQuery(
    api.sap.declarations.getSapDeclaration,
    token ? { sessionToken: token } : "skip"
  );
  const cloudinaryConfig = useQuery(api.config.getCloudinaryConfig);

  // Mutations
  const getOrCreateDeclaration = useMutation(api.sap.declarations.getOrCreateSapDeclaration);
  const updateDocuments = useMutation(api.sap.declarations.updateSapDocuments);
  const submitDeclaration = useMutation(api.sap.declarations.submitSapDeclaration);

  // Local state
  const [declarationId, setDeclarationId] = useState<string | null>(null);
  const [sapNumber, setSapNumber] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [exclusivityAttested, setExclusivityAttested] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Init : créer ou récupérer la déclaration
  useEffect(() => {
    async function init() {
      if (!token || initialized) return;
      try {
        const result = await getOrCreateDeclaration({ sessionToken: token });
        if (result.declaration) {
          setDeclarationId(result.declaration._id);
          setSapNumber(result.declaration.sapDeclarationNumber ?? "");
          setReceiptUrl(result.declaration.sapReceiptUrl ?? null);
          setExclusivityAttested(result.declaration.exclusivityAttested ?? false);
        }
        setInitialized(true);
      } catch (error) {
        console.error("Erreur init SAP:", error);
      }
    }
    init();
  }, [token, initialized, getOrCreateDeclaration]);

  // Sync avec les données backend
  useEffect(() => {
    if (sapDeclaration && initialized) {
      setSapNumber(sapDeclaration.sapDeclarationNumber ?? "");
      setReceiptUrl(sapDeclaration.sapReceiptUrl ?? null);
      setExclusivityAttested(sapDeclaration.exclusivityAttested ?? false);
      setDeclarationId(sapDeclaration._id);
    }
  }, [sapDeclaration, initialized]);

  // Upload du récépissé vers Cloudinary
  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token || !declarationId || !cloudinaryConfig?.cloudName) return;

    setIsUploading(true);
    try {
      const { uploadToCloudinary } = await import("@/app/lib/cloudinary");
      const result = await uploadToCloudinary(
        file,
        {
          cloudName: cloudinaryConfig.cloudName,
          apiKey: cloudinaryConfig.apiKey,
          uploadPreset: cloudinaryConfig.uploadPreset,
        },
        { folder: "sap-receipts", maxWidth: 2000, maxHeight: 2000, quality: 95 }
      );

      if (result.success && result.url) {
        setReceiptUrl(result.url);
        await updateDocuments({
          sessionToken: token,
          declarationId: declarationId as any,
          sapReceiptUrl: result.url,
        });
      }
    } catch (error) {
      console.error("Erreur upload:", error);
      setErrorMessage("Erreur lors de l'upload du document");
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setIsUploading(false);
    }
  };

  // Sauvegarder les infos
  const handleSave = async () => {
    if (!token || !declarationId) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      await updateDocuments({
        sessionToken: token,
        declarationId: declarationId as any,
        sapDeclarationNumber: sapNumber,
        exclusivityAttested,
      });
      setSuccessMessage("Informations enregistrées");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur lors de la sauvegarde");
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Soumettre la déclaration
  const handleSubmit = async () => {
    if (!token || !declarationId) return;
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      // Sauvegarder d'abord
      await updateDocuments({
        sessionToken: token,
        declarationId: declarationId as any,
        sapDeclarationNumber: sapNumber,
        exclusivityAttested,
      });
      // Puis soumettre
      await submitDeclaration({
        sessionToken: token,
        declarationId: declarationId as any,
      });
      setSuccessMessage("Déclaration SAP soumise pour vérification !");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur lors de la soumission");
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const status = sapDeclaration?.status ?? "pending";
  const isEditable = status === "pending" || status === "rejected" || status === "revoked";
  const canSubmit = isEditable && sapNumber.trim() && receiptUrl && exclusivityAttested;

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: "Brouillon", color: "bg-gray-100 text-gray-700", icon: Clock },
    submitted: { label: "En attente de vérification", color: "bg-amber-100 text-amber-700", icon: Clock },
    approved: { label: "Approuvé", color: "bg-green-100 text-green-700", icon: Check },
    rejected: { label: "Rejeté", color: "bg-red-100 text-red-700", icon: AlertCircle },
    revoked: { label: "Révoqué", color: "bg-red-100 text-red-700", icon: Ban },
  };

  const currentStatus = statusConfig[status] ?? statusConfig.pending;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="space-y-6">
      {/* Encart informatif */}
      <SectionCard title="Services à la Personne (SAP)" icon={FileCheck}>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700 space-y-2">
              <p className="font-medium">Qu&apos;est-ce que le statut SAP ?</p>
              <p>
                Les prestataires déclarés auprès de la DDETS bénéficient d&apos;un taux de TVA réduit à <strong>10%</strong> (au lieu de 20%) sur les services de garde et promenade d&apos;animaux, à condition que le client soit une personne dépendante (personne âgée ou en situation de handicap).
              </p>
              <p>
                Vos clients éligibles profitent également d&apos;un <strong>crédit d&apos;impôt de 50%</strong> sur les prestations SAP.
              </p>
            </div>
          </div>
        </div>

        {/* Statut actuel */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-medium text-gray-600">Statut :</span>
          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium", currentStatus.color)}>
            <StatusIcon className="w-4 h-4" />
            {currentStatus.label}
          </span>
          {status === "approved" && sapDeclaration?.reviewedAt && (
            <span className="text-xs text-gray-500">
              Approuvé le {new Date(sapDeclaration.reviewedAt).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>

        {/* Message de rejet */}
        {(status === "rejected" || status === "revoked") && sapDeclaration?.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700">
                  {status === "rejected" ? "Motif du rejet" : "Motif de la révocation"}
                </p>
                <p className="text-sm text-red-600 mt-1">{sapDeclaration.rejectionReason}</p>
                <p className="text-xs text-red-500 mt-2">Vous pouvez modifier votre déclaration et la soumettre à nouveau.</p>
              </div>
            </div>
          </div>
        )}

        {/* Formulaire (si pas approuvé ni en attente) */}
        {isEditable && (
          <div className="space-y-6">
            {/* Numéro de déclaration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de déclaration SAP (DDETS)
              </label>
              <input
                type="text"
                value={sapNumber}
                onChange={(e) => setSapNumber(e.target.value)}
                placeholder="Ex: SAP123456789"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            {/* Upload récépissé */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Récépissé de déclaration SAP
              </label>
              {receiptUrl ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-700 flex-1">Document uploadé</span>
                  <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                    <ExternalLink className="w-4 h-4" /> Voir
                  </a>
                  <label className="cursor-pointer text-sm text-gray-500 hover:text-primary">
                    Changer
                    <input type="file" accept="image/*,.pdf" onChange={handleReceiptUpload} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className={cn(
                  "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                  isUploading ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
                )}>
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Cliquez pour uploader votre récépissé</span>
                      <span className="text-xs text-gray-400 mt-1">PDF, JPG ou PNG</span>
                    </>
                  )}
                  <input type="file" accept="image/*,.pdf" onChange={handleReceiptUpload} className="hidden" disabled={isUploading} />
                </label>
              )}
            </div>

            {/* Attestation d'exclusivité */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exclusivityAttested}
                  onChange={(e) => setExclusivityAttested(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">
                  J&apos;atteste sur l&apos;honneur exercer exclusivement en mode SAP (Services à la Personne), avec un maximum de 30% d&apos;activité non-SAP, conformément à la réglementation en vigueur.
                </span>
              </label>
            </div>

            {/* Messages */}
            {successMessage && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                <Check className="w-4 h-4" /> {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" /> {errorMessage}
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-full font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
                Enregistrer
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="px-6 py-3 bg-primary text-white rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <FileCheck className="w-4 h-4 inline mr-2" />}
                Soumettre ma déclaration SAP
              </button>
            </div>
          </div>
        )}

        {/* En attente de validation */}
        {status === "submitted" && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-700">Déclaration en cours de vérification</p>
            <p className="text-sm text-gray-500 mt-1">
              Notre équipe examine votre déclaration SAP. Vous serez notifié du résultat.
            </p>
          </div>
        )}

        {/* Approuvé */}
        {status === "approved" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-lg font-medium text-green-700">Statut SAP vérifié</p>
            <p className="text-sm text-gray-500 mt-2">
              Votre déclaration SAP est approuvée. Les clients éligibles bénéficieront automatiquement du taux de TVA réduit à 10% sur vos services de garde et promenade.
            </p>
            {sapDeclaration?.sapDeclarationNumber && (
              <p className="text-sm text-gray-500 mt-2">
                N° de déclaration : <strong>{sapDeclaration.sapDeclarationNumber}</strong>
              </p>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

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
      case "sap":
        return <SapTab />;
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
