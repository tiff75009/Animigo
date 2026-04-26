"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";

export interface AnnouncerPreviewData {
  id: string;
  firstName: string;
  lastName: string;
  username?: string;
  profileImage?: string | null;
  isDisplayingLogo?: boolean;
  location: string;
  city?: string | null;
  postalCode?: string | null;
  rating: number;
  reviewCount: number;
  verified: boolean;
  sapApproved: boolean;
  statusType: "particulier" | "micro_entrepreneur" | "professionnel";
}

/**
 * Récupère les données de l'annonceur connecté pour alimenter
 * l'aperçu live d'une carte formule (mêmes champs que ceux affichés
 * sur la page /recherche).
 */
export function useAnnouncerPreviewData(): {
  announcer: AnnouncerPreviewData | null;
  isLoading: boolean;
} {
  const { user, isLoading: authLoading } = useAuth();

  const announcerData = useQuery(
    api.public.search.getAnnouncerById,
    user?.id ? { announcerId: user.id as Id<"users"> } : "skip"
  );

  if (authLoading || !user) {
    return { announcer: null, isLoading: true };
  }

  if (announcerData === undefined) {
    return { announcer: null, isLoading: true };
  }

  if (!announcerData) {
    // Fallback minimal depuis useAuth si la query échoue
    return {
      announcer: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        profileImage: null,
        isDisplayingLogo: false,
        location: "",
        city: null,
        postalCode: null,
        rating: 0,
        reviewCount: 0,
        verified: false,
        sapApproved: false,
        statusType:
          user.accountType === "annonceur_pro"
            ? user.companyType === "micro_enterprise"
              ? "micro_entrepreneur"
              : "professionnel"
            : "particulier",
      },
      isLoading: false,
    };
  }

  return {
    announcer: {
      id: String(announcerData.id),
      firstName: announcerData.firstName,
      lastName: announcerData.lastName,
      username: announcerData.username ?? undefined,
      profileImage: announcerData.profileImage,
      isDisplayingLogo: announcerData.isDisplayingLogo,
      location: announcerData.location,
      city: announcerData.city,
      postalCode: announcerData.postalCode,
      rating: 0, // Pas encore calculé via cette query — placeholder
      reviewCount: 0,
      verified: false, // À enrichir si une query "verified" est disponible
      sapApproved: false,
      statusType: announcerData.statusType,
    },
    isLoading: false,
  };
}
