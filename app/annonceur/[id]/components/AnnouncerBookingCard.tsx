"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Shield, ChevronDown, ChevronUp, Check } from "lucide-react";
import { ServiceData, FormuleData } from "./types";
import { cn } from "@/app/lib/utils";
import {
  BookingSummary,
  type BookingSelection,
  type PriceBreakdown,
  type ClientAddress,
  formatPrice,
  calculatePriceWithCommission,
  isGardeService,
  getFormuleBestPrice,
} from "./booking";

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

interface AnnouncerBookingCardProps {
  services: ServiceData[];
  responseRate: number;
  responseTime: string;
  nextAvailable: string;
  selectedServiceId?: string | null;
  commissionRate?: number;
  vatRate?: number;
  stripeFeeRate?: number;
  bookingService?: ServiceData | null;
  bookingVariant?: FormuleData | null;
  bookingSelection?: BookingSelection;
  priceBreakdown?: PriceBreakdown | null;
  clientAddress?: ClientAddress | null;
  // Props pour formules collectives
  collectiveSlots?: CollectiveSlotInfo[];
  animalCount?: number;
  // Props pour formules individuelles multi-séances
  selectedSessions?: SelectedSession[];
  announcerFirstName?: string; // Prénom de l'annonceur pour "Chez [prénom]"
  announcerId?: string; // ID de l'annonceur pour la politique d'annulation
  announcerStatusType?: "particulier" | "micro_entrepreneur" | "professionnel";
  // Vérification de l'animal pour les invités
  requiresAnimalVerification?: boolean;
  guestAnimalValid?: boolean;
  guestAnimalError?: string;
  onServiceChange?: (serviceId: string | null) => void;
  onBook?: () => void;
  onFinalize?: () => void;
  onContact?: () => void;
}

// Get best price for a service
const getServiceBestPrice = (service: ServiceData, commissionRate: number): { price: number; unit: string } => {
  if (service.formules.length === 0) return { price: 0, unit: "" };

  const isGarde = isGardeService(service);
  let bestPrice = 0;
  let bestUnit = "";

  for (const formule of service.formules) {
    const { price, unit } = getFormuleBestPrice(formule, isGarde);
    if (price > 0 && (bestPrice === 0 || price < bestPrice)) {
      bestPrice = price;
      bestUnit = unit;
    }
  }

  return { price: bestPrice, unit: bestUnit ? `/${bestUnit}` : "" };
};

export default function AnnouncerBookingCard({
  services,
  responseRate,
  responseTime,
  nextAvailable,
  selectedServiceId,
  commissionRate = 15,
  vatRate = 20,
  stripeFeeRate = 3,
  bookingService,
  bookingVariant,
  bookingSelection,
  priceBreakdown,
  clientAddress,
  collectiveSlots = [],
  animalCount = 1,
  selectedSessions = [],
  announcerFirstName,
  announcerId,
  announcerStatusType,
  requiresAnimalVerification = false,
  guestAnimalValid = false,
  guestAnimalError,
  onServiceChange,
  onBook,
  onFinalize,
  onContact,
}: AnnouncerBookingCardProps) {
  const [isServicesExpanded, setIsServicesExpanded] = useState(false);

  // Find selected service
  const selectedService = selectedServiceId
    ? services.find((s) => s.id === selectedServiceId)
    : null;

  // Check if we have a booking in progress (formule selected)
  const hasBookingInProgress = Boolean(bookingService && bookingVariant);

  // Check if it's a range mode service (garde)
  const isRangeMode = bookingService ? isGardeService(bookingService) : false;

  // If booking is in progress, show the summary
  if (hasBookingInProgress && bookingSelection) {
    return (
      <div className="sticky top-36 space-y-4">
        <BookingSummary
          service={bookingService!}
          variant={bookingVariant!}
          selection={bookingSelection}
          priceBreakdown={priceBreakdown ?? null}
          commissionRate={commissionRate}
          vatRate={vatRate}
          stripeFeeRate={stripeFeeRate}
          responseRate={responseRate}
          responseTime={responseTime}
          nextAvailable={nextAvailable}
          isRangeMode={isRangeMode}
          clientAddress={clientAddress}
          collectiveSlots={collectiveSlots}
          animalCount={animalCount}
          selectedSessions={selectedSessions}
          announcerFirstName={announcerFirstName}
          announcerId={announcerId}
          announcerStatusType={announcerStatusType}
          isGarde={isRangeMode}
          requiresAnimalVerification={requiresAnimalVerification}
          guestAnimalValid={guestAnimalValid}
          guestAnimalError={guestAnimalError}
          onBook={onBook}
          onFinalize={onFinalize}
        />

        {/* Trust badge */}
        <div
          className="p-3 bg-white"
          style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
            >
              <Shield className="w-4 h-4" style={{ color: "#1f3a33" }} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
                Réservation sécurisée
              </p>
              <p className="text-[11px] text-[#6d6d68]">
                Paiement protégé, assurance incluse
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default view: service selection dropdown (original behavior)
  let displayPrice: number;
  let displayUnit: string;

  if (selectedService) {
    const { price, unit } = getServiceBestPrice(selectedService, commissionRate);
    displayPrice = price;
    displayUnit = unit;
  } else {
    let minPrice = Infinity;
    let minUnit = "/prestation";
    for (const service of services) {
      const { price, unit } = getServiceBestPrice(service, commissionRate);
      if (price > 0 && price < minPrice) {
        minPrice = price;
        minUnit = unit;
      }
    }
    displayPrice = minPrice;
    displayUnit = minUnit;
  }

  const hasPrice = displayPrice !== Infinity && displayPrice > 0;

  return (
    <div className="sticky top-36">
      <div
        className="bg-white overflow-hidden"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        {/* Header — eyebrow + prix */}
        <div className="p-5" style={{ borderBottom: "1px solid #f1ede3" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
                {selectedService ? selectedService.categoryName : "À partir de"}
              </div>
              {hasPrice ? (
                <p className="text-[22px] font-semibold text-[#1f1f1d] tracking-[-0.02em]">
                  {formatPrice(calculatePriceWithCommission(displayPrice, commissionRate))}€
                  <span className="text-[11px] font-normal text-[#6d6d68] ml-1">{displayUnit}</span>
                </p>
              ) : (
                <p className="text-[14px] font-semibold text-[#9c9484] tracking-[-0.01em]">
                  Prix sur demande
                </p>
              )}
            </div>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 mt-1"
              style={{ border: "1px solid #cfdbd3", color: "#2f4a3f", background: "#fff" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2f4a3f" }} />
              Dispo. {nextAvailable}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className="p-3 text-center"
              style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
            >
              <p className="text-[18px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
                {responseRate}%
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mt-0.5">
                Taux de réponse
              </p>
            </div>
            <div
              className="p-3 text-center"
              style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
            >
              <p className="text-[18px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
                {responseTime}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mt-0.5">
                Temps de réponse
              </p>
            </div>
          </div>

          {/* Services Selection */}
          <div
            className="overflow-hidden transition-colors"
            style={{
              borderRadius: 12,
              border: `1px solid ${selectedServiceId ? "#1f3a33" : "#ece9e1"}`,
            }}
          >
            <button
              onClick={() => setIsServicesExpanded(!isServicesExpanded)}
              className="w-full p-3 flex items-center justify-between transition-colors hover:bg-[#f7f5ef]"
              style={{ background: selectedServiceId ? "#f5f9f6" : "#fff" }}
            >
              <div className="flex items-center gap-2">
                {selectedService && (
                  <span className="text-[16px]">{selectedService.categoryIcon}</span>
                )}
                <span
                  className="text-[13.5px] font-semibold tracking-[-0.01em]"
                  style={{ color: selectedServiceId ? "#1f3a33" : "#1f1f1d" }}
                >
                  {selectedService ? selectedService.categoryName : "Choisir une prestation"}
                </span>
              </div>
              {isServicesExpanded ? (
                <ChevronUp className="w-4 h-4" style={{ color: "#9c9484" }} />
              ) : (
                <ChevronDown className="w-4 h-4" style={{ color: "#9c9484" }} />
              )}
            </button>

            <AnimatePresence>
              {isServicesExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className="max-h-[300px] overflow-y-auto"
                    style={{ borderTop: "1px solid #f1ede3" }}
                  >
                    {services.map((service, index) => {
                      const isSelected = service.id === selectedServiceId;
                      const { price: serviceMinPrice, unit: serviceUnit } = getServiceBestPrice(service, commissionRate);

                      return (
                        <button
                          key={service.id.toString()}
                          onClick={() => {
                            onServiceChange?.(service.id.toString());
                            setIsServicesExpanded(false);
                          }}
                          className="w-full p-3 text-left transition-colors hover:bg-[#fafafa]"
                          style={{
                            background: isSelected ? "#f5f9f6" : "transparent",
                            borderTop: index > 0 ? "1px solid #f1ede3" : "none",
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[16px] flex-shrink-0">{service.categoryIcon}</span>
                              <div className="min-w-0">
                                <p
                                  className="text-[13px] font-semibold tracking-[-0.01em] truncate"
                                  style={{ color: isSelected ? "#1f3a33" : "#1f1f1d" }}
                                >
                                  {service.categoryName}
                                </p>
                                <p className="text-[11px] text-[#6d6d68] truncate">
                                  {service.formules.length} formule{service.formules.length > 1 ? "s" : ""}
                                  {service.options.length > 0 && ` · ${service.options.length} option${service.options.length > 1 ? "s" : ""}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {serviceMinPrice > 0 && (
                                <span className="text-[13px] font-semibold text-[#1f1f1d] whitespace-nowrap">
                                  {formatPrice(calculatePriceWithCommission(serviceMinPrice, commissionRate))}€{serviceUnit}
                                </span>
                              )}
                              {isSelected && (
                                <div
                                  className="w-4 h-4 rounded-full flex items-center justify-center"
                                  style={{ background: "#1f3a33" }}
                                >
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Instructions */}
          <p className="text-[12px] text-[#9c9484] text-center px-2">
            Sélectionnez un service puis choisissez une formule ci-dessous.
          </p>

          {/* Bouton contact */}
          <motion.button
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            onClick={onContact}
            className="w-full py-2.5 px-4 rounded-full text-[13px] font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              background: "#fff",
              border: "1px solid #1f3a33",
              color: "#1f3a33",
            }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Contacter le prestataire
          </motion.button>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3"
          style={{ background: "#fcfaf4", borderTop: "1px solid #f1ede3" }}
        >
          <p className="text-[11px] text-center font-medium" style={{ color: "#6d6d68" }}>
            Annulation gratuite jusqu&apos;à 48h avant
          </p>
        </div>
      </div>

      {/* Trust badge - card cohérente */}
      <div
        className="mt-3 p-3 bg-white"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
          >
            <Shield className="w-4 h-4" style={{ color: "#1f3a33" }} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
              Réservation sécurisée
            </p>
            <p className="text-[11px] text-[#6d6d68]">
              Paiement protégé, assurance incluse
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
