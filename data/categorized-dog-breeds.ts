/**
 * Races de chiens catégorisées selon la législation française (Loi du 6 janvier 1999)
 *
 * Catégorie 1 - Chiens d'attaque:
 * Chiens non inscrits au LOF (Livre des Origines Français) ou assimilés à certaines races
 *
 * Catégorie 2 - Chiens de garde et de défense:
 * Chiens inscrits au LOF de certaines races + Rottweiler (avec ou sans LOF)
 */

// Races potentiellement catégorisées (nécessitent vérification LOF)
export const CATEGORIZED_BREED_SLUGS = {
  // American Staffordshire Terrier / Staffordshire Terrier
  // Sans LOF = Cat 1, Avec LOF = Cat 2
  "american-staffordshire-terrier": { cat1IfNoLof: true, cat2IfLof: true },
  "staffordshire-bull-terrier": { cat1IfNoLof: true, cat2IfLof: true },

  // Tosa
  // Sans LOF = Cat 1, Avec LOF = Cat 2
  "tosa": { cat1IfNoLof: true, cat2IfLof: true },
  "tosa-inu": { cat1IfNoLof: true, cat2IfLof: true },

  // Mastiff / Boerbull
  // Sans LOF = Cat 1
  "mastiff": { cat1IfNoLof: true, cat2IfLof: false },
  "boerboel": { cat1IfNoLof: true, cat2IfLof: false },
  "boerbull": { cat1IfNoLof: true, cat2IfLof: false },

  // Rottweiler - Toujours Cat 2 (avec ou sans LOF)
  "rottweiler": { cat1IfNoLof: false, cat2IfLof: true, alwaysCat2: true },
} as const;

// Mots-clés pour détecter les races potentiellement catégorisées dans les noms
export const CATEGORIZED_BREED_KEYWORDS = [
  "pitbull",
  "pit bull",
  "pit-bull",
  "american staff",
  "amstaff",
  "am staff",
  "staffordshire",
  "staffie",
  "staff",
  "tosa",
  "mastiff",
  "boerboel",
  "boerbull",
  "rottweiler",
  "rotweiler",
  "rott",
];

// Type pour le résultat de vérification de catégorie
export interface DogCategoryResult {
  isCategorized: boolean;
  category: "none" | "cat1" | "cat2" | "unknown";
  requiresLofCheck: boolean;
  breedName: string;
}

// Tranches de poids pour déterminer la taille
export const WEIGHT_RANGES = {
  small: { min: 0, max: 10, label: "Petit (moins de 10 kg)" },
  medium: { min: 10, max: 25, label: "Moyen (10 à 25 kg)" },
  large: { min: 25, max: Infinity, label: "Grand (plus de 25 kg)" },
} as const;

export type DogSize = "small" | "medium" | "large";

/**
 * Détermine la taille du chien à partir de son poids
 */
export function getSizeFromWeight(weightKg: number): DogSize {
  if (weightKg < 10) return "small";
  if (weightKg <= 25) return "medium";
  return "large";
}

/**
 * Vérifie si une race est potentiellement catégorisée
 */
export function checkBreedCategory(
  breedSlug: string | null,
  breedName: string,
  hasLof: boolean = false
): DogCategoryResult {
  // Normaliser le nom pour la recherche
  const normalizedName = breedName.toLowerCase().trim();
  const normalizedSlug = breedSlug?.toLowerCase().trim() || "";

  // Vérifier par slug
  const slugMatch = Object.entries(CATEGORIZED_BREED_SLUGS).find(
    ([slug]) => normalizedSlug.includes(slug) || slug.includes(normalizedSlug)
  );

  if (slugMatch) {
    const [, config] = slugMatch;

    // Rottweiler est toujours Cat 2
    if ("alwaysCat2" in config && config.alwaysCat2) {
      return {
        isCategorized: true,
        category: "cat2",
        requiresLofCheck: false,
        breedName,
      };
    }

    // Autres races: dépend du LOF
    if (hasLof && config.cat2IfLof) {
      return {
        isCategorized: true,
        category: "cat2",
        requiresLofCheck: true,
        breedName,
      };
    }

    if (!hasLof && config.cat1IfNoLof) {
      return {
        isCategorized: true,
        category: "cat1",
        requiresLofCheck: true,
        breedName,
      };
    }
  }

  // Vérifier par mots-clés dans le nom
  const keywordMatch = CATEGORIZED_BREED_KEYWORDS.some(
    keyword => normalizedName.includes(keyword)
  );

  if (keywordMatch) {
    return {
      isCategorized: true,
      category: "unknown", // Nécessite vérification manuelle
      requiresLofCheck: true,
      breedName,
    };
  }

  return {
    isCategorized: false,
    category: "none",
    requiresLofCheck: false,
    breedName,
  };
}

/**
 * Vérifie si un chien est accepté selon les restrictions de la formule
 */
export function isDogAccepted(
  dogSize: DogSize,
  dogCategory: "none" | "cat1" | "cat2",
  acceptedSizes: DogSize[],
  categoryAcceptance: "none" | "cat1" | "cat2" | "both"
): { accepted: boolean; reason?: string } {
  // Vérifier la taille
  if (!acceptedSizes.includes(dogSize)) {
    const sizeLabels = {
      small: "petite taille",
      medium: "taille moyenne",
      large: "grande taille",
    };
    return {
      accepted: false,
      reason: `Ce prestataire n'accepte pas les chiens de ${sizeLabels[dogSize]}.`,
    };
  }

  // Vérifier la catégorie
  if (dogCategory === "cat1") {
    if (categoryAcceptance !== "cat1" && categoryAcceptance !== "both") {
      return {
        accepted: false,
        reason: "Ce prestataire n'accepte pas les chiens de catégorie 1.",
      };
    }
  }

  if (dogCategory === "cat2") {
    if (categoryAcceptance !== "cat2" && categoryAcceptance !== "both") {
      return {
        accepted: false,
        reason: "Ce prestataire n'accepte pas les chiens de catégorie 2.",
      };
    }
  }

  // Si le chien est catégorisé (cat1 ou cat2) et que l'annonceur n'accepte que "none"
  if ((dogCategory === "cat1" || dogCategory === "cat2") && categoryAcceptance === "none") {
    return {
      accepted: false,
      reason: "Ce prestataire n'accepte pas les chiens catégorisés.",
    };
  }

  return { accepted: true };
}
