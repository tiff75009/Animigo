"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckCircle, Info } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import ServiceForm from "../services/ServiceForm";
import ServiceList from "../services/ServiceList";

interface ServiceCategory {
  slug: string;
  name: string;
  icon?: string;
  billingType?: "hourly" | "daily" | "flexible";
  allowedPriceUnits?: ("hour" | "half_day" | "day" | "week" | "month")[];
  defaultVariants?: Array<{
    name: string;
    description?: string;
    suggestedDuration?: number;
    includedFeatures?: string[];
  }>;
  allowCustomVariants?: boolean;
  allowRangeBooking?: boolean;
  allowOvernightStay?: boolean;
  // Type de catégorie
  typeId?: string | null;
  typeName?: string | null;
  typeIcon?: string | null;
  typeColor?: string | null;
  // Configuration tarification avancée
  announcerPriceMode?: "manual" | "automatic";
  displayPriceUnit?: "hour" | "half_day" | "day" | "week" | "month";
  defaultNightlyPrice?: number;
}

interface CategoryType {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

type PriceUnit = "hour" | "half_day" | "day" | "week" | "month" | "flat";

type ServiceLocation = "announcer_home" | "client_home" | "both";

interface Service {
  id: Id<"services">;
  category: string;
  animalTypes: string[];
  serviceLocation?: ServiceLocation;
  isActive: boolean;
  basePrice?: number;
  moderationStatus?: string;
  variants?: Array<{
    id: Id<"serviceVariants">;
    name: string;
    description?: string;
    price: number;
    priceUnit: PriceUnit;
    // Multi-tarification
    pricing?: {
      hourly?: number;
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
    duration?: number;
    includedFeatures?: string[];
    order: number;
    isActive: boolean;
  }>;
  options?: Array<{
    id: Id<"serviceOptions">;
    name: string;
    description?: string;
    price: number;
    priceType: "flat" | "per_day" | "per_unit";
    unitLabel?: string;
    maxQuantity?: number;
    order: number;
    isActive: boolean;
  }>;
}

interface ServicesTabProps {
  services: Service[];
  categories: ServiceCategory[];
  categoryTypes?: CategoryType[];
  token: string;
  onAddService: (data: {
    category: string;
    animalTypes: string[];
    serviceLocation?: ServiceLocation;
    initialVariants: Array<{
      name: string;
      description?: string;
      price: number;
      priceUnit: "hour" | "half_day" | "day" | "week" | "month" | "flat";
      // Multi-tarification
      pricing?: {
        hourly?: number;
        halfDaily?: number;
        daily?: number;
        weekly?: number;
        monthly?: number;
      };
      duration?: number;
      includedFeatures?: string[];
    }>;
    initialOptions?: Array<{
      name: string;
      description?: string;
      price: number;
      priceType: "flat" | "per_day" | "per_unit";
      unitLabel?: string;
      maxQuantity?: number;
    }>;
  }) => Promise<boolean | undefined>;
  onEditService: (serviceId: Id<"services">, data: { category: string; animalTypes: string[] }) => void;
  onToggleService: (serviceId: Id<"services">, isActive: boolean) => void;
  onDeleteService: (serviceId: Id<"services">) => void;
  isSaving: boolean;
  error?: string | null;
  successMessage?: string | null;
  onClearSuccess: () => void;
}

export default function ServicesTab({
  services,
  categories,
  categoryTypes = [],
  token,
  onAddService,
  onEditService,
  onToggleService,
  onDeleteService,
  isSaving,
  error,
  successMessage,
  onClearSuccess,
}: ServicesTabProps) {
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<Id<"services"> | null>(null);

  const existingCategories = services.map((s) => s.category);

  const handleEditService = (serviceId: Id<"services">) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      // For now, just toggle the card expansion
      // Edit functionality is handled within ServiceCard
      setEditingServiceId(serviceId === editingServiceId ? null : serviceId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-4 bg-secondary/10 border border-secondary/20 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-secondary" />
              <p className="text-secondary font-medium">{successMessage}</p>
            </div>
            <button
              onClick={onClearSuccess}
              className="text-secondary/60 hover:text-secondary"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Banner */}
      <AnimatePresence>
        {services.length === 0 && !isAddingService && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl"
          >
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-700">Bienvenue !</p>
              <p className="text-sm text-blue-600 mt-1">
                Créez votre premier service pour commencer à recevoir des demandes.
                Vous pourrez définir vos tarifs et options.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Service Button */}
      <AnimatePresence>
        {!isAddingService && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => setIsAddingService(true)}
            className="w-full p-5 border-2 border-dashed border-foreground/20 rounded-2xl text-center hover:border-primary/50 hover:bg-primary/5 transition-all group"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <span className="font-medium text-foreground">
                Ajouter un service
              </span>
              <span className="text-sm text-text-light">
                Créez une nouvelle offre de garde
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Service Form */}
      <AnimatePresence>
        {isAddingService && (
          <ServiceForm
            categories={categories}
            categoryTypes={categoryTypes}
            existingCategories={existingCategories}
            onSubmit={async (data) => {
              const success = await onAddService(data);
              if (success) {
                setIsAddingService(false);
              }
              return success;
            }}
            onCancel={() => setIsAddingService(false)}
            isSubmitting={isSaving}
            error={error}
          />
        )}
      </AnimatePresence>

      {/* Services List */}
      <ServiceList
        services={services}
        categories={categories}
        token={token}
        onAddService={() => setIsAddingService(true)}
        onEditService={handleEditService}
        onToggleService={onToggleService}
        onDeleteService={onDeleteService}
      />
    </div>
  );
}
