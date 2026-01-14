"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Image from "next/image";
import { Star, CheckCircle, MapPin } from "lucide-react";
import { PARIS_CENTER, serviceTypes, type SitterLocation } from "@/app/lib/search-data";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

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

// Map center controller component
function MapController({
  selectedSitter,
}: {
  selectedSitter: SitterLocation | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedSitter) {
      map.flyTo(
        [selectedSitter.coordinates.lat, selectedSitter.coordinates.lng],
        14,
        { duration: 0.5 }
      );
    }
  }, [selectedSitter, map]);

  return null;
}

// Popup content component
function SitterPopup({ sitter }: { sitter: SitterLocation }) {
  return (
    <div className="min-w-[200px]">
      <div className="flex items-center gap-3 mb-2">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={sitter.profileImage}
            alt={sitter.firstName}
            fill
            className="object-cover"
          />
        </div>
        <div>
          <h4 className="font-semibold text-foreground flex items-center gap-1">
            {sitter.firstName} {sitter.lastName.charAt(0)}.
            {sitter.verified && (
              <CheckCircle className="w-4 h-4 text-secondary" />
            )}
          </h4>
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-3 h-3 fill-accent text-accent" />
            <span className="font-medium">{sitter.rating}</span>
            <span className="text-text-light">({sitter.reviewCount})</span>
          </div>
        </div>
      </div>

      <p className="text-sm text-text-light flex items-center gap-1 mb-2">
        <MapPin className="w-3 h-3" />
        {sitter.location}
      </p>

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
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
        <span className="text-sm text-text-light">À partir de</span>
        <span className="font-bold text-primary">{sitter.hourlyRate}€/h</span>
      </div>

      <button className="w-full mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
        Voir le profil
      </button>
    </div>
  );
}

interface MapComponentProps {
  sitters: SitterLocation[];
  selectedSitter: SitterLocation | null;
  onSitterSelect: (sitter: SitterLocation) => void;
}

export default function MapComponent({
  sitters,
  selectedSitter,
  onSitterSelect,
}: MapComponentProps) {
  const mapRef = useRef<L.Map>(null);

  return (
    <MapContainer
      center={[PARIS_CENTER.lat, PARIS_CENTER.lng]}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController selectedSitter={selectedSitter} />

      {sitters.map((sitter) => (
        <Marker
          key={sitter.id}
          position={[sitter.coordinates.lat, sitter.coordinates.lng]}
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
      ))}
    </MapContainer>
  );
}
