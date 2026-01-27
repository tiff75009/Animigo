"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useCallback } from "react";

interface Coordinates {
  lat: number;
  lng: number;
}

interface ProfileUpdateData {
  profileImageUrl?: string | null;
  coverImageUrl?: string | null;
  description?: string | null;
  location?: string | null;
  city?: string | null;
  postalCode?: string | null;
  coordinates?: Coordinates | null;
  googlePlaceId?: string | null;
}

interface LocationUpdateData {
  location: string;
  city?: string;
  postalCode?: string;
  coordinates?: Coordinates;
  googlePlaceId?: string;
}

export function useClientProfile(token: string | null | undefined) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile = useQuery(
    api.client.profile.getClientProfile,
    token ? { token } : "skip"
  );

  const upsertMutation = useMutation(api.client.profile.upsertClientProfile);
  const updateLocationMutation = useMutation(api.client.profile.updateLocation);

  const updateProfile = useCallback(async (data: ProfileUpdateData) => {
    if (!token) return { success: false };
    setIsSaving(true);
    setError(null);
    try {
      await upsertMutation({ token, ...data });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la sauvegarde";
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }, [token, upsertMutation]);

  const updateLocation = useCallback(async (data: LocationUpdateData) => {
    if (!token) return { success: false };
    setIsSaving(true);
    setError(null);
    try {
      await updateLocationMutation({ token, ...data });
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la sauvegarde";
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }, [token, updateLocationMutation]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    profile,
    isLoading: profile === undefined,
    isSaving,
    error,
    updateProfile,
    updateLocation,
    clearError,
  };
}
