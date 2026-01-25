"use client";

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
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { ServiceData, FormuleData, OptionData } from "../types";
import type { BookingSelection, PriceBreakdown, ClientAddress } from "./types";
import { formatPrice, formatDateDisplay } from "./pricing";

interface CollectiveSlotInfo {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
}

interface BookingSummaryProps {
  service: ServiceData | null;
  variant: FormuleData | null;
  selection: BookingSelection;
  priceBreakdown: PriceBreakdown | null;
  commissionRate: number;
  responseRate?: number;
  responseTime?: string;
  nextAvailable?: string;
  compact?: boolean;
  isRangeMode?: boolean; // Mode plage (garde) avec date de début et fin
  clientAddress?: ClientAddress | null; // Adresse client pour service a domicile
  // Props pour formules collectives
  collectiveSlots?: CollectiveSlotInfo[]; // Créneaux sélectionnés avec leurs détails
  animalCount?: number; // Nombre d'animaux pour séance collective
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
  responseRate,
  responseTime,
  nextAvailable,
  compact = false,
  isRangeMode = false,
  clientAddress,
  collectiveSlots = [],
  animalCount = 1,
  onBook,
  onFinalize,
  className,
}: BookingSummaryProps) {
  // Déterminer si c'est une formule collective
  const isCollectiveFormule = variant?.sessionType === "collective";
  const numberOfSessions = variant?.numberOfSessions || 1;
  const hasAllSlotsSelected = isCollectiveFormule
    ? collectiveSlots.length >= numberOfSessions
    : true;
  // Get selected options
  const selectedOptions = service?.options.filter((opt) =>
    selection.selectedOptionIds.includes(opt.id.toString())
  ) || [];

  // Calculate if booking is ready - requires complete date/time selection
  // Pour les formules collectives : tous les créneaux doivent être sélectionnés
  // Pour le mode plage : date début, date fin, heure début, heure fin
  // Pour le mode normal : date début, heure début
  const isDateTimeComplete = isCollectiveFormule
    ? hasAllSlotsSelected
    : isRangeMode
      ? Boolean(selection.startDate && selection.endDate && selection.startTime && selection.endTime)
      : Boolean(selection.startDate && selection.startTime);

  const isReadyToBook = Boolean(
    selection.selectedServiceId &&
    selection.selectedVariantId &&
    isDateTimeComplete &&
    (isCollectiveFormule || priceBreakdown)
  );

  // Check what is missing for validation message
  const getMissingFields = () => {
    const missing: string[] = [];
    if (isCollectiveFormule) {
      const slotsNeeded = numberOfSessions - collectiveSlots.length;
      if (slotsNeeded > 0) {
        missing.push(`${slotsNeeded} créneau${slotsNeeded > 1 ? "x" : ""}`);
      }
    } else {
      if (!selection.startDate) missing.push("date de début");
      if (isRangeMode && !selection.endDate) missing.push("date de fin");
      if (!selection.startTime) missing.push("heure de début");
      if (isRangeMode && !selection.endTime) missing.push("heure de fin");
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
  // Pour les formules normales : afficher si pas de date ou pas de prix
  const showPartialState = isCollectiveFormule
    ? !hasAllSlotsSelected
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
              <span className="text-xs text-gray-500">
                {numberOfSessions} séance{numberOfSessions > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Créneaux sélectionnés pour formules collectives */}
        {isCollectiveFormule && collectiveSlots.length > 0 && (
          <div className="pb-4 border-b border-gray-100 mb-4">
            <p className="text-sm text-gray-500 mb-2">
              Créneaux sélectionnés ({collectiveSlots.length}/{numberOfSessions})
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
            {isCollectiveFormule ? (
              <CalendarCheck className="w-5 h-5 text-primary" />
            ) : (
              <Calendar className="w-5 h-5 text-primary" />
            )}
          </div>
          <p className="text-gray-500 text-sm">
            {isCollectiveFormule
              ? `Sélectionnez ${numberOfSessions - collectiveSlots.length} créneau${(numberOfSessions - collectiveSlots.length) > 1 ? "x" : ""}`
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
              {isCollectiveFormule && variant ? (
                // Pour les formules collectives : prix horaire × nombre de séances × durée × nombre d'animaux + commission
                // variant.price est le prix à l'heure, variant.duration est en minutes, numberOfSessions est le nombre de séances
                formatPrice(
                  Math.round(
                    (variant.price * (variant.duration || 60) / 60) * numberOfSessions * animalCount * (1 + commissionRate / 100)
                  )
                )
              ) : priceBreakdown ? (
                formatPrice(priceBreakdown.total)
              ) : (
                "---"
              )}€
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
        </div>

        {/* Créneaux collectifs */}
        {isCollectiveFormule && collectiveSlots.length > 0 && (
          <div className="p-3 bg-purple-50 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">
                Séances sélectionnées ({collectiveSlots.length}/{numberOfSessions})
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

        {/* Nombre d'animaux pour formules collectives */}
        {isCollectiveFormule && animalCount > 0 && (
          <div className="p-3 bg-blue-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {animalCount} animal{animalCount > 1 ? "aux" : ""}
              </span>
            </div>
          </div>
        )}

        {/* Dates & times (pour formules non-collectives) */}
        {!isCollectiveFormule && (
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
            const hoursPerDay = 8; // Heures par journée de garde

            if (daysCount > 1) {
              // Multi-jours : afficher jours + total heures
              const avgHoursPerDay = hoursCount / daysCount;
              return (
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    {daysCount} jour{daysCount > 1 ? "s" : ""} · {hoursCount.toFixed(1).replace(".0", "")}h au total
                    <span className="hidden sm:inline text-gray-400"> ({avgHoursPerDay.toFixed(1).replace(".0", "")}h/jour)</span>
                  </span>
                </div>
              );
            } else if (hoursCount > 0) {
              // Même jour : afficher heures
              return (
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Durée : {hoursCount.toFixed(1).replace(".0", "")}h</span>
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
                  : "Chez le prestataire"}
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

        {/* Options */}
        {selectedOptions.length > 0 && (
          <div className="p-3 bg-secondary/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Plus className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-gray-900">Options</span>
            </div>
            <div className="space-y-1">
              {selectedOptions.map((opt) => (
                <div
                  key={opt.id.toString()}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700">{opt.name}</span>
                  <span className="text-secondary font-medium">
                    +{formatPrice(opt.price * (1 + commissionRate / 100))}€
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total - frais de service inclus */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex justify-between font-bold text-lg">
            <span className="text-gray-900">Total</span>
            <span className="text-primary">
              {isCollectiveFormule && variant ? (
                // Pour les formules collectives : prix horaire × nombre de séances × durée × nombre d'animaux + commission
                formatPrice(
                  Math.round(
                    (variant.price * (variant.duration || 60) / 60) * numberOfSessions * animalCount * (1 + commissionRate / 100)
                  )
                )
              ) : priceBreakdown ? (
                formatPrice(priceBreakdown.total)
              ) : (
                "---"
              )}€
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">
            Frais de service inclus
          </p>
        </div>

        {/* Validation message for missing fields */}
        {hasMissingFields && (
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

      {/* Footer - only for full mode */}
      {!compact && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-center text-gray-500">
            Annulation gratuite jusqu&apos;à 48h avant
          </p>
        </div>
      )}
    </div>
  );
}
