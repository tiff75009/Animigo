"use client";

import { motion } from "framer-motion";
import { Check, Edit2 } from "lucide-react";
import Image from "next/image";
import { Id } from "@/convex/_generated/dataModel";

interface AnimalCardProps {
  id: Id<"animals">;
  name: string;
  type: string;
  emoji: string;
  breed?: string;
  gender: string;
  photoUrl?: string | null;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  selectable?: boolean;
  compact?: boolean;
}

export default function AnimalCard({
  name,
  type,
  emoji,
  breed,
  gender,
  photoUrl,
  isSelected = false,
  onSelect,
  onEdit,
  selectable = true,
  compact = false,
}: AnimalCardProps) {
  const genderLabel = gender === "male" ? "Mâle" : gender === "female" ? "Femelle" : "";

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={selectable ? onSelect : undefined}
        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
          selectable ? "cursor-pointer" : ""
        } ${
          isSelected
            ? "border-primary bg-primary/5"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        {/* Photo ou emoji */}
        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              {emoji}
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">{name}</h4>
          <p className="text-sm text-gray-500 truncate">
            {breed || type}
            {genderLabel && ` • ${genderLabel}`}
          </p>
        </div>

        {/* Checkbox */}
        {selectable && (
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              isSelected
                ? "bg-primary border-primary text-white"
                : "border-gray-300"
            }`}
          >
            {isSelected && <Check className="w-4 h-4" />}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={selectable ? onSelect : undefined}
      className={`relative rounded-xl border-2 overflow-hidden transition-colors ${
        selectable ? "cursor-pointer" : ""
      } ${
        isSelected
          ? "border-primary"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Photo ou fond coloré avec emoji */}
      <div className="relative h-32 bg-gradient-to-br from-primary/10 to-secondary/10">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-50">
            {emoji}
          </div>
        )}

        {/* Badge sélectionné */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
        )}

        {/* Bouton éditer */}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="absolute top-2 left-2 p-1.5 bg-white/90 hover:bg-white rounded-full transition-colors shadow-sm"
          >
            <Edit2 className="w-4 h-4 text-gray-600" />
          </button>
        )}
      </div>

      {/* Infos */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <h4 className="font-semibold text-foreground truncate">{name}</h4>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {breed || type}
          {genderLabel && ` • ${genderLabel}`}
        </p>
      </div>

      {/* Overlay sélectionné */}
      {isSelected && (
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      )}
    </motion.div>
  );
}
