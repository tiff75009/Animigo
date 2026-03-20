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
  ownedAnimals?: Array<{ id?: string; type: string; name: string; breed?: string; age?: number; profilePhoto?: string }>;
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
  onOwnedAnimalsChange: (animals: Array<{ type: string; name: string; breed?: string; age?: number }>) => void;
}

function ConditionCard({
  onClick,
  icon,
  iconBg,
  title,
  subtitle,
  hoverColor = "hover:bg-primary/5",
  editColor = "group-hover:text-primary group-hover:bg-primary/10",
}: {
  onClick: () => void;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  hoverColor?: string;
  editColor?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn("group relative flex items-center gap-4 p-4 bg-background rounded-xl transition-colors text-left", hoverColor)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className={cn("absolute top-2 right-2 p-1.5 rounded-lg bg-foreground/5 transition-colors", editColor)}>
        <Edit className="w-3.5 h-3.5 text-foreground/40 transition-colors" />
      </div>
      <div className={cn("p-3 rounded-xl", iconBg)}>{icon}</div>
      <div className="flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        {subtitle && <p className="text-sm text-text-light">{subtitle}</p>}
      </div>
    </motion.button>
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-white rounded-3xl shadow-lg p-6"
    >
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <Home className="w-5 h-5 text-primary" />
        Conditions de garde
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type de logement */}
        <motion.button
          type="button"
          onClick={() => onHousingTypeChange(profile.housingType === "house" ? "apartment" : "house")}
          className="group relative flex items-center gap-4 p-4 bg-background rounded-xl hover:bg-primary/5 transition-colors text-left"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-foreground/5 group-hover:bg-primary/10 transition-colors">
            <Edit className="w-3.5 h-3.5 text-foreground/40 group-hover:text-primary transition-colors" />
          </div>
          <div className={cn("p-3 rounded-xl", profile.housingType ? "bg-primary/10" : "bg-amber-100")}>
            {profile.housingType === "house" ? (
              <Home className="w-6 h-6 text-primary" />
            ) : profile.housingType === "apartment" ? (
              <Building2 className="w-6 h-6 text-primary" />
            ) : (
              <Home className="w-6 h-6 text-amber-500" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              {profile.housingType === "house" ? "Maison" : profile.housingType === "apartment" ? "Appartement" : "Type de logement ?"}
            </p>
            {profile.housingType ? (
              <p className="text-sm text-text-light flex items-center gap-1">
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={profile.housingSize || ""}
                  placeholder="?"
                  onClick={e => e.stopPropagation()}
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    if (val > 0) onHousingSizeChange(val);
                  }}
                  className="w-12 px-1 py-0.5 text-sm text-center bg-transparent border-b border-dashed border-foreground/30 focus:border-primary focus:outline-none font-medium text-foreground"
                />
                m²
              </p>
            ) : (
              <p className="text-sm text-amber-600">À renseigner</p>
            )}
          </div>
        </motion.button>

        {/* Jardin */}
        <ConditionCard
          onClick={() => {
            const sizes = [null, "petit", "moyen", "grand"];
            const currentIdx = profile.hasGarden ? sizes.indexOf(profile.gardenSize || "petit") : 0;
            const nextIdx = (currentIdx + 1) % sizes.length;
            onGardenSizeChange(sizes[nextIdx]);
          }}
          icon={<TreeDeciduous className={cn("w-6 h-6", profile.hasGarden ? "text-green-600" : "text-gray-400")} />}
          iconBg={profile.hasGarden ? "bg-green-100" : "bg-gray-100"}
          title={
            profile.hasGarden
              ? `${profile.gardenSize === "petit" ? "Petit jardin" : profile.gardenSize === "moyen" ? "Jardin moyen" : "Grand jardin"}`
              : "Pas de jardin"
          }
          hoverColor="hover:bg-green-50"
          editColor="group-hover:text-green-600 group-hover:bg-green-100"
        />

        {/* Fumeur */}
        <ConditionCard
          onClick={() => onIsSmokerChange(!(profile.isSmoker ?? false))}
          icon={
            profile.isSmoker === true
              ? <Cigarette className="w-6 h-6 text-orange-600" />
              : <CigaretteOff className={cn("w-6 h-6", profile.isSmoker === false ? "text-green-600" : "text-amber-500")} />
          }
          iconBg={profile.isSmoker === false ? "bg-green-100" : profile.isSmoker === true ? "bg-orange-100" : "bg-amber-100"}
          title={profile.isSmoker === true ? "Fumeur" : profile.isSmoker === false ? "Non-fumeur" : "Fumeur ?"}
          subtitle={profile.isSmoker === undefined ? "À renseigner" : undefined}
          hoverColor="hover:bg-green-50"
          editColor="group-hover:text-green-600 group-hover:bg-green-100"
        />

        {/* Enfants */}
        <ConditionCard
          onClick={() => onHasChildrenChange(!(profile.hasChildren ?? false), profile.childrenAges || [])}
          icon={
            <Baby className={cn("w-6 h-6",
              profile.hasChildren ? "text-secondary" : profile.hasChildren === false ? "text-gray-400" : "text-amber-500"
            )} />
          }
          iconBg={profile.hasChildren ? "bg-secondary/10" : profile.hasChildren === false ? "bg-gray-100" : "bg-amber-100"}
          title={profile.hasChildren ? "Enfants présents" : profile.hasChildren === false ? "Pas d'enfants" : "Enfants ?"}
          subtitle={
            profile.hasChildren && profile.childrenAges && profile.childrenAges.length > 0
              ? profile.childrenAges.map(a => a === "0-3" ? "0-3" : a === "4-10" ? "4-10" : "11-17").join(", ") + " ans"
              : profile.hasChildren === undefined ? "À renseigner" : undefined
          }
          hoverColor="hover:bg-secondary/5"
          editColor="group-hover:text-secondary group-hover:bg-secondary/10"
        />

        {/* Animaux de l'annonceur */}
        <div className="flex items-center gap-4 p-4 bg-background rounded-xl text-left">
          <div className={cn("p-3 rounded-xl",
            profile.ownedAnimals && profile.ownedAnimals.length > 0 ? "bg-primary/10" : "bg-gray-100"
          )}>
            <PawPrint className={cn("w-6 h-6",
              profile.ownedAnimals && profile.ownedAnimals.length > 0 ? "text-primary" : "text-gray-400"
            )} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              {profile.ownedAnimals && profile.ownedAnimals.length > 0
                ? `${profile.ownedAnimals.length} animal${profile.ownedAnimals.length > 1 ? "x" : ""}`
                : "Mes animaux"}
            </p>
            {profile.ownedAnimals && profile.ownedAnimals.length > 0 ? (
              <p className="text-sm text-text-light">
                {profile.ownedAnimals.map(a => a.name).join(", ")}
              </p>
            ) : (
              <p className="text-sm text-text-light">Voir ci-dessous</p>
            )}
          </div>
        </div>

        {/* Alimentation */}
        <ConditionCard
          onClick={() => onProvidesFoodChange(!(profile.providesFood ?? false))}
          icon={
            <Utensils className={cn("w-6 h-6",
              profile.providesFood === true ? "text-green-600" : profile.providesFood === false ? "text-orange-600" : "text-amber-500"
            )} />
          }
          iconBg={profile.providesFood === true ? "bg-green-100" : profile.providesFood === false ? "bg-orange-100" : "bg-amber-100"}
          title={
            profile.providesFood === true ? "Alimentation fournie"
              : profile.providesFood === false ? "À fournir par le propriétaire"
              : "Alimentation ?"
          }
          subtitle={profile.providesFood === undefined ? "À renseigner" : undefined}
          hoverColor="hover:bg-orange-50"
          editColor="group-hover:text-orange-600 group-hover:bg-orange-100"
        />
      </div>

      {/* Section enfants - Âges (si enfants) */}
      {profile.hasChildren && (
        <div className="mt-4 p-4 bg-secondary/5 rounded-xl">
          <p className="text-sm font-medium text-foreground mb-2">Âge des enfants :</p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "0-3", label: "0-3 ans", emoji: "👶" },
              { value: "4-10", label: "4-10 ans", emoji: "🧒" },
              { value: "11-17", label: "11-17 ans", emoji: "👦" },
            ].map(age => {
              const isSelected = profile.childrenAges?.includes(age.value);
              return (
                <motion.button
                  key={age.value}
                  type="button"
                  onClick={() => {
                    const currentAges = profile.childrenAges || [];
                    if (isSelected) {
                      onChildrenAgesChange(currentAges.filter(a => a !== age.value));
                    } else {
                      onChildrenAgesChange([...currentAges, age.value]);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm",
                    isSelected ? "bg-secondary text-white" : "bg-white text-foreground hover:bg-secondary/10"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>{age.emoji}</span>
                  <span className="font-medium">{age.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Section animaux - Liste et ajout */}
      <div className="mt-4 p-4 bg-primary/5 rounded-xl">
        <p className="text-sm font-medium text-foreground mb-3">Mes animaux :</p>

        {profile.ownedAnimals && profile.ownedAnimals.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {profile.ownedAnimals.map((animal, index) => (
              <div
                key={animal.id || index}
                className="group flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-primary/20 hover:border-primary/40 transition-colors"
              >
                {animal.profilePhoto ? (
                  <img src={animal.profilePhoto} alt={animal.name} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <span className="text-sm">
                    {ANIMAL_TYPE_OPTIONS.find(o => o.value === animal.type)?.emoji || "🐾"}
                  </span>
                )}
                <span className="font-medium text-sm">{animal.name}</span>
                {animal.age !== undefined && <span className="text-xs text-text-light">({animal.age}a)</span>}

                <div className="flex items-center gap-1 ml-1">
                  <Link href={`/dashboard/mes-animaux/${animal.id || `index-${index}`}/modifier`}>
                    <motion.div
                      className="text-foreground/40 hover:text-primary p-0.5"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </motion.div>
                  </Link>
                  <motion.button
                    type="button"
                    onClick={() => {
                      const newAnimals = [...(profile.ownedAnimals || [])];
                      newAnimals.splice(index, 1);
                      onOwnedAnimalsChange(newAnimals);
                    }}
                    className="text-foreground/40 hover:text-red-600 p-0.5"
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link href="/dashboard/mes-animaux/nouveau">
          <motion.div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un animal</span>
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}
