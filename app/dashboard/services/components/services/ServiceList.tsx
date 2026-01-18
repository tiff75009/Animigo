"use client";

import { motion } from "framer-motion";
import { Briefcase, Plus } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import ServiceCard from "./ServiceCard";
import EmptyState from "../shared/EmptyState";
import { containerVariants, itemVariants } from "@/app/lib/animations";

interface ServiceCategory {
  slug: string;
  name: string;
  icon?: string;
  billingType?: "hourly" | "daily" | "flexible";
}

type PriceUnit = "hour" | "day" | "week" | "month" | "flat";

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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {services.map((service) => (
        <motion.div key={service.id} variants={itemVariants}>
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
    </motion.div>
  );
}
