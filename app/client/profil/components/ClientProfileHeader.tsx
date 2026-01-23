"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Camera, MapPin, Calendar } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ClientProfileHeaderProps {
  profile: {
    firstName: string;
    lastName: string;
    profileImageUrl: string | null;
    city: string | null;
    createdAt: number;
  };
  onPhotoClick?: () => void;
  isUploading?: boolean;
}

function ClientProfileHeader({
  profile,
  onPhotoClick,
  isUploading,
}: ClientProfileHeaderProps) {
  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();

  // Formater la date d'inscription
  const memberSince = new Date(profile.createdAt).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-foreground/5"
    >
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Photo de profil */}
        <div className="relative">
          <div
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center overflow-hidden",
              profile.profileImageUrl
                ? "bg-gray-100"
                : "bg-gradient-to-br from-secondary to-secondary/70"
            )}
          >
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-white">{initials}</span>
            )}
          </div>

          {onPhotoClick && (
            <motion.button
              onClick={onPhotoClick}
              disabled={isUploading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "absolute bottom-0 right-0 p-2 rounded-full bg-primary text-white shadow-lg",
                "hover:bg-primary/90 transition-colors",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              <Camera className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Informations */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-bold text-foreground">
            {profile.firstName} {profile.lastName}
          </h2>

          <div className="mt-2 flex flex-col sm:flex-row items-center gap-3 text-sm text-text-light">
            {profile.city && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{profile.city}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-secondary" />
              <span>Membre depuis {memberSince}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(ClientProfileHeader);
