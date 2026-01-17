"use client";

import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Check } from "lucide-react";
import type { AccountType } from "../page";

interface AccountTypeStepProps {
  selectedType: AccountType | null;
  onSelect: (type: AccountType) => void;
  onNext: () => void;
}

const accountTypes = [
  {
    type: "annonceur_pro" as AccountType,
    title: "Pet-sitter Professionnel",
    description: "Vous avez un SIRET et exercez en tant que professionnel",
    emoji: "💼",
    color: "primary",
    features: [
      "Facturation pro",
      "Badge vérifié",
      "Priorité dans les recherches",
    ],
  },
  {
    type: "annonceur_particulier" as AccountType,
    title: "Pet-sitter Particulier",
    description: "Vous gardez des animaux occasionnellement",
    emoji: "🏠",
    color: "secondary",
    features: ["Profil personnalisé", "Messagerie", "Gestion des missions"],
  },
  {
    type: "utilisateur" as AccountType,
    title: "Propriétaire d'animaux",
    description: "Vous recherchez un garde pour votre compagnon",
    emoji: "🐾",
    color: "purple",
    features: ["Recherche avancée", "Avis vérifiés", "Paiement sécurisé"],
  },
];

const colorClasses: Record<string, { bg: string; border: string; badge: string }> = {
  primary: {
    bg: "bg-primary/5",
    border: "border-primary",
    badge: "bg-primary/20 text-primary",
  },
  secondary: {
    bg: "bg-secondary/5",
    border: "border-secondary",
    badge: "bg-secondary/20 text-secondary",
  },
  purple: {
    bg: "bg-purple/5",
    border: "border-purple",
    badge: "bg-purple/20 text-purple",
  },
};

export function AccountTypeStep({
  selectedType,
  onSelect,
  onNext,
}: AccountTypeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-foreground font-medium">
          Quel type de compte souhaitez-vous créer ?
        </p>
      </div>

      <div className="space-y-4">
        {accountTypes.map((type, index) => {
          const isSelected = selectedType === type.type;
          const colors = colorClasses[type.color];

          return (
            <motion.button
              key={type.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onSelect(type.type)}
              className={cn(
                "w-full p-5 rounded-2xl border-2 text-left transition-all",
                isSelected
                  ? `${colors.border} ${colors.bg} shadow-lg`
                  : "border-foreground/10 hover:border-foreground/20 hover:bg-foreground/5"
              )}
            >
              <div className="flex items-start gap-4">
                {/* Icône */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                    isSelected ? colors.bg : "bg-foreground/10"
                  )}
                >
                  {type.emoji}
                </div>

                {/* Contenu */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-foreground">{type.title}</h3>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-sm text-text-light mt-1">
                    {type.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {type.features.map((feature) => (
                      <span
                        key={feature}
                        className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          isSelected ? colors.badge : "bg-foreground/10 text-text-light"
                        )}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <Button
        onClick={onNext}
        disabled={!selectedType}
        className="w-full mt-6"
        size="lg"
      >
        Continuer
      </Button>
    </div>
  );
}
