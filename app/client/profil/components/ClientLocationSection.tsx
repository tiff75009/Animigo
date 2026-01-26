"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Plus,
  Trash2,
  Star,
  Edit2,
  Save,
  X,
  Loader2,
  CheckCircle,
  Home,
  Building2,
  Briefcase,
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

interface ClientLocationSectionProps {
  sessionToken: string;
}

const MAX_ADDRESSES = 3;

const labelIcons: Record<string, React.ElementType> = {
  "Maison": Home,
  "Travail": Briefcase,
  "Bureau": Building2,
};

const defaultLabels = ["Maison", "Travail", "Autre"];

export default function ClientLocationSection({ sessionToken }: ClientLocationSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState({
    label: "",
    address: "",
    city: null as string | null,
    postalCode: null as string | null,
    coordinates: null as Coordinates | null,
    placeId: "",
    additionalInfo: "",
  });
  const [editAddress, setEditAddress] = useState({
    label: "",
    address: "",
    city: null as string | null,
    postalCode: null as string | null,
    coordinates: null as Coordinates | null,
    placeId: "",
    additionalInfo: "",
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Queries and mutations
  const addresses = useQuery(api.client.addresses.getAddresses, { sessionToken });
  const addAddressMutation = useMutation(api.client.addresses.addAddress);
  const updateAddressMutation = useMutation(api.client.addresses.updateAddress);
  const deleteAddressMutation = useMutation(api.client.addresses.deleteAddress);
  const setDefaultMutation = useMutation(api.client.addresses.setDefaultAddress);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset success message
  useEffect(() => {
    if (savedSuccess) {
      const timer = setTimeout(() => setSavedSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [savedSuccess]);

  // Suggest label based on existing addresses
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
      additionalInfo: "",
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
      additionalInfo: "",
    });
  }, []);

  // Handle address selection for new address
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
    if (!newAddress.address || !newAddress.label) return;

    setIsSubmitting(true);
    try {
      await addAddressMutation({
        sessionToken,
        label: newAddress.label,
        address: newAddress.address,
        city: newAddress.city || undefined,
        postalCode: newAddress.postalCode || undefined,
        coordinates: newAddress.coordinates || undefined,
        googlePlaceId: newAddress.placeId || undefined,
        additionalInfo: newAddress.additionalInfo || undefined,
        isDefault: !addresses || addresses.length === 0,
      });
      setSavedSuccess(true);
      cancelAdding();
    } catch (error) {
      console.error("Error adding address:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [newAddress, sessionToken, addAddressMutation, addresses, cancelAdding]);

  // Start editing
  const startEditing = useCallback((addr: Address) => {
    setEditingId(addr._id as string);
    setEditAddress({
      label: addr.label,
      address: addr.address,
      city: addr.city || null,
      postalCode: addr.postalCode || null,
      coordinates: addr.coordinates || null,
      placeId: addr.googlePlaceId || "",
      additionalInfo: addr.additionalInfo || "",
    });
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditAddress({
      label: "",
      address: "",
      city: null,
      postalCode: null,
      coordinates: null,
      placeId: "",
      additionalInfo: "",
    });
  }, []);

  // Handle address selection for edit
  const handleEditAddressChange = useCallback((data: {
    address: string;
    city: string | null;
    postalCode: string | null;
    coordinates: { lat: number; lng: number };
    placeId: string;
  } | null) => {
    if (data) {
      setEditAddress((prev) => ({
        ...prev,
        address: data.address,
        city: data.city,
        postalCode: data.postalCode,
        coordinates: data.coordinates,
        placeId: data.placeId,
      }));
    }
  }, []);

  // Save edited address
  const saveEditedAddress = useCallback(async () => {
    if (!editingId || !editAddress.address || !editAddress.label) return;

    // Skip if it's a profile-based virtual address
    if (editingId.startsWith("profile-")) {
      cancelEditing();
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAddressMutation({
        sessionToken,
        addressId: editingId as Id<"clientAddresses">,
        label: editAddress.label,
        address: editAddress.address,
        city: editAddress.city || undefined,
        postalCode: editAddress.postalCode || undefined,
        coordinates: editAddress.coordinates || undefined,
        googlePlaceId: editAddress.placeId || undefined,
        additionalInfo: editAddress.additionalInfo || undefined,
      });
      setSavedSuccess(true);
      cancelEditing();
    } catch (error) {
      console.error("Error updating address:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [editingId, editAddress, sessionToken, updateAddressMutation, cancelEditing]);

  // Delete address
  const handleDelete = useCallback(async (addressId: string) => {
    if (addressId.startsWith("profile-")) return;

    if (!confirm("Supprimer cette adresse ?")) return;

    setIsSubmitting(true);
    try {
      await deleteAddressMutation({
        sessionToken,
        addressId: addressId as Id<"clientAddresses">,
      });
      setSavedSuccess(true);
    } catch (error) {
      console.error("Error deleting address:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionToken, deleteAddressMutation]);

  // Set as default
  const handleSetDefault = useCallback(async (addressId: string) => {
    if (addressId.startsWith("profile-")) return;

    setIsSubmitting(true);
    try {
      await setDefaultMutation({
        sessionToken,
        addressId: addressId as Id<"clientAddresses">,
      });
      setSavedSuccess(true);
    } catch (error) {
      console.error("Error setting default:", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionToken, setDefaultMutation]);

  const canAddMore = addresses && addresses.length < MAX_ADDRESSES;
  const isVirtualAddress = (id: string) => typeof id === 'string' && id.startsWith("profile-");
  const isLoading = addresses === undefined;

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
              Mes adresses
            </h3>
            <p className="text-sm text-text-light">
              Jusqu'à {MAX_ADDRESSES} adresses pour vos réservations
            </p>
          </div>
        </div>

        {canAddMore && !isAdding && (
          <motion.button
            onClick={startAdding}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </motion.button>
        )}
      </div>

      {/* Success message */}
      <AnimatePresence>
        {savedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 bg-green-50 rounded-xl flex items-center gap-2 text-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Modifications enregistrées</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-secondary" />
        </div>
      )}

      {/* Addresses list */}
      {!isLoading && (
        <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {addresses?.map((addr: Address) => {
            const isEditing = editingId === addr._id;
            const IconComponent = labelIcons[addr.label] || MapPin;

            return (
              <motion.div
                key={addr._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "p-4 rounded-xl border transition-colors",
                  addr.isDefault
                    ? "border-secondary/30 bg-secondary/5"
                    : "border-foreground/10 bg-gray-50/50"
                )}
              >
                {isEditing ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editAddress.label}
                        onChange={(e) => setEditAddress((prev) => ({ ...prev, label: e.target.value }))}
                        placeholder="Nom de l'adresse"
                        className="flex-1 px-3 py-2 rounded-lg border border-foreground/10 text-sm focus:outline-none focus:border-secondary"
                      />
                    </div>

                    <AddressAutocomplete
                      value={editAddress.address}
                      onChange={handleEditAddressChange}
                      onInputChange={(val) => setEditAddress((prev) => ({ ...prev, address: val }))}
                      placeholder="Rechercher l'adresse..."
                      searchType="address"
                    />

                    <input
                      type="text"
                      value={editAddress.additionalInfo || ""}
                      onChange={(e) => setEditAddress((prev) => ({ ...prev, additionalInfo: e.target.value }))}
                      placeholder="Infos complémentaires (étage, code...)"
                      className="w-full px-3 py-2 rounded-lg border border-foreground/10 text-sm focus:outline-none focus:border-secondary"
                    />

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        onClick={cancelEditing}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 rounded-lg text-sm text-text-light hover:bg-gray-100 transition-colors"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={saveEditedAddress}
                        disabled={isSubmitting || !editAddress.address}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary text-white hover:bg-secondary/90 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Enregistrer
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg flex-shrink-0",
                      addr.isDefault ? "bg-secondary/20 text-secondary" : "bg-gray-100 text-gray-500"
                    )}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-foreground">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/20 text-secondary font-medium">
                            Par défaut
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground truncate">{addr.address || "Adresse non renseignée"}</p>
                      {addr.city && (
                        <p className="text-xs text-text-light mt-0.5">
                          {addr.city}
                          {addr.postalCode && ` (${addr.postalCode})`}
                        </p>
                      )}
                      {addr.additionalInfo && (
                        <p className="text-xs text-text-light mt-1 italic">{addr.additionalInfo}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!addr.isDefault && !isVirtualAddress(addr._id as string) && (
                        <button
                          onClick={() => handleSetDefault(addr._id as string)}
                          disabled={isSubmitting}
                          title="Définir par défaut"
                          className="p-2 rounded-lg text-text-light hover:bg-gray-100 hover:text-secondary transition-colors disabled:opacity-50"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      {!isVirtualAddress(addr._id as string) && (
                        <>
                          <button
                            onClick={() => startEditing(addr)}
                            disabled={isSubmitting}
                            title="Modifier"
                            className="p-2 rounded-lg text-text-light hover:bg-gray-100 hover:text-foreground transition-colors disabled:opacity-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {addresses && addresses.length > 1 && (
                            <button
                              onClick={() => handleDelete(addr._id as string)}
                              disabled={isSubmitting}
                              title="Supprimer"
                              className="p-2 rounded-lg text-text-light hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add new address form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl border border-secondary/30 bg-secondary/5 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAddress.label}
                    onChange={(e) => setNewAddress((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder="Nom de l'adresse (ex: Maison)"
                    className="flex-1 px-3 py-2 rounded-lg border border-foreground/10 text-sm focus:outline-none focus:border-secondary bg-white"
                  />
                </div>

                <AddressAutocomplete
                  value={newAddress.address}
                  onChange={handleNewAddressChange}
                  onInputChange={(val) => setNewAddress((prev) => ({ ...prev, address: val }))}
                  placeholder="Rechercher l'adresse..."
                  searchType="address"
                />

                <input
                  type="text"
                  value={newAddress.additionalInfo}
                  onChange={(e) => setNewAddress((prev) => ({ ...prev, additionalInfo: e.target.value }))}
                  placeholder="Infos complémentaires (étage, code...)"
                  className="w-full px-3 py-2 rounded-lg border border-foreground/10 text-sm focus:outline-none focus:border-secondary bg-white"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={cancelAdding}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-lg text-sm text-text-light hover:bg-white transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={saveNewAddress}
                    disabled={isSubmitting || !newAddress.address || !newAddress.label}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-secondary text-white hover:bg-secondary/90 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Ajouter l'adresse
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {(!addresses || addresses.length === 0) && !isAdding && (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <MapPin className="w-10 h-10 text-text-light mx-auto mb-3" />
            <p className="text-foreground font-medium">Aucune adresse enregistrée</p>
            <p className="text-sm text-text-light mt-1">
              Ajoutez une adresse pour faciliter vos réservations
            </p>
            <button
              onClick={startAdding}
              className="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-secondary text-white hover:bg-secondary/90 transition-colors"
            >
              Ajouter une adresse
            </button>
          </div>
        )}

          {/* Max addresses reached notice */}
          {addresses && addresses.length >= MAX_ADDRESSES && (
            <p className="text-xs text-text-light text-center py-2">
              Vous avez atteint le maximum de {MAX_ADDRESSES} adresses
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
