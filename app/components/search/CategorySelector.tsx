"use client";

import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";
import { ServiceCategory } from "@/app/hooks/useSearch";
import { Loader2 } from "lucide-react";

interface CategorySelectorProps {
  selectedCategory: ServiceCategory | null;
  onSelect: (category: ServiceCategory | null) => void;
  className?: string;
}

export default function CategorySelector({
  selectedCategory,
  onSelect,
  className,
}: CategorySelectorProps) {
  const categories = useQuery(api.admin.serviceCategories.getActiveCategories);

  if (categories === undefined) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 justify-center",
        className
      )}
    >
      {/* Bouton "Tous" */}
      <motion.button
        type="button"
        onClick={() => onSelect(null)}
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

      {/* Catégories dynamiques */}
      {categories.map((category) => {
        const isSelected = selectedCategory?.slug === category.slug;

        return (
          <motion.button
            key={category.id}
            type="button"
            onClick={() =>
              onSelect(
                isSelected
                  ? null
                  : {
                      id: category.id,
                      slug: category.slug,
                      name: category.name,
                      icon: category.icon,
                      imageUrl: category.imageUrl,
                      billingType: category.billingType as "hourly" | "daily" | "flexible" | undefined,
                    }
              )
            }
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
      })}
    </div>
  );
}
