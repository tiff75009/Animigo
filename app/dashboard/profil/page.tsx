"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  CheckCircle,
  Home,
  Building2,
  TreeDeciduous,
  Baby,
  Heart,
  Clock,
  Calendar,
  CalendarDays,
  CalendarRange,
  Euro,
  Utensils,
  Star,
  Edit,
  XCircle,
  Ban,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  ChevronLeft,
  ChevronRight,
  Car,
  Cigarette,
  CigaretteOff,
  Plus,
  Trash2,
  PawPrint,
  type LucideIcon,
  Loader2,
} from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { mockReviews, calculateStats, type PricingTier } from "@/app/lib/dashboard-data";
import { cn } from "@/app/lib/utils";
import Link from "next/link";
import ProfileHeader from "../components/ProfileHeader";
import ProfileCompletionBar from "../components/ProfileCompletionBar";
import ProfileSettingsSection from "../components/ProfileSettingsSection";
import ActivitiesSection from "../components/ActivitiesSection";
import EnvironmentPhotosSection from "../components/EnvironmentPhotosSection";
import { Id } from "@/convex/_generated/dataModel";

// Pricing Card Component
interface PricingCardProps {
  icon: LucideIcon;
  label: string;
  pricing: PricingTier;
  color: "primary" | "secondary" | "purple" | "accent";
}

const colorClasses = {
  primary: {
    bg: "bg-primary/5",
    text: "text-primary",
    barBg: "bg-primary/20",
    barFill: "bg-primary",
  },
  secondary: {
    bg: "bg-secondary/5",
    text: "text-secondary",
    barBg: "bg-secondary/20",
    barFill: "bg-secondary",
  },
  purple: {
    bg: "bg-purple/5",
    text: "text-purple",
    barBg: "bg-purple/20",
    barFill: "bg-purple",
  },
  accent: {
    bg: "bg-accent/10",
    text: "text-foreground",
    barBg: "bg-accent/30",
    barFill: "bg-accent",
  },
};

function PricingCard({ icon: Icon, label, pricing, color }: PricingCardProps) {
  const colors = colorClasses[color];
  const diff = pricing.price - pricing.average;
  const diffPercent = Math.round((diff / pricing.average) * 100);
  const position = ((pricing.price - pricing.min) / (pricing.max - pricing.min)) * 100;

  return (
    <div className={cn("rounded-2xl p-4", colors.bg)}>
      <div className="flex items-center justify-between mb-3">
        <Icon className={cn("w-5 h-5", colors.text)} />
        <span className="text-xs text-text-light">/ {label.toLowerCase()}</span>
      </div>

      <p className={cn("text-2xl font-bold mb-1", colors.text)}>{pricing.price}€</p>

      {/* Comparison badge */}
      <div className="flex items-center gap-1 mb-3">
        {diff === 0 ? (
          <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
            <Minus className="w-3 h-3" />
            Dans la moyenne
          </span>
        ) : diff > 0 ? (
          <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
            <TrendingUp className="w-3 h-3" />
            +{diffPercent}% vs moyenne
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
            <TrendingDown className="w-3 h-3" />
            {diffPercent}% vs moyenne
          </span>
        )}
      </div>

      {/* Price range bar */}
      <div className="space-y-1">
        <div className={cn("h-2 rounded-full relative", colors.barBg)}>
          {/* Average marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-foreground/40 z-10"
            style={{ left: `${((pricing.average - pricing.min) / (pricing.max - pricing.min)) * 100}%` }}
          />
          {/* Current price position */}
          <motion.div
            className={cn("absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-md", colors.barFill)}
            style={{ left: `${position}%` }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-light">
          <span>{pricing.min}€</span>
          <span className="font-medium">Moy. {pricing.average}€</span>
          <span>{pricing.max}€</span>
        </div>
      </div>
    </div>
  );
}

// Availability Calendar Component
interface AvailabilityCalendarProps {
  availability: { [key: string]: "available" | "partial" | "unavailable" };
}

function AvailabilityCalendar({ availability }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  // Adjust for Monday start (0 = Monday, 6 = Sunday)
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getDateKey = (day: number) => {
    const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    return `${currentMonth.getFullYear()}-${month}-${dayStr}`;
  };

  const getAvailabilityForDay = (day: number) => {
    const dateKey = getDateKey(day);
    return availability[dateKey] || "available";
  };

  const availabilityColors = {
    available: "bg-green-100 text-green-700",
    partial: "bg-orange-100 text-orange-700",
    unavailable: "bg-red-100 text-red-400",
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-3">
        <motion.button
          onClick={prevMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </motion.button>
        <h4 className="text-sm font-semibold text-foreground">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h4>
        <motion.button
          onClick={nextMonth}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronRight className="w-4 h-4 text-foreground" />
        </motion.button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-text-light py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Empty cells for days before the first day of month */}
        {Array.from({ length: adjustedFirstDay }).map((_, index) => (
          <div key={`empty-${index}`} className="h-8" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const status = getAvailabilityForDay(day);

          return (
            <div
              key={day}
              className={cn(
                "h-8 rounded flex items-center justify-center text-xs font-medium",
                availabilityColors[status]
              )}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-foreground/10">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
          <span className="text-xs text-text-light">Dispo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300" />
          <span className="text-xs text-text-light">Partiel</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
          <span className="text-xs text-text-light">Indispo</span>
        </div>
      </div>
    </div>
  );
}

// Mock data pour les sections non encore connectées
const mockPricing = {
  hourly: { price: 15, average: 14, min: 10, max: 20 },
  daily: { price: 35, average: 32, min: 25, max: 45 },
  weekly: { price: 200, average: 190, min: 150, max: 280 },
  monthly: { price: 700, average: 650, min: 500, max: 900 },
};

const mockAvailability: { [key: string]: "available" | "partial" | "unavailable" } = {};

const mockAcceptedAnimalTypes = [
  { type: "Chien", emoji: "🐕", accepted: true },
  { type: "Chat", emoji: "🐈", accepted: true },
  { type: "Lapin", emoji: "🐰", accepted: true },
  { type: "Rongeur", emoji: "🐹", accepted: true },
  { type: "Oiseau", emoji: "🦜", accepted: false },
  { type: "Reptile", emoji: "🦎", accepted: false },
];

// Types d'animaux pour l'affichage
const ANIMAL_TYPE_OPTIONS = [
  { value: "chien", label: "Chien", emoji: "🐕" },
  { value: "chat", label: "Chat", emoji: "🐈" },
  { value: "lapin", label: "Lapin", emoji: "🐰" },
  { value: "rongeur", label: "Rongeur", emoji: "🐹" },
  { value: "oiseau", label: "Oiseau", emoji: "🦜" },
  { value: "reptile", label: "Reptile", emoji: "🦎" },
  { value: "poisson", label: "Poisson", emoji: "🐠" },
  { value: "autre", label: "Autre", emoji: "🐾" },
];

export default function ProfilePage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const stats = calculateStats();

  // Récupérer le profil Convex
  const profileData = useQuery(
    api.services.profile.getProfile,
    token ? { token } : "skip"
  );

  // Mutations
  const upsertProfile = useMutation(api.services.profile.upsertProfile);

  // État de chargement
  const isLoading = authLoading || profileData === undefined;

  // Données du profil
  const userInfo = profileData?.user;
  const profile = profileData?.profile;

  // Photo de profil depuis le profil (URL Cloudinary)
  const profileImageUrl = profile?.profileImageUrl || null;

  // Calculer le pourcentage de complétion du profil
  const profileCompletionData = {
    hasProfilePhoto: !!profileImageUrl,
    hasCoverPhoto: !!profile?.coverImageUrl,
    hasDescription: !!profile?.description && profile.description.trim().length > 0,
    hasLocation: !!profile?.city || !!profile?.location,
    hasRadius: !!profile?.radius && profile.radius > 0,
    hasAcceptedAnimals: !!profile?.acceptedAnimals && profile.acceptedAnimals.length > 0,
    hasEquipments: profile?.hasGarden !== undefined || profile?.hasVehicle !== undefined,
    hasMaxAnimals: !!profile?.maxAnimalsPerSlot && profile.maxAnimalsPerSlot > 0,
    hasServices: true, // TODO: vérifier les services
    hasAvailability: true, // TODO: vérifier les disponibilités
    hasIcad: profile?.icadRegistered !== undefined && profile?.icadRegistered !== null,
  };

  // Handlers pour les modifications
  const handleUpdateDescription = useCallback(async (description: string) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, description: description || null });
  }, [token, upsertProfile]);

  const handleUpdateLocation = useCallback(async (data: {
    location: string;
    city?: string;
    postalCode?: string;
    department?: string;
    region?: string;
    coordinates?: { lat: number; lng: number };
    googlePlaceId?: string;
  }) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({
      token,
      location: data.location || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
      department: data.department || null,
      region: data.region || null,
      coordinates: data.coordinates || null,
      googlePlaceId: data.googlePlaceId || null,
    });
  }, [token, upsertProfile]);

  const handleUploadAvatar = useCallback(async (cloudinaryUrl: string) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, profileImageUrl: cloudinaryUrl });
  }, [token, upsertProfile]);

  const handleRemoveAvatar = useCallback(async () => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, profileImageUrl: null });
  }, [token, upsertProfile]);

  const handleUploadCover = useCallback(async (cloudinaryUrl: string) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, coverImageUrl: cloudinaryUrl });
  }, [token, upsertProfile]);

  const handleRemoveCover = useCallback(async () => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, coverImageUrl: null });
  }, [token, upsertProfile]);

  // Handlers pour les paramètres du profil
  const handleRadiusChange = useCallback(async (radius: number) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, radius });
  }, [token, upsertProfile]);

  const handleAcceptedAnimalsChange = useCallback(async (animals: string[]) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, acceptedAnimals: animals });
  }, [token, upsertProfile]);

  const handleHasGardenChange = useCallback(async (hasGarden: boolean) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, hasGarden });
  }, [token, upsertProfile]);

  const handleHasVehicleChange = useCallback(async (hasVehicle: boolean) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, hasVehicle });
  }, [token, upsertProfile]);

  const handleMaxAnimalsChange = useCallback(async (maxAnimalsPerSlot: number) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, maxAnimalsPerSlot });
  }, [token, upsertProfile]);

  // Handlers pour les conditions de garde
  const handleHousingTypeChange = useCallback(async (housingType: "house" | "apartment") => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, housingType });
  }, [token, upsertProfile]);

  const handleHousingSizeChange = useCallback(async (housingSize: number) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, housingSize });
  }, [token, upsertProfile]);

  const handleGardenSizeChange = useCallback(async (gardenSize: string | null) => {
    if (!token) throw new Error("Non authentifié");
    if (gardenSize === null) {
      await upsertProfile({ token, hasGarden: false, gardenSize: null });
    } else {
      await upsertProfile({ token, hasGarden: true, gardenSize });
    }
  }, [token, upsertProfile]);

  const handleIsSmokerChange = useCallback(async (isSmoker: boolean) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, isSmoker });
  }, [token, upsertProfile]);

  const handleHasChildrenChange = useCallback(async (hasChildren: boolean, childrenAges?: string[]) => {
    if (!token) throw new Error("Non authentifié");
    if (hasChildren && childrenAges) {
      await upsertProfile({ token, hasChildren, childrenAges });
    } else {
      await upsertProfile({ token, hasChildren: false, childrenAges: null });
    }
  }, [token, upsertProfile]);

  const handleChildrenAgesChange = useCallback(async (childrenAges: string[]) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, childrenAges });
  }, [token, upsertProfile]);

  const handleProvidesFoodChange = useCallback(async (providesFood: boolean) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, providesFood });
  }, [token, upsertProfile]);

  const handleOwnedAnimalsChange = useCallback(async (ownedAnimals: Array<{ type: string; name: string; breed?: string; age?: number }>) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, ownedAnimals: ownedAnimals.length > 0 ? ownedAnimals : null });
  }, [token, upsertProfile]);

  const handleSelectedActivitiesChange = useCallback(async (selectedActivities: Array<{ activityId: Id<"activities">; customDescription?: string }>) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, selectedActivities: selectedActivities.length > 0 ? selectedActivities : null });
  }, [token, upsertProfile]);

  const handleEnvironmentPhotosChange = useCallback(async (environmentPhotos: Array<{ id: string; url: string; caption?: string }>) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, environmentPhotos: environmentPhotos.length > 0 ? environmentPhotos : null });
  }, [token, upsertProfile]);

  const handleUpdateIcad = useCallback(async (icadRegistered: boolean) => {
    if (!token) throw new Error("Non authentifié");
    await upsertProfile({ token, icadRegistered });
  }, [token, upsertProfile]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-text-light">Chargement du profil...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si pas de données utilisateur
  if (!userInfo) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <p className="text-red-700">Impossible de charger le profil. Veuillez vous reconnecter.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Ma fiche
        </h1>
        <p className="text-text-light mt-1">
          Votre annonce visible par les propriétaires d&apos;animaux
        </p>
      </motion.div>

      {/* Profile Completion Bar */}
      <ProfileCompletionBar profileData={profileCompletionData} />

      {/* Profile Header avec bannière */}
      <ProfileHeader
        firstName={userInfo.firstName}
        lastName={userInfo.lastName}
        profileImage={profileImageUrl}
        coverImage={profile?.coverImageUrl}
        location={profile?.location}
        city={profile?.city}
        postalCode={profile?.postalCode}
        region={profile?.region}
        memberSince={user?.createdAt}
        verified={user?.emailVerified || false}
        rating={stats.averageRating}
        reviewCount={stats.totalReviews}
        responseRate={0}
        responseTime={undefined}
        description={profile?.description}
        icadRegistered={profile?.icadRegistered}
        isEditable={true}
        onUpdateDescription={handleUpdateDescription}
        onUpdateLocation={handleUpdateLocation}
        onUpdateIcad={handleUpdateIcad}
        onUploadAvatar={handleUploadAvatar}
        onRemoveAvatar={handleRemoveAvatar}
        onUploadCover={handleUploadCover}
        onRemoveCover={handleRemoveCover}
      />

      {/* Rayon d'intervention */}
      <ProfileSettingsSection
        radius={profile?.radius || 20}
        onRadiusChange={handleRadiusChange}
        acceptedAnimals={[]}
        isEditable={true}
        showOnlyRadius={true}
      />

      {/* Availability & Pricing - Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Availability Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-white rounded-3xl shadow-lg p-6"
        >
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Mes disponibilités
          </h3>
          <AvailabilityCalendar availability={mockAvailability} />
        </motion.div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl shadow-lg p-6"
        >
          <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Euro className="w-5 h-5 text-primary" />
            Tarifs
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <PricingCard
              icon={Clock}
              label="Heure"
              pricing={mockPricing.hourly}
              color="primary"
            />
            <PricingCard
              icon={Calendar}
              label="Jour"
              pricing={mockPricing.daily}
              color="secondary"
            />
            <PricingCard
              icon={CalendarDays}
              label="Semaine"
              pricing={mockPricing.weekly}
              color="purple"
            />
            <PricingCard
              icon={CalendarRange}
              label="Mois"
              pricing={mockPricing.monthly}
              color="accent"
            />
          </div>
          <div className="mt-3 p-2 bg-blue-50 rounded-xl flex items-center gap-2 text-xs text-blue-700">
            <span>💡</span>
            <span>Prix moyens basés sur votre zone géographique.</span>
          </div>
        </motion.div>
      </div>

      {/* Accepted Animals & Capacity & Equipment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-3xl shadow-lg p-6"
      >
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          Animaux acceptés
        </h3>

        {/* Capacité maximale */}
        <div className="mb-6">
          <p className="text-sm font-medium text-foreground mb-3">Capacité maximale</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <motion.button
                key={num}
                type="button"
                onClick={() => handleMaxAnimalsChange(num)}
                className={cn(
                  "w-12 h-12 rounded-xl border-2 font-semibold text-lg transition-all",
                  profile?.maxAnimalsPerSlot === num
                    ? "border-primary bg-primary text-white"
                    : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {num}
              </motion.button>
            ))}
          </div>
          {!profile?.maxAnimalsPerSlot && (
            <p className="text-xs text-amber-500 mt-2">
              Sélectionnez une capacité maximale
            </p>
          )}
        </div>

        {/* Types d'animaux */}
        <div className="mb-6">
          <p className="text-sm font-medium text-foreground mb-3">Types d&apos;animaux</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {mockAcceptedAnimalTypes.map((animal) => {
              const isAccepted = profile?.acceptedAnimals?.includes(animal.type.toLowerCase()) ?? false;
              return (
                <motion.button
                  key={animal.type}
                  type="button"
                  onClick={() => {
                    const animalId = animal.type.toLowerCase();
                    const currentAnimals = profile?.acceptedAnimals || [];
                    if (isAccepted) {
                      handleAcceptedAnimalsChange(currentAnimals.filter((a: string) => a !== animalId));
                    } else {
                      handleAcceptedAnimalsChange([...currentAnimals, animalId]);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer",
                    isAccepted
                      ? "bg-green-50 border-2 border-green-300"
                      : "bg-gray-50 border-2 border-gray-200 hover:border-gray-300"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-2xl">{animal.emoji}</span>
                  <span className={cn(
                    "font-medium",
                    isAccepted ? "text-green-700" : "text-gray-500"
                  )}>
                    {animal.type}
                  </span>
                  {isAccepted ? (
                    <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-300 ml-auto" />
                  )}
                </motion.button>
              );
            })}
          </div>
          {(!profile?.acceptedAnimals || profile.acceptedAnimals.length === 0) && (
            <p className="text-xs text-amber-500 mt-2">
              Sélectionnez au moins un type d&apos;animal
            </p>
          )}
        </div>

        {/* Équipements */}
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Équipements</p>
          <div className="flex flex-wrap gap-3">
            <motion.button
              type="button"
              onClick={() => handleHasVehicleChange(!profile?.hasVehicle)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all",
                profile?.hasVehicle
                  ? "border-secondary bg-secondary/5 text-secondary"
                  : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={cn(
                "p-2 rounded-lg",
                profile?.hasVehicle ? "bg-secondary/10" : "bg-foreground/5"
              )}>
                <Car className="w-5 h-5" />
              </div>
              <span className="font-medium">J&apos;ai un véhicule</span>
              {profile?.hasVehicle && <CheckCircle className="w-5 h-5 ml-2" />}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Housing Conditions - Style Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-3xl shadow-lg p-6"
      >
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Home className="w-5 h-5 text-primary" />
          Conditions de garde
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Type de logement */}
          <motion.button
            type="button"
            onClick={() => handleHousingTypeChange(profile?.housingType === "house" ? "apartment" : "house")}
            className="group relative flex items-center gap-4 p-4 bg-background rounded-xl hover:bg-primary/5 transition-colors text-left"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-foreground/5 group-hover:bg-primary/10 transition-colors">
              <Edit className="w-3.5 h-3.5 text-foreground/40 group-hover:text-primary transition-colors" />
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              profile?.housingType ? "bg-primary/10" : "bg-amber-100"
            )}>
              {profile?.housingType === "house" ? (
                <Home className="w-6 h-6 text-primary" />
              ) : profile?.housingType === "apartment" ? (
                <Building2 className="w-6 h-6 text-primary" />
              ) : (
                <Home className="w-6 h-6 text-amber-500" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {profile?.housingType === "house" ? "🏠 Maison" : profile?.housingType === "apartment" ? "🏢 Appartement" : "Type de logement ?"}
              </p>
              {profile?.housingType ? (
                <p className="text-sm text-text-light flex items-center gap-1">
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={profile?.housingSize || ""}
                    placeholder="?"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 0) handleHousingSizeChange(val);
                    }}
                    className="w-12 px-1 py-0.5 text-sm text-center bg-transparent border-b border-dashed border-foreground/30 focus:border-primary focus:outline-none font-medium text-foreground"
                  />
                  m²
                </p>
              ) : (
                <p className="text-sm text-amber-600">À renseigner</p>
              )}
            </div>
          </motion.button>

          {/* Jardin */}
          <motion.button
            type="button"
            onClick={() => {
              const sizes = [null, "petit", "moyen", "grand"];
              const currentIdx = profile?.hasGarden ? sizes.indexOf(profile?.gardenSize || "petit") : 0;
              const nextIdx = (currentIdx + 1) % sizes.length;
              handleGardenSizeChange(sizes[nextIdx]);
            }}
            className="group relative flex items-center gap-4 p-4 bg-background rounded-xl hover:bg-green-50 transition-colors text-left"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-foreground/5 group-hover:bg-green-100 transition-colors">
              <Edit className="w-3.5 h-3.5 text-foreground/40 group-hover:text-green-600 transition-colors" />
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              profile?.hasGarden ? "bg-green-100" : "bg-gray-100"
            )}>
              <TreeDeciduous className={cn(
                "w-6 h-6",
                profile?.hasGarden ? "text-green-600" : "text-gray-400"
              )} />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {profile?.hasGarden
                  ? `🌳 ${profile?.gardenSize === "petit" ? "Petit jardin" : profile?.gardenSize === "moyen" ? "Jardin moyen" : "Grand jardin"}`
                  : "🚫 Pas de jardin"}
              </p>
            </div>
          </motion.button>

          {/* Fumeur */}
          <motion.button
            type="button"
            onClick={() => handleIsSmokerChange(!(profile?.isSmoker ?? false))}
            className="group relative flex items-center gap-4 p-4 bg-background rounded-xl hover:bg-green-50 transition-colors text-left"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-foreground/5 group-hover:bg-green-100 transition-colors">
              <Edit className="w-3.5 h-3.5 text-foreground/40 group-hover:text-green-600 transition-colors" />
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              profile?.isSmoker === false ? "bg-green-100" : profile?.isSmoker === true ? "bg-orange-100" : "bg-amber-100"
            )}>
              {profile?.isSmoker === true ? (
                <Cigarette className="w-6 h-6 text-orange-600" />
              ) : profile?.isSmoker === false ? (
                <CigaretteOff className="w-6 h-6 text-green-600" />
              ) : (
                <CigaretteOff className="w-6 h-6 text-amber-500" />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {profile?.isSmoker === true ? "🚬 Fumeur" : profile?.isSmoker === false ? "🚭 Non-fumeur" : "Fumeur ?"}
              </p>
              {profile?.isSmoker === undefined && (
                <p className="text-sm text-amber-600">À renseigner</p>
              )}
            </div>
          </motion.button>

          {/* Enfants */}
          <motion.button
            type="button"
            onClick={() => handleHasChildrenChange(!(profile?.hasChildren ?? false), profile?.childrenAges || [])}
            className="group relative flex items-center gap-4 p-4 bg-background rounded-xl hover:bg-secondary/5 transition-colors text-left"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-foreground/5 group-hover:bg-secondary/10 transition-colors">
              <Edit className="w-3.5 h-3.5 text-foreground/40 group-hover:text-secondary transition-colors" />
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              profile?.hasChildren ? "bg-secondary/10" : profile?.hasChildren === false ? "bg-gray-100" : "bg-amber-100"
            )}>
              <Baby className={cn(
                "w-6 h-6",
                profile?.hasChildren ? "text-secondary" : profile?.hasChildren === false ? "text-gray-400" : "text-amber-500"
              )} />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {profile?.hasChildren ? "👶 Enfants présents" : profile?.hasChildren === false ? "👤 Pas d'enfants" : "Enfants ?"}
              </p>
              {profile?.hasChildren && profile?.childrenAges && profile.childrenAges.length > 0 && (
                <p className="text-sm text-text-light">
                  {profile.childrenAges.map((a: string) => a === "0-3" ? "👶 0-3" : a === "4-10" ? "🧒 4-10" : "👦 11-17").join(", ")} ans
                </p>
              )}
              {profile?.hasChildren === undefined && (
                <p className="text-sm text-amber-600">À renseigner</p>
              )}
            </div>
          </motion.button>

          {/* Animaux de l'annonceur */}
          <div className="flex items-center gap-4 p-4 bg-background rounded-xl text-left">
            <div className={cn(
              "p-3 rounded-xl",
              profile?.ownedAnimals && profile.ownedAnimals.length > 0 ? "bg-primary/10" : "bg-gray-100"
            )}>
              <PawPrint className={cn(
                "w-6 h-6",
                profile?.ownedAnimals && profile.ownedAnimals.length > 0 ? "text-primary" : "text-gray-400"
              )} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {profile?.ownedAnimals && profile.ownedAnimals.length > 0
                  ? `🐾 ${profile.ownedAnimals.length} animal${profile.ownedAnimals.length > 1 ? "x" : ""}`
                  : "🐾 Mes animaux"}
              </p>
              {profile?.ownedAnimals && profile.ownedAnimals.length > 0 ? (
                <p className="text-sm text-text-light">
                  {profile.ownedAnimals.map((a: { name: string }) => a.name).join(", ")}
                </p>
              ) : (
                <p className="text-sm text-text-light">Voir ci-dessous</p>
              )}
            </div>
          </div>

          {/* Alimentation */}
          <motion.button
            type="button"
            onClick={() => handleProvidesFoodChange(!(profile?.providesFood ?? false))}
            className="group relative flex items-center gap-4 p-4 bg-background rounded-xl hover:bg-orange-50 transition-colors text-left"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-foreground/5 group-hover:bg-orange-100 transition-colors">
              <Edit className="w-3.5 h-3.5 text-foreground/40 group-hover:text-orange-600 transition-colors" />
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              profile?.providesFood === true ? "bg-green-100" : profile?.providesFood === false ? "bg-orange-100" : "bg-amber-100"
            )}>
              <Utensils className={cn(
                "w-6 h-6",
                profile?.providesFood === true ? "text-green-600" : profile?.providesFood === false ? "text-orange-600" : "text-amber-500"
              )} />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {profile?.providesFood === true ? "✅ Alimentation fournie" : profile?.providesFood === false ? "📦 À fournir" : "Alimentation ?"}
              </p>
              {profile?.providesFood === false && (
                <p className="text-sm text-text-light">Le propriétaire fournit</p>
              )}
              {profile?.providesFood === undefined && (
                <p className="text-sm text-amber-600">À renseigner</p>
              )}
            </div>
          </motion.button>
        </div>

        {/* Section enfants - Âges (si enfants) */}
        {profile?.hasChildren && (
          <div className="mt-4 p-4 bg-secondary/5 rounded-xl">
            <p className="text-sm font-medium text-foreground mb-2">Âge des enfants :</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "0-3", label: "0-3 ans", emoji: "👶" },
                { value: "4-10", label: "4-10 ans", emoji: "🧒" },
                { value: "11-17", label: "11-17 ans", emoji: "👦" },
              ].map((age) => {
                const isSelected = profile?.childrenAges?.includes(age.value);
                return (
                  <motion.button
                    key={age.value}
                    type="button"
                    onClick={() => {
                      const currentAges = profile?.childrenAges || [];
                      if (isSelected) {
                        handleChildrenAgesChange(currentAges.filter((a: string) => a !== age.value));
                      } else {
                        handleChildrenAgesChange([...currentAges, age.value]);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm",
                      isSelected
                        ? "bg-secondary text-white"
                        : "bg-white text-foreground hover:bg-secondary/10"
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>{age.emoji}</span>
                    <span className="font-medium">{age.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section animaux - Liste et ajout */}
        <div className="mt-4 p-4 bg-primary/5 rounded-xl">
          <p className="text-sm font-medium text-foreground mb-3">Mes animaux :</p>

          {profile?.ownedAnimals && profile.ownedAnimals.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {profile.ownedAnimals.map((animal: { id?: string; type: string; name: string; breed?: string; age?: number; profilePhoto?: string }, index: number) => (
                <div
                  key={animal.id || index}
                  className="group flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-primary/20 hover:border-primary/40 transition-colors"
                >
                  {animal.profilePhoto ? (
                    <img src={animal.profilePhoto} alt={animal.name} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <span className="text-sm">
                      {ANIMAL_TYPE_OPTIONS.find(o => o.value === animal.type)?.emoji || "🐾"}
                    </span>
                  )}
                  <span className="font-medium text-sm">{animal.name}</span>
                  {animal.age !== undefined && <span className="text-xs text-text-light">({animal.age}a)</span>}

                  {/* Boutons édition/suppression */}
                  <div className="flex items-center gap-1 ml-1">
                    <Link href={`/dashboard/mes-animaux/${animal.id || `index-${index}`}/modifier`}>
                      <motion.div
                        className="text-foreground/40 hover:text-primary p-0.5"
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </motion.div>
                    </Link>
                    <motion.button
                      type="button"
                      onClick={() => {
                        const newAnimals = [...(profile?.ownedAnimals || [])];
                        newAnimals.splice(index, 1);
                        handleOwnedAnimalsChange(newAnimals);
                      }}
                      className="text-foreground/40 hover:text-red-600 p-0.5"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link href="/dashboard/mes-animaux/nouveau">
            <motion.div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un animal</span>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Activities */}
      <ActivitiesSection
        token={token}
        selectedActivities={profile?.selectedActivities as Array<{ activityId: Id<"activities">; customDescription?: string }> | undefined}
        onUpdate={handleSelectedActivitiesChange}
      />

      {/* Environment Photos */}
      <EnvironmentPhotosSection
        photos={profile?.environmentPhotos || []}
        onUpdate={handleEnvironmentPhotosChange}
      />

      {/* Recent Reviews Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-3xl shadow-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Star className="w-5 h-5 fill-accent text-accent" />
            Derniers avis
            <span className="ml-2 px-2 py-0.5 bg-accent/20 text-foreground text-sm rounded-full">
              {stats.averageRating.toFixed(1)}/5
            </span>
          </h3>
          <a href="/dashboard/avis" className="text-sm text-primary font-medium hover:underline">
            Voir tous les avis
          </a>
        </div>

        <div className="space-y-4">
          {mockReviews.slice(0, 2).map((review) => (
            <div key={review.id} className="p-4 bg-background rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-xl">
                  {review.clientAvatar}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{review.clientName}</p>
                  <p className="text-xs text-text-light flex items-center gap-1">
                    <span>{review.animal.emoji}</span>
                    {review.animal.name}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-4 h-4",
                        i < review.rating ? "fill-accent text-accent" : "text-gray-200"
                      )}
                    />
                  ))}
                </div>
              </div>
              <p className="text-text-light text-sm">&ldquo;{review.comment}&rdquo;</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
