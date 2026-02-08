"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, User, Calendar, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/app/hooks/useAuth";
import { useServicesPageData } from "./hooks/useServicesPageData";
import ServicesTab from "./components/tabs/ServicesTab";
import PhoneVerificationBanner from "./components/PhoneVerificationBanner";

export default function ServicesPage() {
  const { user, token } = useAuth();
  const [justVerified, setJustVerified] = useState(false);

  // Use the custom hook for all data management (avec polling automatique après création)
  const {
    services,
    categories,
    categoryTypes,
    profileData,
    hasAvailability,
    isSaving,
    error,
    successMessage,
    clearSuccess,
    addService,
    updateService,
    deleteService,
    toggleService,
    refetchServices,
  } = useServicesPageData(token ?? undefined);

  const isPhoneVerified = user?.phoneVerified === true || justVerified;

  const handlePhoneVerified = () => {
    setJustVerified(true);
    refetchServices();
  };

  // Vérification des prérequis
  const profile = profileData?.profile;
  const isProfileComplete =
    profile &&
    Array.isArray(profile.acceptedAnimals) &&
    profile.acceptedAnimals.length > 0 &&
    profile.location &&
    profile.housingType;

  const hasPlanning = hasAvailability === true;

  const canCreateServices = isProfileComplete && hasPlanning;
  const isSapApproved = profile?.isSapApproved === true;

  // Étapes de complétion
  const prerequisites = [
    {
      id: "profile",
      label: "Compléter ma fiche",
      description: "Renseignez vos animaux acceptés, conditions de garde et localisation",
      done: !!isProfileComplete,
      href: "/dashboard/profil",
      icon: User,
    },
    {
      id: "planning",
      label: "Configurer mes disponibilités",
      description: "Définissez vos créneaux disponibles dans le planning",
      done: hasPlanning,
      href: "/dashboard/planning",
      icon: Calendar,
    },
  ];

  const completedCount = prerequisites.filter((p) => p.done).length;

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

        {/* Bannière vérification téléphone */}
        {!isPhoneVerified && user && token && (
          <PhoneVerificationBanner
            phone={user.phone}
            token={token}
            onVerified={handlePhoneVerified}
          />
        )}

        {/* Prérequis non complétés */}
        {!canCreateServices && profileData !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-white border border-foreground/10 rounded-2xl overflow-hidden"
          >
            <div className="p-5 border-b border-foreground/5">
              <h2 className="font-bold text-foreground text-lg">
                Avant de créer un service
              </h2>
              <p className="text-sm text-text-light mt-1">
                Complétez ces étapes pour pouvoir proposer vos services aux clients
              </p>
              {/* Progress bar */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedCount / prerequisites.length) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                  />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {completedCount}/{prerequisites.length}
                </span>
              </div>
            </div>

            <div className="divide-y divide-foreground/5">
              {prerequisites.map((step, index) => (
                <Link
                  key={step.id}
                  href={step.href}
                  className="flex items-center gap-4 p-4 hover:bg-foreground/[0.02] transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    step.done
                      ? "bg-secondary/10"
                      : "bg-primary/10"
                  }`}>
                    {step.done ? (
                      <CheckCircle className="w-5 h-5 text-secondary" />
                    ) : (
                      <step.icon className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-light">
                        ÉTAPE {index + 1}
                      </span>
                      {step.done && (
                        <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">
                          FAIT
                        </span>
                      )}
                    </div>
                    <p className={`font-semibold ${step.done ? "text-text-light line-through" : "text-foreground"}`}>
                      {step.label}
                    </p>
                    <p className="text-sm text-text-light">{step.description}</p>
                  </div>
                  {!step.done && (
                    <ArrowRight className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Services Content */}
        {token ? (
          <ServicesTab
            services={services || []}
            categories={categories}
            categoryTypes={categoryTypes}
            token={token}
            onAddService={addService}
            onEditService={(serviceId, data) => updateService(serviceId, data)}
            onToggleService={toggleService}
            onDeleteService={deleteService}
            isSaving={isSaving}
            error={error}
            successMessage={successMessage}
            onClearSuccess={clearSuccess}
            phoneVerified={isPhoneVerified}
            canCreateServices={!!canCreateServices}
            isSapApproved={isSapApproved}
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
