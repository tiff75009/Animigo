"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Search,
  MapPin,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

// Dropdown de filtre réutilisable avec animation
export function FilterDropdown({
  label,
  icon,
  isActive,
  isOpen,
  onToggle,
  minWidth = "min-w-[200px]",
  children,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isOpen: boolean;
  onToggle: () => void;
  minWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
          isActive
            ? "bg-primary text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        )}
      >
        <span className={cn(typeof icon === "string" ? "" : "")}>{icon}</span>
        <span>{label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full left-1/2 -translate-x-1/2 mt-2 py-2 bg-white rounded-xl shadow-xl border border-gray-200 z-[100]",
              minWidth
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Toggle grille / liste
export function ViewModeToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1.5 bg-gray-100/80 rounded-xl border border-gray-200/50">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setViewMode("grid")}
        className={cn(
          "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
          viewMode === "grid"
            ? "bg-white text-gray-900 shadow-md"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Grille</span>
      </motion.button>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setViewMode("list")}
        className={cn(
          "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
          viewMode === "list"
            ? "bg-white text-gray-900 shadow-md"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">Liste</span>
      </motion.button>
    </div>
  );
}

// État vide quand aucun résultat
export function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 px-4"
    >
      {/* Illustration */}
      <div className="relative w-32 h-32 mx-auto mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full animate-pulse" />
        <div className="absolute inset-2 bg-white rounded-full shadow-inner flex items-center justify-center">
          <div className="relative">
            <Search className="w-12 h-12 text-gray-300" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
              <span className="text-xs">?</span>
            </div>
          </div>
        </div>
        {/* Emojis statiques */}
        <span className="absolute -top-2 -left-2 text-2xl">🐕</span>
        <span className="absolute -top-1 -right-3 text-2xl">🐱</span>
        <span className="absolute -bottom-2 right-0 text-xl">🐰</span>
      </div>

      <h3 className="text-2xl font-bold text-gray-900 mb-3">
        Aucun prestataire trouvé
      </h3>
      <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
        Nous n&apos;avons pas trouvé de garde correspondant à vos critères.
        <br />
        Essayez d&apos;élargir votre recherche !
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReset}
          className="px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Effacer tous les filtres
        </motion.button>
        <span className="text-gray-400 text-sm">ou</span>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          <MapPin className="w-4 h-4" />
          Changer de localisation
        </motion.button>
      </div>
    </motion.div>
  );
}
