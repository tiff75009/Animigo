"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  Camera,
  Save,
  X,
  Dog,
  Cat,
  Bird,
  Rabbit,
  Fish,
  MapPin,
  Clock,
  Euro,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Image as ImageIcon,
  Upload,
  Loader2,
  Star,
  ShieldAlert,
  ShieldCheck,
  Info,
  Sparkles,
  Pencil,
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { PriceRecommendation } from "./components/PriceRecommendation";

// Types d'animaux disponibles
const ANIMAL_TYPES = [
  { id: "chien", label: "Chien", icon: Dog },
  { id: "chat", label: "Chat", icon: Cat },
  { id: "oiseau", label: "Oiseau", icon: Bird },
  { id: "rongeur", label: "Rongeur", icon: Rabbit },
  { id: "poisson", label: "Poisson", icon: Fish },
  { id: "reptile", label: "Reptile", icon: Star },
  { id: "nac", label: "NAC", icon: Star },
];

// Catégories par défaut (fallback si pas encore chargées)
const DEFAULT_CATEGORIES = [
  { slug: "garde", name: "Garde", icon: "🏠" },
  { slug: "autre", name: "Autre", icon: "✨" },
];

// Unités de prix
const PRICE_UNITS = [
  { id: "hour", label: "/ heure" },
  { id: "day", label: "/ jour" },
  { id: "week", label: "/ semaine" },
  { id: "month", label: "/ mois" },
  { id: "flat", label: "forfait" },
];

interface OwnedAnimal {
  type: string;
  name: string;
  breed?: string;
  age?: number;
}

interface ServiceFormData {
  category: string;
  name: string;
  description: string;
  price: number;
  priceUnit: "hour" | "day" | "week" | "month" | "flat";
  duration: number;
  animalTypes: string[];
}

export default function ServicesPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "services" | "photos">("profile");
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<Id<"services"> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Queries
  const profileData = useQuery(
    api.services.profile.getProfile,
    token ? { token } : "skip"
  );
  const services = useQuery(
    api.services.services.getMyServices,
    token ? { token } : "skip"
  );
  const photos = useQuery(
    api.services.photos.getMyPhotos,
    token ? { token } : "skip"
  );

  // Catégories de services (depuis le panel admin)
  const categoriesData = useQuery(api.admin.serviceCategories.getActiveCategories, {});
  const serviceCategories = categoriesData?.length ? categoriesData : DEFAULT_CATEGORIES;

  // Mutations
  const upsertProfile = useMutation(api.services.profile.upsertProfile);
  const addService = useMutation(api.services.services.addService);
  const updateService = useMutation(api.services.services.updateService);
  const deleteService = useMutation(api.services.services.deleteService);
  const generateUploadUrl = useMutation(api.services.photos.generateUploadUrl);
  const savePhoto = useMutation(api.services.photos.savePhoto);
  const deletePhoto = useMutation(api.services.photos.deletePhoto);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    bio: "",
    description: "",
    experience: "",
    availability: "",
    location: "",
    radius: 10,
    acceptedAnimals: [] as string[],
    hasGarden: false,
    hasVehicle: false,
    ownedAnimals: [] as OwnedAnimal[],
  });

  // State for adding new owned animal
  const [newAnimal, setNewAnimal] = useState<OwnedAnimal>({
    type: "chien",
    name: "",
    breed: "",
    age: undefined,
  });
  const [isAddingAnimal, setIsAddingAnimal] = useState(false);

  // Service form state
  const [serviceForm, setServiceForm] = useState<ServiceFormData>({
    category: "garde",
    name: "",
    description: "",
    price: 0,
    priceUnit: "hour",
    duration: 60,
    animalTypes: [],
  });

  // Initialize profile form when data loads
  useState(() => {
    if (profileData?.profile) {
      setProfileForm({
        bio: profileData.profile.bio || "",
        description: profileData.profile.description || "",
        experience: profileData.profile.experience || "",
        availability: profileData.profile.availability || "",
        location: profileData.profile.location || "",
        radius: profileData.profile.radius || 10,
        acceptedAnimals: profileData.profile.acceptedAnimals || [],
        hasGarden: profileData.profile.hasGarden || false,
        hasVehicle: profileData.profile.hasVehicle || false,
        ownedAnimals: profileData.profile.ownedAnimals || [],
      });
    }
  });

  // Add owned animal
  const handleAddOwnedAnimal = () => {
    if (!newAnimal.name.trim()) return;
    setProfileForm({
      ...profileForm,
      ownedAnimals: [...profileForm.ownedAnimals, { ...newAnimal }],
    });
    setNewAnimal({ type: "chien", name: "", breed: "", age: undefined });
    setIsAddingAnimal(false);
  };

  // Remove owned animal
  const handleRemoveOwnedAnimal = (index: number) => {
    setProfileForm({
      ...profileForm,
      ownedAnimals: profileForm.ownedAnimals.filter((_, i) => i !== index),
    });
  };

  // Save profile
  const handleSaveProfile = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      await upsertProfile({
        token,
        ...profileForm,
      });
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Add service
  const handleAddService = async () => {
    if (!token) return;
    setIsSaving(true);
    setContentError(null);
    setSuccessMessage(null);
    try {
      const result = await addService({
        token,
        category: serviceForm.category,
        name: serviceForm.name,
        description: serviceForm.description || undefined,
        price: serviceForm.price * 100, // Convert to cents
        priceUnit: serviceForm.priceUnit,
        duration: serviceForm.duration || undefined,
        animalTypes: serviceForm.animalTypes,
      });

      if (result.requiresModeration) {
        setSuccessMessage(result.message || "Service soumis à modération");
      }

      setIsAddingService(false);
      setServiceForm({
        category: "garde",
        name: "",
        description: "",
        price: 0,
        priceUnit: "hour",
        duration: 60,
        animalTypes: [],
      });
    } catch (error: unknown) {
      console.error("Erreur:", error);
      if (error && typeof error === "object" && "data" in error) {
        const convexError = error as { data?: string };
        setContentError(convexError.data || "Une erreur est survenue");
      } else if (error instanceof Error) {
        setContentError(error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Delete service
  const handleDeleteService = async (serviceId: Id<"services">) => {
    if (!token || !confirm("Supprimer ce service ?")) return;
    try {
      await deleteService({ token, serviceId });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  // Toggle service active
  const handleToggleService = async (serviceId: Id<"services">, isActive: boolean) => {
    if (!token) return;
    try {
      await updateService({ token, serviceId, isActive: !isActive });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  // Edit service - populate form and open
  const handleEditService = (service: {
    id: Id<"services">;
    category: string;
    name: string;
    description?: string;
    price: number;
    priceUnit: "hour" | "day" | "week" | "month" | "flat";
    animalTypes: string[];
  }) => {
    setEditingServiceId(service.id);
    setServiceForm({
      category: service.category,
      name: service.name,
      description: service.description || "",
      price: service.price / 100, // Convert from cents to euros
      priceUnit: service.priceUnit,
      duration: 60,
      animalTypes: service.animalTypes,
    });
    setIsAddingService(true);
    setContentError(null);
  };

  // Save edited service
  const handleSaveEditedService = async () => {
    if (!token || !editingServiceId) return;
    setIsSaving(true);
    setContentError(null);
    setSuccessMessage(null);
    try {
      await updateService({
        token,
        serviceId: editingServiceId,
        category: serviceForm.category,
        name: serviceForm.name,
        description: serviceForm.description || undefined,
        price: serviceForm.price * 100, // Convert to cents
        priceUnit: serviceForm.priceUnit,
        animalTypes: serviceForm.animalTypes,
      });

      setIsAddingService(false);
      setEditingServiceId(null);
      setServiceForm({
        category: "garde",
        name: "",
        description: "",
        price: 0,
        priceUnit: "hour",
        duration: 60,
        animalTypes: [],
      });
      setSuccessMessage("Service modifié avec succès");
    } catch (error: unknown) {
      console.error("Erreur:", error);
      if (error && typeof error === "object" && "data" in error) {
        const convexError = error as { data?: string };
        setContentError(convexError.data || "Une erreur est survenue");
      } else if (error instanceof Error) {
        setContentError(error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    try {
      const uploadUrl = await generateUploadUrl({ token });
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await savePhoto({ token, storageId });
    } catch (error) {
      console.error("Erreur upload:", error);
    }
  };

  // Delete photo
  const handleDeletePhoto = async (photoId: Id<"photos">) => {
    if (!token || !confirm("Supprimer cette photo ?")) return;
    try {
      await deletePhoto({ token, photoId });
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2).replace(".", ",");
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-primary" />
          Mes services
        </h1>
        <p className="text-text-light mt-2">
          Gérez votre profil, vos services et vos photos
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-foreground/10 pb-4">
        {[
          { id: "profile", label: "Profil", icon: Edit2 },
          { id: "services", label: "Services & Tarifs", icon: Euro },
          { id: "photos", label: "Photos", icon: Camera },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-white"
                : "text-text-light hover:bg-primary/10"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Bio */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-foreground/5">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Présentation
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Titre / Accroche
                  </label>
                  <input
                    type="text"
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, bio: e.target.value })
                    }
                    placeholder="Ex: Pet-sitter passionné avec 5 ans d'expérience"
                    className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    maxLength={150}
                  />
                  <p className="text-xs text-text-light mt-1">
                    {profileForm.bio.length}/150 caractères
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Description détaillée
                  </label>
                  <textarea
                    value={profileForm.description}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, description: e.target.value })
                    }
                    placeholder="Décrivez votre expérience, votre approche avec les animaux, vos spécialités..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Expérience & Formations
                  </label>
                  <textarea
                    value={profileForm.experience}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, experience: e.target.value })
                    }
                    placeholder="Vos formations, certifications, années d'expérience..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Location & Availability */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-foreground/5">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Localisation & Disponibilités
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Ville / Zone
                  </label>
                  <input
                    type="text"
                    value={profileForm.location}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, location: e.target.value })
                    }
                    placeholder="Ex: Paris 15ème"
                    className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Rayon d&apos;intervention (km)
                  </label>
                  <input
                    type="number"
                    value={profileForm.radius}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, radius: Number(e.target.value) })
                    }
                    min={1}
                    max={100}
                    className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Disponibilités
                  </label>
                  <textarea
                    value={profileForm.availability}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, availability: e.target.value })
                    }
                    placeholder="Ex: Disponible en semaine de 9h à 18h, week-ends sur demande..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Animals & Equipment */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-foreground/5">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Animaux acceptés & Équipements
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Types d&apos;animaux
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ANIMAL_TYPES.map((animal) => (
                      <button
                        key={animal.id}
                        type="button"
                        onClick={() => {
                          const newAnimals = profileForm.acceptedAnimals.includes(animal.id)
                            ? profileForm.acceptedAnimals.filter((a) => a !== animal.id)
                            : [...profileForm.acceptedAnimals, animal.id];
                          setProfileForm({ ...profileForm, acceptedAnimals: newAnimals });
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          profileForm.acceptedAnimals.includes(animal.id)
                            ? "bg-primary text-white"
                            : "bg-foreground/5 text-foreground hover:bg-foreground/10"
                        }`}
                      >
                        <animal.icon className="w-4 h-4" />
                        {animal.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileForm.hasGarden}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, hasGarden: e.target.checked })
                      }
                      className="w-5 h-5 rounded border-foreground/20 text-primary focus:ring-primary"
                    />
                    <span className="text-foreground">J&apos;ai un jardin</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profileForm.hasVehicle}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, hasVehicle: e.target.checked })
                      }
                      className="w-5 h-5 rounded border-foreground/20 text-primary focus:ring-primary"
                    />
                    <span className="text-foreground">J&apos;ai un véhicule</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Mes animaux */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-foreground/5">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Mes animaux
              </h2>
              <p className="text-sm text-text-light mb-4">
                Indiquez si vous avez vos propres animaux. Cela rassure les utilisateurs de savoir que vous êtes vous-même propriétaire.
              </p>

              {/* Liste des animaux */}
              <div className="space-y-3 mb-4">
                {profileForm.ownedAnimals.map((animal, index) => {
                  const animalType = ANIMAL_TYPES.find((a) => a.id === animal.type);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-primary/5 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          {animalType && <animalType.icon className="w-5 h-5 text-primary" />}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{animal.name}</p>
                          <p className="text-sm text-text-light">
                            {animalType?.label}
                            {animal.breed && ` - ${animal.breed}`}
                            {animal.age && ` - ${animal.age} an${animal.age > 1 ? "s" : ""}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveOwnedAnimal(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}

                {profileForm.ownedAnimals.length === 0 && !isAddingAnimal && (
                  <p className="text-center text-text-light py-4">
                    Vous n&apos;avez pas encore ajouté d&apos;animaux
                  </p>
                )}
              </div>

              {/* Formulaire d'ajout */}
              <AnimatePresence>
                {isAddingAnimal && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 border border-primary/20 rounded-xl mb-4 space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Type d&apos;animal
                        </label>
                        <select
                          value={newAnimal.type}
                          onChange={(e) =>
                            setNewAnimal({ ...newAnimal, type: e.target.value })
                          }
                          className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                          {ANIMAL_TYPES.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Nom
                        </label>
                        <input
                          type="text"
                          value={newAnimal.name}
                          onChange={(e) =>
                            setNewAnimal({ ...newAnimal, name: e.target.value })
                          }
                          placeholder="Ex: Max"
                          className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Race (optionnel)
                        </label>
                        <input
                          type="text"
                          value={newAnimal.breed || ""}
                          onChange={(e) =>
                            setNewAnimal({ ...newAnimal, breed: e.target.value })
                          }
                          placeholder="Ex: Labrador"
                          className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Âge (optionnel)
                        </label>
                        <input
                          type="number"
                          value={newAnimal.age || ""}
                          onChange={(e) =>
                            setNewAnimal({
                              ...newAnimal,
                              age: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          placeholder="En années"
                          min={0}
                          max={30}
                          className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddOwnedAnimal}
                        disabled={!newAnimal.name.trim()}
                        className="flex-1 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Ajouter
                      </button>
                      <button
                        onClick={() => setIsAddingAnimal(false)}
                        className="px-4 py-3 bg-foreground/5 text-foreground font-semibold rounded-xl hover:bg-foreground/10"
                      >
                        Annuler
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isAddingAnimal && (
                <button
                  onClick={() => setIsAddingAnimal(true)}
                  className="w-full py-3 border-2 border-dashed border-primary/30 text-primary font-semibold rounded-xl hover:bg-primary/5 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter un animal
                </button>
              )}
            </div>

            {/* Save Button */}
            <motion.button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Enregistrer le profil
            </motion.button>
          </motion.div>
        )}

        {/* Services Tab */}
        {activeTab === "services" && (
          <motion.div
            key="services"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Success Message */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4"
              >
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Service en attente de modération</p>
                    <p className="text-sm text-amber-600 mt-1">{successMessage}</p>
                  </div>
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className="ml-auto text-amber-400 hover:text-amber-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Add Service Button */}
            {!isAddingService && (
              <motion.button
                onClick={() => setIsAddingService(true)}
                className="w-full py-4 border-2 border-dashed border-primary/30 text-primary font-semibold rounded-xl hover:bg-primary/5 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-5 h-5" />
                Ajouter un service
              </motion.button>
            )}

            {/* Add Service Form */}
            <AnimatePresence>
              {isAddingService && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-primary/20"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      {editingServiceId ? "Modifier le service" : "Nouveau service"}
                    </h3>
                    <button
                      onClick={() => {
                        setIsAddingService(false);
                        setEditingServiceId(null);
                        setContentError(null);
                        setServiceForm({
                          category: "garde",
                          name: "",
                          description: "",
                          price: 0,
                          priceUnit: "hour",
                          duration: 60,
                          animalTypes: [],
                        });
                      }}
                      className="p-2 hover:bg-foreground/5 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content Error Alert */}
                  {contentError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">Contenu non autorisé</p>
                          <p className="text-sm text-red-600 mt-1">{contentError}</p>
                          <p className="text-xs text-red-500 mt-2">
                            Les numéros de téléphone et adresses email ne sont pas autorisés dans les annonces.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Info about moderation */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mb-4">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Info className="w-4 h-4" />
                      <span>Les numéros de téléphone et emails sont interdits et peuvent entraîner une modération.</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Catégorie */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Catégorie
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {serviceCategories.map((cat) => (
                          <button
                            key={cat.slug}
                            type="button"
                            onClick={() =>
                              setServiceForm({ ...serviceForm, category: cat.slug })
                            }
                            className={`flex flex-col items-center gap-1 p-3 rounded-xl text-sm font-medium transition-all ${
                              serviceForm.category === cat.slug
                                ? "bg-primary text-white shadow-lg shadow-primary/30"
                                : "bg-foreground/5 text-foreground hover:bg-foreground/10"
                            }`}
                          >
                            <span className="text-xl">{cat.icon}</span>
                            <span className="text-xs">{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Nom du service
                      </label>
                      <input
                        type="text"
                        value={serviceForm.name}
                        onChange={(e) =>
                          setServiceForm({ ...serviceForm, name: e.target.value })
                        }
                        placeholder="Ex: Garde à domicile"
                        className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Description
                      </label>
                      <textarea
                        value={serviceForm.description}
                        onChange={(e) =>
                          setServiceForm({ ...serviceForm, description: e.target.value })
                        }
                        placeholder="Décrivez ce service..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Prix (€)
                        </label>
                        <input
                          type="number"
                          value={serviceForm.price}
                          onChange={(e) =>
                            setServiceForm({ ...serviceForm, price: Number(e.target.value) })
                          }
                          min={0}
                          step={0.5}
                          className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Unité
                        </label>
                        <select
                          value={serviceForm.priceUnit}
                          onChange={(e) =>
                            setServiceForm({
                              ...serviceForm,
                              priceUnit: e.target.value as ServiceFormData["priceUnit"],
                            })
                          }
                          className="w-full px-4 py-3 rounded-xl border border-foreground/10 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                          {PRICE_UNITS.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Prix conseillé */}
                    {token && serviceForm.category && (
                      <PriceRecommendation
                        token={token}
                        category={serviceForm.category}
                        priceUnit={serviceForm.priceUnit}
                        currentPrice={serviceForm.price * 100}
                        onSelectPrice={(priceInCents) =>
                          setServiceForm({ ...serviceForm, price: priceInCents / 100 })
                        }
                      />
                    )}

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Animaux acceptés pour ce service
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {ANIMAL_TYPES.map((animal) => (
                          <button
                            key={animal.id}
                            type="button"
                            onClick={() => {
                              const newAnimals = serviceForm.animalTypes.includes(animal.id)
                                ? serviceForm.animalTypes.filter((a) => a !== animal.id)
                                : [...serviceForm.animalTypes, animal.id];
                              setServiceForm({ ...serviceForm, animalTypes: newAnimals });
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              serviceForm.animalTypes.includes(animal.id)
                                ? "bg-primary text-white"
                                : "bg-foreground/5 text-foreground hover:bg-foreground/10"
                            }`}
                          >
                            <animal.icon className="w-4 h-4" />
                            {animal.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={editingServiceId ? handleSaveEditedService : handleAddService}
                      disabled={!serviceForm.category || !serviceForm.name || serviceForm.price <= 0 || isSaving}
                      className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : editingServiceId ? (
                        <Save className="w-5 h-5" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                      {editingServiceId ? "Enregistrer les modifications" : "Ajouter le service"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Services List */}
            <div className="space-y-4">
              {services?.map((service) => (
                <motion.div
                  key={service.id}
                  layout
                  className={`bg-white rounded-2xl p-6 shadow-sm border ${
                    service.isActive ? "border-foreground/5" : "border-red-200 bg-red-50/50"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Category badge */}
                        {service.category && (
                          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full flex items-center gap-1">
                            <span>{serviceCategories.find(c => c.slug === service.category)?.icon}</span>
                            {serviceCategories.find(c => c.slug === service.category)?.name || service.category}
                          </span>
                        )}
                        <h3 className="text-lg font-semibold text-foreground">
                          {service.name}
                        </h3>
                        {/* Moderation status badge */}
                        {service.moderationStatus === "pending" && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-xs rounded-full flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            En modération
                          </span>
                        )}
                        {service.moderationStatus === "rejected" && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Rejeté
                          </span>
                        )}
                        {!service.isActive && service.moderationStatus !== "pending" && service.moderationStatus !== "rejected" && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                            Désactivé
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-text-light mt-1">{service.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {service.animalTypes.map((animal) => {
                          const animalInfo = ANIMAL_TYPES.find((a) => a.id === animal);
                          return (
                            <span
                              key={animal}
                              className="px-2 py-1 bg-foreground/5 rounded-full text-xs text-foreground"
                            >
                              {animalInfo?.label || animal}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {formatPrice(service.price)}€
                      </p>
                      <p className="text-sm text-text-light">
                        {PRICE_UNITS.find((u) => u.id === service.priceUnit)?.label}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-foreground/5">
                    {/* Modifier */}
                    <button
                      onClick={() => handleEditService(service)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Modifier
                    </button>
                    {/* Sponsoriser */}
                    <button
                      onClick={() => {
                        // TODO: Implémenter la fonctionnalité de sponsorisation
                        alert("Fonctionnalité à venir !");
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 hover:from-amber-200 hover:to-yellow-200 transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      Sponsoriser
                    </button>
                    {/* Activer/Désactiver */}
                    <button
                      onClick={() => handleToggleService(service.id, service.isActive)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        service.isActive
                          ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                          : "bg-green-100 text-green-600 hover:bg-green-200"
                      }`}
                    >
                      {service.isActive ? (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          Désactiver
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Activer
                        </>
                      )}
                    </button>
                    {/* Supprimer */}
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                </motion.div>
              ))}

              {services?.length === 0 && !isAddingService && (
                <div className="text-center py-12 text-text-light">
                  <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Vous n&apos;avez pas encore de services</p>
                  <p className="text-sm">Ajoutez votre premier service pour commencer</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Photos Tab */}
        {activeTab === "photos" && (
          <motion.div
            key="photos"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Upload Zone */}
            <label className="block cursor-pointer">
              <div className="w-full py-12 border-2 border-dashed border-primary/30 rounded-2xl hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">
                    Cliquez pour ajouter des photos
                  </p>
                  <p className="text-sm text-text-light">
                    JPG, PNG jusqu&apos;à 5 Mo
                  </p>
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>

            {/* Photos Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos?.map((photo) => (
                <motion.div
                  key={photo.id}
                  layout
                  className="relative aspect-square rounded-xl overflow-hidden group"
                >
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt={photo.title || "Photo"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-foreground/5 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-foreground/20" />
                    </div>
                  )}
                  {photo.isProfilePhoto && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-white text-xs rounded-full">
                      Photo de profil
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {photos?.length === 0 && (
                <div className="col-span-full text-center py-12 text-text-light">
                  <Camera className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Aucune photo</p>
                  <p className="text-sm">
                    Ajoutez des photos de vos prestations
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
