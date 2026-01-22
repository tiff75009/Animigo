"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { useCloudinary } from "@/app/hooks/useCloudinary";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Camera,
  Upload,
  X,
  Loader2,
  PawPrint,
  Heart,
  Sparkles,
  AlertCircle,
  Plus,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";

// Types d'animaux
const ANIMAL_TYPES = [
  { id: "chien", name: "Chien", emoji: "🐕" },
  { id: "chat", name: "Chat", emoji: "🐱" },
  { id: "oiseau", name: "Oiseau", emoji: "🐦" },
  { id: "rongeur", name: "Rongeur", emoji: "🐹" },
  { id: "poisson", name: "Poisson", emoji: "🐠" },
  { id: "reptile", name: "Reptile", emoji: "🦎" },
  { id: "nac", name: "NAC", emoji: "🐾" },
];

// Tailles
const SIZES = [
  { id: "petit", name: "Petit", description: "Moins de 10 kg" },
  { id: "moyen", name: "Moyen", description: "10 - 25 kg" },
  { id: "grand", name: "Grand", description: "25 - 45 kg" },
  { id: "tres_grand", name: "Très grand", description: "Plus de 45 kg" },
];

// Traits de comportement
const BEHAVIOR_TRAITS = [
  "Joueur",
  "Calme",
  "Énergique",
  "Affectueux",
  "Indépendant",
  "Sociable",
  "Timide",
  "Curieux",
  "Protecteur",
  "Gourmand",
];

// Étapes du formulaire
const STEPS = [
  { id: 1, title: "Identité", description: "Qui est votre compagnon ?" },
  { id: 2, title: "Apparence", description: "À quoi ressemble-t-il ?" },
  { id: 3, title: "Personnalité", description: "Comment se comporte-t-il ?" },
  { id: 4, title: "Santé", description: "Informations de santé" },
];

interface FormData {
  name: string;
  type: string;
  gender: "male" | "female" | "unknown";
  birthDate: string;
  breed: string;
  weight: string;
  size: string;
  description: string;
  profilePhoto: string;
  galleryPhotos: string[];
  goodWithChildren: boolean | null;
  goodWithDogs: boolean | null;
  goodWithCats: boolean | null;
  goodWithOtherAnimals: boolean | null;
  behaviorTraits: string[];
  hasAllergies: boolean;
  allergiesDetails: string;
  medicalConditions: string;
  specialNeeds: string;
}

export default function NewAnimalPage() {
  const router = useRouter();
  const { user } = useAuth();
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const { isConfigured, uploadState, uploadImage, uploadImages } = useCloudinary();
  const createAnimal = useMutation(api.animals.createAnimal);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "",
    gender: "unknown",
    birthDate: "",
    breed: "",
    weight: "",
    size: "",
    description: "",
    profilePhoto: "",
    galleryPhotos: [],
    goodWithChildren: null,
    goodWithDogs: null,
    goodWithCats: null,
    goodWithOtherAnimals: null,
    behaviorTraits: [],
    hasAllergies: false,
    allergiesDetails: "",
    medicalConditions: "",
    specialNeeds: "",
  });

  // Calculer l'âge à partir de la date de naissance
  const calculateAge = (birthDate: string): string => {
    if (!birthDate) return "";
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();

    if (years === 0) {
      if (months <= 0) return "Moins d'un mois";
      return `${months} mois`;
    }
    if (years === 1 && months < 0) {
      return `${12 + months} mois`;
    }
    if (years < 2) {
      return `${years} an${months > 0 ? ` et ${months} mois` : ""}`;
    }
    return `${years} ans`;
  };

  // Gestion de l'upload de photo de profil
  const handleProfilePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!isConfigured) {
        setError("Cloudinary n'est pas configuré. Contactez l'administrateur.");
        return;
      }

      const url = await uploadImage(file, "animigo/animals/profiles");
      if (url) {
        setFormData((prev) => ({ ...prev, profilePhoto: url }));
      }
    },
    [isConfigured, uploadImage]
  );

  // Gestion de l'upload de galerie
  const handleGalleryUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      if (!isConfigured) {
        setError("Cloudinary n'est pas configuré. Contactez l'administrateur.");
        return;
      }

      const urls = await uploadImages(files, "animigo/animals/gallery");
      if (urls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          galleryPhotos: [...prev.galleryPhotos, ...urls],
        }));
      }
    },
    [isConfigured, uploadImages]
  );

  // Supprimer une photo de la galerie
  const removeGalleryPhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      galleryPhotos: prev.galleryPhotos.filter((_, i) => i !== index),
    }));
  };

  // Toggle un trait de comportement
  const toggleBehaviorTrait = (trait: string) => {
    setFormData((prev) => ({
      ...prev,
      behaviorTraits: prev.behaviorTraits.includes(trait)
        ? prev.behaviorTraits.filter((t) => t !== trait)
        : [...prev.behaviorTraits, trait],
    }));
  };

  // Validation de l'étape courante
  const validateCurrentStep = (): boolean => {
    setError(null);

    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setError("Le nom de votre animal est requis");
        return false;
      }
      if (!formData.type) {
        setError("Veuillez sélectionner le type d'animal");
        return false;
      }
      if (!formData.gender) {
        setError("Veuillez indiquer le sexe de votre animal");
        return false;
      }
    }

    return true;
  };

  // Navigation
  const goToNextStep = () => {
    if (validateCurrentStep() && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Soumission du formulaire
  const handleSubmit = async () => {
    if (!token) {
      setError("Vous devez être connecté");
      return;
    }

    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createAnimal({
        token,
        name: formData.name.trim(),
        type: formData.type,
        gender: formData.gender,
        birthDate: formData.birthDate || undefined,
        breed: formData.breed.trim() || undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        size: formData.size || undefined,
        description: formData.description.trim() || undefined,
        profilePhoto: formData.profilePhoto || undefined,
        galleryPhotos: formData.galleryPhotos.length > 0 ? formData.galleryPhotos : undefined,
        goodWithChildren: formData.goodWithChildren ?? undefined,
        goodWithDogs: formData.goodWithDogs ?? undefined,
        goodWithCats: formData.goodWithCats ?? undefined,
        goodWithOtherAnimals: formData.goodWithOtherAnimals ?? undefined,
        behaviorTraits: formData.behaviorTraits.length > 0 ? formData.behaviorTraits : undefined,
        hasAllergies: formData.hasAllergies || undefined,
        allergiesDetails: formData.allergiesDetails.trim() || undefined,
        medicalConditions: formData.medicalConditions.trim() || undefined,
        specialNeeds: formData.specialNeeds.trim() || undefined,
      });

      router.push("/client/mes-animaux?success=created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Composant de sélection Oui/Non/Inconnu
  const YesNoSelect = ({
    value,
    onChange,
    label,
  }: {
    value: boolean | null;
    onChange: (val: boolean | null) => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        {[
          { val: true, label: "Oui", color: "bg-green-500" },
          { val: false, label: "Non", color: "bg-red-500" },
          { val: null, label: "Je ne sais pas", color: "bg-gray-400" },
        ].map((option) => (
          <button
            key={String(option.val)}
            type="button"
            onClick={() => onChange(option.val)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              value === option.val
                ? `${option.color} text-white shadow-md`
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/client/mes-animaux"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </Link>

        <div className="flex items-center gap-2">
          <PawPrint className="w-5 h-5 text-primary" />
          <span className="font-semibold text-gray-900">Nouveau compagnon</span>
        </div>

        <div className="w-20" />
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: currentStep >= step.id ? "#FF6B6B" : "#E5E7EB",
                  scale: currentStep === step.id ? 1.1 : 1,
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  currentStep >= step.id ? "text-white" : "text-gray-400"
                }`}
              >
                {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
              </motion.div>
              {index < STEPS.length - 1 && (
                <div className="w-8 sm:w-16 h-1 mx-1">
                  <motion.div
                    initial={false}
                    animate={{
                      scaleX: currentStep > step.id ? 1 : 0,
                    }}
                    className="h-full bg-primary origin-left"
                    style={{ transformOrigin: "left" }}
                  />
                  <div className="h-full bg-gray-200 -mt-1" />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="text-center mt-4">
          <h2 className="text-xl font-bold text-gray-900">{STEPS[currentStep - 1].title}</h2>
          <p className="text-sm text-gray-500">{STEPS[currentStep - 1].description}</p>
        </div>
      </div>

      {/* Form Content */}
      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            {/* Step 1: Identité */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment s'appelle-t-il ? <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Max, Luna, Félix..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-lg"
                    maxLength={50}
                  />
                </div>

                {/* Type d'animal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Quel type d'animal ? <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {ANIMAL_TYPES.map((type) => (
                      <motion.button
                        key={type.id}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setFormData({ ...formData, type: type.id })}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                          formData.type === type.id
                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                        }`}
                      >
                        <span className="text-2xl">{type.emoji}</span>
                        <span className="text-xs font-medium">{type.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Sexe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Sexe <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    {[
                      { id: "male", label: "Mâle", icon: "♂️" },
                      { id: "female", label: "Femelle", icon: "♀️" },
                      { id: "unknown", label: "Inconnu", icon: "❓" },
                    ].map((sex) => (
                      <motion.button
                        key={sex.id}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() =>
                          setFormData({ ...formData, gender: sex.id as "male" | "female" | "unknown" })
                        }
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                          formData.gender === sex.id
                            ? "bg-primary text-white shadow-md"
                            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <span>{sex.icon}</span>
                        <span>{sex.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Date de naissance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de naissance
                    {formData.birthDate && (
                      <span className="ml-2 text-primary font-normal">
                        ({calculateAge(formData.birthDate)})
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>

                {/* Race */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Race / Espèce
                  </label>
                  <input
                    type="text"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                    placeholder="Ex: Labrador, Persan, Canari..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Apparence */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Photo de profil */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Photo de profil
                  </label>
                  <div className="flex flex-col items-center">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="relative w-40 h-40 rounded-full overflow-hidden bg-gray-100 border-4 border-dashed border-gray-300 cursor-pointer group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {formData.profilePhoto ? (
                        <>
                          <img
                            src={formData.profilePhoto}
                            alt="Photo de profil"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="w-8 h-8 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                          {uploadState.isUploading ? (
                            <Loader2 className="w-10 h-10 animate-spin" />
                          ) : (
                            <>
                              <Camera className="w-10 h-10 mb-2" />
                              <span className="text-sm">Ajouter une photo</span>
                            </>
                          )}
                        </div>
                      )}
                    </motion.div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePhotoUpload}
                      className="hidden"
                    />
                    {formData.profilePhoto && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, profilePhoto: "" })}
                        className="mt-2 text-sm text-red-500 hover:text-red-600"
                      >
                        Supprimer la photo
                      </button>
                    )}
                  </div>
                </div>

                {/* Poids et Taille */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Poids (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      placeholder="Ex: 12.5"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Taille
                    </label>
                    <select
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-white"
                    >
                      <option value="">Sélectionner</option>
                      {SIZES.map((size) => (
                        <option key={size.id} value={size.id}>
                          {size.name} ({size.description})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Décrivez votre animal en quelques mots..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                  />
                </div>

                {/* Galerie photos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Galerie photos <span className="text-gray-400">(optionnel)</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {formData.galleryPhotos.map((photo, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative aspect-square rounded-xl overflow-hidden group"
                      >
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeGalleryPhoto(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => galleryInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors"
                    >
                      {uploadState.isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-6 h-6" />
                          <span className="text-xs mt-1">Ajouter</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Personnalité */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Compatibilité */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Heart className="w-5 h-5 text-primary" />
                    <span>Compatibilité</span>
                  </div>

                  <YesNoSelect
                    value={formData.goodWithChildren}
                    onChange={(val) => setFormData({ ...formData, goodWithChildren: val })}
                    label="S'entend bien avec les enfants ?"
                  />

                  {(formData.type === "chien" || formData.type === "") && (
                    <YesNoSelect
                      value={formData.goodWithDogs}
                      onChange={(val) => setFormData({ ...formData, goodWithDogs: val })}
                      label="S'entend bien avec les autres chiens ?"
                    />
                  )}

                  {(formData.type === "chat" || formData.type === "") && (
                    <YesNoSelect
                      value={formData.goodWithCats}
                      onChange={(val) => setFormData({ ...formData, goodWithCats: val })}
                      label="S'entend bien avec les autres chats ?"
                    />
                  )}

                  <YesNoSelect
                    value={formData.goodWithOtherAnimals}
                    onChange={(val) => setFormData({ ...formData, goodWithOtherAnimals: val })}
                    label="S'entend bien avec les autres animaux ?"
                  />
                </div>

                {/* Traits de caractère */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <Sparkles className="w-5 h-5 text-secondary" />
                    <span>Caractère</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Sélectionnez les traits qui correspondent à votre animal
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {BEHAVIOR_TRAITS.map((trait) => (
                      <motion.button
                        key={trait}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleBehaviorTrait(trait)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          formData.behaviorTraits.includes(trait)
                            ? "bg-secondary text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {trait}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Santé */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {/* Allergies */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Votre animal a-t-il des allergies ?
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          hasAllergies: !formData.hasAllergies,
                          allergiesDetails: formData.hasAllergies ? "" : formData.allergiesDetails,
                        })
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        formData.hasAllergies ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <motion.div
                        initial={false}
                        animate={{ x: formData.hasAllergies ? 24 : 0 }}
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
                      />
                    </button>
                  </div>
                  {formData.hasAllergies && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <textarea
                        value={formData.allergiesDetails}
                        onChange={(e) =>
                          setFormData({ ...formData, allergiesDetails: e.target.value })
                        }
                        placeholder="Décrivez les allergies..."
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Conditions médicales */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conditions médicales <span className="text-gray-400">(optionnel)</span>
                  </label>
                  <textarea
                    value={formData.medicalConditions}
                    onChange={(e) =>
                      setFormData({ ...formData, medicalConditions: e.target.value })
                    }
                    placeholder="Maladies chroniques, traitements en cours..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                  />
                </div>

                {/* Besoins spéciaux */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Besoins particuliers <span className="text-gray-400">(optionnel)</span>
                  </label>
                  <textarea
                    value={formData.specialNeeds}
                    onChange={(e) => setFormData({ ...formData, specialNeeds: e.target.value })}
                    placeholder="Régime alimentaire spécial, besoins de médication..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                  />
                </div>

                {/* Récapitulatif */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    {formData.profilePhoto ? (
                      <img
                        src={formData.profilePhoto}
                        alt={formData.name}
                        className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-3xl shadow-lg">
                        {ANIMAL_TYPES.find((t) => t.id === formData.type)?.emoji || "🐾"}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{formData.name || "Votre animal"}</h3>
                      <p className="text-sm text-gray-600">
                        {ANIMAL_TYPES.find((t) => t.id === formData.type)?.name}
                        {formData.breed && ` • ${formData.breed}`}
                        {formData.birthDate && ` • ${calculateAge(formData.birthDate)}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Vérifiez les informations et cliquez sur &quot;Créer le profil&quot; pour enregistrer votre compagnon !
                  </p>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Erreur */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Cloudinary non configuré */}
        {!isConfigured && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <p className="text-yellow-700 text-sm">
              L'upload de photos n'est pas disponible. Contactez l'administrateur pour configurer Cloudinary.
            </p>
          </motion.div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4">
        {currentStep > 1 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={goToPrevStep}
            className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Précédent
          </motion.button>
        )}

        {currentStep < STEPS.length ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={goToNextStep}
            className="flex-1 py-3 px-6 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors"
          >
            Suivant
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Créer le profil
              </>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}
