"use client";

import React from "react";
import Image from "next/image";
import { AlertCircle, Clock, MapPin, Moon, Sun, Home, CalendarCheck, Users, CreditCard, Package, Plus, PawPrint, Edit2 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { ServiceDetail, ServiceVariant } from "./FormulaStep";
import type { ServiceOption } from "./OptionsStep";
import AddressSection from "./AddressSection";
import { GuestAddressSelector } from "@/app/annonceur/[id]/components/booking";
import type { GuestAddress } from "@/app/annonceur/[id]/components/booking/types";

// Type pour les séances multi-sessions
interface SelectedSession {
  date: string;
  startTime: string;
  endTime: string;
}

// Type pour les créneaux collectifs
interface CollectiveSlotInfo {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
}

// Type pour les animaux de l'utilisateur (correspondant au retour de getUserAnimals)
interface UserAnimal {
  id: string;
  name: string;
  type: string;
  emoji?: string;
  breed?: string;
  primaryPhotoUrl?: string | null;
}

// Price calculation result interface (must match page.tsx)
interface PriceBreakdown {
  firstDayAmount: number;
  firstDayHours: number;
  firstDayIsFullDay: boolean;
  fullDays: number;
  fullDaysAmount: number;
  lastDayAmount: number;
  lastDayHours: number;
  lastDayIsFullDay: boolean;
  nightsAmount: number;
  nights: number;
  optionsAmount: number;
  totalAmount: number;
  hourlyRate: number;
  dailyRate: number;
  nightlyRate: number;
}

interface AnnouncerData {
  firstName: string;
  lastName?: string;
  profileImage: string | null;
  location: string;
}

interface SummaryStepProps {
  announcer: AnnouncerData;
  selectedService: ServiceDetail;
  selectedVariant: ServiceVariant;
  selectedDate: string;
  selectedEndDate: string | null;
  selectedTime: string | null;
  selectedEndTime: string | null;
  includeOvernightStay: boolean;
  days: number;
  selectedOptionIds: string[];
  priceBreakdown: PriceBreakdown;
  serviceLocation: "announcer_home" | "client_home" | null;
  commissionRate?: number; // Taux de commission en %
  // Support pour les formules collectives
  isCollectiveFormula?: boolean;
  collectiveSlots?: CollectiveSlotInfo[];
  animalCount?: number;
  // Support pour les formules individuelles multi-séances
  isMultiSessionIndividual?: boolean;
  selectedSessions?: SelectedSession[];
  // Animaux de l'utilisateur
  userAnimals?: UserAnimal[] | null;
  selectedAnimalIds?: string[];
  // Gestion des adresses
  sessionToken?: string | null;
  selectedAddressId?: string | null;
  onAddressSelect?: (addressId: string | null, addressData?: {
    address: string;
    city?: string;
    postalCode?: string;
    coordinates?: { lat: number; lng: number };
  }) => void;
  // Adresse guest pour utilisateurs non connectés
  guestAddress?: GuestAddress | null;
  onGuestAddressChange?: (address: GuestAddress | null) => void;
  announcerCoordinates?: { lat: number; lng: number };
  // Billing info pour affichage jours/demi-journées
  billingInfo?: {
    billingUnit?: string;
    fullDays: number;
    halfDays: number;
    firstDayIsHalfDay?: boolean;
    lastDayIsHalfDay?: boolean;
  };
  clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day";
  // Pricing details
  stripeFeeRate?: number; // Frais de gestion de paiement (Stripe)
  vatRate?: number; // TVA sur les commissions
  announcerStatusType?: "particulier" | "micro_entrepreneur" | "professionnel";
  error: string | null;
}

// Helper functions
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatHours(hours: number): string {
  if (hours === Math.floor(hours)) {
    return `${hours}h`;
  }
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h${minutes.toString().padStart(2, "0")}`;
}

export default function SummaryStep({
  announcer,
  selectedService,
  selectedVariant,
  selectedDate,
  selectedEndDate,
  selectedTime,
  selectedEndTime,
  includeOvernightStay,
  days,
  selectedOptionIds,
  priceBreakdown,
  serviceLocation,
  commissionRate = 15,
  // Formules collectives
  isCollectiveFormula = false,
  collectiveSlots = [],
  animalCount = 1,
  // Formules multi-séances
  isMultiSessionIndividual = false,
  selectedSessions = [],
  // Animaux de l'utilisateur
  userAnimals = null,
  selectedAnimalIds = [],
  // Gestion des adresses
  sessionToken = null,
  selectedAddressId = null,
  onAddressSelect,
  // Adresse guest
  guestAddress = null,
  onGuestAddressChange,
  announcerCoordinates,
  // Billing info
  billingInfo,
  clientBillingMode,
  // Pricing details
  stripeFeeRate = 3,
  vatRate = 20,
  announcerStatusType = "particulier",
  error,
}: SummaryStepProps) {
  const isMultiDay = selectedEndDate && selectedEndDate !== selectedDate;

  // Déterminer le type de formule
  const isCollective = isCollectiveFormula || selectedVariant.sessionType === "collective";
  const isMultiSession = isMultiSessionIndividual || (!isCollective && (selectedVariant.numberOfSessions || 1) > 1);
  const numberOfSessions = selectedVariant.numberOfSessions || 1;

  // Filtrer les animaux sélectionnés
  const selectedAnimals = userAnimals?.filter(animal => selectedAnimalIds.includes(animal.id)) || [];
  const effectiveAnimalCount = selectedAnimals.length > 0 ? selectedAnimals.length : animalCount;

  // Formater l'heure (9:00 -> 9h, 14:30 -> 14h30)
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    return minutes === "00" ? `${parseInt(hours)}h` : `${parseInt(hours)}h${minutes}`;
  };

  // Calculer la durée totale en heures
  const calculateTotalHours = () => {
    if (!selectedTime) return 0;

    const startParts = selectedTime.split(":").map(Number);
    const startHour = startParts[0] + startParts[1] / 60;

    if (selectedEndTime) {
      const endParts = selectedEndTime.split(":").map(Number);
      const endHour = endParts[0] + endParts[1] / 60;

      if (isMultiDay) {
        // Multi-jours: heures du premier jour + jours complets + heures du dernier jour
        const firstDayHours = 20 - startHour; // Jusqu'à 20h par défaut
        const lastDayHours = endHour - 8; // Depuis 8h par défaut
        const middleDays = days - 2;
        return firstDayHours + (middleDays > 0 ? middleDays * 8 : 0) + lastDayHours;
      } else {
        // Même jour
        return endHour - startHour;
      }
    }
    return 0;
  };

  const totalHours = calculateTotalHours();

  // Helper pour afficher le lieu de prestation
  const getLocationLabel = () => {
    if (!serviceLocation) return null;
    return serviceLocation === "client_home"
      ? "À domicile (chez vous)"
      : "Chez le pet-sitter";
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="text-lg font-bold text-foreground mb-4">Récapitulatif</h2>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Announcer */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
          {announcer.profileImage ? (
            <Image
              src={announcer.profileImage}
              alt={announcer.firstName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-semibold text-lg">
                {announcer.firstName.charAt(0)}
              </span>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">
            {announcer.firstName} {announcer.lastName?.charAt(0)}.
          </p>
          <p className="text-sm text-text-light flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {announcer.location}
          </p>
        </div>
      </div>

      {/* Service Details */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-text-light">Service</span>
          <span className="font-medium text-foreground">
            {selectedService.categoryIcon} {selectedService.categoryName}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-light">Prestation</span>
          <span className="font-medium text-foreground flex items-center gap-2">
            {selectedVariant.name}
            {isCollective && (
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                Collectif
              </span>
            )}
            {isMultiSession && !isCollective && (
              <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                {numberOfSessions} séances
              </span>
            )}
          </span>
        </div>
        {/* Section Adresse de la prestation */}
        {serviceLocation === "client_home" && sessionToken && onAddressSelect && (
          <AddressSection
            sessionToken={sessionToken}
            serviceLocation={serviceLocation}
            announcerLocation={announcer.location}
            selectedAddressId={selectedAddressId}
            onAddressSelect={onAddressSelect}
          />
        )}

        {/* Adresse guest pour utilisateurs non connectés */}
        {serviceLocation === "client_home" && !sessionToken && onGuestAddressChange && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-light">Lieu de prestation</span>
              <span className="font-medium text-foreground flex items-center gap-1">
                <Home className="w-3 h-3" />
                À votre domicile
              </span>
            </div>
            {guestAddress?.address ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">{guestAddress.address}</p>
                      {(guestAddress.city || guestAddress.postalCode) && (
                        <p className="text-xs text-green-600">
                          {[guestAddress.postalCode, guestAddress.city].filter(Boolean).join(" ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGuestAddressChange(null)}
                    className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                    title="Modifier l'adresse"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <GuestAddressSelector
                guestAddress={guestAddress}
                announcerCoordinates={announcerCoordinates}
                onAddressChange={onGuestAddressChange}
              />
            )}
          </div>
        )}

        {/* Lieu chez l'annonceur */}
        {serviceLocation === "announcer_home" && (
          <div className="flex justify-between text-sm">
            <span className="text-text-light">Lieu</span>
            <span className="font-medium text-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {getLocationLabel()}
            </span>
          </div>
        )}

        {/* Affichage des dates selon le type de formule */}
        {isCollective ? (
          // Formule collective: liste numérotée des créneaux
          <div className="p-3 bg-purple-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">
                {collectiveSlots.length > 0
                  ? `Créneaux sélectionnés (${collectiveSlots.length}/${numberOfSessions})`
                  : `${numberOfSessions} séance${numberOfSessions > 1 ? "s" : ""} collective${numberOfSessions > 1 ? "s" : ""}`
                }
              </span>
            </div>
            {collectiveSlots.length > 0 ? (
              <div className="space-y-1.5">
                {collectiveSlots
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((slot, index) => (
                  <div
                    key={slot._id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 text-xs flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 capitalize">
                      {formatDate(slot.date)}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-purple-700 font-medium">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-purple-600/70 animate-pulse">
                Chargement des créneaux...
              </p>
            )}
            {effectiveAnimalCount > 1 && (
              <div className="mt-2 pt-2 border-t border-purple-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-700">
                  {effectiveAnimalCount} animal{effectiveAnimalCount > 1 ? "aux" : ""}
                </span>
              </div>
            )}
          </div>
        ) : isMultiSession ? (
          // Formule multi-séances: liste numérotée des séances
          <div className="p-3 bg-primary/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {selectedSessions.length > 0
                  ? `Séances planifiées (${selectedSessions.length}/${numberOfSessions})`
                  : `${numberOfSessions} séance${numberOfSessions > 1 ? "s" : ""} à planifier`
                }
              </span>
            </div>
            {selectedSessions.length > 0 ? (
              <div className="space-y-1.5">
                {selectedSessions
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((session, index) => (
                  <div
                    key={`${session.date}-${session.startTime}`}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 capitalize">
                      {formatDate(session.date)}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-primary font-medium">
                      {session.startTime} - {session.endTime}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-primary/70 animate-pulse">
                Chargement des séances...
              </p>
            )}
          </div>
        ) : (
          // Formule uni-séance: affichage classique
          <div className="text-sm">
            <span className="text-text-light block mb-1">Date et horaire</span>
            <div className="font-medium text-foreground">
              {isMultiDay && selectedTime && selectedEndTime ? (
                // Multi-jours avec heures
                <span>
                  Du {formatDate(selectedDate)} à {formatTime(selectedTime)} jusqu&apos;au {formatDate(selectedEndDate)} à {formatTime(selectedEndTime)}
                </span>
              ) : selectedTime && selectedEndTime ? (
                // Même jour avec plage horaire
                <span>
                  {formatDate(selectedDate)} de {formatTime(selectedTime)} à {formatTime(selectedEndTime)}
                </span>
              ) : selectedTime ? (
                // Même jour avec heure de début seulement
                <span>
                  {formatDate(selectedDate)} à {formatTime(selectedTime)}
                </span>
              ) : isMultiDay ? (
                // Multi-jours sans heures
                <span>
                  Du {formatDate(selectedDate)} au {formatDate(selectedEndDate)}
                </span>
              ) : (
                // Date simple
                <span>{formatDate(selectedDate)}</span>
              )}
            </div>
            {/* Durée */}
            {(days >= 1 || totalHours > 0) && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-text-light">
                <Clock className="w-3 h-3" />
                <span>
                  {(() => {
                    // Si on a des infos de facturation avec demi-journées
                    const isHalfDayBilling = billingInfo?.billingUnit === "half_day" || billingInfo?.billingUnit === "day" ||
                      billingInfo?.firstDayIsHalfDay || billingInfo?.lastDayIsHalfDay ||
                      clientBillingMode === "round_half_day";

                    if (isHalfDayBilling && billingInfo) {
                      const fullDays = billingInfo.fullDays ?? 0;
                      const halfDays = billingInfo.halfDays ?? 0;

                      const parts: string[] = [];
                      if (fullDays > 0) {
                        parts.push(`${fullDays} journée${fullDays > 1 ? "s" : ""}`);
                      }
                      if (halfDays > 0) {
                        parts.push(`${halfDays} demi-journée${halfDays > 1 ? "s" : ""}`);
                      }

                      const durationStr = parts.length > 0 ? parts.join(" + ") : `${days} jour${days > 1 ? "s" : ""}`;

                      // Ajouter les nuits si applicable
                      if (includeOvernightStay && priceBreakdown.nights > 0) {
                        return `${durationStr} • ${priceBreakdown.nights} nuit${priceBreakdown.nights > 1 ? "s" : ""}`;
                      }
                      return durationStr;
                    }

                    // Affichage par défaut
                    if (days > 1) {
                      let result = `${days} jour${days > 1 ? "s" : ""}`;
                      if (includeOvernightStay && priceBreakdown.nights > 0) {
                        result += ` • ${priceBreakdown.nights} nuit${priceBreakdown.nights > 1 ? "s" : ""}`;
                      }
                      return result;
                    } else if (totalHours > 0) {
                      return `Durée : ${totalHours.toFixed(1).replace(".0", "")}h`;
                    }
                    return null;
                  })()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Section Animaux - visible si des animaux sont sélectionnés */}
        {selectedAnimals.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-xl mt-3">
            <div className="flex items-center gap-2 mb-2">
              <PawPrint className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                {selectedAnimals.length > 1 ? "Animaux concernés" : "Animal concerné"}
              </span>
            </div>
            <div className="space-y-2">
              {selectedAnimals.map((animal) => (
                <div
                  key={animal.id}
                  className="flex items-center gap-3"
                >
                  {animal.primaryPhotoUrl ? (
                    <Image
                      src={animal.primaryPhotoUrl}
                      alt={animal.name}
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 text-sm">
                      {animal.emoji || animal.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{animal.name}</p>
                    <p className="text-xs text-text-light">
                      {animal.type}{animal.breed ? ` - ${animal.breed}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {selectedAnimals.length > 1 && (
              <p className="text-xs text-amber-600 mt-2 pt-2 border-t border-amber-200">
                Le prix est ajusté pour {selectedAnimals.length} animaux
              </p>
            )}
          </div>
        )}
      </div>

      {/* Price Breakdown - Mode Plan/Détaillé */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        {/* En-tête avec icône */}
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-foreground">Détail du prix</span>
        </div>

        {/* Formule de base - Prix HT (sans commission) */}
        <div className={cn(
          "rounded-xl p-4 space-y-3",
          isCollective ? "bg-purple-50" : isMultiSession ? "bg-primary/5" : "bg-gray-50"
        )}>
          {/* Ligne formule */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Package className={cn(
                  "w-4 h-4",
                  isCollective ? "text-purple-600" : isMultiSession ? "text-primary" : "text-gray-600"
                )} />
                <span className="font-medium text-foreground">
                  Formule : {selectedVariant.name}
                </span>
              </div>

              {/* Détail du calcul selon le type - Prix HT */}
              {isCollective ? (
                // Formule collective: prix × séances × animaux
                <p className="text-xs text-gray-500 ml-6">
                  └ {formatPrice(selectedVariant.price)} × {numberOfSessions} séance{numberOfSessions > 1 ? "s" : ""}
                  {effectiveAnimalCount > 1 && ` × ${effectiveAnimalCount} animaux`}
                </p>
              ) : isMultiSession ? (
                // Formule multi-séances: prix × séances
                <p className="text-xs text-gray-500 ml-6">
                  └ {formatPrice(selectedVariant.price)} × {numberOfSessions} séance{numberOfSessions > 1 ? "s" : ""}
                </p>
              ) : (
                // Formule uni-séance: détail avec jours/demi-journées
                <div className="text-xs text-gray-500 ml-6 space-y-1">
                  {(() => {
                    // Récupérer les horaires de journée du service
                    const dayStart = selectedService.dayStartTime || "08:00";
                    const dayEnd = selectedService.dayEndTime || "18:00";
                    const dailyRate = priceBreakdown.dailyRate;
                    const halfDayRate = Math.round(dailyRate / 2);

                    // Si on a des infos de facturation avec demi-journées
                    const isHalfDayBilling = billingInfo?.billingUnit === "half_day" || billingInfo?.billingUnit === "day" ||
                      billingInfo?.firstDayIsHalfDay || billingInfo?.lastDayIsHalfDay ||
                      clientBillingMode === "round_half_day";

                    if (isHalfDayBilling && billingInfo && days >= 1) {
                      const fullDays = billingInfo.fullDays ?? 0;
                      const halfDays = billingInfo.halfDays ?? 0;
                      const firstDayIsHalf = billingInfo.firstDayIsHalfDay ?? false;
                      const lastDayIsHalf = billingInfo.lastDayIsHalfDay ?? false;

                      const lines: React.ReactNode[] = [];

                      // Formater les horaires pour affichage
                      const dayStartDisplay = dayStart.replace(":", "h");
                      const dayEndDisplay = dayEnd.replace(":", "h");

                      if (days === 1) {
                        // Un seul jour
                        const startDisplay = selectedTime ? formatTime(selectedTime) : dayStartDisplay;
                        const endDisplay = selectedEndTime ? formatTime(selectedEndTime) : dayEndDisplay;
                        if (firstDayIsHalf || halfDays === 1) {
                          lines.push(
                            <div key="single" className="flex justify-between">
                              <span>└ Demi-journée ({startDisplay} → {endDisplay})</span>
                              <span>{formatPrice(halfDayRate)}</span>
                            </div>
                          );
                        } else {
                          lines.push(
                            <div key="single" className="flex justify-between">
                              <span>└ Journée complète ({startDisplay} → {endDisplay})</span>
                              <span>{formatPrice(dailyRate)}</span>
                            </div>
                          );
                        }
                      } else {
                        // Multi-jours : afficher le détail
                        // Premier jour
                        const startDisplay = selectedTime ? formatTime(selectedTime) : dayStartDisplay;
                        if (firstDayIsHalf) {
                          lines.push(
                            <div key="first" className="flex justify-between">
                              <span>└ 1er jour : demi-journée ({startDisplay} → {dayEndDisplay})</span>
                              <span>{formatPrice(halfDayRate)}</span>
                            </div>
                          );
                        } else {
                          lines.push(
                            <div key="first" className="flex justify-between">
                              <span>└ 1er jour : journée ({startDisplay} → {dayEndDisplay})</span>
                              <span>{formatPrice(dailyRate)}</span>
                            </div>
                          );
                        }

                        // Jours intermédiaires (si plus de 2 jours)
                        if (days > 2) {
                          const middleDays = days - 2; // tous les jours sauf premier et dernier
                          if (middleDays > 0) {
                            lines.push(
                              <div key="middle" className="flex justify-between">
                                <span>└ {middleDays} jour{middleDays > 1 ? "s" : ""} complet{middleDays > 1 ? "s" : ""} ({dayStartDisplay} → {dayEndDisplay})</span>
                                <span>{formatPrice(dailyRate * middleDays)}</span>
                              </div>
                            );
                          }
                        }

                        // Dernier jour
                        const endDisplay = selectedEndTime ? formatTime(selectedEndTime) : dayEndDisplay;
                        if (lastDayIsHalf) {
                          lines.push(
                            <div key="last" className="flex justify-between">
                              <span>└ Dernier jour : demi-journée ({dayStartDisplay} → {endDisplay})</span>
                              <span>{formatPrice(halfDayRate)}</span>
                            </div>
                          );
                        } else {
                          lines.push(
                            <div key="last" className="flex justify-between">
                              <span>└ Dernier jour : journée ({dayStartDisplay} → {endDisplay})</span>
                              <span>{formatPrice(dailyRate)}</span>
                            </div>
                          );
                        }
                      }

                      // Ligne récap avec totaux
                      lines.push(
                        <div key="recap" className="flex justify-between pt-1 border-t border-gray-200/50 mt-1 font-medium text-gray-600">
                          <span>
                            {fullDays > 0 && `${fullDays} journée${fullDays > 1 ? "s" : ""} × ${formatPrice(dailyRate)}`}
                            {fullDays > 0 && halfDays > 0 && " + "}
                            {halfDays > 0 && `${halfDays} demi-journée${halfDays > 1 ? "s" : ""} × ${formatPrice(halfDayRate)}`}
                          </span>
                        </div>
                      );

                      return lines;
                    }

                    // Affichage par défaut (facturation horaire ou jours simples)
                    if (days > 1) {
                      return (
                        <div className="flex justify-between">
                          <span>└ {days} jours × {formatPrice(dailyRate)}/jour</span>
                          <span>{formatPrice(dailyRate * days)}</span>
                        </div>
                      );
                    } else if (priceBreakdown.firstDayHours > 0) {
                      return (
                        <div className="flex justify-between">
                          <span>└ {formatHours(priceBreakdown.firstDayHours)} × {formatPrice(priceBreakdown.hourlyRate)}/h</span>
                          <span>{formatPrice(priceBreakdown.firstDayAmount)}</span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex justify-between">
                        <span>└ Prestation</span>
                        <span>{formatPrice(priceBreakdown.firstDayAmount)}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <span className={cn(
              "font-bold text-lg",
              isCollective ? "text-purple-700" : isMultiSession ? "text-primary" : "text-foreground"
            )}>
              {isCollective ? (
                formatPrice(Math.round(selectedVariant.price * numberOfSessions * effectiveAnimalCount))
              ) : isMultiSession ? (
                formatPrice(Math.round(selectedVariant.price * numberOfSessions))
              ) : (
                formatPrice(priceBreakdown.firstDayAmount + priceBreakdown.fullDaysAmount + priceBreakdown.lastDayAmount)
              )}
            </span>
          </div>

          {/* Nuits (si applicable et pas formule collective/multi-session) - Prix HT */}
          {!isCollective && !isMultiSession && includeOvernightStay && priceBreakdown.nights > 0 && (
            <div className="flex items-start justify-between pt-2 border-t border-gray-200/50">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium text-indigo-800">Nuits</span>
                </div>
                <p className="text-xs text-indigo-600 ml-6">
                  └ {priceBreakdown.nights} nuit{priceBreakdown.nights > 1 ? "s" : ""} × {formatPrice(priceBreakdown.nightlyRate)}/nuit
                </p>
              </div>
              <span className="font-medium text-indigo-700">
                +{formatPrice(priceBreakdown.nightsAmount)}
              </span>
            </div>
          )}
        </div>

        {/* Options - Prix HT */}
        {selectedOptionIds.length > 0 && (
          <div className="bg-secondary/5 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-4 h-4 text-secondary" />
              <span className="font-medium text-foreground">Options</span>
            </div>
            {selectedOptionIds.map((optId) => {
              const opt = selectedService.options.find(
                (o: ServiceOption) => o.id === optId
              );
              if (!opt) return null;
              return (
                <div
                  key={optId}
                  className="flex justify-between text-sm ml-6"
                >
                  <span className="text-gray-600">└ {opt.name}</span>
                  <span className="font-medium text-secondary">+{formatPrice(opt.price)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Prix annonceur HT + Commissions + Total */}
        <div className="bg-gray-100 rounded-xl p-4 space-y-2">
          {/* Prix annonceur HT (sans commission) */}
          {(() => {
            // Calcul du prix HT (ce que reçoit l'annonceur)
            const optionsAmount = selectedOptionIds.reduce((sum, optId) => {
              const opt = selectedService.options.find((o: ServiceOption) => o.id === optId);
              return sum + (opt?.price || 0);
            }, 0);

            const baseAmountHT = isCollective
              ? Math.round(selectedVariant.price * numberOfSessions * effectiveAnimalCount) + optionsAmount
              : isMultiSession
                ? Math.round(selectedVariant.price * numberOfSessions) + optionsAmount
                : priceBreakdown.totalAmount;

            // Commission plateforme sur le montant HT
            const platformCommission = Math.round(baseAmountHT * commissionRate / 100);

            // Frais de gestion de paiement (sur le total TTC)
            const totalBeforePaymentFees = baseAmountHT + platformCommission;
            const paymentFees = Math.round(totalBeforePaymentFees * stripeFeeRate / 100);

            // Total final
            const totalTTC = totalBeforePaymentFees + paymentFees;

            return (
              <>
                {/* Prix annonceur HT */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Prix prestataire HT</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(baseAmountHT)}
                  </span>
                </div>

                {/* Mention TVA pour micro-entrepreneurs */}
                {announcerStatusType === "micro_entrepreneur" && (
                  <div className="text-xs text-gray-500 italic">
                    TVA non applicable - Autoliquidation de TVA (art. 293 B du CGI)
                  </div>
                )}

                {/* Commission plateforme */}
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Commission plateforme ({commissionRate}%)</span>
                  <span>{formatPrice(platformCommission)}</span>
                </div>

                {/* Frais de gestion de paiement */}
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Frais de gestion paiement ({stripeFeeRate}%)</span>
                  <span>{formatPrice(paymentFees)}</span>
                </div>

                {/* Ligne de séparation */}
                <div className="border-t-2 border-primary/20 my-2" />

                {/* Total à payer */}
                <div className="flex justify-between">
                  <span className="font-bold text-lg text-foreground">Total à payer</span>
                  <span className="font-bold text-xl text-primary">
                    {formatPrice(totalTTC)}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
