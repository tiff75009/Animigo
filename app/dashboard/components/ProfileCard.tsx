"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  MapPin,
  CheckCircle,
  Clock,
  Calendar,
  Star,
  Shield,
  MessageSquare,
  Pencil,
  User,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import EditableField from "./EditableField";
import AvatarUpload from "./AvatarUpload";
import AddressEditModal from "./AddressEditModal";

interface LocationData {
  location: string;
  city?: string;
  postalCode?: string;
  department?: string;
  region?: string;
  coordinates?: { lat: number; lng: number };
  googlePlaceId?: string;
}

interface ProfileCardProps {
  firstName: string;
  lastName: string;
  profileImage?: string | null;
  // Adresse structurée
  location?: string | null;
  city?: string | null;
  postalCode?: string | null;
  region?: string | null;
  memberSince?: string | number;
  verified?: boolean;
  rating?: number;
  reviewCount?: number;
  responseRate?: number;
  responseTime?: string;
  description?: string | null;
  // Callbacks pour les modifications
  onUpdateDescription?: (description: string) => Promise<void>;
  onUpdateLocation?: (data: LocationData) => Promise<void>;
  onUploadAvatar?: (url: string) => Promise<void>;
  onRemoveAvatar?: () => Promise<void>;
  // Mode édition
  isEditable?: boolean;
  isLoading?: boolean;
}

export default function ProfileCard({
  firstName,
  lastName,
  profileImage,
  location,
  city,
  postalCode,
  region,
  memberSince,
  verified = false,
  rating = 0,
  reviewCount = 0,
  responseRate = 0,
  responseTime,
  description,
  onUpdateDescription,
  onUpdateLocation,
  onUploadAvatar,
  onRemoveAvatar,
  isEditable = false,
  isLoading = false,
}: ProfileCardProps) {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const formatDate = (dateInput?: string | number) => {
    if (!dateInput) return "";
    const date = typeof dateInput === "number" ? new Date(dateInput) : new Date(dateInput);
    return date.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  };

  const hasDescription = description && description.trim().length > 0;

  // Construire l'affichage de l'adresse
  const buildDisplayAddress = () => {
    const loc = location?.trim() || "";
    const cityName = city?.trim() || "";
    const postal = postalCode?.trim() || "";

    // Si location contient déjà la ville (ex: anciennes données), ne pas la répéter
    const locationContainsCity = cityName && loc.toLowerCase().includes(cityName.toLowerCase());

    // Si location est vide ou égal à la ville, on affiche juste ville + CP
    if (!loc || loc.toLowerCase() === cityName.toLowerCase()) {
      if (cityName) {
        return postal ? `${postal} ${cityName}` : cityName;
      }
      return "";
    }

    // Location existe et n'est pas juste la ville
    const parts: string[] = [loc];

    // Ajouter ville + CP si pas déjà dans location
    if (cityName && !locationContainsCity) {
      parts.push(postal ? `${postal} ${cityName}` : cityName);
    } else if (postal && !loc.includes(postal)) {
      // Ajouter juste le CP si la ville est déjà dans location
      parts.push(postal);
    }

    return parts.join(", ");
  };

  const displayAddress = buildDisplayAddress();
  const hasLocation = displayAddress.length > 0;

  const handleSaveAddress = async (data: LocationData) => {
    if (onUpdateLocation) {
      await onUpdateLocation(data);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row gap-6 animate-pulse">
          {/* Photo skeleton */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gray-200 mx-auto sm:mx-0" />

          {/* Info skeleton */}
          <div className="flex-1 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-48 mx-auto sm:mx-0" />
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto sm:mx-0" />
            <div className="flex gap-2 justify-center sm:justify-start">
              <div className="h-8 bg-gray-200 rounded w-20" />
              <div className="h-8 bg-gray-200 rounded w-16" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          </div>
        </div>
        <div className="mt-6 h-20 bg-gray-100 rounded-xl" />
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Top Section - Photo + Main Info */}
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Profile Photo */}
            <div className="relative mx-auto sm:mx-0 flex-shrink-0">
              {isEditable && onUploadAvatar ? (
                <AvatarUpload
                  currentImageUrl={profileImage}
                  onUploadComplete={onUploadAvatar}
                  onRemove={onRemoveAvatar}
                  size="md"
                />
              ) : (
                <div className="relative group">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-gray-100 ring-4 ring-gray-50">
                    {profileImage ? (
                      <Image
                        src={profileImage}
                        alt={`${firstName} ${lastName}`}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <User className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Verified badge */}
              {verified && (
                <div className="absolute bottom-1 right-1 bg-secondary text-white p-1.5 rounded-lg shadow-md">
                  <CheckCircle className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              {/* Name */}
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                {firstName} {lastName}
              </h2>

              {/* Location + Member since */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 text-sm text-gray-500 mb-4">
                {isEditable && onUpdateLocation ? (
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className={cn(
                      "group flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors",
                      hasLocation
                        ? "hover:bg-gray-100"
                        : "bg-amber-50 border border-amber-200 hover:bg-amber-100"
                    )}
                  >
                    <MapPin className={cn(
                      "w-4 h-4 flex-shrink-0",
                      hasLocation ? "text-gray-400" : "text-amber-500"
                    )} />
                    <span className={cn(
                      hasLocation ? "text-gray-600" : "text-amber-700 font-medium"
                    )}>
                      {hasLocation ? displayAddress : "Ajouter votre adresse"}
                    </span>
                    <Pencil className={cn(
                      "w-3 h-3 transition-opacity",
                      hasLocation
                        ? "opacity-0 group-hover:opacity-100 text-gray-400"
                        : "text-amber-500"
                    )} />
                  </button>
                ) : (
                  hasLocation && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {displayAddress}
                    </span>
                  )
                )}
                {memberSince && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Membre depuis {formatDate(memberSince)}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                {/* Verified */}
                {verified && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 text-secondary rounded-lg text-sm font-medium">
                    <Shield className="w-4 h-4" />
                    Vérifié
                  </div>
                )}

                {/* Rating */}
                {reviewCount > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {rating.toFixed(1)}
                    <span className="text-amber-600/70">({reviewCount})</span>
                  </div>
                )}

                {/* Response rate */}
                {responseRate > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                    <MessageSquare className="w-4 h-4" />
                    {responseRate}%
                  </div>
                )}

                {/* Response time */}
                {responseTime && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    {responseTime}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          <div className={cn(
            "p-4 rounded-xl",
            hasDescription || isEditable ? "bg-gray-50" : "bg-amber-50 border border-amber-200"
          )}>
            {isEditable && onUpdateDescription ? (
              <EditableField
                value={description || ""}
                placeholder="Ajoutez une description pour vous présenter aux propriétaires d'animaux..."
                onSave={onUpdateDescription}
                type="textarea"
                maxLength={1000}
                minRows={3}
                maxRows={8}
                textClassName="text-gray-600 leading-relaxed text-sm sm:text-base"
              />
            ) : hasDescription ? (
              <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                {description}
              </p>
            ) : (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Pencil className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Description manquante
                  </p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Ajoutez une description pour vous présenter aux propriétaires d&apos;animaux.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modal d'édition d'adresse */}
      <AddressEditModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleSaveAddress}
        currentAddress={location || ""}
        currentCity={city || ""}
        currentPostalCode={postalCode || ""}
        currentRegion={region || ""}
      />
    </>
  );
}
