"use client";

import { useState, useMemo } from "react";
import { MapPin, Navigation, Check } from "lucide-react";
import { cn } from "@/app/lib/utils";
import AddressAutocomplete from "@/app/components/ui/AddressAutocomplete";
import type { GuestAddress } from "./types";

interface GuestAddressSelectorProps {
  guestAddress: GuestAddress | null;
  announcerCoordinates?: { lat: number; lng: number };
  onAddressChange: (address: GuestAddress | null) => void;
  className?: string;
}

// Calcul de distance avec la formule de Haversine (en km)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Formatage de la distance
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export default function GuestAddressSelector({
  guestAddress,
  announcerCoordinates,
  onAddressChange,
  className,
}: GuestAddressSelectorProps) {
  const [inputValue, setInputValue] = useState(guestAddress?.address || "");

  // Calculer la distance si les deux coordonnées sont disponibles
  const distance = useMemo(() => {
    if (!guestAddress?.coordinates || !announcerCoordinates) {
      return null;
    }
    return calculateDistance(
      guestAddress.coordinates.lat,
      guestAddress.coordinates.lng,
      announcerCoordinates.lat,
      announcerCoordinates.lng
    );
  }, [guestAddress?.coordinates, announcerCoordinates]);

  const handleAddressSelect = (data: {
    address: string;
    city: string | null;
    postalCode: string | null;
    coordinates: { lat: number; lng: number };
  } | null) => {
    if (data) {
      onAddressChange({
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        coordinates: data.coordinates,
      });
      setInputValue(data.address);
    } else {
      onAddressChange(null);
      setInputValue("");
    }
  };

  const isAddressValid = guestAddress?.address && guestAddress?.coordinates;

  return (
    <div className={cn("bg-white rounded-2xl p-5 border border-gray-100", className)}>
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="p-2 bg-blue-100 rounded-lg">
          <MapPin className="w-5 h-5 text-blue-600" />
        </span>
        Adresse de prestation
      </h3>

      <div className="space-y-4">
        {/* Autocomplete Input */}
        <AddressAutocomplete
          value={inputValue}
          onChange={handleAddressSelect}
          onInputChange={setInputValue}
          placeholder="Entrez votre adresse..."
          searchType="address"
          allowManualEntry={true}
          onManualChange={(value) => {
            // En mode manuel, on n'a pas les coordonnées
            if (value) {
              onAddressChange({
                address: value,
                city: null,
                postalCode: null,
                coordinates: null,
              });
            } else {
              onAddressChange(null);
            }
          }}
        />

        {/* Address confirmation card */}
        {isAddressValid && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-800">
                  Adresse confirmée
                </p>
                <p className="text-sm text-green-700 mt-0.5">
                  {guestAddress.address}
                  {guestAddress.city && `, ${guestAddress.city}`}
                  {guestAddress.postalCode && ` ${guestAddress.postalCode}`}
                </p>

                {/* Distance display */}
                {distance !== null && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-green-600">
                    <Navigation className="w-4 h-4" />
                    <span>
                      À <span className="font-semibold">{formatDistance(distance)}</span> du prestataire
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Helper text */}
        {!guestAddress?.address && (
          <p className="text-sm text-gray-500">
            Entrez votre adresse pour que le prestataire puisse se déplacer chez vous.
          </p>
        )}

        {/* Warning if no coordinates (manual entry) */}
        {guestAddress?.address && !guestAddress?.coordinates && (
          <p className="text-sm text-amber-600">
            Adresse saisie manuellement. La distance ne peut pas être calculée.
          </p>
        )}
      </div>
    </div>
  );
}
