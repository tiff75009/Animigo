"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Camera,
  FileText,
  MapPin,
  Heart,
  Euro,
  Calendar,
  Navigation,
  Trees,
  Users,
  Image as ImageIcon,
  Shield,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ProfileData {
  hasProfilePhoto?: boolean;
  hasCoverPhoto?: boolean;
  hasDescription?: boolean;
  hasLocation?: boolean;
  hasRadius?: boolean;
  hasAcceptedAnimals?: boolean;
  hasEquipments?: boolean;
  hasMaxAnimals?: boolean;
  hasServices?: boolean;
  hasAvailability?: boolean;
  hasIcad?: boolean;
}

interface ProfileCompletionBarProps {
  profileData: ProfileData;
  className?: string;
}

interface CompletionItem {
  key: keyof ProfileData;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  weight: number;
}

const completionItems: CompletionItem[] = [
  {
    key: "hasProfilePhoto",
    label: "Photo de profil",
    shortLabel: "Photo",
    icon: <Camera className="w-3.5 h-3.5" />,
    weight: 10,
  },
  {
    key: "hasCoverPhoto",
    label: "Photo de couverture",
    shortLabel: "Couverture",
    icon: <ImageIcon className="w-3.5 h-3.5" />,
    weight: 10,
  },
  {
    key: "hasDescription",
    label: "Description",
    shortLabel: "Description",
    icon: <FileText className="w-3.5 h-3.5" />,
    weight: 15,
  },
  {
    key: "hasLocation",
    label: "Adresse",
    shortLabel: "Adresse",
    icon: <MapPin className="w-3.5 h-3.5" />,
    weight: 10,
  },
  {
    key: "hasRadius",
    label: "Rayon d'intervention",
    shortLabel: "Rayon",
    icon: <Navigation className="w-3.5 h-3.5" />,
    weight: 10,
  },
  {
    key: "hasAcceptedAnimals",
    label: "Animaux acceptés",
    shortLabel: "Animaux",
    icon: <Heart className="w-3.5 h-3.5" />,
    weight: 10,
  },
  {
    key: "hasEquipments",
    label: "Équipements",
    shortLabel: "Équipements",
    icon: <Trees className="w-3.5 h-3.5" />,
    weight: 5,
  },
  {
    key: "hasMaxAnimals",
    label: "Capacité max",
    shortLabel: "Capacité",
    icon: <Users className="w-3.5 h-3.5" />,
    weight: 10,
  },
  {
    key: "hasServices",
    label: "Services & tarifs",
    shortLabel: "Services",
    icon: <Euro className="w-3.5 h-3.5" />,
    weight: 10,
  },
  {
    key: "hasAvailability",
    label: "Disponibilités",
    shortLabel: "Dispo",
    icon: <Calendar className="w-3.5 h-3.5" />,
    weight: 10,
  },
  {
    key: "hasIcad",
    label: "I-CAD",
    shortLabel: "I-CAD",
    icon: <Shield className="w-3.5 h-3.5" />,
    weight: 5,
  },
];

export default function ProfileCompletionBar({
  profileData,
  className,
}: ProfileCompletionBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculer le pourcentage de complétion
  const completedWeight = completionItems.reduce((sum, item) => {
    return sum + (profileData[item.key] ? item.weight : 0);
  }, 0);

  const percentage = completedWeight;
  const totalWeight = completionItems.reduce((sum, item) => sum + item.weight, 0);

  // Éléments manquants et complétés
  const missingItems = completionItems.filter((item) => !profileData[item.key]);
  const completedItems = completionItems.filter((item) => profileData[item.key]);

  // Couleur selon le pourcentage
  const getBarColor = () => {
    if (percentage >= 80) return "bg-gradient-to-r from-green-500 to-emerald-500";
    if (percentage >= 50) return "bg-gradient-to-r from-amber-500 to-orange-500";
    return "bg-gradient-to-r from-primary to-pink-500";
  };

  const getBgColor = () => {
    if (percentage >= 80) return "bg-green-50 border-green-200";
    if (percentage >= 50) return "bg-amber-50 border-amber-200";
    return "bg-primary/5 border-primary/20";
  };

  const getTextColor = () => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 50) return "text-amber-600";
    return "text-primary";
  };

  // Profil complet
  if (percentage === totalWeight) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl">
            <Sparkles className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-green-700">Profil complet !</p>
            <p className="text-sm text-green-600">
              Votre profil est prêt à être visible par les propriétaires.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-green-100 rounded-full">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-bold text-green-700">100%</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border transition-all",
        getBgColor(),
        className
      )}
    >
      {/* Header compact - toujours visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4"
      >
        {/* Cercle de progression */}
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-gray-200"
            />
            <motion.circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 150.8" }}
              animate={{ strokeDasharray: `${(percentage / totalWeight) * 150.8} 150.8` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                {percentage >= 80 ? (
                  <>
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#10b981" />
                  </>
                ) : percentage >= 50 ? (
                  <>
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#f97316" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#FF6B6B" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </>
                )}
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-sm font-bold", getTextColor())}>
              {Math.round((percentage / totalWeight) * 100)}%
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-left">
          <p className="font-semibold text-gray-900">
            Complétion du profil
          </p>
          <p className="text-sm text-gray-500">
            {missingItems.length === 0
              ? "Tout est complet !"
              : `${missingItems.length} élément${missingItems.length > 1 ? "s" : ""} manquant${missingItems.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Tags des éléments manquants (aperçu) */}
        <div className="hidden md:flex items-center gap-1.5 flex-wrap justify-end max-w-xs">
          {missingItems.slice(0, 3).map((item) => (
            <span
              key={item.key}
              className="flex items-center gap-1 px-2 py-1 bg-white/80 rounded-lg text-xs text-gray-600 border border-gray-200"
            >
              {item.icon}
              <span className="hidden lg:inline">{item.shortLabel}</span>
            </span>
          ))}
          {missingItems.length > 3 && (
            <span className="px-2 py-1 bg-white/80 rounded-lg text-xs text-gray-500 border border-gray-200">
              +{missingItems.length - 3}
            </span>
          )}
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="p-1.5 hover:bg-white/50 rounded-lg"
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </button>

      {/* Détails - expandable */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Barre de progression linéaire */}
              <div className="h-2 bg-white rounded-full overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full", getBarColor())}
                  initial={{ width: 0 }}
                  animate={{ width: `${(percentage / totalWeight) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>

              {/* Grille des éléments */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {completionItems.map((item) => {
                  const isComplete = profileData[item.key];
                  return (
                    <div
                      key={item.key}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                        isComplete
                          ? "bg-green-100 text-green-700"
                          : "bg-white text-gray-500 border border-gray-200"
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      ) : (
                        <span className="flex-shrink-0">{item.icon}</span>
                      )}
                      <span className="truncate">{item.shortLabel}</span>
                    </div>
                  );
                })}
              </div>

              {/* Conseil */}
              {missingItems.length > 0 && (
                <p className="text-xs text-gray-500 pt-2 border-t border-gray-200/50">
                  <span className="font-medium">Conseil :</span> Complétez{" "}
                  <span className={cn("font-medium", getTextColor())}>
                    {missingItems[0].label.toLowerCase()}
                  </span>{" "}
                  pour améliorer votre visibilité.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
