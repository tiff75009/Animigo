"use client";

import { memo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  MapPin,
  Calendar,
  User,
  ImageIcon,
  Sparkles,
  Pencil,
  Star,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import AvatarUpload from "@/app/dashboard/components/AvatarUpload";
import CoverImageUpload from "@/app/dashboard/components/CoverImageUpload";
import EditableField from "@/app/dashboard/components/EditableField";
import AddressEditModal from "@/app/dashboard/components/AddressEditModal";

interface LocationData {
  location: string;
  city?: string;
  postalCode?: string;
  department?: string;
  region?: string;
  coordinates?: { lat: number; lng: number };
  googlePlaceId?: string;
}

interface ClientProfileHeaderProps {
  profile: {
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
    coverImageUrl: string | null;
    location: string | null;
    city: string | null;
    postalCode: string | null;
    description: string | null;
    createdAt: number;
  };
  onUploadAvatar?: (url: string) => Promise<void>;
  onRemoveAvatar?: () => Promise<void>;
  onUploadCover?: (url: string) => Promise<void>;
  onRemoveCover?: () => Promise<void>;
  onUpdateDescription?: (description: string) => Promise<void>;
  onUpdateLocation?: (data: LocationData) => Promise<void>;
}

function ClientProfileHeader({
  profile,
  onUploadAvatar,
  onRemoveAvatar,
  onUploadCover,
  onRemoveCover,
  onUpdateDescription,
  onUpdateLocation,
}: ClientProfileHeaderProps) {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const memberSince = new Date(profile.createdAt).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  const hasDescription =
    profile.description && profile.description.trim().length > 0;

  // Construire l'affichage de l'adresse
  const buildDisplayAddress = () => {
    const loc = profile.location?.trim() || "";
    const cityName = profile.city?.trim() || "";
    const postal = profile.postalCode?.trim() || "";

    const locationContainsCity =
      cityName && loc.toLowerCase().includes(cityName.toLowerCase());

    if (!loc || loc.toLowerCase() === cityName.toLowerCase()) {
      if (cityName) {
        return postal ? `${postal} ${cityName}` : cityName;
      }
      return "";
    }

    const parts: string[] = [loc];

    if (cityName && !locationContainsCity) {
      parts.push(postal ? `${postal} ${cityName}` : cityName);
    } else if (postal && !loc.includes(postal)) {
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-3xl shadow-lg overflow-hidden"
      >
        {/* Cover Image avec Avatar et Nom intégrés */}
        <div className="relative h-56 md:h-64 bg-gradient-to-br from-primary/30 via-secondary/30 to-purple/30">
          {profile.coverImageUrl ? (
            <Image
              src={profile.coverImageUrl}
              alt="Photo de couverture"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-16 h-16 text-white/40 mx-auto mb-2" />
                {onUploadCover && (
                  <p className="text-sm text-white/60">
                    Ajoutez une photo de couverture
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Overlay dégradé plus fort en bas */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Boutons édition couverture */}
          {onUploadCover && (
            <div className="absolute top-4 right-4 z-10">
              <CoverImageUpload
                currentImageUrl={profile.coverImageUrl}
                onUploadComplete={onUploadCover}
                onRemove={onRemoveCover}
              />
            </div>
          )}

          {/* Avatar + Nom - positionnés en bas de la bannière */}
          <div className="absolute bottom-0 left-0 right-0 px-6 md:px-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              {/* Avatar - dépasse en bas de la bannière */}
              <div className="relative flex-shrink-0 translate-y-16 sm:translate-y-12">
                {onUploadAvatar ? (
                  <div className="ring-4 ring-white rounded-2xl bg-white">
                    <AvatarUpload
                      currentImageUrl={profile.profileImageUrl}
                      onUploadComplete={onUploadAvatar}
                      onRemove={onRemoveAvatar}
                      size="lg"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-gray-100 ring-4 ring-white">
                      {profile.profileImageUrl ? (
                        <Image
                          src={profile.profileImageUrl}
                          alt={`${profile.firstName} ${profile.lastName}`}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <User className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Nom + infos - dans la bannière, à droite de l'avatar */}
              <div className="flex-1 text-center sm:text-left pb-4 sm:pb-5">
                <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                  {profile.firstName} {profile.lastName}
                </h1>
                {/* Localisation et membre depuis */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-sm text-white/90">
                  {hasLocation && !onUpdateLocation && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {displayAddress}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Membre depuis {memberSince}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Infos - avec padding top pour l'avatar qui dépasse */}
        <div className="px-6 md:px-8 pt-20 sm:pt-16 pb-6">
          {/* Grille d'infos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {/* Localisation (éditable) */}
            {onUpdateLocation ? (
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(true)}
                className={cn(
                  "col-span-2 group flex items-center gap-3 p-4 rounded-2xl transition-all",
                  hasLocation
                    ? "bg-gray-50 hover:bg-gray-100"
                    : "bg-amber-50 border-2 border-dashed border-amber-200 hover:bg-amber-100"
                )}
              >
                <div
                  className={cn(
                    "p-2.5 rounded-xl",
                    hasLocation ? "bg-white shadow-sm" : "bg-amber-100"
                  )}
                >
                  <MapPin
                    className={cn(
                      "w-5 h-5",
                      hasLocation ? "text-primary" : "text-amber-600"
                    )}
                  />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs text-gray-500 mb-0.5">Localisation</p>
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      hasLocation ? "text-gray-900" : "text-amber-700"
                    )}
                  >
                    {hasLocation
                      ? displayAddress
                      : "Ajouter votre adresse"}
                  </p>
                </div>
                <Pencil
                  className={cn(
                    "w-4 h-4 transition-opacity",
                    hasLocation
                      ? "opacity-0 group-hover:opacity-100 text-gray-400"
                      : "text-amber-500"
                  )}
                />
              </button>
            ) : hasLocation ? (
              <div className="col-span-2 flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Localisation</p>
                  <p className="text-sm font-medium text-gray-900">
                    {displayAddress}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Note moyenne */}
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl">
              <div className="p-2.5 bg-white rounded-xl shadow-sm">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Note moyenne</p>
                <p className="text-sm font-medium text-gray-900">
                  — <span className="text-gray-500">(0 avis)</span>
                </p>
              </div>
            </div>

            {/* Membre depuis */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
              <div className="p-2.5 bg-white rounded-xl shadow-sm">
                <Calendar className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Membre depuis</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {memberSince}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="relative">
            <div
              className={cn(
                "p-5 rounded-2xl transition-all",
                hasDescription || onUpdateDescription
                  ? "bg-gradient-to-br from-gray-50 to-white border border-gray-100"
                  : "bg-amber-50 border-2 border-dashed border-amber-200"
              )}
            >
              {/* Icône décorative */}
              {(hasDescription || onUpdateDescription) && (
                <div className="absolute -top-3 left-5">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                </div>
              )}

              <div className="pt-2">
                {onUpdateDescription ? (
                  <EditableField
                    value={profile.description || ""}
                    placeholder="Présentez-vous en quelques mots... Parlez de vos animaux, de ce que vous recherchez comme services, etc."
                    onSave={onUpdateDescription}
                    type="textarea"
                    maxLength={500}
                    minRows={3}
                    maxRows={6}
                    textClassName="text-gray-700 leading-relaxed"
                  />
                ) : hasDescription ? (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {profile.description}
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
                        Ajoutez une description pour vous présenter aux
                        prestataires.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal d'édition d'adresse */}
      <AddressEditModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleSaveAddress}
        currentAddress={profile.location || ""}
        currentCity={profile.city || ""}
        currentPostalCode={profile.postalCode || ""}
        currentRegion=""
      />
    </>
  );
}

export default memo(ClientProfileHeader);
