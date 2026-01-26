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

interface AddressSectionBookingProps {
  sessionToken: string | null;
  isLoggedIn: boolean;
  serviceLocation: "announcer_home" | "client_home" | undefined;
  announcerLocation: string;
  // Pour les formules collectives (toujours chez l'annonceur)
  isCollectiveFormula?: boolean;
  // Pour l'adresse sélectionnée ou saisie
  currentAddress: string;
  currentCity: string | null;
  currentCoordinates: Coordinates | null;
  onAddressChange: (data: {
    address: string;
    city: string | null;
    coordinates: Coordinates | null;
  }) => void;
  error?: string;
}

const MAX_ADDRESSES = 3;

const labelIcons: Record<string, React.ElementType> = {
  "Maison": Home,
  "Travail": Briefcase,
  "Bureau": Building2,
};

const defaultLabels = ["Maison", "Travail", "Autre"];

// Extraire uniquement la ville depuis la localisation complète
function extractCity(location: string): string {
  if (!location) return "";

  // Formats possibles:
  // "Paris", "Paris 11e", "75011 Paris", "75011"
  // "123 Rue Example, 75011 Paris", "123 Rue Example, Paris 75011"
  // "Rue X, Paris", "123 Avenue Y, 75011 Paris, France"

  // Chercher un pattern ville + arrondissement ou code postal + ville
  const patterns = [
    // "75011 Paris" ou "75011 Paris 11e"
    /\b(\d{5})\s+([A-Za-zÀ-ÿ\s-]+?)(?:\s+\d+e?)?$/i,
    // "Paris 75011" ou "Paris, 75011"
    /\b([A-Za-zÀ-ÿ\s-]+?)\s*,?\s*(\d{5})\b/i,
    // "Paris 11e" ou "Paris 11ème"
    /\b([A-Za-zÀ-ÿ-]+)\s+\d+e?(?:me|ème)?\b/i,
  ];

  // Essayer les patterns
  for (const pattern of patterns) {
    const match = location.match(pattern);
    if (match) {
      // Si on a trouvé un code postal suivi d'une ville
      if (/^\d{5}$/.test(match[1])) {
        return match[2].trim();
      }
      // Si on a trouvé une ville suivie d'un code postal ou arrondissement
      return match[1].trim();
    }
  }

  // Fallback: prendre la dernière partie après la virgule
  const parts = location.split(",").map((p) => p.trim());
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    // Ignorer si c'est "France" ou similaire
    if (lastPart.toLowerCase() === "france") {
      return parts[parts.length - 2] || lastPart;
    }
    // Extraire juste la ville du code postal + ville
    const codePostalMatch = lastPart.match(/^(\d{5})\s+(.+)/);
    if (codePostalMatch) {
      return codePostalMatch[2];
    }
    return lastPart;
  }

  // Dernier recours: retourner tel quel
  return location;
}

export default function AddressSectionBooking({
  sessionToken,
  isLoggedIn,
  serviceLocation,
  announcerLocation,
  isCollectiveFormula = false,
  currentAddress,
  currentCity,
  currentCoordinates,
  onAddressChange,
  error,
}: AddressSectionBookingProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({
    label: "",
    address: "",
    city: null as string | null,
    postalCode: null as string | null,
    coordinates: null as Coordinates | null,
    placeId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries for logged-in users
  const addresses = useQuery(
    api.client.addresses.getAddresses,
    sessionToken && isLoggedIn ? { sessionToken } : "skip"
  );
  const addAddressMutation = useMutation(api.client.addresses.addAddress);

  // Auto-select default address on load for client_home
  useEffect(() => {
    if (
      addresses &&
      addresses.length > 0 &&
      !selectedAddressId &&
      serviceLocation === "client_home" &&
      isLoggedIn &&
      !currentAddress
    ) {
      const defaultAddr = addresses.find((a: Address) => a.isDefault) || addresses[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr._id as string);
        onAddressChange({
          address: defaultAddr.address,
          city: defaultAddr.city || null,
          coordinates: defaultAddr.coordinates || null,
        });
      }
    }
  }, [addresses, selectedAddressId, serviceLocation, isLoggedIn, currentAddress, onAddressChange]);

  // Get suggested label for new address
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

  // Handle new address autocomplete change
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
      setSelectedAddressId(addressId);
      onAddressChange({
        address: newAddress.address,
        city: newAddress.city,
        coordinates: newAddress.coordinates,
      });

      cancelAdding();
      setIsExpanded(false);
    } catch (error) {
      console.error("Error adding address:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [newAddress, sessionToken, addAddressMutation, addresses, onAddressChange, cancelAdding]);

  // Handle address selection from list
  const handleSelectAddress = useCallback((addr: Address) => {
    setSelectedAddressId(addr._id as string);
    onAddressChange({
      address: addr.address,
      city: addr.city || null,
      coordinates: addr.coordinates || null,
    });
    setIsExpanded(false);
  }, [onAddressChange]);

  const canAddMore = addresses && addresses.length < MAX_ADDRESSES;
  const selectedAddress = addresses?.find((a: Address) => a._id === selectedAddressId);
  const isLoading = sessionToken && isLoggedIn && addresses === undefined;

  // For collective formulas - always at announcer's location (show only city for privacy)
  if (isCollectiveFormula) {
    const cityOnly = extractCity(announcerLocation);
    return (
      <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Lieu de la prestation</p>
            <p className="text-sm text-purple-600 font-medium">Seances collectives - Chez le prestataire</p>
            <p className="text-sm text-foreground mt-1">{cityOnly}</p>
            <p className="text-xs text-text-light mt-1">L&apos;adresse exacte sera communiquee apres confirmation</p>
          </div>
        </div>
      </div>
    );
  }

  // If service is at announcer's home - show announcer location (show only city for privacy)
  if (serviceLocation === "announcer_home") {
    const cityOnly = extractCity(announcerLocation);
    return (
      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 text-green-600">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Lieu de la prestation</p>
            <p className="text-sm text-green-600 font-medium">Chez le pet-sitter</p>
            <p className="text-sm text-foreground mt-1">{cityOnly}</p>
            <p className="text-xs text-text-light mt-1">L&apos;adresse exacte sera communiquee apres confirmation</p>
          </div>
        </div>
      </div>
    );
  }

  // If service is at client's home and user is logged in - show address selector
  if (serviceLocation === "client_home" && isLoggedIn && sessionToken) {
    return (
      <div className="space-y-4">
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
                className="p-4 bg-secondary/5 rounded-xl border border-secondary/30 cursor-pointer hover:border-secondary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const IconComponent = labelIcons[selectedAddress.label] || MapPin;
                      return (
                        <div className="p-2 rounded-lg bg-secondary/20 text-secondary">
                          <IconComponent className="w-5 h-5" />
                        </div>
                      );
                    })()}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{selectedAddress.label}</span>
                        {selectedAddress.isDefault && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary">
                            Defaut
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-light">
                        {selectedAddress.address}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-text-light" />
                </div>
              </div>
            )}

            {/* No address selected - prompt to select */}
            {!selectedAddress && !isExpanded && addresses && addresses.length > 0 && (
              <button
                onClick={() => setIsExpanded(true)}
                className={cn(
                  "w-full p-4 rounded-xl border border-dashed text-sm font-medium transition-colors",
                  error
                    ? "border-red-500 bg-red-50 text-red-600"
                    : "border-secondary/30 bg-secondary/5 text-secondary hover:border-secondary/50"
                )}
              >
                Selectionner une adresse
              </button>
            )}

            {/* Empty state - no addresses yet */}
            {!selectedAddress && !isExpanded && (!addresses || addresses.length === 0) && (
              <button
                onClick={startAdding}
                className={cn(
                  "w-full p-4 rounded-xl border border-dashed text-sm font-medium flex items-center justify-center gap-2 transition-colors",
                  error
                    ? "border-red-500 bg-red-50 text-red-600"
                    : "border-secondary/30 bg-secondary/5 text-secondary hover:border-secondary/50"
                )}
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
                  <div className="space-y-2">
                    {addresses?.map((addr: Address) => {
                      const IconComponent = labelIcons[addr.label] || MapPin;
                      const isSelected = addr._id === selectedAddressId;

                      return (
                        <div
                          key={addr._id}
                          onClick={() => handleSelectAddress(addr)}
                          className={cn(
                            "p-4 rounded-xl border cursor-pointer transition-colors",
                            isSelected
                              ? "border-secondary bg-secondary/10"
                              : "border-gray-200 bg-white hover:border-secondary/30"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-lg",
                                isSelected ? "bg-secondary/20 text-secondary" : "bg-gray-100 text-gray-500"
                              )}>
                                <IconComponent className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">{addr.label}</span>
                                  {addr.isDefault && (
                                    <Star className="w-3 h-3 text-secondary fill-secondary" />
                                  )}
                                </div>
                                <p className="text-sm text-text-light">
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
                        className="w-full p-4 rounded-xl border border-dashed border-gray-300 text-text-light hover:border-secondary hover:text-secondary transition-colors text-sm flex items-center justify-center gap-2"
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
                      <div className="p-4 bg-white rounded-xl border border-secondary/30 space-y-3">
                        <input
                          type="text"
                          value={newAddress.label}
                          onChange={(e) => setNewAddress((prev) => ({ ...prev, label: e.target.value }))}
                          placeholder="Nom (ex: Maison)"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-secondary"
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
                            className="px-4 py-2 rounded-xl text-sm text-text-light hover:bg-gray-100 transition-colors"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={saveNewAddress}
                            disabled={isSubmitting || !newAddress.address || !newAddress.label}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-white hover:bg-secondary/90 transition-colors disabled:opacity-50"
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
                      Reduire
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error message */}
            {error && !isExpanded && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </>
        )}
      </div>
    );
  }

  // Case: client_home but user not logged in - show address display or autocomplete
  if (serviceLocation === "client_home" && !isLoggedIn) {
    // Si l'adresse est déjà saisie, afficher en mode lecture avec option de modifier
    if (currentAddress && !isExpanded) {
      return (
        <div className="space-y-3">
          <div
            onClick={() => setIsExpanded(true)}
            className="p-4 bg-green-50 rounded-xl border border-green-200 cursor-pointer hover:border-green-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Adresse de prestation</p>
                  <p className="text-sm text-green-700 font-medium">{currentAddress}</p>
                  {currentCity && (
                    <p className="text-xs text-green-600">{currentCity}</p>
                  )}
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-text-light text-center">Cliquez pour modifier l&apos;adresse</p>
        </div>
      );
    }

    // Mode édition ou pas d'adresse
    return (
      <div className="space-y-3">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <Home className="w-4 h-4 inline mr-2" />
            Prestation a domicile - Saisissez l&apos;adresse de la prestation
          </p>
        </div>
        <AddressAutocomplete
          value={currentAddress}
          onChange={(data) => {
            if (data) {
              onAddressChange({
                address: data.address,
                city: data.city,
                coordinates: data.coordinates,
              });
              setIsExpanded(false);
            } else {
              onAddressChange({
                address: currentAddress,
                city: null,
                coordinates: null,
              });
            }
          }}
          onInputChange={(value) => onAddressChange({
            address: value,
            city: currentCity,
            coordinates: currentCoordinates,
          })}
          onManualChange={(value) => {
            onAddressChange({
              address: value,
              city: null,
              coordinates: null,
            });
          }}
          placeholder="Rechercher une adresse exacte..."
          allowManualEntry={true}
          searchType="address"
          helperText="Saisissez l'adresse ou aura lieu la prestation"
          error={error}
        />
        {isExpanded && currentAddress && (
          <button
            onClick={() => setIsExpanded(false)}
            className="w-full py-2 text-xs text-text-light hover:text-foreground transition-colors flex items-center justify-center gap-1"
          >
            <ChevronUp className="w-3 h-3" />
            Annuler la modification
          </button>
        )}
      </div>
    );
  }

  // Default: No specific service location - show regular address autocomplete
  return (
    <AddressAutocomplete
      value={currentAddress}
      onChange={(data) => {
        if (data) {
          const fullAddress = [
            data.address,
            data.postalCode,
            data.city,
          ]
            .filter(Boolean)
            .join(", ");
          onAddressChange({
            address: fullAddress,
            city: data.city,
            coordinates: data.coordinates,
          });
        } else {
          onAddressChange({
            address: currentAddress,
            city: null,
            coordinates: null,
          });
        }
      }}
      onInputChange={(value) => onAddressChange({
        address: value,
        city: currentCity,
        coordinates: currentCoordinates,
      })}
      onManualChange={(value) => {
        onAddressChange({
          address: value,
          city: null,
          coordinates: null,
        });
      }}
      placeholder="Rechercher une adresse exacte..."
      allowManualEntry={true}
      searchType="address"
      helperText="Saisissez l'adresse ou aura lieu la prestation"
      error={error}
    />
  );
}
