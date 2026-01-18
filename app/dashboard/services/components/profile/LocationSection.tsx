"use client";

import { MapPin, Navigation, Clock, CheckCircle } from "lucide-react";
import SectionCard from "../shared/SectionCard";
import FormField from "../shared/FormField";
import AddressAutocomplete from "@/app/components/ui/AddressAutocomplete";

interface LocationData {
  address: string;
  city: string;
  postalCode: string;
  department: string;
  region: string;
  coordinates: { lat: number; lng: number };
  placeId: string;
}

interface LocationSectionProps {
  location: string;
  radius: number;
  availability: string;
  // Données structurées optionnelles
  city?: string;
  postalCode?: string;
  department?: string;
  region?: string;
  coordinates?: { lat: number; lng: number };
  onLocationChange: (location: string) => void;
  onLocationDataChange: (data: {
    location: string;
    city?: string;
    postalCode?: string;
    department?: string;
    region?: string;
    coordinates?: { lat: number; lng: number };
    googlePlaceId?: string;
  }) => void;
  onRadiusChange: (radius: number) => void;
  onAvailabilityChange: (availability: string) => void;
}

export default function LocationSection({
  location,
  radius,
  availability,
  city,
  postalCode,
  department,
  region,
  coordinates,
  onLocationChange,
  onLocationDataChange,
  onRadiusChange,
  onAvailabilityChange,
}: LocationSectionProps) {
  const handleAddressSelect = (data: LocationData | null) => {
    if (data) {
      const fullAddress = `${data.address}, ${data.postalCode} ${data.city}`;
      onLocationDataChange({
        location: fullAddress,
        city: data.city,
        postalCode: data.postalCode,
        department: data.department,
        region: data.region,
        coordinates: data.coordinates,
        googlePlaceId: data.placeId,
      });
    } else {
      // Effacer les données
      onLocationDataChange({
        location: "",
        city: undefined,
        postalCode: undefined,
        department: undefined,
        region: undefined,
        coordinates: undefined,
        googlePlaceId: undefined,
      });
    }
  };

  const hasValidLocation = coordinates && city && postalCode;

  return (
    <SectionCard
      title="Zone d'intervention"
      description="Définissez où vous pouvez intervenir"
      icon={MapPin}
      iconColor="secondary"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <AddressAutocomplete
              value={location}
              onChange={handleAddressSelect}
              onInputChange={onLocationChange}
              placeholder="Ex: 10 rue de la Paix, Paris"
              label="Adresse"
              helperText="Commencez à taper pour rechercher"
            />

            {/* Afficher les données extraites */}
            {hasValidLocation && (
              <div className="mt-3 p-3 bg-secondary/5 rounded-xl border border-secondary/10">
                <div className="flex items-center gap-2 text-secondary text-sm font-medium mb-2">
                  <CheckCircle className="w-4 h-4" />
                  Adresse vérifiée
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-text-light">
                  <div>
                    <span className="font-medium">Ville:</span> {city}
                  </div>
                  <div>
                    <span className="font-medium">CP:</span> {postalCode}
                  </div>
                  {department && (
                    <div>
                      <span className="font-medium">Dép:</span> {department}
                    </div>
                  )}
                  {region && (
                    <div>
                      <span className="font-medium">Région:</span> {region}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <FormField
            label="Rayon d'intervention"
            name="radius"
            type="number"
            value={radius}
            onChange={(v) => onRadiusChange(v as number)}
            min={1}
            max={100}
            icon={Navigation}
            helperText="Distance max en km"
          />
        </div>

        <FormField
          label="Disponibilités"
          name="availability"
          type="textarea"
          value={availability}
          onChange={(v) => onAvailabilityChange(v as string)}
          placeholder="Ex: Du lundi au vendredi, 8h-19h. Week-ends sur demande."
          rows={2}
          icon={Clock}
          helperText="Indiquez vos créneaux habituels"
        />
      </div>
    </SectionCard>
  );
}
