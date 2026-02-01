"use client";

import { useState } from "react";
import { MapPin, ChevronLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import ServiceLocationSelector from "../ServiceLocationSelector";
import AddressSelector from "../AddressSelector";
import GuestAddressSelector from "../GuestAddressSelector";
import type { ClientAddress, GuestAddress, BookingSelection } from "../types";

interface LocationStepProps {
  // Service settings
  formuleServiceLocation: "announcer_home" | "client_home" | "both" | undefined;
  isRangeMode: boolean;
  announcerFirstName?: string;
  announcerCoordinates?: { lat: number; lng: number };
  announcerRadius?: number | null;

  // Booking state
  bookingSelection?: BookingSelection;

  // Auth state
  isLoggedIn: boolean;

  // Addresses
  clientAddresses: ClientAddress[];
  isLoadingAddresses: boolean;

  // Guest address
  guestAddress?: GuestAddress | null;

  // Callbacks
  onLocationSelect?: (location: "announcer_home" | "client_home") => void;
  onAddressSelect?: (addressId: string) => void;
  onAddNewAddress?: () => void;
  onGuestAddressChange?: (address: GuestAddress | null) => void;
  onAddressOutOfRange?: (outOfRange: boolean) => void;

  // Navigation
  onPrevStep: () => void;
  onNextStep: () => void;
  canProceed: boolean;
  isLastStep: boolean;

  // Animation
  slideVariants: Record<string, { x: number; opacity: number }>;
  slideDirection: "left" | "right";
}

export default function LocationStep({
  formuleServiceLocation,
  isRangeMode,
  announcerFirstName,
  announcerCoordinates,
  announcerRadius,
  bookingSelection,
  isLoggedIn,
  clientAddresses,
  isLoadingAddresses,
  guestAddress,
  onLocationSelect,
  onAddressSelect,
  onAddNewAddress,
  onGuestAddressChange,
  onAddressOutOfRange,
  onPrevStep,
  onNextStep,
  canProceed,
  isLastStep,
  slideVariants,
  slideDirection,
}: LocationStepProps) {
  const [isAddressOutOfRange, setIsAddressOutOfRange] = useState(false);

  const handleDistanceError = (outOfRange: boolean) => {
    setIsAddressOutOfRange(outOfRange);
    onAddressOutOfRange?.(outOfRange);
  };

  return (
    <motion.div
      key="location"
      initial={slideDirection === "right" ? "enterFromRight" : "enterFromLeft"}
      animate="center"
      exit={slideDirection === "right" ? "exitToLeft" : "exitToRight"}
      variants={slideVariants}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <span className="p-2 bg-blue-100 rounded-lg">
            <MapPin className="w-5 h-5 text-blue-600" />
          </span>
          Lieu de prestation
        </h3>

        {onLocationSelect && (
          <ServiceLocationSelector
            serviceLocation={formuleServiceLocation || "both"}
            selectedLocation={bookingSelection?.serviceLocation ?? null}
            onSelect={onLocationSelect}
            isRangeMode={isRangeMode}
            announcerFirstName={announcerFirstName}
          />
        )}

        {/* Sélecteur d'adresse si "à domicile" */}
        {bookingSelection?.serviceLocation === "client_home" && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {isLoggedIn ? (
              onAddressSelect && onAddNewAddress && (
                <AddressSelector
                  addresses={clientAddresses}
                  selectedAddressId={bookingSelection?.selectedAddressId ?? null}
                  isLoading={isLoadingAddresses}
                  onSelect={onAddressSelect}
                  onAddNew={onAddNewAddress}
                  announcerCoordinates={announcerCoordinates}
                  announcerRadius={announcerRadius}
                  onDistanceError={handleDistanceError}
                />
              )
            ) : (
              onGuestAddressChange && (
                <GuestAddressSelector
                  guestAddress={guestAddress ?? null}
                  announcerCoordinates={announcerCoordinates}
                  announcerRadius={announcerRadius}
                  onAddressChange={onGuestAddressChange}
                  onDistanceError={handleDistanceError}
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Boutons de navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={onPrevStep}
          className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Précédent
        </button>
        {!isLastStep && (
          <button
            onClick={onNextStep}
            disabled={!canProceed}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors",
              canProceed
                ? "bg-primary text-white hover:bg-primary/90"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            Continuer
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
