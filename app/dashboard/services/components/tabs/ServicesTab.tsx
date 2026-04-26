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
    // animalTypes est maintenant optionnel au niveau service (les animaux sont définis par formule)
    animalTypes?: string[];
    serviceLocation?: ServiceLocation;
    initialVariants: Array<{
      name: string;
      description?: string;
      objectives?: { icon: string; text: string }[];
      numberOfSessions?: number;
      sessionInterval?: number;
      sessionType?: "individual" | "collective";
      maxAnimalsPerSession?: number;
      serviceLocation?: ServiceLocation;
      // Animaux acceptés au niveau de la formule
      animalTypes?: string[];
      // Restrictions chiens au niveau de la formule
      dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both";
      acceptedDogSizes?: ("small" | "medium" | "large")[];
      price: number;
      priceUnit: "hour" | "half_day" | "day" | "week" | "month" | "flat";
      // Multi-tarification
      pricing?: {
        hourly?: number;
        halfDaily?: number;
        daily?: number;
        weekly?: number;
        monthly?: number;
        nightly?: number;
      };
      duration?: number;
      includedFeatures?: string[];
      isSapEligible?: boolean;
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
  phoneVerified?: boolean;
  canCreateServices?: boolean;
  isSapApproved?: boolean;
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
  phoneVerified,
  canCreateServices = true,
  isSapApproved,
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
            className="flex items-center justify-between gap-3 p-3"
            style={{
              borderRadius: 12,
              background: "#f5f9f6",
              border: "1px solid #cfdbd3",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#1f3a33" }}
              >
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <p className="text-[13.5px] font-semibold text-[#1f3a33] tracking-[-0.01em] truncate">
                {successMessage}
              </p>
            </div>
            <button
              onClick={onClearSuccess}
              className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[rgba(31,58,51,0.08)] flex-shrink-0 transition-colors"
              style={{ color: "#1f3a33" }}
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Banner */}
      <AnimatePresence>
        {services.length === 0 && !isAddingService && canCreateServices && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 p-3"
            style={{
              borderRadius: 12,
              background: "#f7f5ef",
              border: "1px solid #ece9e1",
            }}
          >
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#6d6d68" }} />
            <div>
              <p className="text-[13.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
                Bienvenue !
              </p>
              <p className="text-[12px] text-[#6d6d68] leading-[1.5] mt-0.5">
                Créez votre premier service pour commencer à recevoir des demandes. Vous pourrez définir vos tarifs et options.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Service Button - card sobre dashed */}
      <AnimatePresence>
        {!isAddingService && canCreateServices && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => setIsAddingService(true)}
            className="w-full p-5 text-center transition-all group hover:bg-[#fafafa]"
            style={{
              borderRadius: 14,
              border: "1px dashed #cfdbd3",
              background: "#fff",
            }}
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
          >
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
              >
                <Plus className="w-4 h-4" style={{ color: "#1f3a33" }} />
              </div>
              <span className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
                Ajouter un service
              </span>
              <span className="text-[12px] text-[#6d6d68]">
                Créez une nouvelle offre de garde
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Service Form */}
      <AnimatePresence>
        {isAddingService && canCreateServices && (
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
            isSapApproved={isSapApproved}
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
        phoneVerified={phoneVerified}
        canCreateServices={canCreateServices}
        isSapApproved={isSapApproved}
      />
    </div>
  );
}
