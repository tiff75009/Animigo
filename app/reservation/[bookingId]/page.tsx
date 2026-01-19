"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  MapPin,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Lock,
  Loader2,
  AlertCircle,
  PawPrint,
  CreditCard,
  FileText,
  Sparkles,
  Plus,
  Check,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AnimalSelector, GuestAnimalForm, type GuestAnimalData } from "@/app/components/animals";

// Types
interface ServiceOption {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceUnit?: string;
}

interface PendingBookingData {
  id: Id<"pendingBookings">;
  announcer: {
    id: Id<"users">;
    firstName: string;
    lastName: string;
    profileImage: string | null;
    location: string;
    verified: boolean;
    accountType: string;
    companyType?: string;
    statusType: "particulier" | "micro_entrepreneur" | "professionnel";
  };
  service: {
    id: Id<"services">;
    category: string;
    categoryName: string;
    categoryIcon?: string;
  };
  variant: {
    id: string;
    name: string;
    price: number;
    priceUnit: string;
    duration?: number;
  } | null;
  options: Array<{ id: string; name: string; price: number }>;
  availableOptions: ServiceOption[];
  dates: {
    startDate: string;
    endDate: string;
    startTime?: string;
  };
  amount: number;
  userId?: Id<"users">;
  expiresAt: number;
}

interface GuestData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}


function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

// Formater la durée en heures/minutes
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
}

// Calculer l'heure de fin à partir de l'heure de début et de la durée
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
}

// Calculer le prix du service basé sur le taux horaire et la durée
function calculateServicePrice(hourlyRateCents: number, durationMinutes: number): number {
  // Prix = taux horaire × (durée en heures)
  return Math.round((hourlyRateCents * durationMinutes) / 60);
}

function extractCity(location: string): string {
  // Location formats: "Paris 11e", "75011 Paris", "Rue X, Paris 11e", etc.
  const parts = location.split(",").map((p) => p.trim());
  const lastPart = parts[parts.length - 1];
  // If it starts with a number (zip code), try to get just the city name
  if (/^\d/.test(lastPart)) {
    const cityMatch = lastPart.match(/\d+\s+(.+)/);
    return cityMatch ? cityMatch[1] : lastPart;
  }
  return lastPart;
}

export default function ReservationPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();

  // State
  const [token, setToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedAnimalId, setSelectedAnimalId] = useState<Id<"animals"> | null>(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guest data
  const [guestData, setGuestData] = useState<GuestData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [guestAnimalData, setGuestAnimalData] = useState<GuestAnimalData>({
    name: "",
    type: "",
    gender: "unknown",
    compatibilityTraits: [],
    behaviorTraits: [],
    needsTraits: [],
    customTraits: [],
  });
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);

  // Récupérer le token au chargement
  useEffect(() => {
    const storedToken = localStorage.getItem("session_token");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  // Vérifier la session
  const sessionData = useQuery(
    api.auth.session.getSession,
    token ? { token } : "skip"
  );

  useEffect(() => {
    if (sessionData?.user) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, [sessionData]);

  // Récupérer les données de la réservation
  const bookingData = useQuery(
    api.public.booking.getPendingBooking,
    { bookingId: bookingId as Id<"pendingBookings"> }
  );

  // Mutations
  const finalizeBooking = useMutation(api.public.booking.finalizeBooking);
  const finalizeAsGuest = useMutation(api.public.booking.finalizeBookingAsGuest);
  const login = useMutation(api.auth.login.login);

  // Vérifier si la réservation est expirée
  const isExpired = bookingData && bookingData.expiresAt < Date.now();

  // Initialiser les options sélectionnées depuis les données de réservation
  useEffect(() => {
    if (bookingData?.options) {
      setSelectedOptionIds(bookingData.options.map((opt) => opt.id));
    }
  }, [bookingData?.options]);

  // Calculer le prix de base du service (taux horaire × durée)
  const getServiceBasePrice = () => {
    if (!bookingData?.variant) return 0;
    const { price, duration, priceUnit } = bookingData.variant;

    // Si le service est facturé à l'heure et a une durée définie
    if (priceUnit === "hour" && duration) {
      return calculateServicePrice(price, duration);
    }

    // Sinon, utiliser le prix stocké (pour les services à la journée, etc.)
    return price;
  };

  const serviceBasePrice = getServiceBasePrice();

  // Calculer le prix total avec les options sélectionnées
  const calculateTotalAmount = () => {
    if (!bookingData) return 0;

    // Commencer avec le prix du service calculé
    let total = serviceBasePrice;

    // Ajouter les options actuellement sélectionnées
    for (const optId of selectedOptionIds) {
      const option = bookingData.availableOptions?.find((o) => o.id === optId);
      if (option) {
        total += option.price;
      }
    }

    return total;
  };

  const totalAmount = calculateTotalAmount();

  // Toggle option selection
  const toggleOption = (optionId: string) => {
    setSelectedOptionIds((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  // Validation
  const canSubmitLoggedIn = isLoggedIn && selectedAnimalId && address.trim();
  const canSubmitGuest =
    !isLoggedIn &&
    guestData.firstName.trim() &&
    guestData.lastName.trim() &&
    guestData.email.trim() &&
    guestData.phone.trim() &&
    guestData.password.length >= 6 &&
    guestData.password === guestData.confirmPassword &&
    guestAnimalData.name.trim() &&
    guestAnimalData.type &&
    address.trim();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await login({
        email: loginEmail,
        password: loginPassword,
      });

      if (result.success && result.token) {
        localStorage.setItem("session_token", result.token);
        setToken(result.token);
        setIsLoggedIn(true);
        setShowLoginForm(false);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  };

  const handleSubmit = async () => {
    if (!bookingData) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (isLoggedIn && token && selectedAnimalId) {
        // Utilisateur connecté
        const result = await finalizeBooking({
          token,
          bookingId: bookingId as Id<"pendingBookings">,
          animalId: selectedAnimalId,
          location: address,
          notes: notes || undefined,
          updatedOptionIds: selectedOptionIds,
          updatedAmount: totalAmount,
        });

        if (result.success) {
          router.push(`/dashboard?tab=missions&success=booking`);
        }
      } else {
        // Invité
        const result = await finalizeAsGuest({
          bookingId: bookingId as Id<"pendingBookings">,
          userData: {
            firstName: guestData.firstName,
            lastName: guestData.lastName,
            email: guestData.email,
            phone: guestData.phone,
            password: guestData.password,
          },
          animalData: {
            name: guestAnimalData.name,
            type: guestAnimalData.type,
            gender: guestAnimalData.gender,
            breed: guestAnimalData.breed || undefined,
            birthDate: guestAnimalData.birthDate || undefined,
            description: guestAnimalData.description || undefined,
            compatibilityTraits: guestAnimalData.compatibilityTraits.length > 0 ? guestAnimalData.compatibilityTraits : undefined,
            behaviorTraits: guestAnimalData.behaviorTraits.length > 0 ? guestAnimalData.behaviorTraits : undefined,
            needsTraits: guestAnimalData.needsTraits.length > 0 ? guestAnimalData.needsTraits : undefined,
            customTraits: guestAnimalData.customTraits.length > 0 ? guestAnimalData.customTraits : undefined,
            specialNeeds: guestAnimalData.specialNeeds || undefined,
            medicalConditions: guestAnimalData.medicalConditions || undefined,
          },
          location: address,
          notes: notes || undefined,
          updatedOptionIds: selectedOptionIds,
          updatedAmount: totalAmount,
        });

        if (result.success && result.token) {
          localStorage.setItem("session_token", result.token);
          router.push(`/dashboard?tab=missions&success=booking`);
        }
      }
    } catch (err) {
      console.error("Erreur:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (bookingData === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-text-light">Chargement de votre réservation...</p>
        </div>
      </div>
    );
  }

  // Not found or expired
  if (!bookingData || isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md bg-white rounded-3xl shadow-xl p-8"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {isExpired ? "Réservation expirée" : "Réservation introuvable"}
          </h1>
          <p className="text-text-light mb-8">
            {isExpired
              ? "Cette réservation a expiré. Les réservations sont valides pendant 24 heures. Veuillez recommencer votre recherche."
              : "Cette réservation n'existe pas ou a déjà été finalisée."}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour à l&apos;accueil
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-text-light hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Retour</span>
            </button>
            <h1 className="text-lg font-bold text-foreground">
              Finaliser la réservation
            </h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-3 space-y-6">
            {/* Section Authentification (si non connecté) */}
            {!isLoggedIn && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Vos informations
                  </h2>
                </div>
                <div className="p-6">
                  {showLoginForm ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="votre@email.com"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Mot de passe
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowLoginForm(false)}
                          className="flex-1 py-3 border border-gray-200 text-foreground font-medium rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
                        >
                          Se connecter
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowLoginForm(true)}
                        className="w-full py-3 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary/5 transition-colors mb-6"
                      >
                        J&apos;ai déjà un compte
                      </button>

                      <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-white px-4 text-sm text-text-light">
                            ou créez un compte
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Prénom <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={guestData.firstName}
                              onChange={(e) =>
                                setGuestData({ ...guestData, firstName: e.target.value })
                              }
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              placeholder="Jean"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Nom <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={guestData.lastName}
                              onChange={(e) =>
                                setGuestData({ ...guestData, lastName: e.target.value })
                              }
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              placeholder="Dupont"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="email"
                              value={guestData.email}
                              onChange={(e) =>
                                setGuestData({ ...guestData, email: e.target.value })
                              }
                              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              placeholder="votre@email.com"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Téléphone <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="tel"
                              value={guestData.phone}
                              onChange={(e) =>
                                setGuestData({ ...guestData, phone: e.target.value })
                              }
                              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              placeholder="06 12 34 56 78"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Mot de passe <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <input
                                type="password"
                                value={guestData.password}
                                onChange={(e) =>
                                  setGuestData({ ...guestData, password: e.target.value })
                                }
                                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                placeholder="••••••••"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Confirmer <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="password"
                              value={guestData.confirmPassword}
                              onChange={(e) =>
                                setGuestData({ ...guestData, confirmPassword: e.target.value })
                              }
                              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                                guestData.confirmPassword &&
                                guestData.password !== guestData.confirmPassword
                                  ? "border-red-500 bg-red-50"
                                  : "border-gray-200"
                              }`}
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                        {guestData.password.length > 0 && guestData.password.length < 6 && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Le mot de passe doit contenir au moins 6 caractères
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Section Animal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="bg-gradient-to-r from-secondary to-secondary/80 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <PawPrint className="w-5 h-5" />
                  Votre animal
                </h2>
              </div>
              <div className="p-6">
                {isLoggedIn && token ? (
                  <AnimalSelector
                    token={token}
                    selectedAnimalId={selectedAnimalId}
                    onSelect={setSelectedAnimalId}
                    compact
                  />
                ) : (
                  <GuestAnimalForm
                    data={guestAnimalData}
                    onChange={setGuestAnimalData}
                  />
                )}
              </div>
            </motion.div>

            {/* Section Options */}
            {bookingData.availableOptions && bookingData.availableOptions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Options supplémentaires
                  </h2>
                  <p className="text-sm text-text-light mt-1">
                    Personnalisez votre prestation avec des services additionnels
                  </p>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {bookingData.availableOptions.map((option) => {
                      const isSelected = selectedOptionIds.includes(option.id);
                      return (
                        <div
                          key={option.id}
                          onClick={() => toggleOption(option.id)}
                          className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {/* Checkbox */}
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? "bg-primary text-white"
                                : "border-2 border-gray-300"
                            }`}
                          >
                            {isSelected && <Check className="w-4 h-4" />}
                          </div>

                          {/* Contenu */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-medium text-foreground">
                                {option.name}
                              </h4>
                              <span className="text-primary font-semibold whitespace-nowrap">
                                +{formatPrice(option.price)}
                                {option.priceUnit && (
                                  <span className="text-xs text-text-light font-normal">
                                    /{option.priceUnit}
                                  </span>
                                )}
                              </span>
                            </div>
                            {option.description && (
                              <p className="text-sm text-text-light mt-1">
                                {option.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Section Adresse */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="bg-gradient-to-r from-accent to-accent/80 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Adresse de la prestation
                </h2>
              </div>
              <div className="p-6">
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Entrez votre adresse complète..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </motion.div>

            {/* Section Notes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Notes complémentaires
                  <span className="text-sm font-normal text-text-light">(optionnel)</span>
                </h2>
              </div>
              <div className="p-6">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informations complémentaires pour l'annonceur (code d'accès, instructions particulières...)"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                />
              </div>
            </motion.div>
          </div>

          {/* Colonne récapitulatif (sticky sur desktop) */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden lg:sticky lg:top-24"
            >
              <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Récapitulatif
                </h2>
              </div>
              <div className="p-6">
                {/* Annonceur */}
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    {bookingData.announcer.profileImage ? (
                      <Image
                        src={bookingData.announcer.profileImage}
                        alt={bookingData.announcer.firstName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl bg-primary/10">
                        👤
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground flex items-center gap-1 truncate">
                      {bookingData.announcer.firstName} {bookingData.announcer.lastName.charAt(0)}.
                      {bookingData.announcer.verified && (
                        <CheckCircle className="w-4 h-4 text-secondary flex-shrink-0" />
                      )}
                    </p>
                    <p className="text-sm text-text-light flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {extractCity(bookingData.announcer.location)}
                    </p>
                    {/* Badge statut */}
                    <span
                      className={`inline-flex items-center mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                        bookingData.announcer.statusType === "professionnel"
                          ? "bg-blue-100 text-blue-700"
                          : bookingData.announcer.statusType === "micro_entrepreneur"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {bookingData.announcer.statusType === "professionnel"
                        ? "Professionnel"
                        : bookingData.announcer.statusType === "micro_entrepreneur"
                        ? "Micro-entrepreneur"
                        : "Particulier"}
                    </span>
                  </div>
                </div>

                {/* Service */}
                <div className="py-4 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{bookingData.service.categoryIcon || "✨"}</span>
                    <div>
                      <p className="font-semibold text-foreground">
                        {bookingData.service.categoryName}
                      </p>
                      {bookingData.variant && (
                        <p className="text-sm text-text-light">{bookingData.variant.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="py-4 border-b border-gray-100 space-y-2">
                  <div className="flex items-center gap-3 text-foreground">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="text-sm">
                      {formatDate(bookingData.dates.startDate)}
                      {bookingData.dates.endDate !== bookingData.dates.startDate && (
                        <>
                          <br />
                          <span className="text-text-light">au {formatDate(bookingData.dates.endDate)}</span>
                        </>
                      )}
                    </span>
                  </div>

                  {bookingData.dates.startTime && (
                    <div className="flex items-center gap-3 text-foreground">
                      <Clock className="w-5 h-5 text-primary" />
                      <span className="text-sm">
                        {bookingData.dates.startTime}
                        {bookingData.variant?.duration && (
                          <>
                            {" → "}
                            {calculateEndTime(bookingData.dates.startTime, bookingData.variant.duration)}
                            <span className="text-text-light ml-1">
                              ({formatDuration(bookingData.variant.duration)})
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Options sélectionnées */}
                {selectedOptionIds.length > 0 && (
                  <div className="py-4 border-b border-gray-100">
                    <p className="text-xs font-medium text-text-light uppercase mb-2">
                      Options sélectionnées
                    </p>
                    <div className="space-y-1">
                      {selectedOptionIds.map((optId) => {
                        const option = bookingData.availableOptions?.find(
                          (o) => o.id === optId
                        );
                        if (!option) return null;
                        return (
                          <div
                            key={optId}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-foreground">{option.name}</span>
                            <span className="text-text-light">
                              +{formatPrice(option.price)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Prix */}
                <div className="pt-4">
                  {bookingData.variant && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-light">{bookingData.variant.name}</span>
                        <span className="text-foreground font-medium">
                          {formatPrice(serviceBasePrice)}
                        </span>
                      </div>
                      {/* Détail du calcul si service horaire avec durée */}
                      {bookingData.variant.priceUnit === "hour" && bookingData.variant.duration && (
                        <p className="text-xs text-text-light mt-0.5">
                          {formatPrice(bookingData.variant.price)}/h × {formatDuration(bookingData.variant.duration)}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedOptionIds.length > 0 && (
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-text-light">
                        Options ({selectedOptionIds.length})
                      </span>
                      <span className="text-foreground">
                        +{formatPrice(
                          selectedOptionIds.reduce((sum, optId) => {
                            const option = bookingData.availableOptions?.find(
                              (o) => o.id === optId
                            );
                            return sum + (option?.price || 0);
                          }, 0)
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="font-medium text-foreground">Total à payer</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Bouton Confirmer */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || (!canSubmitLoggedIn && !canSubmitGuest)}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Confirmation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Confirmer la réservation
                    </>
                  )}
                </button>

                {/* Erreur */}
                {error && (
                  <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <p className="text-center text-xs text-text-light mt-4">
                  En confirmant, vous acceptez nos{" "}
                  <Link href="/cgu" className="text-primary hover:underline">
                    conditions générales
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
