"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Check, Loader2, Building2, Map } from "lucide-react";
import { cn } from "@/app/lib/utils";
import AddressAutocomplete from "@/app/components/ui/AddressAutocomplete";

interface AddressData {
  address: string;
  city: string | null;
  postalCode: string | null;
  department: string | null;
  region: string | null;
  coordinates: { lat: number; lng: number };
  placeId: string;
}

interface AddressEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    location: string;
    city?: string;
    postalCode?: string;
    department?: string;
    region?: string;
    coordinates?: { lat: number; lng: number };
    googlePlaceId?: string;
  }) => Promise<void>;
  currentAddress?: string;
  currentCity?: string;
  currentPostalCode?: string;
  currentRegion?: string;
}

export default function AddressEditModal({
  isOpen,
  onClose,
  onSave,
  currentAddress = "",
  currentCity = "",
  currentPostalCode = "",
  currentRegion = "",
}: AddressEditModalProps) {
  const [addressInput, setAddressInput] = useState(currentAddress);
  const [selectedData, setSelectedData] = useState<AddressData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialiser quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setAddressInput(currentAddress);
      setSelectedData(null);
      setError(null);
    }
  }, [isOpen, currentAddress]);

  const handleAddressSelect = (data: AddressData | null) => {
    setSelectedData(data);
    if (data) {
      setAddressInput(data.address);
    }
  };

  const handleSave = async () => {
    if (!selectedData && !addressInput.trim()) {
      setError("Veuillez sélectionner une adresse");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (selectedData) {
        await onSave({
          location: selectedData.address,
          city: selectedData.city ?? undefined,
          postalCode: selectedData.postalCode ?? undefined,
          department: selectedData.department ?? undefined,
          region: selectedData.region ?? undefined,
          coordinates: selectedData.coordinates,
          googlePlaceId: selectedData.placeId,
        });
      } else {
        // Saisie manuelle - juste l'adresse texte
        await onSave({
          location: addressInput.trim(),
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  // Afficher les données sélectionnées ou actuelles
  const displayCity = selectedData?.city || currentCity;
  const displayPostalCode = selectedData?.postalCode || currentPostalCode;
  const displayRegion = selectedData?.region || currentRegion;
  const cityDisplay = displayCity
    ? displayPostalCode
      ? `${displayCity} (${displayPostalCode})`
      : displayCity
    : "";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-xl">
                  <MapPin className="w-5 h-5 text-secondary" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Modifier l&apos;adresse
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Contenu */}
            <div className="space-y-4">
              {/* Autocomplete */}
              <AddressAutocomplete
                value={addressInput}
                onChange={handleAddressSelect}
                onInputChange={setAddressInput}
                placeholder="Ex: 10 rue de la Paix, 75001 Paris"
                label="Adresse"
                helperText="Saisissez votre adresse et sélectionnez une suggestion"
                searchType="address"
              />

              {/* Aperçu des données détectées */}
              {(selectedData || (displayCity || displayRegion)) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gray-50 rounded-xl space-y-3"
                >
                  <p className="text-sm font-medium text-gray-700">
                    Informations détectées :
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {cityDisplay || <span className="text-gray-400 italic">Ville</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Map className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {displayRegion || <span className="text-gray-400 italic">Région</span>}
                      </span>
                    </div>
                  </div>
                  {selectedData && (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <Check className="w-3 h-3" />
                      Adresse vérifiée via Google Maps
                    </div>
                  )}
                </motion.div>
              )}

              {/* Message d'erreur */}
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <motion.button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg",
                  "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Annuler
              </motion.button>

              <motion.button
                type="button"
                onClick={handleSave}
                disabled={isSaving || (!selectedData && !addressInput.trim())}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg",
                  "bg-primary text-white hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Enregistrer
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
