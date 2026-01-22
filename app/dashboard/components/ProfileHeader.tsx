"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  ImageIcon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import EditableField from "./EditableField";
import AvatarUpload from "./AvatarUpload";
import AddressEditModal from "./AddressEditModal";
import CoverImageUpload from "./CoverImageUpload";

interface LocationData {
  location: string;
  city?: string;
  postalCode?: string;
  department?: string;
  region?: string;
  coordinates?: { lat: number; lng: number };
  googlePlaceId?: string;
}

interface ProfileHeaderProps {
  firstName: string;
  lastName: string;
  profileImage?: string | null;
  coverImage?: string | null;
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
  // I-CAD
  icadRegistered?: boolean | null; // true = inscrit, false = non inscrit, null/undefined = pas renseigné
  // Callbacks pour les modifications
  onUpdateDescription?: (description: string) => Promise<void>;
  onUpdateLocation?: (data: LocationData) => Promise<void>;
  onUpdateIcad?: (registered: boolean) => Promise<void>;
  onUploadAvatar?: (url: string) => Promise<void>;
  onRemoveAvatar?: () => Promise<void>;
  onUploadCover?: (url: string) => Promise<void>;
  onRemoveCover?: () => Promise<void>;
  // Mode édition
  isEditable?: boolean;
  isLoading?: boolean;
}

export default function ProfileHeader({
  firstName,
  lastName,
  profileImage,
  coverImage,
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
  icadRegistered,
  onUpdateDescription,
  onUpdateLocation,
  onUpdateIcad,
  onUploadAvatar,
  onRemoveAvatar,
  onUploadCover,
  onRemoveCover,
  isEditable = false,
  isLoading = false,
}: ProfileHeaderProps) {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isIcadModalOpen, setIsIcadModalOpen] = useState(false);
  const [icadLoading, setIcadLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Pour éviter les erreurs SSR avec createPortal
  useEffect(() => {
    setMounted(true);
  }, []);

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

    const locationContainsCity = cityName && loc.toLowerCase().includes(cityName.toLowerCase());

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

  const handleIcadSelection = async (registered: boolean) => {
    if (!onUpdateIcad) return;
    setIcadLoading(true);
    try {
      await onUpdateIcad(registered);
      setIsIcadModalOpen(false);
    } finally {
      setIcadLoading(false);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-lg overflow-hidden"
      >
        {/* Cover skeleton */}
        <div className="h-56 md:h-72 bg-gray-200 animate-pulse" />

        {/* Content skeleton */}
        <div className="px-6 pb-6">
          <div className="flex flex-col items-center -mt-20">
            <div className="w-36 h-36 rounded-2xl bg-gray-300 border-4 border-white animate-pulse" />
            <div className="mt-4 space-y-3 w-full max-w-md">
              <div className="h-5 bg-gray-200 rounded w-32 mx-auto" />
              <div className="h-4 bg-gray-200 rounded w-48 mx-auto" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

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
          {coverImage ? (
            <Image
              src={coverImage}
              alt="Photo de couverture"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-16 h-16 text-white/40 mx-auto mb-2" />
                {isEditable && (
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
          {isEditable && onUploadCover && (
            <div className="absolute top-4 right-4 z-10">
              <CoverImageUpload
                currentImageUrl={coverImage}
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
                {isEditable && onUploadAvatar ? (
                  <div className="ring-4 ring-white rounded-2xl shadow-2xl bg-white">
                    <AvatarUpload
                      currentImageUrl={profileImage}
                      onUploadComplete={onUploadAvatar}
                      onRemove={onRemoveAvatar}
                      size="lg"
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-gray-100 ring-4 ring-white shadow-2xl">
                      {profileImage ? (
                        <Image
                          src={profileImage}
                          alt={`${firstName} ${lastName}`}
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
                    {/* Badge vérifié sur l'avatar */}
                    {verified && (
                      <div className="absolute -bottom-2 -right-2 bg-secondary text-white p-2 rounded-xl shadow-lg ring-3 ring-white">
                        <Shield className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Nom + infos - dans la bannière, à droite de l'avatar */}
              <div className="flex-1 text-center sm:text-left pb-4 sm:pb-5">
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                    {firstName} {lastName}
                  </h1>
                  {verified && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Vérifié
                    </motion.div>
                  )}
                </div>
                {/* Localisation et membre depuis */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-sm text-white/90">
                  {hasLocation && !isEditable && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {displayAddress}
                    </span>
                  )}
                  {memberSince && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      Membre depuis {formatDate(memberSince)}
                    </span>
                  )}
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
            {isEditable && onUpdateLocation ? (
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
                <div className={cn(
                  "p-2.5 rounded-xl",
                  hasLocation ? "bg-white shadow-sm" : "bg-amber-100"
                )}>
                  <MapPin className={cn(
                    "w-5 h-5",
                    hasLocation ? "text-primary" : "text-amber-600"
                  )} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs text-gray-500 mb-0.5">Localisation</p>
                  <p className={cn(
                    "text-sm font-medium truncate",
                    hasLocation ? "text-gray-900" : "text-amber-700"
                  )}>
                    {hasLocation ? displayAddress : "Ajouter votre adresse"}
                  </p>
                </div>
                <Pencil className={cn(
                  "w-4 h-4 transition-opacity",
                  hasLocation
                    ? "opacity-0 group-hover:opacity-100 text-gray-400"
                    : "text-amber-500"
                )} />
              </button>
            ) : hasLocation ? (
              <div className="col-span-2 flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Localisation</p>
                  <p className="text-sm font-medium text-gray-900">{displayAddress}</p>
                </div>
              </div>
            ) : null}

            {/* I-CAD */}
            {isEditable && onUpdateIcad ? (
              <button
                type="button"
                onClick={() => setIsIcadModalOpen(true)}
                className={cn(
                  "group flex items-center gap-3 p-4 rounded-2xl transition-all text-left",
                  icadRegistered === true
                    ? "bg-emerald-50 hover:bg-emerald-100"
                    : icadRegistered === false
                    ? "bg-gray-50 hover:bg-gray-100"
                    : "bg-amber-50 border-2 border-dashed border-amber-200 hover:bg-amber-100"
                )}
              >
                <div className={cn(
                  "p-2.5 rounded-xl",
                  icadRegistered === true
                    ? "bg-emerald-100"
                    : icadRegistered === false
                    ? "bg-white shadow-sm"
                    : "bg-amber-100"
                )}>
                  <Shield className={cn(
                    "w-5 h-5",
                    icadRegistered === true
                      ? "text-emerald-600"
                      : icadRegistered === false
                      ? "text-gray-400"
                      : "text-amber-600"
                  )} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">I-CAD</p>
                  <p className={cn(
                    "text-sm font-medium",
                    icadRegistered === true
                      ? "text-emerald-700"
                      : icadRegistered === false
                      ? "text-gray-600"
                      : "text-amber-700"
                  )}>
                    {icadRegistered === true
                      ? "Inscrit I-CAD"
                      : icadRegistered === false
                      ? "Non inscrit"
                      : "À renseigner"}
                  </p>
                </div>
                <Pencil className={cn(
                  "w-4 h-4 transition-opacity",
                  icadRegistered === undefined || icadRegistered === null
                    ? "text-amber-500"
                    : "opacity-0 group-hover:opacity-100 text-gray-400"
                )} />
              </button>
            ) : icadRegistered === true ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl">
                <div className="p-2.5 bg-emerald-100 rounded-xl">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">I-CAD</p>
                  <p className="text-sm font-medium text-emerald-700">Inscrit I-CAD</p>
                </div>
              </div>
            ) : null}

            {/* Note */}
            {reviewCount > 0 && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Note moyenne</p>
                  <p className="text-sm font-medium text-gray-900">
                    {rating.toFixed(1)} <span className="text-gray-500">({reviewCount} avis)</span>
                  </p>
                </div>
              </div>
            )}

            {/* Taux de réponse */}
            {responseRate > 0 && (
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Taux de réponse</p>
                  <p className="text-sm font-medium text-gray-900">{responseRate}%</p>
                </div>
              </div>
            )}

            {/* Temps de réponse */}
            {responseTime && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl">
                <div className="p-2.5 bg-white rounded-xl shadow-sm">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Temps de réponse</p>
                  <p className="text-sm font-medium text-gray-900">{responseTime}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="relative">
            <div className={cn(
              "p-5 rounded-2xl transition-all",
              hasDescription || isEditable
                ? "bg-gradient-to-br from-gray-50 to-white border border-gray-100"
                : "bg-amber-50 border-2 border-dashed border-amber-200"
            )}>
              {/* Icône décorative */}
              {(hasDescription || isEditable) && (
                <div className="absolute -top-3 left-5">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                </div>
              )}

              <div className="pt-2">
                {isEditable && onUpdateDescription ? (
                  <EditableField
                    value={description || ""}
                    placeholder="Présentez-vous aux propriétaires d'animaux... Parlez de votre expérience, votre passion pour les animaux, vos disponibilités..."
                    onSave={onUpdateDescription}
                    type="textarea"
                    maxLength={1000}
                    minRows={3}
                    maxRows={8}
                    textClassName="text-gray-700 leading-relaxed"
                  />
                ) : hasDescription ? (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
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
          </div>
        </div>
      </motion.div>

      {/* Modal I-CAD - rendu via Portal */}
      {mounted && createPortal(
        <AnimatePresence>
          {isIcadModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
              onClick={() => !icadLoading && setIsIcadModalOpen(false)}
            >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header avec gradient */}
              <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">Inscription I-CAD</h3>
                  <p className="text-white/80 text-sm mt-1">
                    Fichier National d&apos;Identification des Carnivores Domestiques
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-600 text-sm mb-6">
                  L&apos;I-CAD est le fichier national qui recense les chiens, chats et furets identifiés en France.
                  Être inscrit rassure les propriétaires sur votre professionnalisme.
                </p>

                <p className="text-gray-900 font-medium mb-4">
                  Êtes-vous inscrit au fichier I-CAD ?
                </p>

                {/* Options */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    type="button"
                    onClick={() => handleIcadSelection(true)}
                    disabled={icadLoading}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all text-left",
                      "hover:border-emerald-300 hover:bg-emerald-50",
                      icadRegistered === true
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {icadRegistered === true && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                    )}
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="font-semibold text-gray-900">Oui</p>
                    <p className="text-xs text-gray-500 mt-0.5">Je suis inscrit I-CAD</p>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => handleIcadSelection(false)}
                    disabled={icadLoading}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all text-left",
                      "hover:border-gray-300 hover:bg-gray-50",
                      icadRegistered === false
                        ? "border-gray-400 bg-gray-50"
                        : "border-gray-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {icadRegistered === false && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                      <span className="text-gray-400 font-bold">✕</span>
                    </div>
                    <p className="font-semibold text-gray-900">Non</p>
                    <p className="text-xs text-gray-500 mt-0.5">Pas encore inscrit</p>
                  </motion.button>
                </div>

                {/* Info link */}
                <div className="mt-6 p-3 bg-blue-50 rounded-xl">
                  <p className="text-xs text-blue-700">
                    <span className="font-medium">En savoir plus :</span>{" "}
                    <a
                      href="https://www.i-cad.fr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                    >
                      www.i-cad.fr
                    </a>
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsIcadModalOpen(false)}
                  disabled={icadLoading}
                  className="w-full py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body
      )}

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
