"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import { cn } from "@/app/lib/utils";

import {
  AnnouncerHeader,
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

export default function AnnouncerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("services");

  // Récupérer l'ID de l'annonceur depuis l'URL
  const announcerId = params.id as Id<"users">;

  // Récupérer les données de l'annonceur depuis Convex
  const announcerData = useQuery(
    api.public.announcer.getAnnouncerProfile,
    { userId: announcerId }
  );

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
    ownAnimals: (announcerData.ownAnimals || []).map((a: {
      id?: string;
      type: string;
      name: string;
      breed?: string | null;
      age?: number | null;
      gender?: "male" | "female" | "unknown" | null;
      weight?: number | null;
      size?: string | null;
      description?: string | null;
      profilePhoto?: string | null;
      galleryPhotos?: string[];
      goodWithChildren?: boolean | null;
      goodWithDogs?: boolean | null;
      goodWithCats?: boolean | null;
      goodWithOtherAnimals?: boolean | null;
      behaviorTraits?: string[];
    }) => ({
      id: a.id,
      type: a.type,
      name: a.name,
      breed: a.breed,
      age: a.age,
      gender: a.gender,
      weight: a.weight,
      size: a.size,
      description: a.description,
      profilePhoto: a.profilePhoto,
      galleryPhotos: a.galleryPhotos || [],
      goodWithChildren: a.goodWithChildren,
      goodWithDogs: a.goodWithDogs,
      goodWithCats: a.goodWithCats,
      goodWithOtherAnimals: a.goodWithOtherAnimals,
      behaviorTraits: a.behaviorTraits || [],
    })),
    icadRegistered: announcerData.icadRegistered,
    gallery: announcerData.gallery,
    services: announcerData.services.map((s: {
      id: string;
      categoryId: string;
      categoryName: string;
      categoryIcon: string;
      description: string;
      animalTypes: string[];
      formules: Array<{
        id: string;
        name: string;
        description: string;
        price: number;
        duration: number;
        unit: string;
      }>;
      options: Array<{
        id: string;
        name: string;
        description: string;
        price: number;
      }>;
    }) => ({
      id: s.id,
      categoryId: s.categoryId,
      categoryName: s.categoryName,
      categoryIcon: s.categoryIcon,
      description: s.description,
      animalTypes: s.animalTypes,
      formules: s.formules.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        price: f.price,
        duration: f.duration,
        unit: f.unit,
      })),
      options: s.options.map((o) => ({
        id: o.id,
        name: o.name,
        description: o.description,
        price: o.price,
      })),
    })),
    activities: announcerData.activities,
    reviews: announcerData.reviews,
    availability: {
      nextAvailable: announcerData.availability.nextAvailable,
    },
    radius: announcerData.radius,
  };

  const handleBook = (serviceId?: string, variantId?: string) => {
    const params = new URLSearchParams();
    if (serviceId) params.set("service", serviceId);
    if (variantId) params.set("variant", variantId);
    const queryString = params.toString();
    router.push(`/reserver/${announcerId}${queryString ? `?${queryString}` : ""}`);
  };

  const handleContact = () => {
    // TODO: Ouvrir la messagerie
    router.push(`/client/messagerie?annonceur=${announcerId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixe */}
      <AnnouncerHeader
        isFavorite={isFavorite}
        onToggleFavorite={() => setIsFavorite(!isFavorite)}
      />

      {/* Hero Section avec Cover */}
      <AnnouncerHero announcer={announcer} />

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
              onBook={handleBook}
              onContact={handleContact}
            />
          </div>
        </div>
      </main>

      {/* Mobile Floating CTA */}
      <AnnouncerMobileCTA services={announcer.services} onBook={handleBook} />
    </div>
  );
}
