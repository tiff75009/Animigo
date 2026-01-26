"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Plus } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import ServiceCard from "./ServiceCard";
import EmptyState from "../shared/EmptyState";

interface ServiceCategory {
  slug: string;
  name: string;
  icon?: string;
  billingType?: "hourly" | "daily" | "flexible";
}

type PriceUnit = "hour" | "half_day" | "day" | "week" | "month" | "flat";

interface Service {
  id: Id<"services">;
  category: string;
  animalTypes: string[];
  isActive: boolean;
  basePrice?: number;
  moderationStatus?: string;
  variants?: Array<{
    id: Id<"serviceVariants">;
    name: string;
    description?: string;
    price: number;
    priceUnit: PriceUnit;
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

interface ServiceListProps {
  services: Service[];
  categories: ServiceCategory[];
  token: string;
  onAddService: () => void;
  onEditService: (serviceId: Id<"services">) => void;
  onToggleService: (serviceId: Id<"services">, isActive: boolean) => void;
  onDeleteService: (serviceId: Id<"services">) => void;
}

export default function ServiceList({
  services,
  categories,
  token,
  onAddService,
  onEditService,
  onToggleService,
  onDeleteService,
}: ServiceListProps) {
  const getCategoryData = (slug: string) => {
    return categories.find((c) => c.slug === slug);
  };

  if (services.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Aucun service"
        description="Créez votre premier service pour commencer à recevoir des demandes de garde."
        action={{
          label: "Créer un service",
          onClick: onAddService,
          icon: Plus,
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {services.map((service) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            layout
          >
            <ServiceCard
              service={service}
              categoryData={getCategoryData(service.category)}
              token={token}
              onEdit={() => onEditService(service.id)}
              onToggle={() => onToggleService(service.id, service.isActive)}
              onDelete={() => onDeleteService(service.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
