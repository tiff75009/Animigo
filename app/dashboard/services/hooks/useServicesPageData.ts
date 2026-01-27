"use client";

import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useCallback, useEffect, useRef } from "react";

// Types
export interface OwnedAnimal {
  type: string;
  name: string;
  breed?: string;
  age?: number;
}

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
  // Nombre max d'animaux par créneau
  maxAnimalsPerSlot?: number;
}

export interface ServiceFormData {
  category: string;
  animalTypes: string[];
}

export interface ServiceCategory {
  slug: string;
  name: string;
  icon?: string;
  parentCategoryId?: Id<"serviceCategories">;
  parentName?: string;
  isParent?: boolean;
  billingType?: "hourly" | "daily" | "flexible";
  allowedPriceUnits?: ("hour" | "half_day" | "day" | "week" | "month")[];
  defaultVariants?: Array<{
    name: string;
    description?: string;
    suggestedDuration?: number;
    includedFeatures?: string[];
  }>;
  allowCustomVariants?: boolean;
  allowRangeBooking?: boolean;
  allowOvernightStay?: boolean;
  isCapacityBased?: boolean; // Mode garde (propagé depuis le parent)
  // Type de catégorie (hérité du parent pour les prestations)
  typeId?: string | null;
  typeName?: string | null;
  typeIcon?: string | null;
  typeColor?: string | null;
  // Configuration tarification avancée
  announcerPriceMode?: "manual" | "automatic";
  displayPriceUnit?: "hour" | "half_day" | "day" | "week" | "month";
  clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day";
  hourlyBillingSurchargePercent?: number;
  defaultNightlyPrice?: number;
}

export interface CategoryType {
  id: string;
  slug: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

// Structure hiérarchique retournée par getActiveCategories
interface CategoriesData {
  parentCategories: Array<{
    id: Id<"serviceCategories">;
    slug: string;
    name: string;
    icon?: string;
    isParent: boolean;
    typeId?: string | null;
    typeName?: string | null;
    typeIcon?: string | null;
    typeColor?: string | null;
    subcategories: ServiceCategory[];
  }>;
  rootCategories: ServiceCategory[];
  categoryTypes: CategoryType[];
}

const DEFAULT_CATEGORIES: ServiceCategory[] = [
  { slug: "garde", name: "Garde", icon: "🏠" },
  { slug: "autre", name: "Autre", icon: "✨" },
];

// Type for services - on utilise any pour éviter les problèmes de types avec Convex
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceData = any[] | undefined;

export function useServicesPageData(token: string | undefined) {
  // Local states
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Convex client pour les requêtes manuelles
  const convex = useConvex();

  // État local pour les services (permet le refetch manuel)
  const [localServices, setLocalServices] = useState<ServiceData | undefined>(undefined);
  const isRefetchingRef = useRef(false);

  // Queries Convex (subscriptions)
  const profileData = useQuery(
    api.services.profile.getProfile,
    token ? { token } : "skip"
  );

  const servicesSubscription = useQuery(
    api.services.services.getMyServices,
    token ? { token } : "skip"
  );

  const photos = useQuery(
    api.services.photos.getMyPhotos,
    token ? { token } : "skip"
  );

  const categoriesData = useQuery(api.admin.serviceCategories.getActiveCategories, {}) as CategoriesData | undefined;

  // Synchroniser localServices avec la subscription Convex
  // Mais seulement si on n'est pas en train de refetch manuellement
  useEffect(() => {
    if (servicesSubscription !== undefined && !isRefetchingRef.current) {
      setLocalServices(servicesSubscription);
    }
  }, [servicesSubscription]);

  // Fonction de refetch manuel
  const refetchServices = useCallback(async () => {
    if (!token) return;

    isRefetchingRef.current = true;

    try {
      // Attendre un peu que Convex commit la transaction
      await new Promise(resolve => setTimeout(resolve, 100));

      // Faire une requête directe (pas de subscription)
      const freshServices = await convex.query(api.services.services.getMyServices, { token });

      if (freshServices) {
        setLocalServices(freshServices);
      }
    } catch (err) {
      console.error("Erreur refetch services:", err);
    } finally {
      // Réactiver la sync avec la subscription après un délai
      setTimeout(() => {
        isRefetchingRef.current = false;
      }, 500);
    }
  }, [token, convex]);

  // Utiliser localServices comme source de données
  const services = localServices;

  // Extraire toutes les sous-catégories (les seules sélectionnables pour les services)
  const categories: ServiceCategory[] = (() => {
    if (!categoriesData) return DEFAULT_CATEGORIES;

    const allCategories: ServiceCategory[] = [];

    // Ajouter les sous-catégories de chaque parent
    categoriesData.parentCategories.forEach((parent) => {
      parent.subcategories.forEach((sub) => {
        allCategories.push({
          ...sub,
          parentName: parent.name,
          // Type hérité du parent (déjà inclus dans sub depuis le backend)
          typeId: sub.typeId || parent.typeId,
          typeName: sub.typeName || parent.typeName,
          typeIcon: sub.typeIcon || parent.typeIcon,
          typeColor: sub.typeColor || parent.typeColor,
        });
      });
    });

    // Ajouter les catégories racine (sans parent)
    categoriesData.rootCategories.forEach((cat) => {
      allCategories.push(cat);
    });

    return allCategories.length > 0 ? allCategories : DEFAULT_CATEGORIES;
  })();

  // Liste des types de catégories
  const categoryTypes: CategoryType[] = categoriesData?.categoryTypes || [];

  // Données hiérarchiques pour l'affichage groupé
  const categoriesHierarchy = categoriesData;

  // Mutations
  const upsertProfileMutation = useMutation(api.services.profile.upsertProfile);
  const addServiceMutation = useMutation(api.services.services.addService);
  const updateServiceMutation = useMutation(api.services.services.updateService);
  const deleteServiceMutation = useMutation(api.services.services.deleteService);
  const generateUploadUrlMutation = useMutation(api.services.photos.generateUploadUrl);
  const savePhotoMutation = useMutation(api.services.photos.savePhoto);
  const deletePhotoMutation = useMutation(api.services.photos.deletePhoto);

  // Clear handlers
  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccessMessage(null), []);

  // Profile actions
  const saveProfile = useCallback(async (data: ProfileFormData) => {
    if (!token) return;
    setIsSaving(true);
    setError(null);
    try {
      await upsertProfileMutation({ token, ...data });
      setSuccessMessage("Profil enregistré avec succès");
    } catch (err) {
      console.error("Erreur:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  }, [token, upsertProfileMutation]);

  // Service actions
  const addService = useCallback(async (data: {
    category: string;
    animalTypes: string[];
    serviceLocation?: "announcer_home" | "client_home" | "both";
    // Garde de nuit
    allowOvernightStay?: boolean;
    dayStartTime?: string;
    dayEndTime?: string;
    overnightPrice?: number;
    // Chiens catégorisés
    dogCategoryAcceptance?: "none" | "cat1" | "cat2" | "both";
    initialVariants: Array<{
      name: string;
      description?: string;
      price: number;
      priceUnit: "hour" | "half_day" | "day" | "week" | "month" | "flat";
      // Multi-tarification
      pricing?: {
        hourly?: number;
        halfDaily?: number;
        daily?: number;
        weekly?: number;
        monthly?: number;
        nightly?: number;
      };
      duration?: number;
      includedFeatures?: string[];
    }>;
    initialOptions?: Array<{
      name: string;
      description?: string;
      price: number;
      priceType: "flat" | "per_day" | "per_unit";
      unitLabel?: string;
      maxQuantity?: number;
    }>;
  }) => {
    if (!token) return false;
    setIsSaving(true);
    setError(null);
    try {
      await addServiceMutation({
        token,
        category: data.category,
        animalTypes: data.animalTypes,
        serviceLocation: data.serviceLocation,
        allowOvernightStay: data.allowOvernightStay,
        dayStartTime: data.dayStartTime,
        dayEndTime: data.dayEndTime,
        overnightPrice: data.overnightPrice,
        dogCategoryAcceptance: data.dogCategoryAcceptance,
        initialVariants: data.initialVariants,
        initialOptions: data.initialOptions?.length ? data.initialOptions : undefined,
      });

      setSuccessMessage("Service créé avec succès");

      // Refetch manuel pour s'assurer que le nouveau service apparaît
      await refetchServices();

      return true;
    } catch (err) {
      console.error("Erreur:", err);
      if (err && typeof err === "object" && "data" in err) {
        setError((err as { data?: string }).data || "Erreur lors de la création");
      } else {
        setError(err instanceof Error ? err.message : "Erreur lors de la création");
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [token, addServiceMutation, refetchServices]);

  const updateService = useCallback(async (
    serviceId: Id<"services">,
    data: Partial<ServiceFormData & { isActive: boolean }>
  ) => {
    if (!token) return;
    setIsSaving(true);
    try {
      await updateServiceMutation({
        token,
        serviceId,
        ...data,
      });
    } catch (err) {
      console.error("Erreur:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setIsSaving(false);
    }
  }, [token, updateServiceMutation]);

  const deleteService = useCallback(async (serviceId: Id<"services">) => {
    if (!token) return;
    try {
      await deleteServiceMutation({ token, serviceId });
    } catch (err) {
      console.error("Erreur:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  }, [token, deleteServiceMutation]);

  const toggleService = useCallback(async (serviceId: Id<"services">, isActive: boolean) => {
    if (!token) return;
    try {
      await updateServiceMutation({ token, serviceId, isActive: !isActive });
    } catch (err) {
      console.error("Erreur:", err);
    }
  }, [token, updateServiceMutation]);

  // Photo actions
  const uploadPhoto = useCallback(async (file: File) => {
    if (!token) return;
    setIsSaving(true);
    try {
      const uploadUrl = await generateUploadUrlMutation({ token });
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await savePhotoMutation({
        token,
        storageId,
        title: file.name,
      });
    } catch (err) {
      console.error("Erreur:", err);
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setIsSaving(false);
    }
  }, [token, generateUploadUrlMutation, savePhotoMutation]);

  const deletePhoto = useCallback(async (photoId: Id<"photos">) => {
    if (!token) return;
    try {
      await deletePhotoMutation({ token, photoId });
    } catch (err) {
      console.error("Erreur:", err);
    }
  }, [token, deletePhotoMutation]);

  return {
    // Data
    profileData,
    services,
    photos,
    categories,
    categoriesHierarchy,
    categoryTypes,

    // Loading states
    isLoading: !profileData && !services && !photos,
    isSaving,

    // Messages
    error,
    successMessage,
    clearError,
    clearSuccess,

    // Actions
    saveProfile,
    addService,
    updateService,
    deleteService,
    toggleService,
    uploadPhoto,
    deletePhoto,

    // Manual refetch
    refetchServices,
  };
}
