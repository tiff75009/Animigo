/**
 * Utilitaires pour la gestion des localisations françaises
 * Extraction de département, région à partir du code postal
 */

// Mapping département -> région (France métropolitaine + DOM-TOM)
const DEPARTMENT_TO_REGION: Record<string, string> = {
  // Auvergne-Rhône-Alpes
  "01": "Auvergne-Rhône-Alpes",
  "03": "Auvergne-Rhône-Alpes",
  "07": "Auvergne-Rhône-Alpes",
  "15": "Auvergne-Rhône-Alpes",
  "26": "Auvergne-Rhône-Alpes",
  "38": "Auvergne-Rhône-Alpes",
  "42": "Auvergne-Rhône-Alpes",
  "43": "Auvergne-Rhône-Alpes",
  "63": "Auvergne-Rhône-Alpes",
  "69": "Auvergne-Rhône-Alpes",
  "73": "Auvergne-Rhône-Alpes",
  "74": "Auvergne-Rhône-Alpes",

  // Bourgogne-Franche-Comté
  "21": "Bourgogne-Franche-Comté",
  "25": "Bourgogne-Franche-Comté",
  "39": "Bourgogne-Franche-Comté",
  "58": "Bourgogne-Franche-Comté",
  "70": "Bourgogne-Franche-Comté",
  "71": "Bourgogne-Franche-Comté",
  "89": "Bourgogne-Franche-Comté",
  "90": "Bourgogne-Franche-Comté",

  // Bretagne
  "22": "Bretagne",
  "29": "Bretagne",
  "35": "Bretagne",
  "56": "Bretagne",

  // Centre-Val de Loire
  "18": "Centre-Val de Loire",
  "28": "Centre-Val de Loire",
  "36": "Centre-Val de Loire",
  "37": "Centre-Val de Loire",
  "41": "Centre-Val de Loire",
  "45": "Centre-Val de Loire",

  // Corse
  "2A": "Corse",
  "2B": "Corse",

  // Grand Est
  "08": "Grand Est",
  "10": "Grand Est",
  "51": "Grand Est",
  "52": "Grand Est",
  "54": "Grand Est",
  "55": "Grand Est",
  "57": "Grand Est",
  "67": "Grand Est",
  "68": "Grand Est",
  "88": "Grand Est",

  // Hauts-de-France
  "02": "Hauts-de-France",
  "59": "Hauts-de-France",
  "60": "Hauts-de-France",
  "62": "Hauts-de-France",
  "80": "Hauts-de-France",

  // Île-de-France
  "75": "Île-de-France",
  "77": "Île-de-France",
  "78": "Île-de-France",
  "91": "Île-de-France",
  "92": "Île-de-France",
  "93": "Île-de-France",
  "94": "Île-de-France",
  "95": "Île-de-France",

  // Normandie
  "14": "Normandie",
  "27": "Normandie",
  "50": "Normandie",
  "61": "Normandie",
  "76": "Normandie",

  // Nouvelle-Aquitaine
  "16": "Nouvelle-Aquitaine",
  "17": "Nouvelle-Aquitaine",
  "19": "Nouvelle-Aquitaine",
  "23": "Nouvelle-Aquitaine",
  "24": "Nouvelle-Aquitaine",
  "33": "Nouvelle-Aquitaine",
  "40": "Nouvelle-Aquitaine",
  "47": "Nouvelle-Aquitaine",
  "64": "Nouvelle-Aquitaine",
  "79": "Nouvelle-Aquitaine",
  "86": "Nouvelle-Aquitaine",
  "87": "Nouvelle-Aquitaine",

  // Occitanie
  "09": "Occitanie",
  "11": "Occitanie",
  "12": "Occitanie",
  "30": "Occitanie",
  "31": "Occitanie",
  "32": "Occitanie",
  "34": "Occitanie",
  "46": "Occitanie",
  "48": "Occitanie",
  "65": "Occitanie",
  "66": "Occitanie",
  "81": "Occitanie",
  "82": "Occitanie",

  // Pays de la Loire
  "44": "Pays de la Loire",
  "49": "Pays de la Loire",
  "53": "Pays de la Loire",
  "72": "Pays de la Loire",
  "85": "Pays de la Loire",

  // Provence-Alpes-Côte d'Azur
  "04": "Provence-Alpes-Côte d'Azur",
  "05": "Provence-Alpes-Côte d'Azur",
  "06": "Provence-Alpes-Côte d'Azur",
  "13": "Provence-Alpes-Côte d'Azur",
  "83": "Provence-Alpes-Côte d'Azur",
  "84": "Provence-Alpes-Côte d'Azur",

  // DOM-TOM
  "971": "Guadeloupe",
  "972": "Martinique",
  "973": "Guyane",
  "974": "La Réunion",
  "976": "Mayotte",
};

/**
 * Extrait le code département à partir d'un code postal
 * Gère les cas spéciaux: Corse (2A, 2B) et DOM-TOM (97x)
 */
export function extractDepartmentFromPostalCode(postalCode: string): string | null {
  if (!postalCode || postalCode.length < 2) return null;

  // Nettoyer le code postal
  const cleanPostal = postalCode.replace(/\s/g, "").trim();

  // DOM-TOM: codes postaux commençant par 97 ou 98
  if (cleanPostal.startsWith("97") || cleanPostal.startsWith("98")) {
    return cleanPostal.substring(0, 3);
  }

  // Corse: codes postaux commençant par 20
  if (cleanPostal.startsWith("20")) {
    // 20000-20190 = Corse-du-Sud (2A)
    // 20200-20299 = Haute-Corse (2B)
    const num = parseInt(cleanPostal, 10);
    if (num >= 20000 && num < 20200) return "2A";
    if (num >= 20200 && num < 20300) return "2B";
    // Par défaut pour les codes postaux 20xxx
    return "2A";
  }

  // France métropolitaine: 2 premiers chiffres
  return cleanPostal.substring(0, 2);
}

/**
 * Retourne la région à partir du code département
 */
export function getRegionFromDepartment(department: string | null): string | null {
  if (!department) return null;
  return DEPARTMENT_TO_REGION[department] || null;
}

/**
 * Parse une chaîne de localisation pour extraire les composants
 * Essaie de trouver un code postal et déduit département/région
 */
export function parseLocationString(location: string | null | undefined): {
  city: string | null;
  postalCode: string | null;
  department: string | null;
  region: string | null;
} {
  if (!location) {
    return { city: null, postalCode: null, department: null, region: null };
  }

  // Chercher un code postal (5 chiffres)
  const postalMatch = location.match(/\b(\d{5})\b/);
  const postalCode = postalMatch ? postalMatch[1] : null;

  // Extraire département et région
  const department = postalCode ? extractDepartmentFromPostalCode(postalCode) : null;
  const region = department ? getRegionFromDepartment(department) : null;

  // Extraire la ville (texte sans le code postal)
  let cityStr = location;
  if (postalCode) {
    cityStr = location.replace(postalCode, "");
  }
  // Nettoyer la ville
  cityStr = cityStr
    .replace(/[,\-()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const city: string | null = cityStr || null;

  return { city, postalCode, department, region };
}

/**
 * Formate une localisation structurée en chaîne lisible
 */
export function formatLocation(data: {
  city?: string | null;
  postalCode?: string | null;
  department?: string | null;
  region?: string | null;
}): string {
  const parts: string[] = [];

  if (data.city) parts.push(data.city);
  if (data.postalCode) parts.push(`(${data.postalCode})`);

  return parts.join(" ") || "Non renseigné";
}

/**
 * Vérifie si deux localisations sont dans le même département
 */
export function isSameDepartment(
  dept1: string | null | undefined,
  dept2: string | null | undefined
): boolean {
  if (!dept1 || !dept2) return false;
  return dept1 === dept2;
}

/**
 * Vérifie si deux localisations sont dans la même région
 */
export function isSameRegion(
  region1: string | null | undefined,
  region2: string | null | undefined
): boolean {
  if (!region1 || !region2) return false;
  return region1 === region2;
}
