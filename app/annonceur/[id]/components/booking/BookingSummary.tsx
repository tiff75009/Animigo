"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Moon,
  Package,
  Plus,
  ArrowRight,
  Sparkles,
  MapPin,
  Home,
  CreditCard,
  Eye,
  Users,
  CalendarCheck,
  Info,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/app/lib/utils";
import type { ServiceData, FormuleData, OptionData } from "../types";
import type { BookingSelection, PriceBreakdown, ClientAddress } from "./types";
import { formatPrice, formatDateDisplay } from "./pricing";
import CancellationPolicyModal from "./CancellationPolicyModal";

interface CollectiveSlotInfo {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
}

// Type pour les séances multi-sessions individuelles
interface SelectedSession {
  date: string;
  startTime: string;
  endTime: string;
}

interface BookingSummaryProps {
  service: ServiceData | null;
  variant: FormuleData | null;
  selection: BookingSelection;
  priceBreakdown: PriceBreakdown | null;
  commissionRate: number;
  vatRate?: number; // Taux de TVA sur les commissions (défaut 20%)
  stripeFeeRate?: number; // Taux de frais Stripe (défaut 3%)
  responseRate?: number;
  responseTime?: string;
  nextAvailable?: string;
  compact?: boolean;
  isRangeMode?: boolean; // Mode plage (garde) avec date de début et fin
  clientAddress?: ClientAddress | null; // Adresse client pour service a domicile
  // Props pour formules collectives
  collectiveSlots?: CollectiveSlotInfo[]; // Créneaux sélectionnés avec leurs détails
  animalCount?: number; // Nombre d'animaux pour séance collective
  // Props pour formules individuelles multi-séances
  selectedSessions?: SelectedSession[];
  announcerFirstName?: string; // Prénom de l'annonceur pour "Chez [prénom]"
  // Vérification de l'animal pour les invités
  requiresAnimalVerification?: boolean;
  guestAnimalValid?: boolean;
  guestAnimalError?: string;
  announcerId?: string;
  announcerStatusType?: "particulier" | "micro_entrepreneur" | "professionnel";
  isGarde?: boolean;
  onBook?: () => void;
  onFinalize?: () => void; // Aller directement à la page de finalisation
  className?: string;
}

export default function BookingSummary({
  service,
  variant,
  selection,
  priceBreakdown,
  commissionRate,
  vatRate = 20,
  stripeFeeRate = 3,
  responseRate,
  responseTime,
  nextAvailable,
  compact = false,
  isRangeMode = false,
  clientAddress,
  collectiveSlots = [],
  animalCount = 1,
  selectedSessions = [],
  announcerFirstName,
  requiresAnimalVerification = false,
  guestAnimalValid = false,
  guestAnimalError,
  announcerId,
  announcerStatusType,
  isGarde = false,
  onBook,
  onFinalize,
  className,
}: BookingSummaryProps) {
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);

  // Query politique annonceur
  const cancellationPolicy = useQuery(
    api.planning.cancellation.getPublicAnnouncerCancellationPolicy,
    announcerId ? { announcerId: announcerId as Id<"users"> } : "skip"
  );
  // Déterminer si c'est une formule collective
  const isCollectiveFormule = variant?.sessionType === "collective";
  const numberOfSessions = variant?.numberOfSessions || 1;
  // Nombre réel de créneaux sélectionnés
  const actualSlotCount = isCollectiveFormule && collectiveSlots.length > 0
    ? collectiveSlots.length
    : numberOfSessions;

  // Déterminer si c'est une formule individuelle multi-séances
  const isMultiSessionIndividual = !isCollectiveFormule && numberOfSessions > 1;

  const hasAllSlotsSelected = isCollectiveFormule
    ? collectiveSlots.length >= 1
    : true;

  const hasAllSessionsSelected = isMultiSessionIndividual
    ? selectedSessions.length >= numberOfSessions
    : true;
  // Get selected options
  const selectedOptions = service?.options.filter((opt) =>
    selection.selectedOptionIds.includes(opt.id.toString())
  ) || [];

  // Calculate if booking is ready - requires complete date/time selection
  // Pour les formules collectives : tous les créneaux doivent être sélectionnés
  // Pour les formules individuelles multi-séances : toutes les séances doivent être sélectionnées
  // Pour le mode plage : date début, date fin, heure début, heure fin
  // Pour le mode normal : date début, heure début
  const isDateTimeComplete = isCollectiveFormule
    ? hasAllSlotsSelected
    : isMultiSessionIndividual
      ? hasAllSessionsSelected
      : isRangeMode
        ? Boolean(selection.startDate && selection.endDate && selection.startTime && selection.endTime)
        : Boolean(selection.startDate && selection.startTime);

  // Vérifier si l'adresse est requise et saisie
  const isAddressRequired = selection.serviceLocation === "client_home";
  const hasAddress = isAddressRequired
    ? Boolean(clientAddress || selection.guestAddress?.address)
    : true;

  // Vérification de l'animal pour les invités
  const isAnimalVerificationOk = !requiresAnimalVerification || guestAnimalValid;

  const isReadyToBook = Boolean(
    selection.selectedServiceId &&
    selection.selectedVariantId &&
    isDateTimeComplete &&
    hasAddress &&
    isAnimalVerificationOk &&
    (isCollectiveFormule || isMultiSessionIndividual || priceBreakdown)
  );

  // Check what is missing for validation message
  const getMissingFields = () => {
    const missing: string[] = [];
    if (isCollectiveFormule) {
      if (collectiveSlots.length === 0) {
        missing.push("au moins 1 créneau");
      }
    } else if (isMultiSessionIndividual) {
      const sessionsNeeded = numberOfSessions - selectedSessions.length;
      if (sessionsNeeded > 0) {
        missing.push(`${sessionsNeeded} séance${sessionsNeeded > 1 ? "s" : ""}`);
      }
    } else {
      if (!selection.startDate) missing.push("date de début");
      if (isRangeMode && !selection.endDate) missing.push("date de fin");
      if (!selection.startTime) missing.push("heure de début");
      if (isRangeMode && !selection.endTime) missing.push("heure de fin");
    }
    // Vérifier l'adresse pour les services à domicile
    if (isAddressRequired && !hasAddress) {
      missing.push("adresse de prestation");
    }
    // Vérifier la race de l'animal pour les invités
    if (requiresAnimalVerification && !guestAnimalValid) {
      missing.push("informations de l'animal");
    }
    return missing;
  };

  const missingFields = getMissingFields();
  const hasMissingFields = missingFields.length > 0 && selection.selectedServiceId && selection.selectedVariantId;

  // Empty state
  if (!service || !variant) {
    return (
      <div className={cn("bg-white rounded-2xl p-5 border border-gray-100", className)}>
        <div className="text-center py-6">
          <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Sélectionnez une formule</p>
          <p className="text-sm text-gray-400 mt-1">
            Choisissez une prestation pour voir le récapitulatif
          </p>
        </div>
      </div>
    );
  }

  // Partial state (formule selected but no date/slots)
  // Pour les formules collectives : afficher si pas tous les créneaux sélectionnés
  // Pour les formules individuelles multi-séances : afficher si pas toutes les séances sélectionnées
  // Pour les formules normales : afficher si pas de date ou pas de prix
  const showPartialState = isCollectiveFormule
    ? !hasAllSlotsSelected
    : isMultiSessionIndividual
      ? !hasAllSessionsSelected
      : (!selection.startDate || !priceBreakdown);

  if (showPartialState) {
    return (
      <div className={cn("bg-white rounded-2xl p-5 border border-gray-100", className)}>
        {/* Header with selected formule */}
        <div className="pb-4 border-b border-gray-100 mb-4">
          <p className="text-sm text-gray-500">Formule sélectionnée</p>
          <p className="font-semibold text-gray-900 flex items-center gap-2">
            <span>{service.categoryIcon}</span>
            {variant.name}
          </p>
          {isCollectiveFormule && (
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                Séance collective
              </span>
              {collectiveSlots.length > 0 && (
                <span className="text-xs text-gray-500">
                  {collectiveSlots.length} créneau{collectiveSlots.length > 1 ? "x" : ""}
                </span>
              )}
            </div>
          )}
          {isMultiSessionIndividual && (
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                Pack {numberOfSessions} séances
              </span>
            </div>
          )}
        </div>

        {/* Créneaux sélectionnés pour formules collectives */}
        {isCollectiveFormule && collectiveSlots.length > 0 && (
          <div className="pb-4 border-b border-gray-100 mb-4">
            <p className="text-sm text-gray-500 mb-2">
              {collectiveSlots.length} créneau{collectiveSlots.length > 1 ? "x" : ""} sélectionné{collectiveSlots.length > 1 ? "s" : ""}
            </p>
            <div className="space-y-2">
              {collectiveSlots.map((slot, index) => (
                <div
                  key={slot._id}
                  className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(slot.date).toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {slot.startTime} - {slot.endTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Séances sélectionnées pour formules individuelles multi-séances */}
        {isMultiSessionIndividual && selectedSessions.length > 0 && (
          <div className="pb-4 border-b border-gray-100 mb-4">
            <p className="text-sm text-gray-500 mb-2">
              Séances sélectionnées ({selectedSessions.length}/{numberOfSessions})
            </p>
            <div className="space-y-2">
              {selectedSessions
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((session, index) => (
                <div
                  key={`${session.date}-${session.startTime}`}
                  className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {new Date(session.date).toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.startTime} - {session.endTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prix total estimé pour formules multi-séances */}
        {isMultiSessionIndividual && variant && (
          <div className="pb-4 border-b border-gray-100 mb-4">
            <div className="p-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total estimé</span>
                <span className="text-lg font-bold text-primary">
                  {formatPrice(
                    Math.round(
                      variant.price * numberOfSessions * (1 + commissionRate / 100)
                    )
                  )}€
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {formatPrice(variant.price * (1 + commissionRate / 100))}€ × {numberOfSessions} séances
              </p>
            </div>
          </div>
        )}

        {/* Nombre d'animaux pour formules collectives */}
        {isCollectiveFormule && animalCount > 1 && (
          <div className="pb-4 border-b border-gray-100 mb-4">
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                {animalCount} animaux
              </span>
            </div>
          </div>
        )}

        {/* Options selected */}
        {selectedOptions.length > 0 && (
          <div className="pb-4 border-b border-gray-100 mb-4">
            <p className="text-sm text-gray-500 mb-2">Options sélectionnées</p>
            <div className="space-y-1">
              {selectedOptions.map((opt) => (
                <p key={opt.id.toString()} className="text-sm text-gray-700 flex items-center gap-2">
                  <Plus className="w-3 h-3 text-secondary" />
                  {opt.name}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="text-center py-4">
          <div className="p-2 bg-primary/10 rounded-full w-fit mx-auto mb-2">
            {isCollectiveFormule || isMultiSessionIndividual ? (
              <CalendarCheck className="w-5 h-5 text-primary" />
            ) : (
              <Calendar className="w-5 h-5 text-primary" />
            )}
          </div>
          <p className="text-gray-500 text-sm">
            {isCollectiveFormule
              ? collectiveSlots.length === 0
                ? "Sélectionnez vos créneaux"
                : "Ajoutez d'autres créneaux ou continuez"
              : isMultiSessionIndividual
                ? `Sélectionnez ${numberOfSessions - selectedSessions.length} séance${(numberOfSessions - selectedSessions.length) > 1 ? "s" : ""}`
                : "Sélectionnez une date pour voir le prix total"}
          </p>
        </div>
      </div>
    );
  }

  // Full summary
  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-primary/5 via-secondary/5 to-purple/5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total estimé</p>
            <p className="text-2xl font-bold text-gray-900">
              {(() => {
                let subtotalHT = 0;
                if (isCollectiveFormule && variant) {
                  subtotalHT = variant.price * actualSlotCount * animalCount;
                } else if (isMultiSessionIndividual && variant) {
                  subtotalHT = variant.price * actualSlotCount * animalCount;
                } else if (priceBreakdown) {
                  const baseWithAnimals = priceBreakdown.baseAmount * animalCount;
                  const nightsWithAnimals = (priceBreakdown.nightsAmount || 0) * animalCount;
                  const optionsAmount = priceBreakdown.optionsAmount || 0;
                  subtotalHT = baseWithAnimals + nightsWithAnimals + optionsAmount;
                }
                if (subtotalHT === 0) return "---";
                const commission = Math.round(subtotalHT * commissionRate / 100);
                const vatOnCommission = Math.round(commission * vatRate / 100);
                const stripeFee = Math.round(subtotalHT * stripeFeeRate / 100);
                return formatPrice(subtotalHT + commission + vatOnCommission + stripeFee);
              })()}€
            </p>
          </div>
          {nextAvailable && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-xs font-medium text-emerald-700">
                Dispo. {nextAvailable}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn("p-5 space-y-4", compact && "p-4 space-y-3")}>
        {/* Quick stats - only for full mode */}
        {!compact && responseRate !== undefined && responseTime && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-primary">{responseRate}%</p>
              <p className="text-xs text-gray-500">Taux de réponse</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <p className="text-2xl font-bold text-secondary">{responseTime}</p>
              <p className="text-xs text-gray-500">Temps de réponse</p>
            </div>
          </div>
        )}

        {/* Nombre d'animaux - affiché pour toutes les formules si > 1 */}
        {animalCount > 1 && (
          <div className="p-3 bg-blue-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {animalCount} animaux
              </span>
            </div>
          </div>
        )}

        {/* Selected formule */}
        <div className="p-3 bg-primary/5 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-gray-900">Formule</span>
          </div>
          <p className="font-semibold text-primary flex items-center gap-2">
            <span>{service.categoryIcon}</span>
            {variant.name}
          </p>
          {isCollectiveFormule && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
              Séance collective
            </span>
          )}
          {isMultiSessionIndividual && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
              Pack {numberOfSessions} séances
            </span>
          )}
        </div>

        {/* Créneaux collectifs */}
        {isCollectiveFormule && collectiveSlots.length > 0 && (
          <div className="p-3 bg-purple-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">
                {collectiveSlots.length} créneau{collectiveSlots.length > 1 ? "x" : ""} sélectionné{collectiveSlots.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1.5">
              {collectiveSlots.map((slot, index) => (
                <div
                  key={slot._id}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 text-xs flex items-center justify-center font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-gray-700">
                    {new Date(slot.date).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-purple-700 font-medium">
                    {slot.startTime} - {slot.endTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Séances individuelles multi-sessions */}
        {isMultiSessionIndividual && selectedSessions.length > 0 && (
          <div className="p-3 bg-primary/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-900">
                Séances sélectionnées ({selectedSessions.length}/{numberOfSessions})
              </span>
            </div>
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
                    {new Date(session.date).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="text-gray-500">•</span>
                  <span className="text-primary font-medium">
                    {session.startTime} - {session.endTime}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dates & times (pour formules non-collectives et non-multi-sessions) */}
        {!isCollectiveFormule && !isMultiSessionIndividual && (
        <div className="p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Date et horaire</span>
          </div>
          {/* Format combiné date + heure */}
          {(() => {
            const formatTime = (time: string) => {
              const [hours, minutes] = time.split(":");
              return minutes === "00" ? `${parseInt(hours)}h` : `${parseInt(hours)}h${minutes}`;
            };

            const formatDateShort = (dateStr: string) => {
              return new Date(dateStr).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              });
            };

            const hasDateRange = selection.endDate && selection.endDate !== selection.startDate;
            const hasTimeRange = selection.startTime && selection.endTime;

            if (hasDateRange && hasTimeRange) {
              // Plage de jours avec heures
              return (
                <>
                  {/* Version desktop */}
                  <p className="hidden sm:block text-sm text-gray-700">
                    Du {formatDateDisplay(selection.startDate!)} à {formatTime(selection.startTime!)} jusqu&apos;au {formatDateDisplay(selection.endDate!)} à {formatTime(selection.endTime!)}
                  </p>
                  {/* Version mobile - format compact */}
                  <div className="sm:hidden text-sm text-gray-700 space-y-1">
                    <p>{formatDateShort(selection.startDate!)} {formatTime(selection.startTime!)}</p>
                    <p className="text-gray-400">↓</p>
                    <p>{formatDateShort(selection.endDate!)} {formatTime(selection.endTime!)}</p>
                  </div>
                </>
              );
            } else if (hasTimeRange) {
              // Même jour avec plage horaire
              return (
                <p className="text-sm text-gray-700">
                  <span className="hidden sm:inline">{formatDateDisplay(selection.startDate!)}</span>
                  <span className="sm:hidden">{formatDateShort(selection.startDate!)}</span>
                  {" "}de {formatTime(selection.startTime!)} à {formatTime(selection.endTime!)}
                </p>
              );
            } else if (selection.startTime) {
              // Même jour avec heure de début
              return (
                <p className="text-sm text-gray-700">
                  <span className="hidden sm:inline">{formatDateDisplay(selection.startDate!)}</span>
                  <span className="sm:hidden">{formatDateShort(selection.startDate!)}</span>
                  {" "}à {formatTime(selection.startTime!)}
                </p>
              );
            } else if (hasDateRange) {
              // Plage de jours sans heures
              return (
                <>
                  <p className="hidden sm:block text-sm text-gray-700">
                    Du {formatDateDisplay(selection.startDate!)} au {formatDateDisplay(selection.endDate!)}
                  </p>
                  <p className="sm:hidden text-sm text-gray-700">
                    {formatDateShort(selection.startDate!)} → {formatDateShort(selection.endDate!)}
                  </p>
                </>
              );
            } else {
              // Date simple
              return (
                <p className="text-sm text-gray-700">
                  {formatDateDisplay(selection.startDate!)}
                </p>
              );
            }
          })()}
          {/* Duration display - calculated from actual selection */}
          {priceBreakdown && (() => {
            const daysCount = priceBreakdown.daysCount;
            const hoursCount = priceBreakdown.hoursCount;
            const billingUnit = priceBreakdown.billingUnit;

            // Fonction pour formater les heures (arrondir aux 30 min car les tranches planning sont de 30 min)
            const formatHours = (hours: number) => {
              // Arrondir au 0.5 le plus proche
              const rounded = Math.round(hours * 2) / 2;
              // Afficher sans décimale si entier, sinon avec .5
              if (rounded % 1 === 0) {
                return `${rounded}h`;
              }
              return `${Math.floor(rounded)}h30`;
            };

            // Fonction pour afficher la durée en jours/demi-journées
            const formatBillingDuration = () => {
              let fullDaysCount = priceBreakdown.fullDays || 0;
              let halfDaysCount = 0;

              if (daysCount === 1) {
                // Un seul jour
                if (priceBreakdown.firstDayIsFullDay) {
                  fullDaysCount = 1;
                } else if (priceBreakdown.firstDayIsHalfDay) {
                  halfDaysCount = 1;
                } else {
                  fullDaysCount = 1; // Par défaut
                }
              } else {
                // Multi-jours
                if (priceBreakdown.firstDayIsFullDay) fullDaysCount++;
                else if (priceBreakdown.firstDayIsHalfDay) halfDaysCount++;
                else fullDaysCount++;

                if (priceBreakdown.lastDayIsFullDay) fullDaysCount++;
                else if (priceBreakdown.lastDayIsHalfDay) halfDaysCount++;
                else fullDaysCount++;
              }

              const parts: string[] = [];
              if (fullDaysCount > 0) {
                parts.push(`${fullDaysCount} journée${fullDaysCount > 1 ? "s" : ""}`);
              }
              if (halfDaysCount > 0) {
                parts.push(`${halfDaysCount} demi-journée${halfDaysCount > 1 ? "s" : ""}`);
              }

              return parts.join(" + ") || "1 journée";
            };

            // Si le mode de facturation est demi-journée ou journée, afficher en jours/demi-journées
            const isHalfDayOrDayBilling = billingUnit === "half_day" || billingUnit === "day" ||
              priceBreakdown.firstDayIsHalfDay || priceBreakdown.lastDayIsHalfDay;

            if (daysCount > 1) {
              if (isHalfDayOrDayBilling) {
                // Mode arrondi : afficher en jours/demi-journées
                return (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{formatBillingDuration()}</span>
                  </div>
                );
              }
              // Mode horaire : afficher jours + total heures
              const avgHoursPerDay = hoursCount / daysCount;
              return (
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    {daysCount} jour{daysCount > 1 ? "s" : ""} · {formatHours(hoursCount)} au total
                    <span className="hidden sm:inline text-gray-400"> ({formatHours(avgHoursPerDay)}/jour)</span>
                  </span>
                </div>
              );
            } else if (hoursCount > 0) {
              if (isHalfDayOrDayBilling) {
                // Mode arrondi : afficher en jours/demi-journées
                return (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>Durée : {formatBillingDuration()}</span>
                  </div>
                );
              }
              // Mode horaire : afficher heures
              return (
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Durée : {formatHours(hoursCount)}</span>
                </div>
              );
            }
            return null;
          })()}
        </div>
        )}

        {/* Overnight stay - price with commission included (non-collective only) */}
        {!isCollectiveFormule && priceBreakdown && selection.includeOvernightStay && priceBreakdown.nights > 0 && (
          <div className="p-3 bg-indigo-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">
                {priceBreakdown.nights} nuit{priceBreakdown.nights > 1 ? "s" : ""}
              </span>
              <span className="text-sm text-indigo-600 ml-auto">
                +{formatPrice(priceBreakdown.nightsAmount * (1 + commissionRate / 100))}€
              </span>
            </div>
          </div>
        )}

        {/* Service location and address */}
        {selection.serviceLocation && (
          <div className="p-3 bg-blue-50 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              {selection.serviceLocation === "client_home" ? (
                <Home className="w-4 h-4 text-blue-600" />
              ) : (
                <MapPin className="w-4 h-4 text-blue-600" />
              )}
              <span className="text-sm font-medium text-blue-800">
                {selection.serviceLocation === "client_home"
                  ? "A votre domicile"
                  : `Chez ${announcerFirstName || "le prestataire"}`}
              </span>
            </div>
            {selection.serviceLocation === "client_home" && clientAddress && (
              <div className="mt-2 pl-6">
                <p className="text-sm text-blue-700 font-medium">
                  {clientAddress.label}
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {clientAddress.address}
                </p>
                {clientAddress.additionalInfo && (
                  <p className="text-xs text-blue-500 mt-0.5">
                    {clientAddress.additionalInfo}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Détail du prix - prix HT + commission séparée */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-900">Détail du prix</span>
          </div>

          <div className="space-y-2 text-sm">
            {/* Formule de base - prix unitaire HT */}
            {(isCollectiveFormule || isMultiSessionIndividual) && variant && (
              <div className="space-y-1">
                <div className="flex justify-between text-gray-700">
                  <span>Formule : {variant.name}</span>
                  <span className="text-gray-500">{formatPrice(variant.price)}€/séance</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 pl-4">
                  <span>
                    └ {isCollectiveFormule ? actualSlotCount : numberOfSessions} {isCollectiveFormule ? "créneau" : "séance"}{(isCollectiveFormule ? actualSlotCount : numberOfSessions) > 1 ? (isCollectiveFormule ? "x" : "s") : ""}
                    {animalCount > 1 && ` × ${animalCount} animaux`}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatPrice((isCollectiveFormule ? variant.price * actualSlotCount : variant.price * numberOfSessions) * animalCount)}€
                  </span>
                </div>
              </div>
            )}

            {!isCollectiveFormule && !isMultiSessionIndividual && priceBreakdown && (
              <div className="space-y-1">
                <div className="flex justify-between text-gray-700">
                  <span>Formule : {variant.name}</span>
                  <span className="text-gray-500">
                    {(() => {
                      // Afficher l'unité de prix correcte selon le billing
                      const unit = priceBreakdown.billingUnit || (priceBreakdown.hourlyRate > 0 && priceBreakdown.dailyRate === 0 ? "hour" : "day");
                      if (unit === "fixed") {
                        const hours = priceBreakdown.hoursCount || priceBreakdown.firstDayHours || 0;
                        return hours > 0 ? `${formatPrice(priceBreakdown.baseAmount)}€/${hours}h` : `${formatPrice(priceBreakdown.baseAmount)}€`;
                      }
                      if (unit === "hour" && priceBreakdown.hourlyRate > 0) {
                        return `${formatPrice(priceBreakdown.hourlyRate)}€/h`;
                      }
                      if (unit === "half_day" && priceBreakdown.halfDailyRate) {
                        return `${formatPrice(priceBreakdown.halfDailyRate)}€/demi-j`;
                      }
                      if (priceBreakdown.dailyRate > 0) {
                        return `${formatPrice(priceBreakdown.dailyRate)}€/jour`;
                      }
                      if (priceBreakdown.hourlyRate > 0) {
                        return `${formatPrice(priceBreakdown.hourlyRate)}€/h`;
                      }
                      return "";
                    })()}
                  </span>
                </div>
                {/* Affichage détaillé du calcul */}
                {(() => {
                  const dailyRate = priceBreakdown.dailyRate;
                  const halfDailyRate = priceBreakdown.halfDailyRate || Math.round(dailyRate / 2);
                  const billingUnit = priceBreakdown.billingUnit || (priceBreakdown.hourlyRate > 0 && dailyRate === 0 ? "hour" : "day");

                  // Facturation fixe (durée prédéfinie, prix fixe)
                  if (billingUnit === "fixed") {
                    const hours = priceBreakdown.hoursCount || priceBreakdown.firstDayHours || 0;
                    return (
                      <div className="flex justify-between text-xs text-gray-500 pl-4">
                        <span>
                          └ Prestation{hours > 0 ? ` (${hours}h)` : ""}
                          {animalCount > 1 && ` × ${animalCount} animaux`}
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatPrice(priceBreakdown.baseAmount * animalCount)}€
                        </span>
                      </div>
                    );
                  }

                  // Facturation horaire
                  if (billingUnit === "hour" || (priceBreakdown.hourlyRate > 0 && dailyRate === 0)) {
                    const hours = priceBreakdown.hoursCount || priceBreakdown.firstDayHours || 0;
                    const hourLabel = hours > 0 ? `${hours}h` : "1h";
                    return (
                      <div className="flex justify-between text-xs text-gray-500 pl-4">
                        <span>
                          └ {hourLabel} × {formatPrice(priceBreakdown.hourlyRate)}€/h
                          {animalCount > 1 && ` × ${animalCount} animaux`}
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatPrice(priceBreakdown.baseAmount * animalCount)}€
                        </span>
                      </div>
                    );
                  }

                  // Facturation journalière / demi-journée
                  const firstDayIsFull = priceBreakdown.firstDayIsFullDay;
                  const firstDayIsHalf = priceBreakdown.firstDayIsHalfDay;
                  const lastDayIsFull = priceBreakdown.lastDayIsFullDay;
                  const lastDayIsHalf = priceBreakdown.lastDayIsHalfDay;
                  const middleDays = priceBreakdown.fullDays || 0;

                  let fullDaysCount = middleDays;
                  let halfDaysCount = 0;

                  if (priceBreakdown.daysCount === 1) {
                    if (firstDayIsFull) {
                      fullDaysCount = 1;
                    } else if (firstDayIsHalf) {
                      halfDaysCount = 1;
                    } else {
                      fullDaysCount = 1;
                    }
                  } else {
                    if (firstDayIsFull) fullDaysCount++;
                    else if (firstDayIsHalf) halfDaysCount++;
                    else fullDaysCount++;

                    if (lastDayIsFull) fullDaysCount++;
                    else if (lastDayIsHalf) halfDaysCount++;
                    else fullDaysCount++;
                  }

                  const parts: string[] = [];
                  if (fullDaysCount > 0) {
                    parts.push(`${fullDaysCount} jour${fullDaysCount > 1 ? "s" : ""}`);
                  }
                  if (halfDaysCount > 0) {
                    parts.push(`${halfDaysCount} demi-journée${halfDaysCount > 1 ? "s" : ""}`);
                  }

                  const durationLabel = parts.join(" + ") || "1 jour";

                  return (
                    <div className="flex justify-between text-xs text-gray-500 pl-4">
                      <span>
                        └ {durationLabel}
                        {animalCount > 1 && ` × ${animalCount} animaux`}
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatPrice(priceBreakdown.baseAmount * animalCount)}€
                      </span>
                    </div>
                  );
                })()}
                {/* Indication si demi-journée appliquée */}
                {(priceBreakdown.firstDayIsHalfDay || priceBreakdown.lastDayIsHalfDay) && (
                  <p className="text-xs text-blue-600 mt-1 pl-4 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>
                      Demi-journée : {formatPrice(priceBreakdown.halfDailyRate || Math.round(priceBreakdown.dailyRate / 2))}€
                    </span>
                  </p>
                )}
                {/* Indication de facturation arrondie — seulement si on a une facturation journalière avec heures < jour complet */}
                {priceBreakdown.daysCount === 1 && !priceBreakdown.firstDayIsFullDay && !priceBreakdown.firstDayIsHalfDay && priceBreakdown.hoursCount > 0 && priceBreakdown.hoursCount < 8 && priceBreakdown.dailyRate > 0 && (
                  <p className="text-xs text-amber-600 mt-1 pl-4 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>Facturation minimale : journée</span>
                  </p>
                )}
              </div>
            )}

            {/* Nuits si applicable - prix HT */}
            {!isCollectiveFormule && priceBreakdown && selection.includeOvernightStay && priceBreakdown.nights > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-gray-700">
                  <span>Nuits</span>
                  <span className="text-gray-500">{formatPrice(priceBreakdown.nightlyRate)}€/nuit</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 pl-4">
                  <span>└ {priceBreakdown.nights} nuit{priceBreakdown.nights > 1 ? "s" : ""} × {animalCount} animal{animalCount > 1 ? "ux" : ""}</span>
                  <span className="font-medium text-gray-900">
                    +{formatPrice(priceBreakdown.nightsAmount * animalCount)}€
                  </span>
                </div>
              </div>
            )}

            {/* Options - prix HT (pas multiplié par animaux) */}
            {selectedOptions.length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-gray-700">
                  <span>Options</span>
                </div>
                {selectedOptions.map((opt) => (
                  <div key={opt.id.toString()} className="flex justify-between text-xs text-gray-500 pl-4">
                    <span>└ {opt.name}</span>
                    <span className="font-medium text-gray-900">+{formatPrice(opt.price)}€</span>
                  </div>
                ))}
              </div>
            )}

            {/* Séparateur */}
            <div className="border-t border-gray-200 pt-2 mt-2" />

            {/* Calcul des montants */}
            {(() => {
              let serviceAmount = 0;
              if (isCollectiveFormule && variant) {
                serviceAmount = variant.price * actualSlotCount * animalCount;
              } else if (isMultiSessionIndividual && variant) {
                serviceAmount = variant.price * actualSlotCount * animalCount;
              } else if (priceBreakdown) {
                const baseWithAnimals = priceBreakdown.baseAmount * animalCount;
                const nightsWithAnimals = (priceBreakdown.nightsAmount || 0) * animalCount;
                const optionsAmount = priceBreakdown.optionsAmount || 0;
                serviceAmount = baseWithAnimals + nightsWithAnimals + optionsAmount;
              }

              // Déterminer si l'annonceur est assujetti TVA
              const isVatSubject = announcerStatusType === "professionnel";
              const serviceVatRate = 20; // Taux TVA prestation (20% standard)

              // Calcul HT/TTC de la prestation
              const serviceHT = isVatSubject
                ? Math.round(serviceAmount / (1 + serviceVatRate / 100))
                : serviceAmount;
              const serviceTVA = isVatSubject
                ? serviceAmount - serviceHT
                : 0;

              const commission = Math.round(serviceAmount * commissionRate / 100);
              const vatOnCommission = Math.round(commission * vatRate / 100);
              const stripeFee = Math.round(serviceAmount * stripeFeeRate / 100);

              return (
                <>
                  {/* Prix prestataire avec détail HT/TTC */}
                  {isVatSubject ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prix prestataire HT</span>
                        <span className="font-medium text-gray-900">
                          {formatPrice(serviceHT)}€
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>TVA prestation ({serviceVatRate}%)</span>
                        <span>{formatPrice(serviceTVA)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">Prix prestataire TTC</span>
                        <span className="font-semibold text-gray-900">
                          {formatPrice(serviceAmount)}€
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Prix prestataire</span>
                      <span className="font-medium text-gray-900">
                        {formatPrice(serviceAmount)}€
                      </span>
                    </div>
                  )}

                  {/* Mention TVA non applicable pour micro-entrepreneurs */}
                  {announcerStatusType === "micro_entrepreneur" && (
                    <p className="text-xs text-gray-400 italic">
                      TVA non applicable (art. 293 B du CGI)
                    </p>
                  )}

                  {/* Commission */}
                  <div className="flex justify-between text-gray-500">
                    <span>Commission ({commissionRate}%)</span>
                    <span>+{formatPrice(commission)}€</span>
                  </div>

                  {/* TVA sur commission — masquer si 0% */}
                  {vatRate > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>TVA sur commission ({vatRate}%)</span>
                      <span>+{formatPrice(vatOnCommission)}€</span>
                    </div>
                  )}

                  {/* Frais Stripe */}
                  <div className="flex justify-between text-gray-500">
                    <span>Frais de paiement ({stripeFeeRate}%)</span>
                    <span>+{formatPrice(stripeFee)}€</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Total TTC */}
        <div className="pt-3 border-t-2 border-primary/20">
          <div className="flex justify-between font-bold text-lg">
            <span className="text-gray-900">Total à payer</span>
            <span className="text-primary">
              {(() => {
                let subtotalHT = 0;
                if (isCollectiveFormule && variant) {
                  subtotalHT = variant.price * actualSlotCount * animalCount;
                } else if (isMultiSessionIndividual && variant) {
                  subtotalHT = variant.price * actualSlotCount * animalCount;
                } else if (priceBreakdown) {
                  const baseWithAnimals = priceBreakdown.baseAmount * animalCount;
                  const nightsWithAnimals = (priceBreakdown.nightsAmount || 0) * animalCount;
                  const optionsAmount = priceBreakdown.optionsAmount || 0;
                  subtotalHT = baseWithAnimals + nightsWithAnimals + optionsAmount;
                }
                const commission = Math.round(subtotalHT * commissionRate / 100);
                const vatOnCommission = Math.round(commission * vatRate / 100);
                const stripeFee = Math.round(subtotalHT * stripeFeeRate / 100);
                return formatPrice(subtotalHT + commission + vatOnCommission + stripeFee);
              })()}€
            </span>
          </div>
        </div>

        {/* Message d'erreur si l'animal n'est pas accepté */}
        {requiresAnimalVerification && guestAnimalError && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-700 font-medium">
                  Animal non accepté
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {guestAnimalError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Validation message for missing fields */}
        {hasMissingFields && !guestAnimalError && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-700 font-medium">
                  Veuillez compléter votre réservation
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Manquant : {missingFields.join(", ")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        {!compact && (
          <div className="space-y-3">
            {/* Bouton principal - Vérifier la réservation */}
            <motion.button
              whileHover={{ scale: isReadyToBook ? 1.02 : 1 }}
              whileTap={{ scale: isReadyToBook ? 0.98 : 1 }}
              onClick={onBook}
              disabled={!isReadyToBook}
              className={cn(
                "w-full py-3.5 font-semibold rounded-xl transition-all flex items-center justify-center gap-2",
                isReadyToBook
                  ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <Eye className="w-4 h-4" />
              Vérifier la réservation
            </motion.button>

            {/* Bouton secondaire - Finaliser directement */}
            <motion.button
              whileHover={{ scale: isReadyToBook ? 1.02 : 1 }}
              whileTap={{ scale: isReadyToBook ? 0.98 : 1 }}
              onClick={onFinalize}
              disabled={!isReadyToBook}
              className={cn(
                "w-full py-3.5 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border-2",
                isReadyToBook
                  ? "border-secondary bg-secondary/5 text-secondary hover:bg-secondary/10"
                  : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
              )}
            >
              <CreditCard className="w-4 h-4" />
              Finaliser la réservation
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        )}
      </div>

      {/* Footer - politique d'annulation */}
      {!compact && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={() => setShowCancellationPolicy(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Politique d&apos;annulation
          </button>
        </div>
      )}

      {/* Modal politique d'annulation */}
      <CancellationPolicyModal
        isOpen={showCancellationPolicy}
        onClose={() => setShowCancellationPolicy(false)}
        serviceType={
          isGarde
            ? "garde"
            : isCollectiveFormule
              ? "collectif"
              : isMultiSessionIndividual
                ? "multi_seance"
                : "uni_seance"
        }
        numberOfSessions={numberOfSessions}
        totalPrice={(() => {
          if (isCollectiveFormule && variant) {
            return variant.price * actualSlotCount * animalCount;
          } else if (isMultiSessionIndividual && variant) {
            return variant.price * actualSlotCount * animalCount;
          } else if (priceBreakdown) {
            const baseWithAnimals = priceBreakdown.baseAmount * animalCount;
            const nightsWithAnimals = (priceBreakdown.nightsAmount || 0) * animalCount;
            const optionsAmount = priceBreakdown.optionsAmount || 0;
            return baseWithAnimals + nightsWithAnimals + optionsAmount;
          }
          return 0;
        })()}
        announcerPolicy={cancellationPolicy ?? null}
      />
    </div>
  );
}
