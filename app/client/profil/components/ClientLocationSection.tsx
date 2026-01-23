"use client";

import { useState, memo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Save, Loader2, CheckCircle } from "lucide-react";
import AddressAutocomplete from "@/app/components/ui/AddressAutocomplete";
import { cn } from "@/app/lib/utils";

interface Coordinates {
  lat: number;
  lng: number;
}

interface ClientLocationSectionProps {
  location: string | null;
  city: string | null;
  postalCode?: string | null;
  coordinates: Coordinates | null;
  onSave: (data: {
    location: string;
    city?: string;
    postalCode?: string;
    coordinates?: Coordinates;
    googlePlaceId?: string;
  }) => Promise<{ success: boolean }>;
  isSaving: boolean;
}

function ClientLocationSection({
  location,
  city,
  postalCode,
  coordinates,
  onSave,
  isSaving,
}: ClientLocationSectionProps) {
  const [addressValue, setAddressValue] = useState(location || "");
  const [selectedAddress, setSelectedAddress] = useState<{
    address: string;
    city: string | null;
    postalCode: string | null;
    coordinates: Coordinates;
    placeId: string;
  } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Reset when location changes from parent
  useEffect(() => {
    setAddressValue(location || "");
    setHasChanges(false);
  }, [location]);

  // Hide success message after 3 seconds
  useEffect(() => {
    if (savedSuccess) {
      const timer = setTimeout(() => setSavedSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [savedSuccess]);

  const handleAddressChange = useCallback((data: {
    address: string;
    city: string | null;
    postalCode: string | null;
    coordinates: { lat: number; lng: number };
    placeId: string;
  } | null) => {
    if (data) {
      setSelectedAddress(data);
      setAddressValue(data.address);
      setHasChanges(true);
    } else {
      setSelectedAddress(null);
      setAddressValue("");
      setHasChanges(location !== null);
    }
  }, [location]);

  const handleSave = useCallback(async () => {
    if (!selectedAddress) return;

    const result = await onSave({
      location: selectedAddress.address,
      city: selectedAddress.city || undefined,
      postalCode: selectedAddress.postalCode || undefined,
      coordinates: selectedAddress.coordinates,
      googlePlaceId: selectedAddress.placeId,
    });

    if (result.success) {
      setHasChanges(false);
      setSavedSuccess(true);
    }
  }, [selectedAddress, onSave]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-foreground/5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Mon adresse
            </h3>
            <p className="text-sm text-text-light">
              Utilisée pour afficher la distance dans les recherches
            </p>
          </div>
        </div>
      </div>

      {/* Address autocomplete */}
      <AddressAutocomplete
        value={addressValue}
        onChange={handleAddressChange}
        onInputChange={setAddressValue}
        placeholder="Rechercher votre adresse..."
        searchType="address"
        helperText="Commencez à taper pour rechercher votre adresse"
      />

      {/* Current location info */}
      {coordinates && !hasChanges && (
        <div className="mt-4 p-3 bg-secondary/5 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">Adresse enregistrée</span>
          </div>
          <p className="mt-1 text-sm text-text-light">
            {city && <span className="font-medium">{city}</span>}
            {postalCode && <span> ({postalCode})</span>}
          </p>
        </div>
      )}

      {/* Save button */}
      {hasChanges && selectedAddress && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center justify-between"
        >
          <div className="text-sm text-text-light">
            {selectedAddress.city && (
              <span>
                <span className="font-medium">{selectedAddress.city}</span>
                {selectedAddress.postalCode && ` (${selectedAddress.postalCode})`}
              </span>
            )}
          </div>

          <motion.button
            onClick={handleSave}
            disabled={isSaving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium",
              "bg-secondary text-white hover:bg-secondary/90 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Sauvegarder
          </motion.button>
        </motion.div>
      )}

      {/* Success message */}
      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-4 p-3 bg-green-50 rounded-xl flex items-center gap-2 text-green-700"
        >
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Adresse sauvegardée</span>
        </motion.div>
      )}
    </motion.div>
  );
}

export default memo(ClientLocationSection);
