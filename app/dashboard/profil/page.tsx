"use client";

import { motion } from "framer-motion";
import { CalendarDays, Euro, Loader2, ArrowUp, Eye, User as UserIcon, Settings } from "lucide-react";
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
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#1f3a33" }} />
            <p className="text-[13px]" style={{ color: "#6d6d68" }}>Chargement du profil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div
          className="p-4 flex items-start gap-2.5 text-[13px]"
          style={{ borderRadius: 14, background: "#fdf0f0", border: "1px solid #f1cdcd", color: "#8a3a3a" }}
        >
          <p className="m-0">Impossible de charger le profil. Veuillez vous reconnecter.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ─── Header pattern unifié (eyebrow + titre + CTA) ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
          >
            <UserIcon className="w-5 h-5" style={{ color: "#1f3a33" }} />
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
              Espace · Profil
            </div>
            <h1
              className="text-[22px] md:text-[26px] font-semibold tracking-[-0.01em] m-0"
              style={{ color: "#1f1f1d" }}
            >
              Mon profil
            </h1>
            <p className="text-[12.5px] mt-0.5 m-0" style={{ color: "#6d6d68" }}>
              Votre annonce visible par les propriétaires d&apos;animaux
            </p>
          </div>
        </div>
        {user?.username && (
          <Link
            href={`/profil/${user.username}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-opacity hover:opacity-90 w-fit"
            style={{ background: "#1f3a33", color: "#f7f5ef" }}
          >
            <Eye className="w-3.5 h-3.5" />
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

      {/* ─── Disponibilités & Tarifs : grid 2 colonnes (style unifié) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Mes disponibilités */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="bg-white p-5"
          style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
              >
                <CalendarDays className="w-4 h-4" style={{ color: "#1f3a33" }} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
                  Section · Planning
                </div>
                <h3
                  className="text-[15px] font-semibold tracking-[-0.01em] m-0"
                  style={{ color: "#1f1f1d" }}
                >
                  Mes disponibilités
                </h3>
              </div>
            </div>
            <Link
              href="/dashboard/planning"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-colors flex-shrink-0"
              style={{ background: "#fcfaf4", color: "#1f3a33", border: "1px solid #ece9e1" }}
            >
              <Settings className="w-3 h-3" />
              Gérer
            </Link>
          </div>
          <DashboardAvailabilityCalendar token={token} />
        </motion.div>

        {/* Tarifs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="bg-white p-5"
          style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
              >
                <Euro className="w-4 h-4" style={{ color: "#1f3a33" }} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#9c9484" }}>
                  Section · Tarification
                </div>
                <h3
                  className="text-[15px] font-semibold tracking-[-0.01em] m-0"
                  style={{ color: "#1f1f1d" }}
                >
                  Tarifs
                </h3>
              </div>
            </div>
            <Link
              href="/dashboard/services"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-colors flex-shrink-0"
              style={{ background: "#fcfaf4", color: "#1f3a33", border: "1px solid #ece9e1" }}
            >
              <Settings className="w-3 h-3" />
              Gérer
            </Link>
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
            className="fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-opacity hover:opacity-90"
            style={{ background: "#1f3a33", color: "#f7f5ef" }}
            aria-label="Remonter en haut de page"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
