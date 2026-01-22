"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/app/lib/utils";
import { ServiceCategory } from "@/app/hooks/useSearch";
import { Loader2 } from "lucide-react";

interface CategorySelectorProps {
  selectedCategory: ServiceCategory | null;
  onSelect: (category: ServiceCategory | null) => void;
  className?: string;
}

// Types pour la structure hiérarchique retournée par getActiveCategories
interface SubcategoryData {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  imageUrl?: string | null;
  parentCategoryId?: Id<"serviceCategories">;
  billingType?: string;
  allowRangeBooking?: boolean;
  allowedPriceUnits?: string[];
  allowOvernightStay?: boolean;
}

interface ParentCategoryData {
  id: Id<"serviceCategories">;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  imageUrl?: string | null;
  isParent: boolean;
  subcategories: SubcategoryData[];
}

interface CategoriesData {
  parentCategories: ParentCategoryData[];
  rootCategories: SubcategoryData[];
}

export default function CategorySelector({
  selectedCategory,
  onSelect,
  className,
}: CategorySelectorProps) {
  const categories = useQuery(api.admin.serviceCategories.getActiveCategories) as CategoriesData | undefined;

  if (categories === undefined) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleSelect = (category: SubcategoryData | null) => {
    if (category === null) {
      onSelect(null);
    } else {
      onSelect({
        id: category.id,
        slug: category.slug,
        name: category.name,
        icon: category.icon,
        imageUrl: category.imageUrl,
        parentCategoryId: category.parentCategoryId,
        billingType: category.billingType as "hourly" | "daily" | "flexible" | undefined,
        allowRangeBooking: category.allowRangeBooking,
        allowOvernightStay: category.allowOvernightStay,
        allowedPriceUnits: category.allowedPriceUnits as ("hour" | "day" | "week" | "month")[] | undefined,
      });
    }
  };

  // Check if there's any hierarchical structure
  const hasHierarchy = categories.parentCategories.some(p => p.subcategories.length > 0);

  // Render a single category button
  const renderCategoryButton = (category: SubcategoryData) => {
    const isSelected = selectedCategory?.slug === category.slug;
    return (
      <motion.button
        key={category.id}
        type="button"
        onClick={() => handleSelect(isSelected ? null : category)}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all",
          isSelected
            ? "border-primary bg-primary text-white"
            : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {category.icon && <span className="text-lg">{category.icon}</span>}
        <span className="text-sm font-medium">{category.name}</span>
      </motion.button>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Bouton "Tous" */}
      <div className="flex flex-wrap gap-2 justify-center">
        <motion.button
          type="button"
          onClick={() => handleSelect(null)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all",
            selectedCategory === null
              ? "border-primary bg-primary text-white"
              : "border-foreground/10 bg-white text-foreground hover:border-foreground/20"
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-lg">🔍</span>
          <span className="text-sm font-medium">Tous</span>
        </motion.button>
      </div>

      {/* Catégories hiérarchiques */}
      {hasHierarchy ? (
        <div className="space-y-4">
          {categories.parentCategories.map((parent) => {
            // N'afficher que les parents avec des sous-catégories
            if (parent.subcategories.length === 0) return null;

            return (
              <div key={parent.id} className="space-y-2">
                {/* Header du parent (non-cliquable) */}
                <div className="flex items-center gap-2 px-2">
                  {parent.icon && <span className="text-lg">{parent.icon}</span>}
                  <span className="text-xs font-semibold text-text-light uppercase tracking-wider">
                    {parent.name}
                  </span>
                </div>
                {/* Sous-catégories */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {parent.subcategories.map((subcategory) => renderCategoryButton(subcategory))}
                </div>
              </div>
            );
          })}

          {/* Catégories racine (sans parent) */}
          {categories.rootCategories.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <span className="text-lg">📋</span>
                <span className="text-xs font-semibold text-text-light uppercase tracking-wider">
                  Autres
                </span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {categories.rootCategories.map((category) => renderCategoryButton(category))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Affichage plat si pas de hiérarchie */
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.rootCategories.map((category) => renderCategoryButton(category))}
          {categories.parentCategories.map((parent) => {
            // Si le parent n'a pas de sous-catégories, l'afficher comme bouton
            if (parent.subcategories.length === 0) {
              return renderCategoryButton({
                id: parent.id,
                slug: parent.slug,
                name: parent.name,
                icon: parent.icon,
                imageUrl: parent.imageUrl,
              });
            }
            // Sinon afficher les sous-catégories directement
            return parent.subcategories.map((sub) => renderCategoryButton(sub));
          })}
        </div>
      )}
    </div>
  );
}
