"use client";

import Image from "next/image";
import { AlertCircle, Clock, MapPin, Moon, Sun, Home } from "lucide-react";
import type { ServiceDetail, ServiceVariant } from "./FormulaStep";
import type { ServiceOption } from "./OptionsStep";

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
  error,
}: SummaryStepProps) {
  const isMultiDay = selectedEndDate && selectedEndDate !== selectedDate;

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

  // Calculer la commission et le total avec commission
  const commissionAmount = Math.round((priceBreakdown.totalAmount * commissionRate) / 100);
  const totalWithCommission = priceBreakdown.totalAmount + commissionAmount;

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
          <span className="font-medium text-foreground">
            {selectedVariant.name}
          </span>
        </div>
        {getLocationLabel() && (
          <div className="flex justify-between text-sm">
            <span className="text-text-light">Lieu</span>
            <span className="font-medium text-foreground flex items-center gap-1">
              {serviceLocation === "client_home" ? (
                <Home className="w-3 h-3" />
              ) : (
                <MapPin className="w-3 h-3" />
              )}
              {getLocationLabel()}
            </span>
          </div>
        )}
        {/* Affichage des dates et horaires - format combiné */}
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
          {(days > 1 || totalHours > 0) && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-text-light">
              <Clock className="w-3 h-3" />
              {days > 1 ? (
                <span>
                  {days} jour{days > 1 ? "s" : ""} · {totalHours > 0 ? `${totalHours.toFixed(1).replace(".0", "")}h au total` : ""}
                  {totalHours > 0 && days > 1 && (
                    <span className="text-gray-400"> ({(totalHours / days).toFixed(1).replace(".0", "")}h/jour)</span>
                  )}
                </span>
              ) : totalHours > 0 ? (
                <span>Durée : {totalHours.toFixed(1).replace(".0", "")}h</span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Price Breakdown - Detailed - Tous les prix incluent la commission */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        {/* Tarifs de base */}
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Détail des tarifs</p>

          {/* Helper: appliquer la commission */}
          {(() => {
            const withCommission = (amount: number) => Math.round(amount * (1 + commissionRate / 100));
            const firstDayWithComm = withCommission(priceBreakdown.firstDayAmount);
            const fullDaysWithComm = withCommission(priceBreakdown.fullDaysAmount);
            const dailyRateWithComm = withCommission(priceBreakdown.dailyRate);
            const hourlyRateWithComm = withCommission(priceBreakdown.hourlyRate);
            const lastDayWithComm = withCommission(priceBreakdown.lastDayAmount);

            return (
              <>
                {/* Prestation journalière */}
                {isMultiDay ? (
                  <>
                    {/* Premier jour - toujours afficher les heures réelles */}
                    <div className="flex justify-between text-sm">
                      <span className="text-text-light flex items-center gap-2">
                        <Sun className="w-4 h-4 text-amber-500" />
                        <span>
                          {formatDate(selectedDate)}
                          <span className="text-gray-400 ml-1">
                            {selectedTime ? (
                              `(${formatTime(selectedTime)} → 20h · ${formatHours(priceBreakdown.firstDayHours)})`
                            ) : (
                              `(${formatHours(priceBreakdown.firstDayHours)})`
                            )}
                          </span>
                        </span>
                      </span>
                      <span className="font-medium">{formatPrice(firstDayWithComm)}</span>
                    </div>

                    {/* Jours complets intermédiaires - avec dates */}
                    {priceBreakdown.fullDays > 0 && (() => {
                      // Calculer les dates des jours intermédiaires
                      const startDateObj = new Date(selectedDate);
                      const firstMiddleDay = new Date(startDateObj);
                      firstMiddleDay.setDate(startDateObj.getDate() + 1);
                      const lastMiddleDay = new Date(firstMiddleDay);
                      lastMiddleDay.setDate(firstMiddleDay.getDate() + priceBreakdown.fullDays - 1);

                      const formatShortDate = (date: Date) => date.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      });

                      return (
                        <div className="flex justify-between text-sm">
                          <span className="text-text-light flex items-center gap-2">
                            <Sun className="w-4 h-4 text-amber-500" />
                            <span>
                              {priceBreakdown.fullDays === 1 ? (
                                formatShortDate(firstMiddleDay)
                              ) : (
                                `${formatShortDate(firstMiddleDay)} → ${formatShortDate(lastMiddleDay)}`
                              )}
                              <span className="text-gray-400 ml-1">
                                ({priceBreakdown.fullDays} jour{priceBreakdown.fullDays > 1 ? "s" : ""} · {formatPrice(dailyRateWithComm)}/jour)
                              </span>
                            </span>
                          </span>
                          <span className="font-medium">{formatPrice(fullDaysWithComm)}</span>
                        </div>
                      );
                    })()}

                    {/* Dernier jour - toujours afficher les heures réelles */}
                    {priceBreakdown.lastDayHours > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-text-light flex items-center gap-2">
                          <Sun className="w-4 h-4 text-amber-500" />
                          <span>
                            {formatDate(selectedEndDate)}
                            <span className="text-gray-400 ml-1">
                              {selectedEndTime ? (
                                `(8h → ${formatTime(selectedEndTime)} · ${formatHours(priceBreakdown.lastDayHours)})`
                              ) : (
                                `(${formatHours(priceBreakdown.lastDayHours)})`
                              )}
                            </span>
                          </span>
                        </span>
                        <span className="font-medium">{formatPrice(lastDayWithComm)}</span>
                      </div>
                    )}
                  </>
                ) : (
                  /* Même jour - afficher les heures réelles */
                  priceBreakdown.firstDayHours > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-light flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span>
                          {selectedTime && selectedEndTime ? (
                            <>
                              {formatTime(selectedTime)} → {formatTime(selectedEndTime)}
                              <span className="text-gray-400 ml-1">
                                ({formatHours(priceBreakdown.firstDayHours)}
                                {priceBreakdown.firstDayIsFullDay || priceBreakdown.firstDayAmount === priceBreakdown.dailyRate
                                  ? ` · ${formatPrice(dailyRateWithComm)}/jour`
                                  : priceBreakdown.hourlyRate > 0
                                    ? ` · ${formatPrice(hourlyRateWithComm)}/h`
                                    : ""
                                })
                              </span>
                            </>
                          ) : (
                            <>
                              {formatHours(priceBreakdown.firstDayHours)} de prestation
                              <span className="text-gray-400 ml-1">
                                ({priceBreakdown.firstDayIsFullDay || priceBreakdown.firstDayAmount === priceBreakdown.dailyRate
                                  ? `${formatPrice(dailyRateWithComm)}/jour`
                                  : priceBreakdown.hourlyRate > 0
                                    ? `${formatPrice(hourlyRateWithComm)}/h`
                                    : ""
                                })
                              </span>
                            </>
                          )}
                        </span>
                      </span>
                      <span className="font-medium">{formatPrice(firstDayWithComm)}</span>
                    </div>
                  )
                )}
              </>
            );
          })()}

          {/* Nuits - prix avec commission incluse */}
          {includeOvernightStay && priceBreakdown.nights > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-indigo-700 flex items-center gap-2">
                <Moon className="w-4 h-4" />
                <span>
                  {priceBreakdown.nights} nuit{priceBreakdown.nights > 1 ? "s" : ""}
                  {priceBreakdown.nightlyRate > 0 && (
                    <span className="text-indigo-400 ml-1">
                      ({formatPrice(Math.round(priceBreakdown.nightlyRate * (1 + commissionRate / 100)))}/nuit)
                    </span>
                  )}
                </span>
              </span>
              <span className="font-medium text-indigo-700">+{formatPrice(Math.round(priceBreakdown.nightsAmount * (1 + commissionRate / 100)))}</span>
            </div>
          )}
        </div>

        {/* Options - prix avec commission incluse */}
        {selectedOptionIds.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Options</p>
            {selectedOptionIds.map((optId) => {
              const opt = selectedService.options.find(
                (o: ServiceOption) => o.id === optId
              );
              if (!opt) return null;
              const optPriceWithCommission = Math.round(opt.price * (1 + commissionRate / 100));
              return (
                <div
                  key={optId}
                  className="flex justify-between text-sm text-secondary"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center text-xs">✓</span>
                    {opt.name}
                  </span>
                  <span className="font-medium">+{formatPrice(optPriceWithCommission)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Total - frais de service inclus */}
        <div className="pt-3 border-t border-gray-200 mt-2">
          <div className="flex justify-between text-lg font-bold">
            <span>Total à payer</span>
            <span className="text-primary">
              {formatPrice(totalWithCommission)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">
            Frais de service inclus
          </p>
        </div>
      </div>
    </div>
  );
}
