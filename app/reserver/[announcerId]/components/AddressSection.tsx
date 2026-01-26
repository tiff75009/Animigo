"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Plus,
  Star,
  Home,
  Building2,
  Briefcase,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import AddressAutocomplete from "@/app/components/ui/AddressAutocomplete";
import { cn } from "@/app/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

interface Coordinates {
  lat: number;
  lng: number;
}

interface Address {
  _id: Id<"clientAddresses"> | string;
  label: string;
  address: string;
  city?: string | null;
  postalCode?: string | null;
  coordinates?: Coordinates | null;
  googlePlaceId?: string;
  additionalInfo?: string | null;
  isDefault: boolean;
}

interface AddressSectionProps {
  sessionToken: string | null;
  serviceLocation: "announcer_home" | "client_home" | null;
  announcerLocation: string;
  selectedAddressId: string | null;
  onAddressSelect: (addressId: string | null, addressData?: {
    address: string;
    city?: string;
    postalCode?: string;
    coordinates?: Coordinates;
  }) => void;
}

const MAX_ADDRESSES = 3;

const labelIcons: Record<string, React.ElementType> = {
  "Maison": Home,
  "Travail": Briefcase,
  "Bureau": Building2,
};

const defaultLabels = ["Maison", "Travail", "Autre"];

export default function AddressSection({
  sessionToken,
  serviceLocation,
  announcerLocation,
  selectedAddressId,
  onAddressSelect,
}: AddressSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: "",
    address: "",
    city: null as string | null,
    postalCode: null as string | null,
    coordinates: null as Coordinates | null,
    placeId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries and mutations (only for logged-in users)
  const addresses = useQuery(
    api.client.addresses.getAddresses,
    sessionToken ? { sessionToken } : "skip"
  );
  const addAddressMutation = useMutation(api.client.addresses.addAddress);

  // Auto-select default address on load
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId && serviceLocation === "client_home") {
      const defaultAddr = addresses.find((a: Address) => a.isDefault) || addresses[0];
      if (defaultAddr && !defaultAddr._id.toString().startsWith("profile-")) {
        onAddressSelect(defaultAddr._id as string, {
          address: defaultAddr.address,
          city: defaultAddr.city || undefined,
          postalCode: defaultAddr.postalCode || undefined,
          coordinates: defaultAddr.coordinates || undefined,
        });
      }
    }
  }, [addresses, selectedAddressId, serviceLocation, onAddressSelect]);

  // Get suggested label
  const getSuggestedLabel = useCallback(() => {
    if (!addresses) return defaultLabels[0];
    const usedLabels = addresses.map((a: Address) => a.label);
    return defaultLabels.find((l) => !usedLabels.includes(l)) || `Adresse ${addresses.length + 1}`;
  }, [addresses]);

  // Start adding new address
  const startAdding = useCallback(() => {
    setNewAddress({
      label: getSuggestedLabel(),
      address: "",
      city: null,
      postalCode: null,
      coordinates: null,
      placeId: "",
    });
    setIsAdding(true);
  }, [getSuggestedLabel]);

  // Cancel adding
  const cancelAdding = useCallback(() => {
    setIsAdding(false);
    setNewAddress({
      label: "",
      address: "",
      city: null,
      postalCode: null,
      coordinates: null,
      placeId: "",
    });
  }, []);

  // Handle address autocomplete change
  const handleNewAddressChange = useCallback((data: {
    address: string;
    city: string | null;
    postalCode: string | null;
    coordinates: { lat: number; lng: number };
    placeId: string;
  } | null) => {
    if (data) {
      setNewAddress((prev) => ({
        ...prev,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        coordinates: data.coordinates,
        placeId: data.placeId,
      }));
    }
  }, []);

  // Save new address
  const saveNewAddress = useCallback(async () => {
    if (!newAddress.address || !newAddress.label || !sessionToken) return;

    setIsSubmitting(true);
    try {
      const addressId = await addAddressMutation({
        sessionToken,
        label: newAddress.label,
        address: newAddress.address,
        city: newAddress.city || undefined,
        postalCode: newAddress.postalCode || undefined,
        coordinates: newAddress.coordinates || undefined,
        googlePlaceId: newAddress.placeId || undefined,
        isDefault: !addresses || addresses.length === 0,
      });

      // Select the newly created address
      onAddressSelect(addressId, {
        address: newAddress.address,
        city: newAddress.city || undefined,
        postalCode: newAddress.postalCode || undefined,
        coordinates: newAddress.coordinates || undefined,
      });

      cancelAdding();
    } catch (error) {
      console.error("Error adding address:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [newAddress, sessionToken, addAddressMutation, addresses, onAddressSelect, cancelAdding]);

  // Handle address selection
  const handleSelectAddress = useCallback((addr: Address) => {
    const addressId = addr._id.toString().startsWith("profile-") ? null : addr._id as string;
    onAddressSelect(addressId, {
      address: addr.address,
      city: addr.city || undefined,
      postalCode: addr.postalCode || undefined,
      coordinates: addr.coordinates || undefined,
    });
    setIsExpanded(false);
  }, [onAddressSelect]);

  const canAddMore = addresses && addresses.length < MAX_ADDRESSES;
  const selectedAddress = addresses?.find((a: Address) => a._id === selectedAddressId);
  const isLoading = sessionToken && addresses === undefined;

  // If service is at announcer's home
  if (serviceLocation === "announcer_home") {
    return (
      <div className="p-4 bg-secondary/5 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary/20 text-secondary">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Lieu de la prestation</p>
            <p className="text-sm text-text-light">Chez le pet-sitter</p>
            <p className="text-sm text-secondary font-medium mt-1">{announcerLocation}</p>
          </div>
        </div>
      </div>
    );
  }

  // If service is at client's home but user not logged in
  if (serviceLocation === "client_home" && !sessionToken) {
    return (
      <div className="p-4 bg-amber-50 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Prestation à domicile</p>
            <p className="text-sm text-text-light">
              Connectez-vous pour sélectionner une adresse de prestation
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If service is at client's home and user is logged in
  if (serviceLocation === "client_home" && sessionToken) {
    return (
      <div className="p-4 bg-secondary/5 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/20 text-secondary">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Adresse de la prestation</p>
              <p className="text-xs text-text-light">Le pet-sitter se déplacera chez vous</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-secondary" />
          </div>
        ) : (
          <>
            {/* Selected address display */}
            {selectedAddress && !isExpanded && (
              <div
                onClick={() => setIsExpanded(true)}
                className="p-3 bg-white rounded-lg border border-secondary/30 cursor-pointer hover:border-secondary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const IconComponent = labelIcons[selectedAddress.label] || MapPin;
                      return (
                        <div className="p-1.5 rounded-lg bg-secondary/10 text-secondary">
                          <IconComponent className="w-4 h-4" />
                        </div>
                      );
                    })()}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{selectedAddress.label}</span>
                        {selectedAddress.isDefault && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary">
                            Défaut
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-light truncate max-w-[250px]">
                        {selectedAddress.address}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-text-light" />
                </div>
              </div>
            )}

            {/* No address selected */}
            {!selectedAddress && !isExpanded && addresses && addresses.length > 0 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full p-3 bg-white rounded-lg border border-dashed border-secondary/30 text-secondary hover:border-secondary/50 hover:bg-secondary/5 transition-colors text-sm font-medium"
              >
                Sélectionner une adresse
              </button>
            )}

            {/* Empty state */}
            {!selectedAddress && !isExpanded && (!addresses || addresses.length === 0) && (
              <button
                onClick={startAdding}
                className="w-full p-3 bg-white rounded-lg border border-dashed border-secondary/30 text-secondary hover:border-secondary/50 hover:bg-secondary/5 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Ajouter une adresse
              </button>
            )}

            {/* Expanded address list */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 mt-3">
                    {addresses?.map((addr: Address) => {
                      const IconComponent = labelIcons[addr.label] || MapPin;
                      const isSelected = addr._id === selectedAddressId;

                      return (
                        <div
                          key={addr._id}
                          onClick={() => handleSelectAddress(addr)}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            isSelected
                              ? "border-secondary bg-secondary/10"
                              : "border-gray-200 bg-white hover:border-secondary/30"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-1.5 rounded-lg",
                                isSelected ? "bg-secondary/20 text-secondary" : "bg-gray-100 text-gray-500"
                              )}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">{addr.label}</span>
                                  {addr.isDefault && (
                                    <Star className="w-3 h-3 text-secondary fill-secondary" />
                                  )}
                                </div>
                                <p className="text-xs text-text-light truncate max-w-[220px]">
                                  {addr.address}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-secondary" />
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add new address button */}
                    {canAddMore && !isAdding && (
                      <button
                        onClick={startAdding}
                        className="w-full p-3 rounded-lg border border-dashed border-gray-300 text-text-light hover:border-secondary hover:text-secondary transition-colors text-sm flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter une adresse
                      </button>
                    )}

                    {/* Max addresses notice */}
                    {!canAddMore && (
                      <p className="text-xs text-text-light text-center py-2">
                        Maximum {MAX_ADDRESSES} adresses. Supprimez-en une dans votre profil pour en ajouter.
                      </p>
                    )}

                    {/* Add new address form */}
                    {isAdding && (
                      <div className="p-3 bg-white rounded-lg border border-secondary/30 space-y-3">
                        <input
                          type="text"
                          value={newAddress.label}
                          onChange={(e) => setNewAddress((prev) => ({ ...prev, label: e.target.value }))}
                          placeholder="Nom (ex: Maison)"
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-secondary"
                        />

                        <AddressAutocomplete
                          value={newAddress.address}
                          onChange={handleNewAddressChange}
                          onInputChange={(val) => setNewAddress((prev) => ({ ...prev, address: val }))}
                          placeholder="Rechercher l'adresse..."
                          searchType="address"
                        />

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            onClick={cancelAdding}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 rounded-lg text-sm text-text-light hover:bg-gray-100 transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={saveNewAddress}
                            disabled={isSubmitting || !newAddress.address || !newAddress.label}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary text-white hover:bg-secondary/90 transition-colors disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                            Ajouter
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Collapse button */}
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="w-full py-2 text-xs text-text-light hover:text-foreground transition-colors flex items-center justify-center gap-1"
                    >
                      <ChevronUp className="w-3 h-3" />
                      Réduire
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    );
  }

  // No service location specified
  return null;
}
