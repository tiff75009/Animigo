"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Star,
  MapPin,
  Shield,
  Heart,
  Share2,
  Clock,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Home,
  Car,
  Trees,
  Dog,
  Cat,
  MessageCircle,
  Phone,
  Award,
  Sparkles,
  Users,
  PawPrint,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

// Données de démonstration - À remplacer par les vraies données
const mockAnnouncer = {
  id: "1",
  firstName: "Marie",
  lastName: "Dupont",
  profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
  coverImage: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200",
  location: "Paris 11e",
  coordinates: { lat: 48.8566, lng: 2.3522 },
  rating: 4.9,
  reviewCount: 127,
  responseTime: "< 1h",
  responseRate: 98,
  verified: true,
  memberSince: "2022",
  statusType: "professionnel" as const,
  bio: `Passionnée par les animaux depuis toujours, j'ai fait de ma passion mon métier ! Avec plus de 5 ans d'expérience dans la garde d'animaux, je m'engage à offrir à vos compagnons tout l'amour et l'attention qu'ils méritent.

Mon domicile est entièrement sécurisé avec un grand jardin clôturé où vos animaux pourront se dépenser en toute liberté. Je suis titulaire de l'ACACED et formée aux premiers secours animaliers.

Chaque animal est unique, c'est pourquoi je prends le temps de connaître ses habitudes et ses besoins pour lui offrir un séjour sur mesure.`,
  languages: ["Français", "Anglais"],
  acceptedAnimals: ["chien", "chat", "rongeur", "oiseau"],
  equipment: {
    hasGarden: true,
    gardenSize: "200m²",
    hasVehicle: true,
    isSmoker: false,
    hasChildren: false,
    hasOwnAnimals: true,
    ownAnimals: [
      { type: "chien", name: "Max", breed: "Golden Retriever" },
    ],
  },
  gallery: [
    "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600",
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600",
    "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600",
    "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600",
    "https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=600",
    "https://images.unsplash.com/photo-1560807707-8cc77767d783?w=600",
  ],
  services: [
    {
      id: "1",
      category: "Garde à domicile",
      icon: "🏠",
      description: "Je garde votre animal chez moi",
      variants: [
        { id: "v1", name: "Journée", price: 25, unit: "jour", duration: "8h-20h" },
        { id: "v2", name: "24h", price: 35, unit: "jour", duration: "Jour et nuit" },
        { id: "v3", name: "Semaine", price: 200, unit: "semaine", duration: "7 jours complets" },
      ],
      options: [
        { id: "o1", name: "Promenade supplémentaire", price: 8 },
        { id: "o2", name: "Administration de médicaments", price: 5 },
      ],
    },
    {
      id: "2",
      category: "Visite à domicile",
      icon: "🚶",
      description: "Je viens chez vous pour m'occuper de votre animal",
      variants: [
        { id: "v3", name: "Visite 30min", price: 12, unit: "visite" },
        { id: "v4", name: "Visite 1h", price: 18, unit: "visite" },
      ],
    },
    {
      id: "3",
      category: "Promenade",
      icon: "🐕",
      description: "Promenades quotidiennes pour votre chien",
      variants: [
        { id: "v5", name: "Promenade 30min", price: 10, unit: "promenade" },
        { id: "v6", name: "Promenade 1h", price: 15, unit: "promenade" },
        { id: "v7", name: "Randonnée 2h", price: 25, unit: "sortie" },
      ],
    },
  ],
  reviews: [
    {
      id: "r1",
      author: "Sophie L.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
      rating: 5,
      date: "Il y a 2 semaines",
      animal: "Luna (chat)",
      content: "Marie est exceptionnelle ! Luna était comme chez elle. Photos et nouvelles tous les jours, je recommande à 100% !",
    },
    {
      id: "r2",
      author: "Thomas B.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
      rating: 5,
      date: "Il y a 1 mois",
      animal: "Rocky (chien)",
      content: "Troisième fois que je confie Rocky à Marie et c'est toujours parfait. Il revient fatigué et heureux de ses promenades !",
    },
    {
      id: "r3",
      author: "Emma D.",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100",
      rating: 4,
      date: "Il y a 2 mois",
      animal: "Milo (chien)",
      content: "Très bonne expérience, Marie est attentionnée et son jardin est parfait pour les chiens. Petit bémol sur la communication mais rien de grave.",
    },
  ],
  availability: {
    nextAvailable: "Demain",
    calendar: [
      { date: "2024-01-15", status: "available" },
      { date: "2024-01-16", status: "available" },
      { date: "2024-01-17", status: "partial" },
      { date: "2024-01-18", status: "unavailable" },
      { date: "2024-01-19", status: "available" },
    ],
  },
};

// Emojis pour les types d'animaux
const animalEmojis: Record<string, string> = {
  chien: "🐕",
  chat: "🐈",
  rongeur: "🐹",
  oiseau: "🦜",
  poisson: "🐠",
  reptile: "🦎",
  nac: "🐾",
};

export default function AnnouncerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"services" | "avis" | "infos">("services");

  // Utiliser les données mock pour le template
  const announcer = mockAnnouncer;

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixe */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline font-medium">Retour aux annonces</span>
          </button>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFavorite(!isFavorite)}
              className={cn(
                "p-2.5 rounded-full transition-colors",
                isFavorite ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="p-2.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Hero Section avec Cover */}
      <section className="pt-16">
        {/* Cover Image */}
        <div className="relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-primary/20 to-secondary/20">
          {announcer.coverImage && (
            <Image
              src={announcer.coverImage}
              alt="Couverture"
              fill
              className="object-cover"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>

        {/* Profile Info Card */}
        <div className="max-w-6xl mx-auto px-4 -mt-20 sm:-mt-24 relative z-10">
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="relative mx-auto sm:mx-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg">
                  {announcer.profileImage ? (
                    <Image
                      src={announcer.profileImage}
                      alt={announcer.firstName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">
                        {announcer.firstName.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                {announcer.verified && (
                  <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md">
                    <div className="bg-secondary rounded-full p-1.5">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                      {announcer.firstName} {announcer.lastName.charAt(0)}.
                    </h1>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-gray-600">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>{announcer.location}</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap justify-center sm:justify-end gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm font-medium",
                      announcer.statusType === "professionnel"
                        ? "bg-blue-50 text-blue-600"
                        : announcer.statusType === "micro_entrepreneur"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-gray-100 text-gray-600"
                    )}>
                      {announcer.statusType === "professionnel" ? "Professionnel" :
                       announcer.statusType === "micro_entrepreneur" ? "Auto-entrepreneur" : "Particulier"}
                    </span>
                    {announcer.verified && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-secondary/10 text-secondary">
                        Profil vérifié
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 mt-4 pt-4 border-t border-gray-100">
                  {/* Rating */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 rounded-lg">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-gray-900">{announcer.rating}</span>
                    </div>
                    <span className="text-sm text-gray-500">({announcer.reviewCount} avis)</span>
                  </div>

                  {/* Response time */}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm">Répond en {announcer.responseTime}</span>
                  </div>

                  {/* Member since */}
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm">Membre depuis {announcer.memberSince}</span>
                  </div>
                </div>

                {/* Accepted animals */}
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
                  <span className="text-sm text-gray-500">Accepte :</span>
                  <div className="flex items-center gap-1">
                    {announcer.acceptedAnimals.map((animal) => (
                      <span
                        key={animal}
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-lg"
                        title={animal}
                      >
                        {animalEmojis[animal] || "🐾"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs - Mobile */}
      <div className="sticky top-16 z-40 bg-white border-b border-gray-200 md:hidden">
        <div className="flex">
          {[
            { id: "services", label: "Prestations", icon: Sparkles },
            { id: "avis", label: "Avis", icon: Star },
            { id: "infos", label: "Infos", icon: Users },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column - Main Content */}
          <div className="md:col-span-2 space-y-6 sm:space-y-8">
            {/* Gallery Section */}
            <section className={cn(activeTab !== "services" && "hidden md:block")}>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="p-2 bg-primary/10 rounded-lg">
                  <PawPrint className="w-5 h-5 text-primary" />
                </span>
                Galerie photos
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {announcer.gallery.slice(0, 6).map((photo, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setGalleryIndex(index)}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden",
                      index === 0 && "col-span-2 row-span-2"
                    )}
                  >
                    <Image
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-300"
                    />
                    {index === 5 && announcer.gallery.length > 6 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          +{announcer.gallery.length - 6}
                        </span>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </section>

            {/* About Section */}
            <section className={cn(activeTab !== "infos" && "hidden md:block")}>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="p-2 bg-secondary/10 rounded-lg">
                  <Users className="w-5 h-5 text-secondary" />
                </span>
                À propos de {announcer.firstName}
              </h2>
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100">
                <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                  {announcer.bio}
                </p>

                {/* Equipment */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-100">
                  {announcer.equipment.hasGarden && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Trees className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Jardin</p>
                        <p className="text-xs text-gray-500">{announcer.equipment.gardenSize}</p>
                      </div>
                    </div>
                  )}
                  {announcer.equipment.hasVehicle && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Car className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Véhicule</p>
                        <p className="text-xs text-gray-500">Disponible</p>
                      </div>
                    </div>
                  )}
                  {announcer.equipment.hasOwnAnimals && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <Dog className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">A un animal</p>
                        <p className="text-xs text-gray-500">{announcer.equipment.ownAnimals[0]?.name}</p>
                      </div>
                    </div>
                  )}
                  {!announcer.equipment.isSmoker && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Non-fumeur</p>
                        <p className="text-xs text-gray-500">Environnement sain</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Services Section */}
            <section className={cn(activeTab !== "services" && "hidden md:block")}>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="p-2 bg-purple/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple" />
                </span>
                Prestations proposées
              </h2>
              <div className="space-y-4">
                {announcer.services.map((service) => (
                  <motion.div
                    key={service.id}
                    layout
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                  >
                    {/* Service Header */}
                    <button
                      onClick={() => setSelectedService(selectedService === service.id ? null : service.id)}
                      className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{service.icon}</span>
                        <div className="text-left">
                          <h3 className="font-semibold text-gray-900">{service.category}</h3>
                          <p className="text-sm text-gray-500">{service.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">
                          À partir de {service.variants[0].price}€
                        </span>
                        <ChevronRight className={cn(
                          "w-5 h-5 text-gray-400 transition-transform",
                          selectedService === service.id && "rotate-90"
                        )} />
                      </div>
                    </button>

                    {/* Service Details */}
                    <AnimatePresence>
                      {selectedService === service.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-gray-100"
                        >
                          <div className="p-4 sm:p-5 space-y-3">
                            {/* Variants */}
                            {service.variants.map((variant) => (
                              <div
                                key={variant.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                              >
                                <div>
                                  <p className="font-medium text-gray-900">{variant.name}</p>
                                  {"duration" in variant && variant.duration && (
                                    <p className="text-sm text-gray-500">{variant.duration}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-primary">{variant.price}€</p>
                                  <p className="text-xs text-gray-500">/{variant.unit}</p>
                                </div>
                              </div>
                            ))}

                            {/* Options */}
                            {service.options && service.options.length > 0 && (
                              <div className="pt-3 border-t border-gray-200">
                                <p className="text-sm font-medium text-gray-500 mb-2">Options disponibles</p>
                                <div className="flex flex-wrap gap-2">
                                  {service.options.map((option) => (
                                    <span
                                      key={option.id}
                                      className="px-3 py-1.5 bg-primary/5 text-primary text-sm font-medium rounded-full"
                                    >
                                      {option.name} (+{option.price}€)
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Reviews Section */}
            <section className={cn(activeTab !== "avis" && "hidden md:block")}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="p-2 bg-amber-50 rounded-lg">
                    <Star className="w-5 h-5 text-amber-500" />
                  </span>
                  Avis ({announcer.reviewCount})
                </h2>
                <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 rounded-full">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-gray-900">{announcer.rating}</span>
                </div>
              </div>

              <div className="space-y-4">
                {announcer.reviews.map((review) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-5 border border-gray-100"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        {review.avatar ? (
                          <Image src={review.avatar} alt={review.author} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                            <span className="text-white font-bold">{review.author.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{review.author}</p>
                            <p className="text-xs text-gray-500">{review.animal} • {review.date}</p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-4 h-4",
                                  i < review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-gray-200 text-gray-200"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-2 text-gray-600 leading-relaxed">{review.content}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Show more reviews button */}
                <button className="w-full py-3 text-primary font-medium hover:bg-primary/5 rounded-xl transition-colors">
                  Voir tous les avis
                </button>
              </div>
            </section>
          </div>

          {/* Right Column - Booking Card (Sticky) */}
          <div className="hidden md:block">
            <div className="sticky top-24">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-primary/5 via-secondary/5 to-purple/5 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">À partir de</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {announcer.services[0].variants[0].price}€
                        <span className="text-sm font-normal text-gray-500">/jour</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-full">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-xs font-medium text-emerald-700">
                        Dispo. {announcer.availability.nextAvailable}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-primary">{announcer.responseRate}%</p>
                      <p className="text-xs text-gray-500">Taux de réponse</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-secondary">{announcer.responseTime}</p>
                      <p className="text-xs text-gray-500">Temps de réponse</p>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  >
                    Réserver maintenant
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contacter
                  </motion.button>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-center text-gray-500">
                    Annulation gratuite jusqu'à 48h avant
                  </p>
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <Shield className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Réservation sécurisée</p>
                    <p className="text-xs text-gray-500">Paiement protégé, assurance incluse</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Floating CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 md:hidden z-40">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-gray-500">À partir de</p>
            <p className="text-xl font-bold text-gray-900">
              {announcer.services[0].variants[0].price}€<span className="text-sm font-normal text-gray-500">/jour</span>
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25"
          >
            Réserver
          </motion.button>
        </div>
      </div>

      {/* Gallery Lightbox */}
      <AnimatePresence>
        {galleryIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setGalleryIndex(null)}
          >
            <button
              onClick={() => setGalleryIndex(null)}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setGalleryIndex(Math.max(0, galleryIndex - 1));
              }}
              className="absolute left-4 p-2 text-white/80 hover:text-white transition-colors"
              disabled={galleryIndex === 0}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            <motion.div
              key={galleryIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-4xl aspect-video mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={announcer.gallery[galleryIndex]}
                alt={`Photo ${galleryIndex + 1}`}
                fill
                className="object-contain"
              />
            </motion.div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setGalleryIndex(Math.min(announcer.gallery.length - 1, galleryIndex + 1));
              }}
              className="absolute right-4 p-2 text-white/80 hover:text-white transition-colors"
              disabled={galleryIndex === announcer.gallery.length - 1}
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
              {galleryIndex + 1} / {announcer.gallery.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer for mobile CTA */}
      <div className="h-24 md:hidden" />
    </div>
  );
}
