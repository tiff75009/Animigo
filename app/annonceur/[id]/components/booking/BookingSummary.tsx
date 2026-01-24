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
  MessageCircle,
  MapPin,
  Home,
  CreditCard,
  Eye,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { ServiceData, FormuleData, OptionData } from "../types";
import type { BookingSelection, PriceBreakdown, ClientAddress } from "./types";
import { formatPrice, formatDateDisplay } from "./pricing";

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
  clientAddress?: ClientAddress | null; // Adresse client pour service a domicile
  onBook?: () => void;
  onFinalize?: () => void; // Aller directement à la page de finalisation
  onContact?: () => void;
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
  clientAddress,
  onBook,
  onFinalize,
  onContact,
  className,
}: BookingSummaryProps) {
  // Get selected options
  const selectedOptions = service?.options.filter((opt) =>
    selection.selectedOptionIds.includes(opt.id.toString())
  ) || [];

  // Calculate if booking is ready - requires time selection
  const isReadyToBook = Boolean(
    selection.selectedServiceId &&
    selection.selectedVariantId &&
    selection.startDate &&
    selection.startTime && // L'heure est obligatoire
    priceBreakdown
  );

  // Check if time is missing for validation message
  const isTimeRequired = Boolean(
    selection.selectedServiceId &&
    selection.selectedVariantId &&
    selection.startDate &&
    !selection.startTime
  );

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

  // Partial state (formule selected but no date)
  if (!selection.startDate || !priceBreakdown) {
    return (
      <div className={cn("bg-white rounded-2xl p-5 border border-gray-100", className)}>
        {/* Header with selected formule */}
        <div className="pb-4 border-b border-gray-100 mb-4">
          <p className="text-sm text-gray-500">Formule sélectionnée</p>
          <p className="font-semibold text-gray-900 flex items-center gap-2">
            <span>{service.categoryIcon}</span>
            {variant.name}
          </p>
        </div>

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
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <p className="text-gray-500 text-sm">
            Sélectionnez une date pour voir le prix total
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
              {formatPrice(priceBreakdown.total)}€
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
        </div>

        {/* Dates & times */}
        <div className="p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Date et horaire</span>
          </div>
          <p className="text-sm text-gray-700">
            {formatDateDisplay(selection.startDate!)}
            {selection.endDate && selection.endDate !== selection.startDate && (
              <> → {formatDateDisplay(selection.endDate)}</>
            )}
          </p>
          {(selection.startTime || selection.endTime) && (
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <Clock className="w-3 h-3" />
              {selection.startTime}
              {selection.endTime && <> - {selection.endTime}</>}
            </div>
          )}
          {/* Duration display - different for duration-based vs day-based services */}
          {variant.duration && variant.duration > 0 ? (
            // Duration-based service: show service duration
            <p className="text-xs text-gray-500 mt-2">
              Durée de la prestation : {variant.duration >= 60
                ? `${Math.floor(variant.duration / 60)}h${variant.duration % 60 > 0 ? `${variant.duration % 60}min` : ""}`
                : `${variant.duration}min`}
            </p>
          ) : priceBreakdown.daysCount > 1 || priceBreakdown.hoursCount !== 8 ? (
            // Day-based service: show days and/or hours
            <p className="text-xs text-gray-500 mt-2">
              {priceBreakdown.daysCount} jour{priceBreakdown.daysCount > 1 ? "s" : ""}
              {priceBreakdown.hoursCount > 0 && priceBreakdown.hoursCount !== priceBreakdown.daysCount * 8 &&
                ` (${priceBreakdown.hoursCount.toFixed(1).replace(".0", "")}h)`}
            </p>
          ) : null}
        </div>

        {/* Overnight stay */}
        {selection.includeOvernightStay && priceBreakdown.nights > 0 && (
          <div className="p-3 bg-indigo-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-800">
                {priceBreakdown.nights} nuit{priceBreakdown.nights > 1 ? "s" : ""}
              </span>
              <span className="text-sm text-indigo-600 ml-auto">
                +{formatPrice(priceBreakdown.nightsAmount)}€
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

        {/* Price breakdown */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Sous-total</span>
            <span className="text-gray-700">{formatPrice(priceBreakdown.subtotal)}€</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Frais de service ({commissionRate}%)</span>
            <span className="text-gray-700">{formatPrice(priceBreakdown.commission)}€</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
            <span className="text-gray-900">Total</span>
            <span className="text-primary">{formatPrice(priceBreakdown.total)}€</span>
          </div>
        </div>

        {/* Validation message for time */}
        {isTimeRequired && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <p className="text-sm text-amber-700 font-medium">
                Veuillez sélectionner un créneau horaire
              </p>
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

            {/* Bouton contacter */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onContact}
              className="w-full py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Contacter
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
