"use client";

import { cn } from "@/app/lib/utils";

type DisplayFormat = "hierarchy" | "subcategory" | "badge";

interface CategoryDisplayProps {
  categoryName: string;
  parentName?: string;
  displayFormat?: DisplayFormat;
  icon?: string;
  parentIcon?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Composant pour afficher une catégorie selon le format configuré
 *
 * Formats:
 * - "subcategory" (défaut): Affiche uniquement le nom de la sous-catégorie
 * - "hierarchy": Affiche "Parent > Sous-catégorie"
 * - "badge": Affiche un badge pour le parent + nom de la sous-catégorie
 */
export default function CategoryDisplay({
  categoryName,
  parentName,
  displayFormat = "subcategory",
  icon,
  parentIcon,
  className,
  size = "md",
}: CategoryDisplayProps) {
  // Si pas de parent, afficher juste le nom
  if (!parentName) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        {icon && <span className={getSizeClass(size, "icon")}>{icon}</span>}
        <span className={getSizeClass(size, "text")}>{categoryName}</span>
      </span>
    );
  }

  // Affichage selon le format
  switch (displayFormat) {
    case "hierarchy":
      return (
        <span className={cn("inline-flex items-center gap-1.5", className)}>
          {parentIcon && (
            <span className={getSizeClass(size, "icon")}>{parentIcon}</span>
          )}
          <span className={cn(getSizeClass(size, "text"), "text-text-light")}>
            {parentName}
          </span>
          <span className={cn(getSizeClass(size, "icon"), "text-text-light")}>
            {">"}
          </span>
          {icon && <span className={getSizeClass(size, "icon")}>{icon}</span>}
          <span className={getSizeClass(size, "text")}>{categoryName}</span>
        </span>
      );

    case "badge":
      return (
        <span className={cn("inline-flex items-center gap-2", className)}>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
              "bg-primary/10 text-primary",
              getSizeClass(size, "badge")
            )}
          >
            {parentIcon && <span>{parentIcon}</span>}
            <span className="font-medium">{parentName}</span>
          </span>
          {icon && <span className={getSizeClass(size, "icon")}>{icon}</span>}
          <span className={getSizeClass(size, "text")}>{categoryName}</span>
        </span>
      );

    case "subcategory":
    default:
      return (
        <span className={cn("inline-flex items-center gap-1.5", className)}>
          {icon && <span className={getSizeClass(size, "icon")}>{icon}</span>}
          <span className={getSizeClass(size, "text")}>{categoryName}</span>
        </span>
      );
  }
}

// Helper pour les tailles
function getSizeClass(
  size: "sm" | "md" | "lg",
  type: "text" | "icon" | "badge"
): string {
  const sizes = {
    sm: {
      text: "text-xs",
      icon: "text-sm",
      badge: "text-xs",
    },
    md: {
      text: "text-sm",
      icon: "text-base",
      badge: "text-xs",
    },
    lg: {
      text: "text-base",
      icon: "text-lg",
      badge: "text-sm",
    },
  };

  return sizes[size][type];
}

// Version inline pour les cas simples
export function formatCategoryDisplay(
  categoryName: string,
  parentName?: string,
  displayFormat: DisplayFormat = "subcategory"
): string {
  if (!parentName) return categoryName;

  switch (displayFormat) {
    case "hierarchy":
      return `${parentName} > ${categoryName}`;
    case "badge":
      return `[${parentName}] ${categoryName}`;
    case "subcategory":
    default:
      return categoryName;
  }
}
