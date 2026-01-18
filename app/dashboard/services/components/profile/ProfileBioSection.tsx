"use client";

import { User, FileText, Award } from "lucide-react";
import SectionCard from "../shared/SectionCard";
import FormField from "../shared/FormField";

interface ProfileBioSectionProps {
  bio: string;
  description: string;
  experience: string;
  onBioChange: (bio: string) => void;
  onDescriptionChange: (description: string) => void;
  onExperienceChange: (experience: string) => void;
}

export default function ProfileBioSection({
  bio,
  description,
  experience,
  onBioChange,
  onDescriptionChange,
  onExperienceChange,
}: ProfileBioSectionProps) {
  return (
    <SectionCard
      title="Présentation"
      description="Présentez-vous aux propriétaires d'animaux"
      icon={User}
      iconColor="primary"
    >
      <div className="space-y-5">
        <FormField
          label="Titre de votre profil"
          name="bio"
          type="text"
          value={bio}
          onChange={(v) => onBioChange(v as string)}
          placeholder="Ex: Passionné d'animaux depuis 10 ans"
          maxLength={150}
          showCharCount
          helperText="Ce titre apparaîtra en premier sur votre profil"
        />

        <FormField
          label="Description détaillée"
          name="description"
          type="textarea"
          value={description}
          onChange={(v) => onDescriptionChange(v as string)}
          placeholder="Décrivez votre expérience, votre approche avec les animaux, pourquoi vous aimez ce que vous faites..."
          rows={4}
          icon={FileText}
          helperText="Soyez authentique et détaillé pour rassurer les propriétaires"
        />

        <FormField
          label="Expérience et formations"
          name="experience"
          type="textarea"
          value={experience}
          onChange={(v) => onExperienceChange(v as string)}
          placeholder="Formations, certifications, années d'expérience..."
          rows={3}
          icon={Award}
          helperText="Mentionnez vos qualifications pertinentes"
        />
      </div>
    </SectionCard>
  );
}
