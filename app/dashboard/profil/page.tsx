"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  MapPin,
  CheckCircle,
  Home,
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
  Shield,
  MessageSquare,
  Edit,
  XCircle,
  Ban,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { mockUserProfile, mockReviews, calculateStats, type PricingTier } from "@/app/lib/dashboard-data";
import { cn } from "@/app/lib/utils";

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

// Photo Gallery Component
interface PhotoGalleryProps {
  photos: { id: string; url: string; caption: string }[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onGoTo?: (index: number) => void;
}

function PhotoGallery({ photos, currentIndex, onClose, onPrev, onNext, onGoTo }: PhotoGalleryProps) {
  const currentPhoto = photos[currentIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <motion.button
        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
        onClick={onClose}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <X className="w-6 h-6" />
      </motion.button>

      {/* Counter */}
      <div className="absolute top-4 left-4 px-4 py-2 bg-white/10 rounded-full text-white text-sm">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Previous button */}
      <motion.button
        className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <ChevronLeft className="w-8 h-8" />
      </motion.button>

      {/* Image container */}
      <motion.div
        key={currentPhoto.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 25 }}
        className="relative max-w-5xl max-h-[80vh] mx-16"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={currentPhoto.url}
          alt={currentPhoto.caption}
          width={1200}
          height={800}
          className="rounded-2xl object-contain max-h-[80vh] w-auto"
        />
        {/* Caption */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-2xl"
        >
          <p className="text-white text-lg font-medium text-center">
            {currentPhoto.caption}
          </p>
        </motion.div>
      </motion.div>

      {/* Next button */}
      <motion.button
        className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <ChevronRight className="w-8 h-8" />
      </motion.button>

      {/* Thumbnails */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {photos.map((photo, index) => (
          <motion.button
            key={photo.id}
            className={cn(
              "w-16 h-12 rounded-lg overflow-hidden border-2 transition-all",
              index === currentIndex
                ? "border-white opacity-100"
                : "border-transparent opacity-50 hover:opacity-75"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onGoTo?.(index);
            }}
            whileHover={{ scale: 1.05 }}
          >
            <Image
              src={photo.url}
              alt={photo.caption}
              width={64}
              height={48}
              className="w-full h-full object-cover"
            />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// Availability Calendar Component
interface AvailabilityCalendarProps {
  availability: { [key: string]: "available" | "partial" | "unavailable" };
}

function AvailabilityCalendar({ availability }: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2024, 0, 1)); // January 2024 for demo

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

export default function ProfilePage() {
  const stats = calculateStats();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  };

  const openGallery = (index: number) => {
    setCurrentPhotoIndex(index);
    setGalleryOpen(true);
  };

  const closeGallery = () => {
    setGalleryOpen(false);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) =>
      prev === 0 ? mockUserProfile.environmentPhotos.length - 1 : prev - 1
    );
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) =>
      prev === mockUserProfile.environmentPhotos.length - 1 ? 0 : prev + 1
    );
  };

  const goToPhoto = (index: number) => {
    setCurrentPhotoIndex(index);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header with edit button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Ma fiche
          </h1>
          <p className="text-text-light mt-1">
            Votre annonce visible par les propriétaires d&apos;animaux
          </p>
        </div>
        <motion.button
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Edit className="w-4 h-4" />
          Modifier
        </motion.button>
      </motion.div>

      {/* Profile Card - Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl shadow-lg overflow-hidden"
      >
        {/* Cover gradient */}
        <div className="h-32 bg-gradient-to-r from-primary to-secondary relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M10%200a2%202%200%20110%204%202%202%200%20010-4zm0%206a2%202%200%20110%204%202%202%200%20010-4zm0%206a2%202%200%20110%204%202%202%200%20010-4z%22%20fill%3D%22%23fff%22%20fill-opacity%3D%22.1%22%2F%3E%3C%2Fsvg%3E')] opacity-30" />
        </div>

        <div className="px-6 pb-6 -mt-16 relative">
          {/* Profile image */}
          <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-white">
                <Image
                  src={mockUserProfile.profileImage}
                  alt={`${mockUserProfile.firstName} ${mockUserProfile.lastName}`}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>
              {mockUserProfile.verified && (
                <div className="absolute -bottom-2 -right-2 bg-secondary text-white p-2 rounded-full shadow-lg">
                  <CheckCircle className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">
                {mockUserProfile.firstName} {mockUserProfile.lastName}
              </h2>
              <p className="text-text-light flex items-center gap-2 mt-1">
                <MapPin className="w-4 h-4" />
                {mockUserProfile.location}
              </p>
              <p className="text-sm text-text-light mt-1">
                Membre depuis {formatDate(mockUserProfile.memberSince)}
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {mockUserProfile.verified && (
                <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  Vérifié
                </span>
              )}
              <span className="px-3 py-1 bg-accent/20 text-foreground rounded-full text-sm font-medium flex items-center gap-1">
                <Star className="w-4 h-4 fill-accent text-accent" />
                {stats.averageRating.toFixed(1)} ({stats.totalReviews} avis)
              </span>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                {mockUserProfile.responseRate}% réponse
              </span>
              <span className="px-3 py-1 bg-purple/10 text-purple rounded-full text-sm font-medium flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Répond en {mockUserProfile.responseTime}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-background rounded-2xl p-5">
            <h3 className="font-semibold text-foreground mb-2">À propos de moi</h3>
            <p className="text-text-light leading-relaxed">
              {mockUserProfile.description}
            </p>
          </div>
        </div>
      </motion.div>

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
          <AvailabilityCalendar availability={mockUserProfile.availability} />
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
              pricing={mockUserProfile.pricing.hourly}
              color="primary"
            />
            <PricingCard
              icon={Calendar}
              label="Jour"
              pricing={mockUserProfile.pricing.daily}
              color="secondary"
            />
            <PricingCard
              icon={CalendarDays}
              label="Semaine"
              pricing={mockUserProfile.pricing.weekly}
              color="purple"
            />
            <PricingCard
              icon={CalendarRange}
              label="Mois"
              pricing={mockUserProfile.pricing.monthly}
              color="accent"
            />
          </div>
          <div className="mt-3 p-2 bg-blue-50 rounded-xl flex items-center gap-2 text-xs text-blue-700">
            <span>💡</span>
            <span>Prix moyens basés sur votre zone géographique.</span>
          </div>
        </motion.div>
      </div>

      {/* Accepted Animals & Capacity */}
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

        <div className="mb-4 p-4 bg-primary/5 rounded-xl inline-block">
          <p className="text-sm text-text-light">Capacité maximale</p>
          <p className="text-2xl font-bold text-primary">{mockUserProfile.maxAnimals} animaux</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {mockUserProfile.acceptedAnimalTypes.map((animal) => (
            <div
              key={animal.type}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl",
                animal.accepted
                  ? "bg-green-50 border border-green-200"
                  : "bg-gray-50 border border-gray-200 opacity-60"
              )}
            >
              <span className="text-2xl">{animal.emoji}</span>
              <span className={cn(
                "font-medium",
                animal.accepted ? "text-green-700" : "text-gray-500"
              )}>
                {animal.type}
              </span>
              {animal.accepted ? (
                <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-400 ml-auto" />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Housing Conditions */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Housing type */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-background rounded-xl">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {mockUserProfile.housing.type === "house" ? "Maison" : "Appartement"}
                </p>
                <p className="text-sm text-text-light">{mockUserProfile.housing.floorArea} m²</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-background rounded-xl">
              <div className={cn(
                "p-3 rounded-xl",
                mockUserProfile.housing.hasGarden ? "bg-green-100" : "bg-gray-100"
              )}>
                <TreeDeciduous className={cn(
                  "w-6 h-6",
                  mockUserProfile.housing.hasGarden ? "text-green-600" : "text-gray-400"
                )} />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {mockUserProfile.housing.hasGarden ? "Jardin" : "Pas de jardin"}
                </p>
                {mockUserProfile.housing.hasGarden && mockUserProfile.housing.gardenSize && (
                  <p className="text-sm text-text-light">{mockUserProfile.housing.gardenSize}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-background rounded-xl">
              <div className={cn(
                "p-3 rounded-xl",
                mockUserProfile.housing.isSmokeFree ? "bg-green-100" : "bg-orange-100"
              )}>
                <Ban className={cn(
                  "w-6 h-6",
                  mockUserProfile.housing.isSmokeFree ? "text-green-600" : "text-orange-600"
                )} />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {mockUserProfile.housing.isSmokeFree ? "Non-fumeur" : "Fumeur"}
                </p>
              </div>
            </div>
          </div>

          {/* Presence */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-background rounded-xl">
              <div className={cn(
                "p-3 rounded-xl",
                mockUserProfile.hasChildren ? "bg-blue-100" : "bg-gray-100"
              )}>
                <Baby className={cn(
                  "w-6 h-6",
                  mockUserProfile.hasChildren ? "text-blue-600" : "text-gray-400"
                )} />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {mockUserProfile.hasChildren ? "Enfants présents" : "Pas d'enfants"}
                </p>
                {mockUserProfile.hasChildren && mockUserProfile.childrenDetails && (
                  <p className="text-sm text-text-light">{mockUserProfile.childrenDetails}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-background rounded-xl">
              <div className={cn(
                "p-3 rounded-xl",
                mockUserProfile.hasOwnAnimals ? "bg-primary/10" : "bg-gray-100"
              )}>
                <Heart className={cn(
                  "w-6 h-6",
                  mockUserProfile.hasOwnAnimals ? "text-primary" : "text-gray-400"
                )} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  {mockUserProfile.hasOwnAnimals ? "Animaux présents" : "Pas d'animaux"}
                </p>
                {mockUserProfile.hasOwnAnimals && mockUserProfile.ownAnimals.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {mockUserProfile.ownAnimals.map((animal, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-text-light">
                        <span>{animal.emoji}</span>
                        <span className="font-medium text-foreground">{animal.name}</span>
                        <span>({animal.type}, {animal.age})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-background rounded-xl">
              <div className={cn(
                "p-3 rounded-xl",
                mockUserProfile.providesFood ? "bg-green-100" : "bg-orange-100"
              )}>
                <Utensils className={cn(
                  "w-6 h-6",
                  mockUserProfile.providesFood ? "text-green-600" : "text-orange-600"
                )} />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {mockUserProfile.providesFood ? "Alimentation fournie" : "Alimentation à fournir"}
                </p>
                {mockUserProfile.foodDetails && (
                  <p className="text-sm text-text-light mt-1">{mockUserProfile.foodDetails}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Activities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-3xl shadow-lg p-6"
      >
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="text-xl">🎯</span>
          Activités proposées
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockUserProfile.activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 bg-background rounded-xl"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                {activity.emoji}
              </div>
              <div>
                <p className="font-semibold text-foreground">{activity.name}</p>
                <p className="text-sm text-text-light">{activity.description}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Environment Photos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white rounded-3xl shadow-lg p-6"
      >
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <span className="text-xl">📸</span>
          Photos de l&apos;environnement
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mockUserProfile.environmentPhotos.map((photo, index) => (
            <motion.div
              key={photo.id}
              className="relative aspect-[4/3] rounded-xl overflow-hidden group cursor-pointer"
              whileHover={{ scale: 1.02 }}
              onClick={() => openGallery(index)}
            >
              <Image
                src={photo.url}
                alt={photo.caption}
                fill
                className="object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="absolute bottom-0 left-0 right-0 p-3 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.caption}
              </p>
              {/* Zoom icon on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Photo Gallery Modal */}
      <AnimatePresence>
        {galleryOpen && (
          <PhotoGallery
            photos={mockUserProfile.environmentPhotos}
            currentIndex={currentPhotoIndex}
            onClose={closeGallery}
            onPrev={prevPhoto}
            onNext={nextPhoto}
            onGoTo={goToPhoto}
          />
        )}
      </AnimatePresence>

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
