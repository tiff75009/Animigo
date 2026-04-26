"use client";

import { motion } from "framer-motion";
import {
  Home,
  Building2,
  TreeDeciduous,
  Baby,
  Cigarette,
  CigaretteOff,
  PawPrint,
  Utensils,
  Edit,
  X,
  Plus,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import Link from "next/link";

const ANIMAL_TYPE_OPTIONS = [
  { value: "chien", emoji: "🐕" },
  { value: "chat", emoji: "🐈" },
  { value: "lapin", emoji: "🐰" },
  { value: "rongeur", emoji: "🐹" },
  { value: "oiseau", emoji: "🦜" },
  { value: "reptile", emoji: "🦎" },
  { value: "poisson", emoji: "🐠" },
  { value: "autre", emoji: "🐾" },
];

interface ProfileData {
  housingType?: "house" | "apartment";
  housingSize?: number;
  hasGarden?: boolean;
  gardenSize?: string;
  isSmoker?: boolean;
  hasChildren?: boolean;
  childrenAges?: string[];
  providesFood?: boolean;
  ownedAnimals?: Array<{
    id?: string;
    type: string;
    name: string;
    breed?: string;
    age?: number;
    profilePhoto?: string;
  }>;
}

interface HousingConditionsSectionProps {
  profile: ProfileData;
  onHousingTypeChange: (type: "house" | "apartment") => void;
  onHousingSizeChange: (size: number) => void;
  onGardenSizeChange: (size: string | null) => void;
  onIsSmokerChange: (isSmoker: boolean) => void;
  onHasChildrenChange: (hasChildren: boolean, ages?: string[]) => void;
  onChildrenAgesChange: (ages: string[]) => void;
  onProvidesFoodChange: (providesFood: boolean) => void;
  onOwnedAnimalsChange: (
    animals: Array<{ type: string; name: string; breed?: string; age?: number }>
  ) => void;
}

// Card KPI compacte avec icône + label + valeur cliquable
function KpiCard({
  icon,
  label,
  value,
  isUnset,
  onClick,
  iconBg = "#f7f5ef",
  iconColor = "#1f3a33",
  borderColor,
  bgColor = "#fff",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  isUnset?: boolean;
  onClick: () => void;
  iconBg?: string;
  iconColor?: string;
  borderColor?: string;
  bgColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all hover:shadow-sm"
      style={{
        background: bgColor,
        border: `1px solid ${borderColor || (isUnset ? "#fde68a" : "#ece9e1")}`,
        borderRadius: 10,
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] font-medium uppercase tracking-[0.06em] m-0"
          style={{ color: "#9c9484" }}
        >
          {label}
        </p>
        <p
          className="text-[12.5px] font-semibold m-0 mt-0.5 truncate"
          style={{ color: isUnset ? "#a16207" : "#1f1f1d" }}
        >
          {value}
        </p>
      </div>
      <Edit
        className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        style={{ color: "#9c9484" }}
      />
    </button>
  );
}

export default function HousingConditionsSection({
  profile,
  onHousingTypeChange,
  onHousingSizeChange,
  onGardenSizeChange,
  onIsSmokerChange,
  onHasChildrenChange,
  onChildrenAgesChange,
  onProvidesFoodChange,
  onOwnedAnimalsChange,
}: HousingConditionsSectionProps) {
  return (
    <motion.div
      id="section-conditions"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, duration: 0.3 }}
      className="bg-white p-5"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      {/* Header pattern unifié */}
      <div className="flex items-start gap-2.5 mb-4">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
        >
          <Home className="w-4 h-4" style={{ color: "#1f3a33" }} />
        </div>
        <div className="min-w-0">
          <div
            className="text-[10px] font-medium uppercase tracking-[0.1em]"
            style={{ color: "#9c9484" }}
          >
            Section · Logement
          </div>
          <h3
            className="text-[15px] font-semibold tracking-[-0.01em] m-0"
            style={{ color: "#1f1f1d" }}
          >
            Conditions de garde
          </h3>
        </div>
      </div>

      {/* Grille KPI 2 colonnes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Type de logement + surface */}
        <div
          className="group flex items-center gap-2.5 px-3 py-2.5"
          style={{
            background: "#fff",
            border: `1px solid ${profile.housingType ? "#ece9e1" : "#fde68a"}`,
            borderRadius: 10,
          }}
        >
          <button
            type="button"
            onClick={() =>
              onHousingTypeChange(profile.housingType === "house" ? "apartment" : "house")
            }
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#f5f9f6]"
            style={{ background: "#f7f5ef" }}
            title="Basculer maison/appartement"
          >
            {profile.housingType === "apartment" ? (
              <Building2 className="w-4 h-4" style={{ color: "#1f3a33" }} />
            ) : (
              <Home className="w-4 h-4" style={{ color: "#1f3a33" }} />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.06em] m-0"
              style={{ color: "#9c9484" }}
            >
              Logement
            </p>
            <p
              className="text-[12.5px] font-semibold m-0 mt-0.5 flex items-center gap-1.5"
              style={{ color: "#1f1f1d" }}
            >
              {profile.housingType === "house"
                ? "Maison"
                : profile.housingType === "apartment"
                ? "Appartement"
                : "Type ?"}
              {profile.housingType && (
                <>
                  <span style={{ color: "#cdc9c0" }}>·</span>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={profile.housingSize || ""}
                    placeholder="?"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 0) onHousingSizeChange(val);
                    }}
                    className="w-10 px-1 py-0 text-[12.5px] text-center bg-transparent border-b border-dashed focus:outline-none font-semibold"
                    style={{ borderColor: "#cdc9c0", color: "#1f1f1d" }}
                  />
                  <span className="text-[11px] font-normal" style={{ color: "#6d6d68" }}>m²</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Jardin */}
        <KpiCard
          icon={<TreeDeciduous className="w-4 h-4" />}
          label="Extérieur"
          value={
            profile.hasGarden
              ? `Jardin ${
                  profile.gardenSize === "petit"
                    ? "petit"
                    : profile.gardenSize === "moyen"
                    ? "moyen"
                    : "grand"
                }`
              : "Pas de jardin"
          }
          isUnset={false}
          onClick={() => {
            const sizes = [null, "petit", "moyen", "grand"];
            const currentIdx = profile.hasGarden
              ? sizes.indexOf(profile.gardenSize || "petit")
              : 0;
            const nextIdx = (currentIdx + 1) % sizes.length;
            onGardenSizeChange(sizes[nextIdx]);
          }}
          iconBg={profile.hasGarden ? "#f5f9f6" : "#f7f5ef"}
          iconColor={profile.hasGarden ? "#1f3a33" : "#9c9484"}
        />

        {/* Fumeur */}
        <KpiCard
          icon={
            profile.isSmoker === true ? (
              <Cigarette className="w-4 h-4" />
            ) : (
              <CigaretteOff className="w-4 h-4" />
            )
          }
          label="Tabac"
          value={
            profile.isSmoker === true
              ? "Fumeur"
              : profile.isSmoker === false
              ? "Non-fumeur"
              : "À renseigner"
          }
          isUnset={profile.isSmoker === undefined}
          onClick={() => onIsSmokerChange(!(profile.isSmoker ?? false))}
          iconBg={profile.isSmoker === true ? "#fef3c7" : "#f5f9f6"}
          iconColor={profile.isSmoker === true ? "#a16207" : "#1f3a33"}
        />

        {/* Enfants */}
        <KpiCard
          icon={<Baby className="w-4 h-4" />}
          label="Enfants"
          value={
            profile.hasChildren
              ? profile.childrenAges && profile.childrenAges.length > 0
                ? profile.childrenAges.join(", ") + " ans"
                : "Présents"
              : profile.hasChildren === false
              ? "Aucun"
              : "À renseigner"
          }
          isUnset={profile.hasChildren === undefined}
          onClick={() =>
            onHasChildrenChange(!(profile.hasChildren ?? false), profile.childrenAges || [])
          }
          iconBg={profile.hasChildren ? "#f5f9f6" : "#f7f5ef"}
          iconColor={profile.hasChildren ? "#1f3a33" : "#9c9484"}
        />

        {/* Alimentation */}
        <KpiCard
          icon={<Utensils className="w-4 h-4" />}
          label="Alimentation"
          value={
            profile.providesFood === true
              ? "Fournie"
              : profile.providesFood === false
              ? "À fournir"
              : "À renseigner"
          }
          isUnset={profile.providesFood === undefined}
          onClick={() => onProvidesFoodChange(!(profile.providesFood ?? false))}
          iconBg={profile.providesFood ? "#f5f9f6" : "#f7f5ef"}
          iconColor={profile.providesFood ? "#1f3a33" : "#9c9484"}
        />

        {/* Animaux possédés (compteur, pas cliquable) */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5"
          style={{ background: "#fff", border: "1px solid #ece9e1", borderRadius: 10 }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background: profile.ownedAnimals && profile.ownedAnimals.length > 0 ? "#f5f9f6" : "#f7f5ef",
            }}
          >
            <PawPrint
              className="w-4 h-4"
              style={{
                color: profile.ownedAnimals && profile.ownedAnimals.length > 0 ? "#1f3a33" : "#9c9484",
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] font-medium uppercase tracking-[0.06em] m-0"
              style={{ color: "#9c9484" }}
            >
              Mes animaux
            </p>
            <p
              className="text-[12.5px] font-semibold m-0 mt-0.5 truncate"
              style={{ color: "#1f1f1d" }}
            >
              {profile.ownedAnimals && profile.ownedAnimals.length > 0
                ? `${profile.ownedAnimals.length} ${profile.ownedAnimals.length > 1 ? "animaux" : "animal"}`
                : "Aucun"}
            </p>
          </div>
        </div>
      </div>

      {/* Sous-section enfants — choix âges (replié si pas d'enfants) */}
      {profile.hasChildren && (
        <div
          className="mt-3 p-3"
          style={{ background: "#fcfaf4", borderRadius: 10, border: "1px solid #f1ede3" }}
        >
          <p
            className="text-[10px] font-medium uppercase tracking-[0.1em] mb-2"
            style={{ color: "#9c9484" }}
          >
            Âge des enfants
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: "0-3", label: "0-3 ans", emoji: "👶" },
              { value: "4-10", label: "4-10 ans", emoji: "🧒" },
              { value: "11-17", label: "11-17 ans", emoji: "👦" },
            ].map((age) => {
              const isSelected = profile.childrenAges?.includes(age.value);
              return (
                <button
                  key={age.value}
                  type="button"
                  onClick={() => {
                    const currentAges = profile.childrenAges || [];
                    if (isSelected) {
                      onChildrenAgesChange(currentAges.filter((a) => a !== age.value));
                    } else {
                      onChildrenAgesChange([...currentAges, age.value]);
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium transition-all"
                  style={
                    isSelected
                      ? { background: "#1f3a33", color: "#f7f5ef", border: "1px solid #1f3a33" }
                      : { background: "#fff", color: "#1f1f1d", border: "1px solid #ece9e1" }
                  }
                >
                  <span>{age.emoji}</span>
                  {age.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sous-section animaux — chips + bouton ajouter */}
      <div
        className="mt-3 p-3"
        style={{ background: "#fcfaf4", borderRadius: 10, border: "1px solid #f1ede3" }}
      >
        <p
          className="text-[10px] font-medium uppercase tracking-[0.1em] mb-2"
          style={{ color: "#9c9484" }}
        >
          Mes animaux
        </p>
        {profile.ownedAnimals && profile.ownedAnimals.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {profile.ownedAnimals.map((animal, index) => (
              <div
                key={animal.id || index}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: "#fff", border: "1px solid #cfdbd3" }}
              >
                {animal.profilePhoto ? (
                  <img
                    src={animal.profilePhoto}
                    alt={animal.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-[14px] leading-none">
                    {ANIMAL_TYPE_OPTIONS.find((o) => o.value === animal.type)?.emoji || "🐾"}
                  </span>
                )}
                <span className="text-[12px] font-semibold" style={{ color: "#1f1f1d" }}>
                  {animal.name}
                </span>
                {animal.age !== undefined && (
                  <span className="text-[10.5px]" style={{ color: "#6d6d68" }}>
                    ({animal.age}a)
                  </span>
                )}
                <Link
                  href={`/dashboard/mes-animaux/${animal.id || `index-${index}`}/modifier`}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "#9c9484" }}
                >
                  <Edit className="w-3 h-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const newAnimals = [...(profile.ownedAnimals || [])];
                    newAnimals.splice(index, 1);
                    onOwnedAnimalsChange(newAnimals);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                  style={{ color: "#9c9484" }}
                  aria-label="Retirer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/dashboard/mes-animaux/nouveau"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "#1f3a33", color: "#f7f5ef" }}
        >
          <Plus className="w-3 h-3" />
          Ajouter un animal
        </Link>
      </div>
    </motion.div>
  );
}
