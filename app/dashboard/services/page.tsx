"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Edit2, Euro, Camera, Save, Loader2, Check } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { useServicesPageData, ProfileFormData } from "./hooks/useServicesPageData";
import ProfileTab from "./components/tabs/ProfileTab";
import ServicesTab from "./components/tabs/ServicesTab";
import PhotosTab from "./components/tabs/PhotosTab";
import { cn } from "@/app/lib/utils";

type TabType = "profile" | "services" | "photos";

const TABS = [
  { id: "profile" as TabType, label: "Mon profil", icon: Edit2 },
  { id: "services" as TabType, label: "Services & Tarifs", icon: Euro },
  { id: "photos" as TabType, label: "Photos", icon: Camera },
] as const;

export default function ServicesPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [showSuccess, setShowSuccess] = useState(false);

  // Use the custom hook for all data management
  const {
    profileData,
    services,
    photos,
    categories,
    isSaving,
    error,
    successMessage,
    clearError,
    clearSuccess,
    saveProfile,
    addService,
    updateService,
    deleteService,
    toggleService,
    uploadPhoto,
    deletePhoto,
  } = useServicesPageData(token ?? undefined);

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    bio: "",
    description: "",
    experience: "",
    availability: "",
    location: "",
    radius: 10,
    acceptedAnimals: [],
    hasGarden: false,
    hasVehicle: false,
    ownedAnimals: [],
    maxAnimalsPerSlot: undefined,
  });

  // Initialize profile form when data loads
  useEffect(() => {
    if (profileData?.profile) {
      setProfileForm({
        bio: profileData.profile.bio || "",
        description: profileData.profile.description || "",
        experience: profileData.profile.experience || "",
        availability: profileData.profile.availability || "",
        location: profileData.profile.location || "",
        radius: profileData.profile.radius || 10,
        // Localisation structurée (Google Maps)
        city: profileData.profile.city,
        postalCode: profileData.profile.postalCode,
        department: profileData.profile.department,
        region: profileData.profile.region,
        coordinates: profileData.profile.coordinates,
        googlePlaceId: profileData.profile.googlePlaceId,
        acceptedAnimals: profileData.profile.acceptedAnimals || [],
        hasGarden: profileData.profile.hasGarden || false,
        hasVehicle: profileData.profile.hasVehicle || false,
        ownedAnimals: profileData.profile.ownedAnimals || [],
        maxAnimalsPerSlot: profileData.profile.maxAnimalsPerSlot,
      });
    }
  }, [profileData]);

  // Détecter les changements dans le profil
  const hasProfileChanges = useMemo(() => {
    if (!profileData?.profile) {
      // Si pas de profil existant, vérifier si le formulaire a des données
      return profileForm.bio !== "" ||
             profileForm.description !== "" ||
             profileForm.location !== "" ||
             profileForm.acceptedAnimals.length > 0 ||
             profileForm.ownedAnimals.length > 0;
    }

    const original = profileData.profile;
    return (
      profileForm.bio !== (original.bio || "") ||
      profileForm.description !== (original.description || "") ||
      profileForm.experience !== (original.experience || "") ||
      profileForm.availability !== (original.availability || "") ||
      profileForm.location !== (original.location || "") ||
      profileForm.radius !== (original.radius || 10) ||
      profileForm.hasGarden !== (original.hasGarden || false) ||
      profileForm.hasVehicle !== (original.hasVehicle || false) ||
      JSON.stringify(profileForm.acceptedAnimals) !== JSON.stringify(original.acceptedAnimals || []) ||
      JSON.stringify(profileForm.ownedAnimals) !== JSON.stringify(original.ownedAnimals || []) ||
      profileForm.city !== original.city ||
      profileForm.postalCode !== original.postalCode ||
      profileForm.googlePlaceId !== original.googlePlaceId
    );
  }, [profileForm, profileData]);

  const handleProfileChange = (updates: Partial<ProfileFormData>) => {
    setProfileForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSaveProfile = useCallback(async () => {
    await saveProfile(profileForm);
    setShowSuccess(true);
    // Cacher le bouton après 2.5 secondes
    setTimeout(() => {
      setShowSuccess(false);
    }, 2500);
  }, [saveProfile, profileForm]);

  // Afficher le bouton flottant seulement sur l'onglet profil et si changements
  const showFloatingButton = activeTab === "profile" && (hasProfileChanges || isSaving || showSuccess);

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
            Gérez votre profil, vos services et vos photos
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 p-1 bg-foreground/5 rounded-xl mb-8"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all",
                  isActive
                    ? "bg-white text-primary shadow-sm"
                    : "text-text-light hover:text-foreground"
                )}
                whileHover={{ scale: isActive ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "profile" && (
            <ProfileTab
              profileForm={profileForm}
              onProfileChange={handleProfileChange}
              successMessage={activeTab === "profile" ? successMessage : null}
            />
          )}

          {activeTab === "services" && (
            token ? (
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
                successMessage={activeTab === "services" ? successMessage : null}
                onClearSuccess={clearSuccess}
              />
            ) : (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )
          )}

          {activeTab === "photos" && (
            <PhotosTab
              photos={photos || []}
              onUpload={uploadPhoto}
              onDelete={deletePhoto}
              isUploading={isSaving}
            />
          )}
        </motion.div>
      </div>

      {/* Bouton flottant de sauvegarde */}
      <AnimatePresence mode="wait">
        {showFloatingButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              backgroundColor: showSuccess ? "#22c55e" : undefined,
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              backgroundColor: { duration: 0.3 }
            }}
            onClick={handleSaveProfile}
            disabled={isSaving || showSuccess}
            className={cn(
              "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl font-semibold shadow-xl",
              showSuccess
                ? "bg-green-500 text-white shadow-green-500/40"
                : "bg-primary text-white shadow-primary/40 hover:shadow-primary/60"
            )}
            whileHover={!isSaving && !showSuccess ? { scale: 1.03, y: -2 } : {}}
            whileTap={!isSaving && !showSuccess ? { scale: 0.97 } : {}}
          >
            <AnimatePresence mode="wait">
              {isSaving ? (
                <motion.div
                  key="saving"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3"
                >
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Enregistrement...</span>
                </motion.div>
              ) : showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
                  className="flex items-center gap-3"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                  <span>Enregistré !</span>
                </motion.div>
              ) : (
                <motion.div
                  key="save"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3"
                >
                  <Save className="w-5 h-5" />
                  <span>Enregistrer</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
