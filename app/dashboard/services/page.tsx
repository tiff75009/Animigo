"use client";

import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { useServicesPageData } from "./hooks/useServicesPageData";
import ServicesTab from "./components/tabs/ServicesTab";

export default function ServicesPage() {
  const { token } = useAuth();

  // Use the custom hook for all data management
  const {
    services,
    categories,
    isSaving,
    error,
    successMessage,
    clearSuccess,
    addService,
    updateService,
    deleteService,
    toggleService,
  } = useServicesPageData(token ?? undefined);

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Mes services</h1>
          </div>
          <p className="text-text-light">
            Gérez vos services et tarifs
          </p>
        </motion.div>

        {/* Services Content */}
        {token ? (
          <ServicesTab
            services={services || []}
            categories={categories}
            token={token}
            onAddService={addService}
            onEditService={(serviceId, data) => updateService(serviceId, data)}
            onToggleService={toggleService}
            onDeleteService={deleteService}
            isSaving={isSaving}
            error={error}
            successMessage={successMessage}
            onClearSuccess={clearSuccess}
          />
        ) : (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  );
}
