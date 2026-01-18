"use client";

import { MapPin, Navigation, Clock } from "lucide-react";
import SectionCard from "../shared/SectionCard";
import FormField from "../shared/FormField";

interface LocationSectionProps {
  location: string;
  radius: number;
  availability: string;
  onLocationChange: (location: string) => void;
  onRadiusChange: (radius: number) => void;
  onAvailabilityChange: (availability: string) => void;
}

export default function LocationSection({
  location,
  radius,
  availability,
  onLocationChange,
  onRadiusChange,
  onAvailabilityChange,
}: LocationSectionProps) {
  return (
    <SectionCard
      title="Zone d'intervention"
      description="Définissez où vous pouvez intervenir"
      icon={MapPin}
      iconColor="secondary"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Ville ou quartier"
            name="location"
            type="text"
            value={location}
            onChange={(v) => onLocationChange(v as string)}
            placeholder="Ex: Paris 15ème"
            icon={MapPin}
            helperText="Votre zone principale d'activité"
          />

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
