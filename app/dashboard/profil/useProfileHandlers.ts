"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export function useProfileHandlers(token: string | null) {
  const upsertProfile = useMutation(api.services.profile.upsertProfile);

  const update = useCallback(
    async (fields: Record<string, unknown>) => {
      if (!token) throw new Error("Non authentifié");
      await upsertProfile({ token, ...fields } as any);
    },
    [token, upsertProfile]
  );

  return {
    upsertProfile: update,

    updateDescription: useCallback(
      (description: string) => update({ description: description || null }),
      [update]
    ),

    updateLocation: useCallback(
      (data: {
        location: string;
        city?: string;
        postalCode?: string;
        department?: string;
        region?: string;
        coordinates?: { lat: number; lng: number };
        googlePlaceId?: string;
      }) =>
        update({
          location: data.location || null,
          city: data.city || null,
          postalCode: data.postalCode || null,
          department: data.department || null,
          region: data.region || null,
          coordinates: data.coordinates || null,
          googlePlaceId: data.googlePlaceId || null,
        }),
      [update]
    ),

    uploadAvatar: useCallback(
      (url: string) => update({ profileImageUrl: url }),
      [update]
    ),

    removeAvatar: useCallback(
      () => update({ profileImageUrl: null }),
      [update]
    ),

    uploadCover: useCallback(
      (url: string) => update({ coverImageUrl: url }),
      [update]
    ),

    removeCover: useCallback(
      () => update({ coverImageUrl: null }),
      [update]
    ),

    updateRadius: useCallback(
      (radius: number) => update({ radius }),
      [update]
    ),

    updateAcceptedAnimals: useCallback(
      (acceptedAnimals: string[]) => update({ acceptedAnimals }),
      [update]
    ),

    updateHasVehicle: useCallback(
      (hasVehicle: boolean) => update({ hasVehicle }),
      [update]
    ),

    updateMaxAnimals: useCallback(
      (maxAnimalsPerSlot: number) => update({ maxAnimalsPerSlot }),
      [update]
    ),

    updateHousingType: useCallback(
      (housingType: "house" | "apartment") => update({ housingType }),
      [update]
    ),

    updateHousingSize: useCallback(
      (housingSize: number) => update({ housingSize }),
      [update]
    ),

    updateGardenSize: useCallback(
      (gardenSize: string | null) =>
        gardenSize === null
          ? update({ hasGarden: false, gardenSize: null })
          : update({ hasGarden: true, gardenSize }),
      [update]
    ),

    updateIsSmoker: useCallback(
      (isSmoker: boolean) => update({ isSmoker }),
      [update]
    ),

    updateHasChildren: useCallback(
      (hasChildren: boolean, childrenAges?: string[]) =>
        hasChildren && childrenAges
          ? update({ hasChildren, childrenAges })
          : update({ hasChildren: false, childrenAges: null }),
      [update]
    ),

    updateChildrenAges: useCallback(
      (childrenAges: string[]) => update({ childrenAges }),
      [update]
    ),

    updateProvidesFood: useCallback(
      (providesFood: boolean) => update({ providesFood }),
      [update]
    ),

    updateOwnedAnimals: useCallback(
      (ownedAnimals: Array<{ type: string; name: string; breed?: string; age?: number }>) =>
        update({ ownedAnimals: ownedAnimals.length > 0 ? ownedAnimals : null }),
      [update]
    ),

    updateSelectedActivities: useCallback(
      (selectedActivities: Array<{ activityId: Id<"activities">; customDescription?: string }>) =>
        update({ selectedActivities: selectedActivities.length > 0 ? selectedActivities : null }),
      [update]
    ),

    updateEnvironmentPhotos: useCallback(
      (environmentPhotos: Array<{ id: string; url: string; caption?: string }>) =>
        update({ environmentPhotos: environmentPhotos.length > 0 ? environmentPhotos : null }),
      [update]
    ),

    updateIcad: useCallback(
      (icadRegistered: boolean) => update({ icadRegistered }),
      [update]
    ),
  };
}
