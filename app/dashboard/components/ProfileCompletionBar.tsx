"use client";

import { motion } from "framer-motion";
import {
  CheckCircle,
  Circle,
  Camera,
  FileText,
  MapPin,
  Heart,
  Euro,
  Calendar,
  Navigation,
  Trees,
  Users,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ProfileData {
  hasProfilePhoto?: boolean;
  hasDescription?: boolean;
  hasLocation?: boolean;
  hasRadius?: boolean;
  hasAcceptedAnimals?: boolean;
  hasEquipments?: boolean;
  hasMaxAnimals?: boolean;
  hasServices?: boolean;
  hasAvailability?: boolean;
}

interface ProfileCompletionBarProps {
  profileData: ProfileData;
  className?: string;
}

interface CompletionItem {
  key: keyof ProfileData;
  label: string;
  icon: React.ReactNode;
  weight: number;
}

const completionItems: CompletionItem[] = [
  {
    key: "hasProfilePhoto",
    label: "Photo de profil",
    icon: <Camera className="w-4 h-4" />,
    weight: 15,
  },
  {
    key: "hasDescription",
    label: "Description",
    icon: <FileText className="w-4 h-4" />,
    weight: 15,
  },
  {
    key: "hasLocation",
    label: "Adresse",
    icon: <MapPin className="w-4 h-4" />,
    weight: 10,
  },
  {
    key: "hasRadius",
    label: "Rayon d'intervention",
    icon: <Navigation className="w-4 h-4" />,
    weight: 10,
  },
  {
    key: "hasAcceptedAnimals",
    label: "Animaux acceptés",
    icon: <Heart className="w-4 h-4" />,
    weight: 15,
  },
  {
    key: "hasEquipments",
    label: "Équipements",
    icon: <Trees className="w-4 h-4" />,
    weight: 5,
  },
  {
    key: "hasMaxAnimals",
    label: "Capacité max",
    icon: <Users className="w-4 h-4" />,
    weight: 10,
  },
  {
    key: "hasServices",
    label: "Services & tarifs",
    icon: <Euro className="w-4 h-4" />,
    weight: 10,
  },
  {
    key: "hasAvailability",
    label: "Disponibilités",
    icon: <Calendar className="w-4 h-4" />,
    weight: 10,
  },
];

export default function ProfileCompletionBar({
  profileData,
  className,
}: ProfileCompletionBarProps) {
  // Calculer le pourcentage de complétion
  const completedWeight = completionItems.reduce((sum, item) => {
    return sum + (profileData[item.key] ? item.weight : 0);
  }, 0);

  const percentage = completedWeight;

  // Éléments manquants
  const missingItems = completionItems.filter((item) => !profileData[item.key]);

  // Couleur selon le pourcentage
  const getBarColor = () => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-primary";
  };

  const getTextColor = () => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 50) return "text-amber-600";
    return "text-primary";
  };

  if (percentage === 100) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-green-50 border border-green-200 rounded-2xl p-4",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-700">Profil complet !</p>
            <p className="text-sm text-green-600">
              Votre profil est prêt à être visible par les propriétaires.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white rounded-2xl shadow-sm border border-gray-100 p-5", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Complétion du profil</h3>
        <span className={cn("text-lg font-bold", getTextColor())}>
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
        <motion.div
          className={cn("h-full rounded-full", getBarColor())}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Liste des éléments */}
      <div className="space-y-2">
        {completionItems.map((item) => {
          const isComplete = profileData[item.key];
          return (
            <div
              key={item.key}
              className={cn(
                "flex items-center gap-2 text-sm",
                isComplete ? "text-green-600" : "text-gray-500"
              )}
            >
              {isComplete ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300" />
              )}
              <span className="flex items-center gap-1.5">
                {item.icon}
                {item.label}
              </span>
              <span className="ml-auto text-xs text-gray-400">
                {item.weight}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Conseil */}
      {missingItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Conseil :</span> Complétez votre{" "}
            <span className="text-primary font-medium">
              {missingItems[0].label.toLowerCase()}
            </span>{" "}
            pour améliorer votre visibilité.
          </p>
        </div>
      )}
    </motion.div>
  );
}
