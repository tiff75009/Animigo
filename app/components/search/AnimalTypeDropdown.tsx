"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Dog, Cat, Bird, Rabbit, Fish, Star, LucideIcon } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface AnimalType {
  id: string;
  label: string;
  icon: LucideIcon;
  emoji: string;
}

const ANIMAL_TYPES: AnimalType[] = [
  { id: "chien", label: "Chien", icon: Dog, emoji: "🐕" },
  { id: "chat", label: "Chat", icon: Cat, emoji: "🐈" },
  { id: "oiseau", label: "Oiseau", icon: Bird, emoji: "🦜" },
  { id: "rongeur", label: "Rongeur", icon: Rabbit, emoji: "🐰" },
  { id: "poisson", label: "Poisson", icon: Fish, emoji: "🐠" },
  { id: "reptile", label: "Reptile", icon: Star, emoji: "🦎" },
  { id: "nac", label: "NAC", icon: Star, emoji: "🐹" },
];

interface AnimalTypeDropdownProps {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export default function AnimalTypeDropdown({
  value,
  onChange,
  className,
}: AnimalTypeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedAnimal = value
    ? ANIMAL_TYPES.find((a) => a.id === value)
    : null;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all bg-white min-w-[140px]",
          value
            ? "border-primary text-primary"
            : "border-foreground/10 text-foreground hover:border-foreground/20"
        )}
      >
        {selectedAnimal ? (
          <>
            <span className="text-lg">{selectedAnimal.emoji}</span>
            <span className="text-sm font-medium">{selectedAnimal.label}</span>
          </>
        ) : (
          <>
            <span className="text-lg">🐾</span>
            <span className="text-sm font-medium">Animal</span>
          </>
        )}
        <ChevronDown
          className={cn(
            "w-4 h-4 ml-auto transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-lg border border-foreground/10 overflow-hidden min-w-[180px]"
          >
            <ul className="py-1">
              {/* Option "Tous" */}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left hover:bg-primary/5 transition-colors flex items-center gap-3",
                    value === null && "bg-primary/10"
                  )}
                >
                  <span className="text-lg">🐾</span>
                  <span className="text-sm font-medium">Tous les animaux</span>
                </button>
              </li>

              <li className="border-t border-foreground/5 my-1" />

              {/* Animal types */}
              {ANIMAL_TYPES.map((animal) => (
                <li key={animal.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(animal.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2.5 text-left hover:bg-primary/5 transition-colors flex items-center gap-3",
                      value === animal.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <span className="text-lg">{animal.emoji}</span>
                    <span className="text-sm font-medium">{animal.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
