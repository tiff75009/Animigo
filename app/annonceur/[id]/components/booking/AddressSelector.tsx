"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, Check, ChevronDown, Edit2, Home, Building2, X } from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { ClientAddress } from "./types";

interface AddressSelectorProps {
  addresses: ClientAddress[];
  selectedAddressId: string | null;
  isLoading?: boolean;
  onSelect: (addressId: string) => void;
  onAddNew: () => void;
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
  className,
}: AddressSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Find selected address
  const selectedAddress = selectedAddressId
    ? addresses.find((a) => a._id === selectedAddressId)
    : addresses.find((a) => a.isDefault) || addresses[0];

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
    </div>
  );
}
