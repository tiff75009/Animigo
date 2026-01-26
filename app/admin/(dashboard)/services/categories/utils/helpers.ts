import type { Category, CategoryFormData, PriceUnit, DefaultVariant } from "../types";

/**
 * Génère un slug à partir d'un nom
 * - Convertit en minuscules
 * - Supprime les accents
 * - Remplace les caractères spéciaux par des tirets
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Convertit une catégorie en données de formulaire
 * Utilisé pour pré-remplir le formulaire lors de l'édition
 */
export function categoryToFormData(category: Category): CategoryFormData {
  return {
    slug: category.slug,
    name: category.name,
    description: category.description || "",
    icon: category.icon || "",
    color: category.color || "#FF6B6B",
    typeId: category.typeId || null,
    parentCategoryId: category.parentCategoryId || null,
    billingType: category.billingType || "hourly",
    defaultHourlyPrice: category.defaultHourlyPrice
      ? category.defaultHourlyPrice / 100
      : 0,
    allowRangeBooking: category.allowRangeBooking || false,
    allowedPriceUnits: (category.allowedPriceUnits as PriceUnit[]) || ["hour"],
    defaultVariants: (category.defaultVariants as DefaultVariant[]) || [],
    allowCustomVariants: category.allowCustomVariants !== false,
    allowOvernightStay: category.allowOvernightStay || false,
    displayFormat: category.displayFormat || "subcategory",
    isCapacityBased: category.isCapacityBased || false,
    enableDurationBasedBlocking: category.enableDurationBasedBlocking || false,
  };
}

/**
 * Vérifie si la catégorie est une prestation (a un parent)
 */
export function isPrestation(category: Category): boolean {
  return !!category.parentCategoryId;
}

/**
 * Vérifie si la catégorie est une catégorie parente
 */
export function isParentCategory(category: Category): boolean {
  return !category.parentCategoryId;
}

/**
 * Groupe les catégories par parent
 * Retourne un Map avec les parents et leurs enfants
 */
export function groupCategoriesByParent(
  categories: Category[]
): Map<Category, Category[]> {
  const result = new Map<Category, Category[]>();

  // Trouver tous les parents
  const parents = categories.filter(isParentCategory);

  // Pour chaque parent, trouver ses enfants
  parents.forEach((parent) => {
    const children = categories.filter(
      (c) => c.parentCategoryId === parent.id
    );
    result.set(parent, children);
  });

  return result;
}
