/**
 * Liste des races de chat avec tailles
 * Sources:
 * - https://www.woopets.fr/chat/races/
 * - https://loof.asso.fr/les-races-de-chat
 * - https://www.zooplus.fr/magazine/chat/races-de-chat
 */

export type CatSize = "small" | "medium" | "large";

export interface CatBreed {
  name: string;
  slug: string;
  size: CatSize;
  /** Poids moyen en kg (approximatif) */
  weightRange?: { min: number; max: number };
}

// Classification des tailles:
// - small: < 4 kg (petits chats)
// - medium: 4-6 kg (chats moyens)
// - large: > 6 kg (grands chats)

export const CAT_BREEDS: CatBreed[] = [
  // Petits chats (< 4 kg)
  { name: "Abyssin", slug: "abyssin", size: "small", weightRange: { min: 3, max: 4.5 } },
  { name: "Balinais", slug: "balinais", size: "small", weightRange: { min: 2.5, max: 4 } },
  { name: "Burmese", slug: "burmese", size: "small", weightRange: { min: 3, max: 5 } },
  { name: "Ceylan", slug: "ceylan", size: "small", weightRange: { min: 3, max: 4 } },
  { name: "Cornish Rex", slug: "cornish-rex", size: "small", weightRange: { min: 2.5, max: 4 } },
  { name: "Devon Rex", slug: "devon-rex", size: "small", weightRange: { min: 2.5, max: 4 } },
  { name: "German Rex", slug: "german-rex", size: "small", weightRange: { min: 2.5, max: 4 } },
  { name: "Havana Brown", slug: "havana-brown", size: "small", weightRange: { min: 2.5, max: 4.5 } },
  { name: "Javanais", slug: "javanais", size: "small", weightRange: { min: 2.5, max: 4 } },
  { name: "Khao Manee", slug: "khao-manee", size: "small", weightRange: { min: 2.5, max: 4 } },
  { name: "Korat", slug: "korat", size: "small", weightRange: { min: 2.5, max: 4.5 } },
  { name: "LaPerm", slug: "laperm", size: "small", weightRange: { min: 2.5, max: 4 } },
  { name: "Mandarin", slug: "mandarin", size: "small", weightRange: { min: 2.5, max: 4 } },
  { name: "Munchkin", slug: "munchkin", size: "small", weightRange: { min: 2.3, max: 4 } },
  { name: "Oriental", slug: "oriental", size: "small", weightRange: { min: 3, max: 5 } },
  { name: "Peterbald", slug: "peterbald", size: "small", weightRange: { min: 2.5, max: 4.5 } },
  { name: "Selkirk Rex", slug: "selkirk-rex", size: "small", weightRange: { min: 3, max: 5 } },
  { name: "Siamois", slug: "siamois", size: "small", weightRange: { min: 2.5, max: 5 } },
  { name: "Singapura", slug: "singapura", size: "small", weightRange: { min: 1.8, max: 3 } },
  { name: "Snowshoe", slug: "snowshoe", size: "small", weightRange: { min: 2.5, max: 5 } },
  { name: "Sokoké", slug: "sokoke", size: "small", weightRange: { min: 2.5, max: 4.5 } },
  { name: "Somali", slug: "somali", size: "small", weightRange: { min: 3, max: 5 } },
  { name: "Sphynx", slug: "sphynx", size: "small", weightRange: { min: 3, max: 5 } },
  { name: "Thaï", slug: "thai", size: "small", weightRange: { min: 3, max: 5 } },
  { name: "Tiffany", slug: "tiffany", size: "small", weightRange: { min: 3, max: 5 } },
  { name: "Tonkinois", slug: "tonkinois", size: "small", weightRange: { min: 2.5, max: 5 } },
  { name: "Toyger", slug: "toyger", size: "small", weightRange: { min: 3, max: 5 } },

  // Chats moyens (4-6 kg)
  { name: "American Bobtail", slug: "american-bobtail", size: "medium", weightRange: { min: 3.5, max: 7 } },
  { name: "American Curl", slug: "american-curl", size: "medium", weightRange: { min: 3, max: 5.5 } },
  { name: "American Shorthair", slug: "american-shorthair", size: "medium", weightRange: { min: 3.5, max: 6 } },
  { name: "American Wirehair", slug: "american-wirehair", size: "medium", weightRange: { min: 3.5, max: 6 } },
  { name: "Angora Turc", slug: "angora-turc", size: "medium", weightRange: { min: 3, max: 5 } },
  { name: "Bengal", slug: "bengal", size: "medium", weightRange: { min: 4, max: 7 } },
  { name: "Bleu Russe", slug: "bleu-russe", size: "medium", weightRange: { min: 3, max: 5.5 } },
  { name: "Bombay", slug: "bombay", size: "medium", weightRange: { min: 3, max: 5 } },
  { name: "British Longhair", slug: "british-longhair", size: "medium", weightRange: { min: 4, max: 7 } },
  { name: "British Shorthair", slug: "british-shorthair", size: "medium", weightRange: { min: 4, max: 7 } },
  { name: "Burmilla", slug: "burmilla", size: "medium", weightRange: { min: 3.5, max: 5.5 } },
  { name: "California Spangled", slug: "california-spangled", size: "medium", weightRange: { min: 4, max: 7 } },
  { name: "Chartreux", slug: "chartreux", size: "medium", weightRange: { min: 4, max: 7 } },
  { name: "Chat de gouttière", slug: "chat-de-gouttiere", size: "medium", weightRange: { min: 3.5, max: 5 } },
  { name: "Chinchilla", slug: "chinchilla", size: "medium", weightRange: { min: 3.5, max: 6 } },
  { name: "Cymric", slug: "cymric", size: "medium", weightRange: { min: 3.5, max: 5.5 } },
  { name: "Donskoy", slug: "donskoy", size: "medium", weightRange: { min: 3.5, max: 6 } },
  { name: "Européen", slug: "europeen", size: "medium", weightRange: { min: 3.5, max: 5 } },
  { name: "Exotic Shorthair", slug: "exotic-shorthair", size: "medium", weightRange: { min: 3.5, max: 6 } },
  { name: "Highland Fold", slug: "highland-fold", size: "medium", weightRange: { min: 3, max: 6 } },
  { name: "Highland Straight", slug: "highland-straight", size: "medium", weightRange: { min: 3, max: 6 } },
  { name: "Japanese Bobtail", slug: "japanese-bobtail", size: "medium", weightRange: { min: 2.5, max: 4.5 } },
  { name: "Kurilian Bobtail", slug: "kurilian-bobtail", size: "medium", weightRange: { min: 3.5, max: 6 } },
  { name: "Manx", slug: "manx", size: "medium", weightRange: { min: 3.5, max: 5.5 } },
  { name: "Mau Égyptien", slug: "mau-egyptien", size: "medium", weightRange: { min: 3, max: 5 } },
  { name: "Nebelung", slug: "nebelung", size: "medium", weightRange: { min: 3.5, max: 6 } },
  { name: "Ocicat", slug: "ocicat", size: "medium", weightRange: { min: 4, max: 6 } },
  { name: "Ojos Azules", slug: "ojos-azules", size: "medium", weightRange: { min: 3, max: 5 } },
  { name: "Persan", slug: "persan", size: "medium", weightRange: { min: 3.5, max: 7 } },
  { name: "Pixie-Bob", slug: "pixie-bob", size: "medium", weightRange: { min: 4, max: 8 } },
  { name: "Sacré de Birmanie", slug: "sacre-de-birmanie", size: "medium", weightRange: { min: 4, max: 6 } },
  { name: "Scottish Fold", slug: "scottish-fold", size: "medium", weightRange: { min: 3, max: 6 } },
  { name: "Scottish Straight", slug: "scottish-straight", size: "medium", weightRange: { min: 3, max: 6 } },
  { name: "Serengeti", slug: "serengeti", size: "medium", weightRange: { min: 4, max: 7 } },
  { name: "Sibérien", slug: "siberien", size: "medium", weightRange: { min: 4, max: 8 } },
  { name: "Skogkatt", slug: "skogkatt", size: "medium", weightRange: { min: 4, max: 7 } },
  { name: "Turc de Van", slug: "turc-de-van", size: "medium", weightRange: { min: 4, max: 8 } },
  { name: "York Chocolat", slug: "york-chocolat", size: "medium", weightRange: { min: 4, max: 7 } },

  // Grands chats (> 6 kg)
  { name: "Chausie", slug: "chausie", size: "large", weightRange: { min: 6, max: 11 } },
  { name: "Highland Lynx", slug: "highland-lynx", size: "large", weightRange: { min: 5, max: 9 } },
  { name: "Maine Coon", slug: "maine-coon", size: "large", weightRange: { min: 5, max: 10 } },
  { name: "Norvégien", slug: "norvegien", size: "large", weightRange: { min: 4, max: 9 } },
  { name: "Ragamuffin", slug: "ragamuffin", size: "large", weightRange: { min: 4.5, max: 9 } },
  { name: "Ragdoll", slug: "ragdoll", size: "large", weightRange: { min: 5, max: 9 } },
  { name: "Savannah", slug: "savannah", size: "large", weightRange: { min: 6, max: 14 } },
];

// Liste triée par nom pour l'autocomplétion
export const CAT_BREEDS_SORTED = [...CAT_BREEDS].sort((a, b) =>
  a.name.localeCompare(b.name, "fr")
);

// Map slug -> race pour lookup rapide
export const CAT_BREED_BY_SLUG = new Map(
  CAT_BREEDS.map((breed) => [breed.slug, breed])
);

// Map nom -> race pour lookup rapide
export const CAT_BREED_BY_NAME = new Map(
  CAT_BREEDS.map((breed) => [breed.name.toLowerCase(), breed])
);

// Labels des tailles
export const CAT_SIZE_LABELS: Record<CatSize, string> = {
  small: "Petit (< 4 kg)",
  medium: "Moyen (4-6 kg)",
  large: "Grand (> 6 kg)",
};

// Tranches de poids pour déterminer la taille
export const CAT_WEIGHT_RANGES = {
  small: { min: 0, max: 4, label: "Petit (moins de 4 kg)" },
  medium: { min: 4, max: 6, label: "Moyen (4 à 6 kg)" },
  large: { min: 6, max: Infinity, label: "Grand (plus de 6 kg)" },
} as const;

/**
 * Détermine la taille du chat à partir de son poids
 */
export function getCatSizeFromWeight(weightKg: number): CatSize {
  if (weightKg < 4) return "small";
  if (weightKg <= 6) return "medium";
  return "large";
}

/**
 * Recherche des races de chat correspondant à une requête
 * @param query - Texte de recherche
 * @param limit - Nombre maximum de résultats (défaut: 10)
 * @returns Liste des races correspondantes
 */
export function searchCatBreeds(query: string, limit: number = 10): CatBreed[] {
  if (!query || query.length < 1) {
    return CAT_BREEDS_SORTED.slice(0, limit);
  }

  const normalizedQuery = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const results = CAT_BREEDS_SORTED.filter((breed) => {
    const normalizedName = breed.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const normalizedSlug = breed.slug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return (
      normalizedName.includes(normalizedQuery) ||
      normalizedSlug.includes(normalizedQuery)
    );
  });

  // Trier par pertinence (commence par > contient)
  results.sort((a, b) => {
    const aName = a.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const bName = b.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const aStartsWith = aName.startsWith(normalizedQuery);
    const bStartsWith = bName.startsWith(normalizedQuery);

    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    return a.name.localeCompare(b.name, "fr");
  });

  return results.slice(0, limit);
}

/**
 * Vérifie si un nom de race existe dans la liste
 */
export function isCatBreedValid(breedName: string): boolean {
  const normalized = breedName.toLowerCase().trim();
  return CAT_BREEDS.some(
    (breed) =>
      breed.name.toLowerCase() === normalized ||
      breed.slug === normalized
  );
}

/**
 * Récupère une race par son slug ou son nom
 */
export function getCatBreed(slugOrName: string): CatBreed | undefined {
  const normalized = slugOrName.toLowerCase().trim();
  return CAT_BREED_BY_SLUG.get(normalized) || CAT_BREED_BY_NAME.get(normalized);
}
