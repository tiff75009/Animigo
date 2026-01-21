"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Image from "next/image";
import { Star, CheckCircle, MapPin } from "lucide-react";
import { PARIS_CENTER, serviceTypes, type SitterLocation } from "@/app/lib/search-data";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue - only run on client
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
}

// Check if we're in browser environment
const isBrowser = typeof window !== "undefined";

// Obfuscate coordinates with ~100m random offset for privacy
// Uses a seeded random based on sitter ID for consistency
function obfuscateCoordinates(
  coords: { lat: number; lng: number },
  sitterId: string
): { lat: number; lng: number } {
  // Generate a pseudo-random number based on sitter ID (consistent for same sitter)
  let seed = 0;
  for (let i = 0; i < sitterId.length; i++) {
    seed = ((seed << 5) - seed + sitterId.charCodeAt(i)) | 0;
  }

  // Use the seed to generate consistent random values
  const random1 = Math.abs(Math.sin(seed) * 10000) % 1;
  const random2 = Math.abs(Math.cos(seed) * 10000) % 1;

  // ~100m offset (0.0009 degrees is approximately 100m at mid-latitudes)
  // Random angle and distance between 50m and 150m
  const angle = random1 * 2 * Math.PI;
  const distance = 0.00045 + random2 * 0.0009; // 50m to 150m in degrees

  return {
    lat: coords.lat + distance * Math.cos(angle),
    lng: coords.lng + distance * Math.sin(angle) / Math.cos(coords.lat * Math.PI / 180),
  };
}

// Custom marker icons
const createCustomIcon = (isSelected: boolean, isVerified: boolean) => {
  const color = isSelected ? "#FF6B6B" : isVerified ? "#4ECDC4" : "#6C63FF";
  const size = isSelected ? 40 : 32;

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          font-size: ${isSelected ? '16px' : '14px'};
        ">🐾</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

// Calculate zoom level based on radius in km
function getZoomForRadius(radiusKm: number): number {
  // Approximate zoom levels for different radii
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  if (radiusKm <= 15) return 11.5;
  if (radiusKm <= 20) return 11;
  if (radiusKm <= 30) return 10.5;
  return 10; // 50km+
}

// Map center controller component
function MapController({
  selectedSitter,
  searchCenter,
  searchRadius,
}: {
  selectedSitter: SitterLocation | null;
  searchCenter?: { lat: number; lng: number } | null;
  searchRadius?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedSitter?.coordinates) {
      // Si un sitter est sélectionné, centrer sur lui
      map.flyTo(
        [selectedSitter.coordinates.lat, selectedSitter.coordinates.lng],
        14,
        { duration: 0.5 }
      );
    }
  }, [selectedSitter, map]);

  // Centrer sur la localisation de recherche quand elle change
  useEffect(() => {
    if (searchCenter && !selectedSitter) {
      const zoom = getZoomForRadius(searchRadius ?? 10);
      map.flyTo([searchCenter.lat, searchCenter.lng], zoom, { duration: 0.5 });
    }
  }, [searchCenter, searchRadius, selectedSitter, map]);

  return null;
}

// Helper pour formater le prix
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

// Helper pour extraire la ville
function extractCity(location: string): string {
  const parts = location.split(",").map((p) => p.trim());
  const lastPart = parts[parts.length - 1];
  if (/^\d/.test(lastPart)) {
    const cityMatch = lastPart.match(/\d+\s+(.+)/);
    return cityMatch ? cityMatch[1] : lastPart;
  }
  return lastPart;
}

// Popup content component
function SitterPopup({ sitter }: { sitter: SitterLocation }) {
  // Déterminer le label du badge de statut
  const getStatusLabel = () => {
    switch (sitter.statusType) {
      case "professionnel": return "Pro";
      case "micro_entrepreneur": return "Micro-ent.";
      default: return "Particulier";
    }
  };

  const getStatusColor = () => {
    switch (sitter.statusType) {
      case "professionnel": return "bg-blue-100 text-blue-700";
      case "micro_entrepreneur": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="min-w-[260px] max-w-[300px]">
      {/* Header avec photo et infos */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-primary/20">
          {sitter.profileImage ? (
            <Image
              src={sitter.profileImage}
              alt={sitter.firstName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <span className="text-2xl font-semibold text-primary">
                {sitter.firstName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {sitter.verified && (
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
              <CheckCircle className="w-4 h-4 text-secondary fill-secondary/20" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground text-base truncate">
            {sitter.firstName} {sitter.lastName.charAt(0)}.
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-sm">{sitter.rating.toFixed(1)}</span>
              <span className="text-xs text-text-light">({sitter.reviewCount})</span>
            </div>
            {sitter.statusType && (
              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${getStatusColor()}`}>
                {getStatusLabel()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Localisation et distance */}
      <div className="flex items-center gap-2 text-sm text-text-light mb-3">
        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{extractCity(sitter.location)}</span>
        {sitter.distance !== undefined && (
          <span className="text-primary font-medium whitespace-nowrap">
            • {sitter.distance.toFixed(1)} km
          </span>
        )}
      </div>

      {/* Services */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {sitter.services.slice(0, 4).map((service) => {
          const info = serviceTypes.find((s) => s.id === service);
          return (
            <span
              key={service}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-lg"
            >
              {info?.emoji} {info?.label || service}
            </span>
          );
        })}
        {sitter.services.length > 4 && (
          <span className="px-2 py-1 bg-gray-100 text-text-light text-xs rounded-lg">
            +{sitter.services.length - 4}
          </span>
        )}
      </div>

      {/* Animaux acceptés */}
      {sitter.acceptedAnimals && sitter.acceptedAnimals.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-text-light mb-3">
          <span>🐾</span>
          <span>{sitter.acceptedAnimals.slice(0, 3).join(", ")}</span>
          {sitter.acceptedAnimals.length > 3 && (
            <span>+{sitter.acceptedAnimals.length - 3}</span>
          )}
        </div>
      )}

      {/* Prix et CTA */}
      <div className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-text-light">À partir de</span>
          <span className="text-lg font-bold text-primary">
            {sitter.basePrice ? formatPrice(sitter.basePrice) : `${sitter.hourlyRate}€`}
          </span>
        </div>
        <button className="w-full py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-sm">
          Voir les formules
        </button>
      </div>
    </div>
  );
}

interface MapComponentProps {
  sitters: SitterLocation[];
  selectedSitter: SitterLocation | null;
  onSitterSelect: (sitter: SitterLocation) => void;
  searchCenter?: { lat: number; lng: number } | null;
  searchRadius?: number; // Rayon de recherche en km
  mapStyle?: "default" | "plan"; // plan = simplified street map
}

// Tile layer configurations
const TILE_LAYERS = {
  default: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  plan: {
    // CartoDB Positron - cleaner, more readable plan style
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

// Inner map component that renders the actual Leaflet map
function MapInner({
  sitters,
  selectedSitter,
  onSitterSelect,
  searchCenter,
  searchRadius,
  initialCenter,
  tileConfig,
}: {
  sitters: SitterLocation[];
  selectedSitter: SitterLocation | null;
  onSitterSelect: (sitter: SitterLocation) => void;
  searchCenter?: { lat: number; lng: number } | null;
  searchRadius?: number;
  initialCenter: { lat: number; lng: number };
  tileConfig: { url: string; attribution: string };
}) {
  return (
    <MapContainer
      center={[initialCenter.lat, initialCenter.lng]}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution={tileConfig.attribution}
        url={tileConfig.url}
      />

      <MapController selectedSitter={selectedSitter} searchCenter={searchCenter} searchRadius={searchRadius} />

      {sitters
        .filter((sitter) => sitter.coordinates)
        .map((sitter) => {
          // Obfuscate position for privacy (~500m random offset)
          const obfuscatedCoords = obfuscateCoordinates(sitter.coordinates, sitter.id);
          return (
            <Marker
              key={sitter.id}
              position={[obfuscatedCoords.lat, obfuscatedCoords.lng]}
              icon={createCustomIcon(
                selectedSitter?.id === sitter.id,
                sitter.verified
              )}
              eventHandlers={{
                click: () => onSitterSelect(sitter),
              }}
            >
              <Popup>
                <SitterPopup sitter={sitter} />
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}

export default function MapComponent({
  sitters = [],
  selectedSitter,
  onSitterSelect,
  searchCenter,
  searchRadius,
  mapStyle = "default",
}: MapComponentProps) {
  const [mapKey, setMapKey] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileConfig = TILE_LAYERS[mapStyle];

  // Utiliser le centre de recherche si disponible, sinon Paris par défaut
  const initialCenter = searchCenter ?? PARIS_CENTER;

  // Attendre que le composant soit monté côté client et que le container existe
  useEffect(() => {
    // Vérifier qu'on est côté client
    if (!isBrowser) return;

    // Utiliser requestAnimationFrame pour s'assurer que le DOM est peint
    let mounted = true;
    const checkReady = () => {
      if (!mounted) return;

      // Vérifier que le container existe et a des dimensions
      if (containerRef.current && containerRef.current.offsetHeight > 0) {
        setIsReady(true);
      } else {
        // Réessayer au prochain frame
        requestAnimationFrame(checkReady);
      }
    };

    // Attendre un tick avant de commencer à vérifier
    const timer = setTimeout(() => {
      requestAnimationFrame(checkReady);
    }, 50);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Regénérer la clé si le style change pour forcer un remontage propre
  useEffect(() => {
    if (isReady) {
      setMapKey((k) => k + 1);
    }
  }, [mapStyle, isReady]);

  return (
    <div ref={containerRef} className="w-full h-full" suppressHydrationWarning>
      {!isReady ? (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-text-light text-sm">Chargement de la carte...</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full" key={mapKey}>
          <MapInner
            sitters={sitters}
            selectedSitter={selectedSitter}
            onSitterSelect={onSitterSelect}
            searchCenter={searchCenter}
            searchRadius={searchRadius}
            mapStyle={mapStyle}
            initialCenter={initialCenter}
            tileConfig={tileConfig}
          />
        </div>
      )}
    </div>
  );
}
