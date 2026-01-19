"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronDown } from "lucide-react";

interface TraitSelectorProps {
  title: string;
  icon: string;
  predefinedTraits: string[];
  selectedTraits: string[];
  onTraitsChange: (traits: string[]) => void;
  allowCustom?: boolean;
  customPlaceholder?: string;
}

export default function TraitSelector({
  title,
  icon,
  predefinedTraits,
  selectedTraits,
  onTraitsChange,
  allowCustom = false,
  customPlaceholder = "Ajouter un trait personnalisé...",
}: TraitSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTrait = (trait: string) => {
    if (!selectedTraits.includes(trait)) {
      onTraitsChange([...selectedTraits, trait]);
    }
    setIsDropdownOpen(false);
  };

  const removeTrait = (trait: string) => {
    onTraitsChange(selectedTraits.filter((t) => t !== trait));
  };

  const handleAddCustom = () => {
    const trimmedInput = customInput.trim();
    if (trimmedInput && !selectedTraits.includes(trimmedInput)) {
      onTraitsChange([...selectedTraits, trimmedInput]);
      setCustomInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustom();
    }
  };

  // Traits disponibles (non sélectionnés)
  const availableTraits = predefinedTraits.filter((t) => !selectedTraits.includes(t));

  return (
    <div className="space-y-3">
      {/* Header avec titre et bouton ajouter */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </h4>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
              >
                <div className="max-h-48 overflow-y-auto p-1">
                  {availableTraits.length > 0 ? (
                    availableTraits.map((trait) => (
                      <button
                        key={trait}
                        type="button"
                        onClick={() => addTrait(trait)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        {trait}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-sm text-gray-500 italic">
                      Tous les traits ont été ajoutés
                    </p>
                  )}
                </div>

                {/* Input personnalisé */}
                {allowCustom && (
                  <div className="border-t border-gray-100 p-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={customPlaceholder}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustom}
                        disabled={!customInput.trim()}
                        className="px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tags sélectionnés */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        <AnimatePresence mode="popLayout">
          {selectedTraits.length > 0 ? (
            selectedTraits.map((trait) => (
              <motion.span
                key={trait}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                layout
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full"
              >
                {trait}
                <button
                  type="button"
                  onClick={() => removeTrait(trait)}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.span>
            ))
          ) : (
            <span className="text-sm text-gray-400 italic">
              Aucun trait sélectionné
            </span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
