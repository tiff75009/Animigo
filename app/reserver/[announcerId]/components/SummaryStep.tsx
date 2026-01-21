"use client";

import Image from "next/image";
import { AlertCircle, Clock, MapPin, Moon, Sun } from "lucide-react";
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
  includeOvernightStay: boolean;
  days: number;
  selectedOptionIds: string[];
  priceBreakdown: PriceBreakdown;
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
  includeOvernightStay,
  days,
  selectedOptionIds,
  priceBreakdown,
  error,
}: SummaryStepProps) {
  const isMultiDay = selectedEndDate && selectedEndDate !== selectedDate;

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
        <div className="flex justify-between text-sm">
          <span className="text-text-light">Dates</span>
          <span className="font-medium text-foreground">
            {formatDate(selectedDate)}
            {isMultiDay && <> → {formatDate(selectedEndDate)}</>}
          </span>
        </div>
        {selectedTime && (
          <div className="flex justify-between text-sm">
            <span className="text-text-light">Heure</span>
            <span className="font-medium text-foreground">{selectedTime}</span>
          </div>
        )}
      </div>

      {/* Price Breakdown - Detailed */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        {/* Single day or first day */}
        {priceBreakdown.firstDayHours > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-text-light flex items-center gap-1">
              {isMultiDay ? (
                <>
                  <Sun className="w-3 h-3" />
                  {formatDate(selectedDate)}
                  {priceBreakdown.firstDayIsFullDay ? (
                    " (journée)"
                  ) : (
                    <span className="text-primary">
                      {" "}
                      ({formatHours(priceBreakdown.firstDayHours)})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" />
                  {priceBreakdown.firstDayIsFullDay
                    ? "Journée complète"
                    : `${formatHours(priceBreakdown.firstDayHours)} de prestation`}
                </>
              )}
            </span>
            <span className="font-medium">
              {formatPrice(priceBreakdown.firstDayAmount)}
            </span>
          </div>
        )}

        {/* Full days in between */}
        {priceBreakdown.fullDays > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-text-light flex items-center gap-1">
              <Sun className="w-3 h-3" />
              {priceBreakdown.fullDays} journée
              {priceBreakdown.fullDays > 1 ? "s" : ""} complète
              {priceBreakdown.fullDays > 1 ? "s" : ""}
            </span>
            <span className="font-medium">
              {formatPrice(priceBreakdown.fullDaysAmount)}
            </span>
          </div>
        )}

        {/* Last day (for multi-day bookings) */}
        {isMultiDay && priceBreakdown.lastDayHours > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-text-light flex items-center gap-1">
              <Sun className="w-3 h-3" />
              {formatDate(selectedEndDate)}
              {priceBreakdown.lastDayIsFullDay ? (
                " (journée)"
              ) : (
                <span className="text-primary">
                  {" "}
                  ({formatHours(priceBreakdown.lastDayHours)})
                </span>
              )}
            </span>
            <span className="font-medium">
              {formatPrice(priceBreakdown.lastDayAmount)}
            </span>
          </div>
        )}

        {/* Overnight stays */}
        {includeOvernightStay && priceBreakdown.nights > 0 && (
          <div className="flex justify-between text-sm text-indigo-700">
            <span className="flex items-center gap-1">
              <Moon className="w-3 h-3" />
              Garde de nuit ({priceBreakdown.nights} nuit
              {priceBreakdown.nights > 1 ? "s" : ""})
            </span>
            <span className="font-medium">
              +{formatPrice(priceBreakdown.nightsAmount)}
            </span>
          </div>
        )}

        {/* Options */}
        {selectedOptionIds.length > 0 &&
          selectedOptionIds.map((optId) => {
            const opt = selectedService.options.find(
              (o: ServiceOption) => o.id === optId
            );
            if (!opt) return null;
            return (
              <div
                key={optId}
                className="flex justify-between text-sm text-secondary"
              >
                <span>{opt.name}</span>
                <span className="font-medium">+{formatPrice(opt.price)}</span>
              </div>
            );
          })}

        {/* Rate info (small text) */}
        {(priceBreakdown.hourlyRate > 0 || priceBreakdown.dailyRate > 0) && (
          <div className="text-xs text-text-light pt-1">
            {priceBreakdown.hourlyRate > 0 && (
              <span>
                Tarif horaire: {formatPrice(priceBreakdown.hourlyRate)}/h
              </span>
            )}
            {priceBreakdown.hourlyRate > 0 && priceBreakdown.dailyRate > 0 && (
              <span> • </span>
            )}
            {priceBreakdown.dailyRate > 0 && (
              <span>
                Tarif journalier: {formatPrice(priceBreakdown.dailyRate)}/jour
              </span>
            )}
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 mt-2">
          <span>Total estimé</span>
          <span className="text-primary">
            {formatPrice(priceBreakdown.totalAmount)}
          </span>
        </div>

        <p className="text-xs text-text-light">
          Les frais de service seront ajoutés à l&apos;étape suivante
        </p>
      </div>
    </div>
  );
}
