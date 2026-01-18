"use client";

import { motion } from "framer-motion";
import { Save, Loader2, CheckCircle } from "lucide-react";
import ProfileBioSection from "../profile/ProfileBioSection";
import LocationSection from "../profile/LocationSection";
import AcceptedAnimalsSection from "../profile/AcceptedAnimalsSection";
import OwnedAnimalsSection, { OwnedAnimal } from "../profile/OwnedAnimalsSection";
import { containerVariants, itemVariants } from "@/app/lib/animations";

export interface ProfileFormData {
  bio: string;
  description: string;
  experience: string;
  availability: string;
  location: string;
  radius: number;
  // Localisation structurée (Google Maps)
  postalCode?: string;
  city?: string;
  department?: string;
  region?: string;
  coordinates?: { lat: number; lng: number };
  googlePlaceId?: string;
  acceptedAnimals: string[];
  hasGarden: boolean;
  hasVehicle: boolean;
  ownedAnimals: OwnedAnimal[];
}

interface ProfileTabProps {
  profileForm: ProfileFormData;
  onProfileChange: (updates: Partial<ProfileFormData>) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  successMessage?: string | null;
}

export default function ProfileTab({
  profileForm,
  onProfileChange,
  onSave,
  isSaving,
  successMessage,
}: ProfileTabProps) {
  const handleAddOwnedAnimal = (animal: OwnedAnimal) => {
    onProfileChange({
      ownedAnimals: [...profileForm.ownedAnimals, animal],
    });
  };

  const handleRemoveOwnedAnimal = (index: number) => {
    onProfileChange({
      ownedAnimals: profileForm.ownedAnimals.filter((_, i) => i !== index),
    });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Success Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-secondary/10 border border-secondary/20 rounded-xl"
        >
          <CheckCircle className="w-5 h-5 text-secondary" />
          <p className="text-secondary font-medium">{successMessage}</p>
        </motion.div>
      )}

      {/* Bio Section */}
      <motion.div variants={itemVariants}>
        <ProfileBioSection
          bio={profileForm.bio}
          description={profileForm.description}
          experience={profileForm.experience}
          onBioChange={(bio) => onProfileChange({ bio })}
          onDescriptionChange={(description) => onProfileChange({ description })}
          onExperienceChange={(experience) => onProfileChange({ experience })}
        />
      </motion.div>

      {/* Location Section */}
      <motion.div variants={itemVariants}>
        <LocationSection
          location={profileForm.location}
          radius={profileForm.radius}
          availability={profileForm.availability}
          city={profileForm.city}
          postalCode={profileForm.postalCode}
          department={profileForm.department}
          region={profileForm.region}
          coordinates={profileForm.coordinates}
          onLocationChange={(location) => onProfileChange({ location })}
          onLocationDataChange={(data) => onProfileChange(data)}
          onRadiusChange={(radius) => onProfileChange({ radius })}
          onAvailabilityChange={(availability) => onProfileChange({ availability })}
        />
      </motion.div>

      {/* Accepted Animals Section */}
      <motion.div variants={itemVariants}>
        <AcceptedAnimalsSection
          acceptedAnimals={profileForm.acceptedAnimals}
          hasGarden={profileForm.hasGarden}
          hasVehicle={profileForm.hasVehicle}
          onAcceptedAnimalsChange={(acceptedAnimals) => onProfileChange({ acceptedAnimals })}
          onHasGardenChange={(hasGarden) => onProfileChange({ hasGarden })}
          onHasVehicleChange={(hasVehicle) => onProfileChange({ hasVehicle })}
        />
      </motion.div>

      {/* Owned Animals Section */}
      <motion.div variants={itemVariants}>
        <OwnedAnimalsSection
          ownedAnimals={profileForm.ownedAnimals}
          onAdd={handleAddOwnedAnimal}
          onRemove={handleRemoveOwnedAnimal}
        />
      </motion.div>

      {/* Save Button */}
      <motion.div variants={itemVariants}>
        <motion.button
          onClick={onSave}
          disabled={isSaving}
          className="w-full py-4 bg-primary text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          whileHover={{ scale: isSaving ? 1 : 1.01 }}
          whileTap={{ scale: isSaving ? 1 : 0.99 }}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Enregistrer le profil
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
