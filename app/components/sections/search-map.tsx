"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Search,
  MapPin,
  Star,
  CheckCircle,
  Clock,
  Filter,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import {
  mockSitters,
  serviceTypes,
  filterSitters,
  type ServiceType,
  type SitterLocation,
} from "@/app/lib/search-data";

// Dynamically import the map component to avoid SSR issues
const MapComponent = dynamic(() => import("./map-component"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-text-light">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

// Sitter Card Component
function SitterCard({
  sitter,
  isSelected,
  onClick,
}: {
  sitter: SitterLocation;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      className={cn(
        "bg-white rounded-2xl p-4 shadow-md cursor-pointer transition-all",
        isSelected
          ? "ring-2 ring-primary shadow-lg"
          : "hover:shadow-lg"
      )}
      onClick={onClick}
      whileHover={{ y: -2 }}
      layout
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
          <Image
            src={sitter.profileImage}
            alt={`${sitter.firstName} ${sitter.lastName}`}
            fill
            className="object-cover"
          />
          {sitter.verified && (
            <div className="absolute -bottom-1 -right-1 bg-secondary text-white p-1 rounded-full">
              <CheckCircle className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-foreground truncate">
              {sitter.firstName} {sitter.lastName.charAt(0)}.
            </h4>
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="font-semibold">{sitter.rating}</span>
              <span className="text-text-light">({sitter.reviewCount})</span>
            </div>
          </div>

          <p className="text-sm text-text-light flex items-center gap-1 mb-2">
            <MapPin className="w-3 h-3" />
            {sitter.location}
          </p>

          {/* Services */}
          <div className="flex flex-wrap gap-1 mb-2">
            {sitter.services.slice(0, 3).map((service) => {
              const info = serviceTypes.find((s) => s.id === service);
              return (
                <span
                  key={service}
                  className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                >
                  {info?.emoji} {info?.label}
                </span>
              );
            })}
            {sitter.services.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-text-light text-xs rounded-full">
                +{sitter.services.length - 3}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-text-light">
              <Clock className="w-3 h-3" />
              <span>Répond en {sitter.responseTime}</span>
            </div>
            <p className="font-bold text-primary">
              {sitter.hourlyRate}€<span className="font-normal text-text-light">/h</span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Service Filter Button
function ServiceButton({
  service,
  isSelected,
  onClick,
}: {
  service: (typeof serviceTypes)[0];
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap",
        isSelected
          ? "bg-primary text-white shadow-md"
          : "bg-white text-foreground hover:bg-primary/10 border border-foreground/10"
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span>{service.emoji}</span>
      <span>{service.label}</span>
    </motion.button>
  );
}

export function SearchMapSection() {
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedServices, setSelectedServices] = useState<ServiceType[]>([]);
  const [filteredSitters, setFilteredSitters] = useState<SitterLocation[]>(mockSitters);
  const [selectedSitter, setSelectedSitter] = useState<SitterLocation | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [minRating, setMinRating] = useState<number>(0);

  // Update filtered sitters when filters change
  useEffect(() => {
    const filtered = filterSitters(mockSitters, {
      services: selectedServices,
      location: locationSearch,
      verifiedOnly,
      availableOnly,
      minRating: minRating > 0 ? minRating : undefined,
    });
    setFilteredSitters(filtered);
  }, [locationSearch, selectedServices, verifiedOnly, availableOnly, minRating]);

  const toggleService = (serviceId: ServiceType) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((s) => s !== serviceId)
        : [...prev, serviceId]
    );
  };

  const clearFilters = () => {
    setLocationSearch("");
    setSelectedServices([]);
    setVerifiedOnly(false);
    setAvailableOnly(true);
    setMinRating(0);
  };

  const hasActiveFilters =
    locationSearch !== "" ||
    selectedServices.length > 0 ||
    verifiedOnly ||
    !availableOnly ||
    minRating > 0;

  return (
    <section id="recherche" className="pt-32 pb-20 bg-gradient-to-b from-primary/5 via-background to-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl opacity-20 animate-float">🐕</div>
        <div className="absolute top-40 right-20 text-5xl opacity-20 animate-float" style={{ animationDelay: "0.5s" }}>🐈</div>
        <div className="absolute bottom-40 left-20 text-4xl opacity-20 animate-float" style={{ animationDelay: "1s" }}>🐰</div>
        <div className="absolute bottom-20 right-10 text-5xl opacity-20 animate-float" style={{ animationDelay: "1.5s" }}>🦜</div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-block mb-4"
          >
            <span className="text-6xl">🐾</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            Trouvez le <span className="text-primary">garde idéal</span>
            <br />près de chez vous
          </h1>
          <p className="text-text-light text-lg md:text-xl max-w-2xl mx-auto">
            Recherchez par localisation et type de service pour trouver le professionnel
            parfait pour votre compagnon
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="max-w-3xl mx-auto mb-8"
        >
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par ville, arrondissement..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="w-full pl-12 pr-32 py-4 rounded-2xl border border-foreground/10 bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <motion.button
                className="p-2 text-text-light hover:text-foreground transition-colors"
                onClick={() => setShowFilters(!showFilters)}
                whileTap={{ scale: 0.95 }}
              >
                <Filter className="w-5 h-5" />
              </motion.button>
              <motion.button
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-semibold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Search className="w-4 h-4" />
                Rechercher
              </motion.button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-white rounded-2xl shadow-lg border border-foreground/10"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-foreground">Filtres avancés</h4>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Réinitialiser
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Verified filter */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-foreground/20 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">Gardes vérifiés uniquement</span>
                </label>

                {/* Available filter */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(e) => setAvailableOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-foreground/20 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">Disponibles maintenant</span>
                </label>

                {/* Rating filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground">Note minimum:</span>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="px-3 py-1 rounded-lg border border-foreground/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value={0}>Toutes</option>
                    <option value={4}>4+ ⭐</option>
                    <option value={4.5}>4.5+ ⭐</option>
                    <option value={4.8}>4.8+ ⭐</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Service Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {serviceTypes.map((service) => (
              <ServiceButton
                key={service.id}
                service={service}
                isSelected={selectedServices.includes(service.id)}
                onClick={() => toggleService(service.id)}
              />
            ))}
          </div>
        </motion.div>

        {/* Results count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-6"
        >
          <p className="text-text-light">
            <span className="font-semibold text-foreground">{filteredSitters.length}</span>{" "}
            garde{filteredSitters.length > 1 ? "s" : ""} trouvé{filteredSitters.length > 1 ? "s" : ""}
            {hasActiveFilters && " avec vos critères"}
          </p>
        </motion.div>

        {/* Map and Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Sitter List */}
          <div className="order-2 lg:order-1">
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              {filteredSitters.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center shadow-md">
                  <div className="text-5xl mb-4">🔍</div>
                  <h4 className="font-semibold text-foreground mb-2">
                    Aucun résultat
                  </h4>
                  <p className="text-text-light mb-4">
                    Essayez de modifier vos critères de recherche
                  </p>
                  <motion.button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-primary text-white rounded-xl font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Réinitialiser les filtres
                  </motion.button>
                </div>
              ) : (
                filteredSitters.map((sitter) => (
                  <SitterCard
                    key={sitter.id}
                    sitter={sitter}
                    isSelected={selectedSitter?.id === sitter.id}
                    onClick={() => setSelectedSitter(sitter)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Map */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-[400px] lg:h-[600px] sticky top-4">
              <MapComponent
                sitters={filteredSitters}
                selectedSitter={selectedSitter}
                onSitterSelect={setSelectedSitter}
              />
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-10"
        >
          <p className="text-text-light mb-4">
            Vous êtes un professionnel de la garde d&apos;animaux ?
          </p>
          <motion.button
            className="px-6 py-3 bg-secondary text-white rounded-xl font-semibold"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Rejoignez notre communauté
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
