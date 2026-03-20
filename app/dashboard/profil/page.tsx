"use client";

import { motion } from "framer-motion";
import { Calendar, Euro, Loader2, ArrowUp, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

// Composants extraits
import ProfileHeader from "../components/ProfileHeader";
import ProfileCompletionBar from "../components/ProfileCompletionBar";
import ProfileSettingsSection from "../components/ProfileSettingsSection";
import ActivitiesSection from "../components/ActivitiesSection";
import EnvironmentPhotosSection from "../components/EnvironmentPhotosSection";
import DashboardAvailabilityCalendar from "./DashboardAvailabilityCalendar";
import DashboardPricingCard from "./DashboardPricingCard";
import AcceptedAnimalsSection from "./AcceptedAnimalsSection";
import HousingConditionsSection from "./HousingConditionsSection";
import ReviewsPreviewSection from "./ReviewsPreviewSection";
import { useProfileHandlers } from "./useProfileHandlers";

export default function ProfilePage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const profileData = useQuery(
    api.services.profile.getProfile,
    token ? { token } : "skip"
  );

  const handlers = useProfileHandlers(token);

  const isLoading = authLoading || profileData === undefined;
  const userInfo = profileData?.user;
  const profile = profileData?.profile;
  const profileImageUrl = profile?.profileImageUrl || null;

  // Complétion du profil
  const profileCompletionData = {
    hasProfilePhoto: !!profileImageUrl,
    hasCoverPhoto: !!profile?.coverImageUrl,
    hasDescription: !!profile?.description && profile.description.trim().length > 0,
    hasLocation: !!profile?.city || !!profile?.location,
    hasRadius: !!profile?.radius && profile.radius > 0,
    hasAcceptedAnimals: !!profile?.acceptedAnimals && profile.acceptedAnimals.length > 0,
    hasEquipments: profile?.hasGarden !== undefined || profile?.hasVehicle !== undefined,
    hasMaxAnimals: !!profile?.maxAnimalsPerSlot && profile.maxAnimalsPerSlot > 0,
    hasServices: true,
    hasAvailability: true,
    hasIcad: profile?.icadRegistered !== undefined && profile?.icadRegistered !== null,
  };

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-text-light">Chargement du profil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <p className="text-red-700">Impossible de charger le profil. Veuillez vous reconnecter.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Mon profil</h1>
          <p className="text-text-light mt-1">Votre annonce visible par les propriétaires d&apos;animaux</p>
        </div>
        {user?.username && (
          <Link
            href={`/profil/${user.username}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm w-fit"
          >
            <Eye className="w-4 h-4" />
            Voir mon profil
          </Link>
        )}
      </motion.div>

      {/* Barre de complétion */}
      <ProfileCompletionBar profileData={profileCompletionData} />

      {/* En-tête profil avec bannière */}
      <div id="section-profile-header">
        <ProfileHeader
          firstName={userInfo.firstName}
          lastName={userInfo.lastName}
          profileImage={profileImageUrl}
          coverImage={profile?.coverImageUrl}
          location={profile?.location}
          city={profile?.city}
          postalCode={profile?.postalCode}
          region={profile?.region}
          memberSince={user?.createdAt}
          verified={user?.emailVerified || false}
          rating={0}
          reviewCount={0}
          responseRate={0}
          responseTime={undefined}
          description={profile?.description}
          icadRegistered={profile?.icadRegistered}
          isEditable={true}
          onUpdateDescription={handlers.updateDescription}
          onUpdateLocation={handlers.updateLocation}
          onUpdateIcad={handlers.updateIcad}
          onUploadAvatar={handlers.uploadAvatar}
          onRemoveAvatar={handlers.removeAvatar}
          onUploadCover={handlers.uploadCover}
          onRemoveCover={handlers.removeCover}
        />
      </div>

      {/* Rayon d'intervention */}
      <div id="section-radius">
        <ProfileSettingsSection
          radius={profile?.radius || 20}
          onRadiusChange={handlers.updateRadius}
          acceptedAnimals={[]}
          isEditable={true}
          showOnlyRadius={true}
        />
      </div>

      {/* Disponibilités & Tarifs - Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendrier des disponibilités */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-white rounded-3xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Mes disponibilités
            </h3>
            <Link href="/dashboard/planning" className="text-sm text-primary font-medium hover:underline">
              Gérer
            </Link>
          </div>
          <DashboardAvailabilityCalendar token={token} />
        </motion.div>

        {/* Tarifs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-3xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Euro className="w-5 h-5 text-primary" />
              Tarifs
            </h3>
          </div>
          {token && <DashboardPricingCard token={token} />}
        </motion.div>
      </div>

      {/* Animaux acceptés & Capacité & Équipements */}
      <AcceptedAnimalsSection
        acceptedAnimals={profile?.acceptedAnimals || []}
        maxAnimalsPerSlot={profile?.maxAnimalsPerSlot}
        hasVehicle={profile?.hasVehicle}
        onAcceptedAnimalsChange={handlers.updateAcceptedAnimals}
        onMaxAnimalsChange={handlers.updateMaxAnimals}
        onHasVehicleChange={handlers.updateHasVehicle}
      />

      {/* Conditions de garde */}
      <HousingConditionsSection
        profile={{
          housingType: profile?.housingType as "house" | "apartment" | undefined,
          housingSize: profile?.housingSize,
          hasGarden: profile?.hasGarden,
          gardenSize: profile?.gardenSize,
          isSmoker: profile?.isSmoker,
          hasChildren: profile?.hasChildren,
          childrenAges: profile?.childrenAges,
          providesFood: profile?.providesFood,
          ownedAnimals: profile?.ownedAnimals as any,
        }}
        onHousingTypeChange={handlers.updateHousingType}
        onHousingSizeChange={handlers.updateHousingSize}
        onGardenSizeChange={handlers.updateGardenSize}
        onIsSmokerChange={handlers.updateIsSmoker}
        onHasChildrenChange={handlers.updateHasChildren}
        onChildrenAgesChange={handlers.updateChildrenAges}
        onProvidesFoodChange={handlers.updateProvidesFood}
        onOwnedAnimalsChange={handlers.updateOwnedAnimals}
      />

      {/* Activités */}
      <ActivitiesSection
        token={token}
        selectedActivities={profile?.selectedActivities as Array<{ activityId: Id<"activities">; customDescription?: string }> | undefined}
        onUpdate={handlers.updateSelectedActivities}
      />

      {/* Photos d'environnement */}
      <EnvironmentPhotosSection
        photos={profile?.environmentPhotos || []}
        onUpdate={handlers.updateEnvironmentPhotos}
      />

      {/* Derniers avis */}
      <ReviewsPreviewSection />

      {/* Bouton remonter en haut */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-colors"
            aria-label="Remonter en haut de page"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
