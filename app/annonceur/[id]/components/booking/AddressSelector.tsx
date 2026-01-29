"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, Check, ChevronDown, Edit2, Home, Building2, X, AlertTriangle, Navigation } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { ClientAddress } from "./types";

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

interface AddressSelectorProps {
  addresses: ClientAddress[];
  selectedAddressId: string | null;
  isLoading?: boolean;
  onSelect: (addressId: string) => void;
  onAddNew: () => void;
  // Props pour vérification du rayon d'action
  announcerCoordinates?: { lat: number; lng: number };
  announcerRadius?: number | null;
  onDistanceError?: (isOutOfRange: boolean, addressId: string | null) => void;
  className?: string;
}

// Icon based on address label
const getAddressIcon = (label: string) => {
  const labelLower = label.toLowerCase();
  if (labelLower.includes("maison") || labelLower.includes("domicile")) {
    return <Home className="w-4 h-4" />;
  }
  if (labelLower.includes("travail") || labelLower.includes("bureau")) {
    return <Building2 className="w-4 h-4" />;
  }
  return <MapPin className="w-4 h-4" />;
};

export default function AddressSelector({
  addresses,
  selectedAddressId,
  isLoading,
  onSelect,
  onAddNew,
  announcerCoordinates,
  announcerRadius,
  onDistanceError,
  className,
}: AddressSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Find selected address
  const selectedAddress = selectedAddressId
    ? addresses.find((a) => a._id === selectedAddressId)
    : addresses.find((a) => a.isDefault) || addresses[0];

  // Calculer la distance pour l'adresse sélectionnée
  const selectedAddressDistance = useMemo(() => {
    if (!selectedAddress?.coordinates || !announcerCoordinates) {
      return null;
    }
    return calculateDistance(
      selectedAddress.coordinates.lat,
      selectedAddress.coordinates.lng,
      announcerCoordinates.lat,
      announcerCoordinates.lng
    );
  }, [selectedAddress?.coordinates, announcerCoordinates]);

  // Vérifier si l'adresse sélectionnée est hors du rayon d'action
  const isOutOfRange = useMemo(() => {
    if (!selectedAddressDistance || !announcerRadius) return false;
    return selectedAddressDistance > announcerRadius;
  }, [selectedAddressDistance, announcerRadius]);

  // Notifier le parent de l'état d'erreur
  useEffect(() => {
    onDistanceError?.(isOutOfRange, selectedAddress?._id ?? null);
  }, [isOutOfRange, selectedAddress?._id, onDistanceError]);

  // If no addresses, show add button
  if (addresses.length === 0) {
    return (
      <div className={cn("bg-white rounded-2xl p-5 border border-gray-100", className)}>
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="p-2 bg-blue-100 rounded-lg">
            <MapPin className="w-5 h-5 text-blue-600" />
          </span>
          Adresse de prestation
        </h3>

        <div className="text-center py-6 bg-gray-50 rounded-xl">
          <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-3">
            Aucune adresse enregistrée
          </p>
          <button
            onClick={onAddNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter une adresse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-2xl p-5 border border-gray-100", className)}>
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span className="p-2 bg-blue-100 rounded-lg">
          <MapPin className="w-5 h-5 text-blue-600" />
        </span>
        Adresse de prestation
      </h3>

      {/* Selected Address Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors text-left"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm text-primary">
            {selectedAddress ? getAddressIcon(selectedAddress.label) : <MapPin className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            {selectedAddress ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {selectedAddress.label}
                  </span>
                  {selectedAddress.isDefault && (
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      Par defaut
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5 truncate">
                  {selectedAddress.address}
                </p>
                {selectedAddress.additionalInfo && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {selectedAddress.additionalInfo}
                  </p>
                )}
              </>
            ) : (
              <span className="text-gray-500">Selectionner une adresse</span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "w-5 h-5 text-gray-400 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              {addresses.map((address) => {
                const isSelected = selectedAddress?._id === address._id;
                return (
                  <button
                    key={address._id}
                    onClick={() => {
                      onSelect(address._id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full p-3 rounded-xl border transition-colors text-left flex items-start gap-3",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        isSelected ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {getAddressIcon(address.label)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "font-medium",
                            isSelected ? "text-primary" : "text-gray-900"
                          )}
                        >
                          {address.label}
                        </span>
                        {address.isDefault && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs font-medium rounded">
                            Defaut
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">
                        {address.address}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="p-1 bg-primary rounded-full text-white">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Add new address button */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onAddNew();
                }}
                className="w-full p-3 rounded-xl border border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors text-left flex items-center gap-3"
              >
                <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="font-medium text-gray-600">
                  Ajouter une nouvelle adresse
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message d'erreur si hors du rayon d'action */}
      {selectedAddress && isOutOfRange && announcerRadius && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-red-800">
                Adresse hors zone d'intervention
              </p>
              <p className="text-sm text-red-600 mt-1">
                Le prestataire se déplace dans un rayon de <span className="font-semibold">{announcerRadius} km</span>.
                Cette adresse est à <span className="font-semibold">{formatDistance(selectedAddressDistance!)}</span> de sa position.
              </p>
              <p className="text-sm text-red-600 mt-2">
                Vous pouvez sélectionner une autre adresse ou choisir "Chez le prestataire" si disponible.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Affichage de la distance si dans la zone */}
      {selectedAddress && !isOutOfRange && selectedAddressDistance !== null && (
        <div className="mt-3 flex items-center gap-1.5 text-sm text-green-600 px-1">
          <Navigation className="w-4 h-4" />
          <span>
            À <span className="font-semibold">{formatDistance(selectedAddressDistance)}</span> du prestataire
          </span>
        </div>
      )}
    </div>
  );
}
