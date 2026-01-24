"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuth } from "@/app/hooks/useAuth";

import {
  AnnouncerHero,
  AnnouncerGallery,
  AnnouncerAbout,
  AnnouncerServices,
  AnnouncerReviews,
  AnnouncerBookingCard,
  AnnouncerMobileCTA,
  AnnouncerTabs,
  type TabType,
  type AnnouncerData,
} from "./components";
import { SearchHeader } from "@/app/components/platform";

// Calcul de distance avec la formule de Haversine (en km)
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function AnnouncerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("services");

  // Récupérer le slug de l'annonceur depuis l'URL
  const announcerSlug = params.id as string;

  // Gérer le service sélectionné avec nuqs (categorySlug, synchronisé avec l'URL)
  const [selectedServiceSlug, setSelectedServiceSlug] = useQueryState("service");

  // Récupérer les données de l'annonceur par son slug
  const announcerData = useQuery(
    api.public.announcer.getAnnouncerBySlug,
    { slug: announcerSlug }
  );

  // Récupérer les coordonnées du client connecté (pour calculer la distance)
  const clientLocation = useQuery(
    api.client.profile.getClientCoordinates,
    token ? { token } : "skip"
  );

  // Récupérer le taux de commission basé sur le type d'annonceur
  const commissionData = useQuery(
    api.admin.commissions.getCommissionRate,
    announcerData?.statusType
      ? { announcerType: announcerData.statusType as "particulier" | "micro_entrepreneur" | "professionnel" }
      : "skip"
  );
  const commissionRate = commissionData?.rate ?? 15; // Default 15% for particuliers

  // Calculer la distance entre le client et l'annonceur
  // (doit être avant les early returns pour respecter les règles des hooks)
  const distance = useMemo(() => {
    if (!clientLocation?.coordinates || !announcerData?.coordinates) {
      return undefined;
    }
    return calculateDistance(
      clientLocation.coordinates.lat,
      clientLocation.coordinates.lng,
      announcerData.coordinates.lat,
      announcerData.coordinates.lng
    );
  }, [clientLocation?.coordinates, announcerData?.coordinates]);

  // État de chargement
  if (announcerData === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-gray-500">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  // Annonceur non trouvé
  if (announcerData === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Annonceur introuvable
          </h1>
          <p className="text-gray-500 mb-6">
            Ce profil n&apos;existe pas ou n&apos;est plus disponible.
          </p>
          <button
            onClick={() => router.push("/recherche")}
            className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            Retour à la recherche
          </button>
        </div>
      </div>
    );
  }

  // Transformer les données pour correspondre au type AnnouncerData
  const announcer: AnnouncerData = {
    id: announcerData.id,
    firstName: announcerData.firstName,
    lastName: announcerData.lastName,
    memberSince: announcerData.memberSince,
    verified: announcerData.verified,
    isIdentityVerified: announcerData.isIdentityVerified,
    statusType: announcerData.statusType as "professionnel" | "micro_entrepreneur" | "particulier",
    profileImage: announcerData.profileImage,
    coverImage: announcerData.coverImage,
    bio: announcerData.bio,
    location: announcerData.location,
    coordinates: announcerData.coordinates,
    rating: announcerData.rating,
    reviewCount: announcerData.reviewCount,
    responseTime: announcerData.responseTime,
    responseRate: announcerData.responseRate,
    acceptedAnimals: announcerData.acceptedAnimals,
    equipment: {
      housingType: announcerData.equipment.housingType as "house" | "apartment" | null,
      housingSize: announcerData.equipment.housingSize,
      hasGarden: announcerData.equipment.hasGarden,
      gardenSize: announcerData.equipment.gardenSize,
      hasVehicle: announcerData.equipment.hasVehicle,
      isSmoker: announcerData.equipment.isSmoker,
      hasChildren: announcerData.equipment.hasChildren,
      childrenAges: announcerData.equipment.childrenAges,
      providesFood: announcerData.equipment.providesFood,
    },
    ownAnimals: announcerData.ownAnimals || [],
    icadRegistered: announcerData.icadRegistered,
    gallery: announcerData.gallery,
    services: announcerData.services,
    activities: announcerData.activities,
    reviews: announcerData.reviews,
    availability: {
      nextAvailable: announcerData.availability.nextAvailable,
    },
    radius: announcerData.radius,
  };

  // Trouver le service sélectionné par son categorySlug
  const selectedService = selectedServiceSlug
    ? announcer.services.find((s) => s.categorySlug === selectedServiceSlug || s.categoryId === selectedServiceSlug)
    : null;

  const handleBook = (serviceIdOrSlug?: string, variantId?: string) => {
    const params = new URLSearchParams();
    if (serviceIdOrSlug) params.set("service", serviceIdOrSlug);
    if (variantId) params.set("variant", variantId);
    const queryString = params.toString();
    // Utiliser l'ID de l'annonceur pour la réservation (backend a besoin de l'ID)
    router.push(`/reserver/${announcerData.id}${queryString ? `?${queryString}` : ""}`);
  };

  const handleContact = () => {
    // TODO: Ouvrir la messagerie
    router.push(`/client/messagerie?annonceur=${announcerData.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixe avec recherche */}
      <SearchHeader
        onLocationClick={() => router.push("/recherche")}
        locationText={clientLocation?.city || clientLocation?.location || undefined}
      />

      {/* Hero Section avec Cover et Action Bar */}
      <AnnouncerHero
        announcer={announcer}
        selectedServiceAnimals={selectedService?.animalTypes}
        distance={distance}
        isFavorite={isFavorite}
        onToggleFavorite={() => setIsFavorite(!isFavorite)}
      />

      {/* Navigation Tabs - Mobile */}
      <AnnouncerTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column - Main Content */}
          <div className="md:col-span-2 space-y-6 sm:space-y-8">
            {/* Gallery Section */}
            <AnnouncerGallery
              gallery={announcer.gallery}
              firstName={announcer.firstName}
              className={cn(activeTab !== "services" && "hidden md:block")}
            />

            {/* About Section */}
            <AnnouncerAbout
              announcer={announcer}
              className={cn(activeTab !== "infos" && "hidden md:block")}
            />

            {/* Services Section */}
            <AnnouncerServices
              services={announcer.services}
              initialExpandedService={selectedService?.id ?? null}
              commissionRate={commissionRate}
              onServiceSelect={(serviceId) => {
                // Trouver le categorySlug du service et mettre à jour l'URL
                const service = announcer.services.find((s) => s.id === serviceId);
                setSelectedServiceSlug(service?.categorySlug ?? service?.categoryId ?? null);
              }}
              className={cn(activeTab !== "services" && "hidden md:block")}
            />

            {/* Reviews Section */}
            <AnnouncerReviews
              reviews={announcer.reviews}
              rating={announcer.rating}
              reviewCount={announcer.reviewCount}
              className={cn(activeTab !== "avis" && "hidden md:block")}
            />
          </div>

          {/* Right Column - Booking Card (Sticky) */}
          <div className="hidden md:block">
            <AnnouncerBookingCard
              services={announcer.services}
              responseRate={announcer.responseRate}
              responseTime={announcer.responseTime}
              nextAvailable={announcer.availability.nextAvailable}
              selectedServiceId={selectedService?.id ?? null}
              commissionRate={commissionRate}
              onServiceChange={(serviceId) => {
                // Trouver le categorySlug du service sélectionné et mettre à jour l'URL
                const service = announcer.services.find((s) => s.id === serviceId);
                setSelectedServiceSlug(service?.categorySlug ?? service?.categoryId ?? null);
              }}
              onBook={handleBook}
              onContact={handleContact}
            />
          </div>
        </div>
      </main>

      {/* Mobile Floating CTA */}
      <AnnouncerMobileCTA
        services={announcer.services}
        selectedServiceId={selectedService?.id ?? null}
        commissionRate={commissionRate}
        onBook={handleBook}
      />
    </div>
  );
}
