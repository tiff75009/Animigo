"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ServiceLocationSelector from "../ServiceLocationSelector";
import AddressSelector from "../AddressSelector";
import GuestAddressSelector from "../GuestAddressSelector";
import StepNav from "./StepNav";
import StepCard, { StepHeader } from "./StepCard";
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
      <StepCard>
        <StepHeader
          eyebrow="Étape · Lieu"
          title="Lieu de prestation"
          description="Choisissez où la prestation aura lieu."
        />

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
          <div
            className="mt-4 pt-4"
            style={{ borderTop: "1px solid #f1ede3" }}
          >
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
      </StepCard>

      <StepNav
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        canProceed={canProceed}
        showNext={!isLastStep}
      />
    </motion.div>
  );
}
