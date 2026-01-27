"use client";

import { useAuth } from "@/app/hooks/useAuth";
import { useClientProfile } from "./hooks/useClientProfile";
import {
  ClientProfileHeader,
  ClientLocationSection,
} from "./components";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, UserCircle } from "lucide-react";

export default function ClientProfilePage() {
  const { token, isLoading: authLoading, isAuthenticated } = useAuth();
  const { profile, isLoading, isSaving, error, updateProfile, updateLocation, clearError } = useClientProfile(token);

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-text-light">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <UserCircle className="w-16 h-16 text-text-light mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Connectez-vous pour accéder à votre profil
          </h2>
          <a
            href="/connexion"
            className="text-primary hover:underline font-medium"
          >
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground">Mon profil</h1>
        <p className="text-text-light mt-1">
          Gérez vos informations personnelles
        </p>
      </motion.div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 rounded-xl flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="text-sm text-red-600 hover:underline mt-1"
            >
              Fermer
            </button>
          </div>
        </motion.div>
      )}

      {/* Profile sections */}
      <div className="space-y-6">
        <ClientProfileHeader
          profile={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            profileImageUrl: profile.profileImageUrl,
            coverImageUrl: profile.coverImageUrl,
            location: profile.location,
            city: profile.city,
            postalCode: profile.postalCode,
            description: profile.description,
            createdAt: profile.createdAt,
          }}
          onUploadAvatar={async (url) => { await updateProfile({ profileImageUrl: url }); }}
          onRemoveAvatar={async () => { await updateProfile({ profileImageUrl: null }); }}
          onUploadCover={async (url) => { await updateProfile({ coverImageUrl: url }); }}
          onRemoveCover={async () => { await updateProfile({ coverImageUrl: null }); }}
          onUpdateDescription={async (desc) => { await updateProfile({ description: desc || null }); }}
          onUpdateLocation={async (data) => { await updateLocation(data); }}
        />

        <ClientLocationSection sessionToken={token!} />
      </div>
    </div>
  );
}
