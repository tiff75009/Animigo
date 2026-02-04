/**
 * Utilitaires géographiques pour l'optimisation des recherches
 * Phase 1 - Pré-filtrage par grille géographique (bounding box)
 */

/**
 * Calcul de distance avec la formule de Haversine (en km)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcule les valeurs de grille pour le pré-filtrage géographique
 * Grille de ~11km (0.1° de latitude = ~11.1km)
 *
 * @param lat Latitude
 * @param lng Longitude
 * @returns { latGrid, lngGrid } arrondis à la grille 0.1°
 */
export function calculateGeoGrid(lat: number, lng: number): { latGrid: number; lngGrid: number } {
  return {
    latGrid: Math.floor(lat * 10),
    lngGrid: Math.floor(lng * 10),
  };
}

/**
 * Calcule les cellules de grille à interroger pour un rayon donné
 *
 * @param centerLat Latitude du centre de recherche
 * @param centerLng Longitude du centre de recherche
 * @param radiusKm Rayon de recherche en km
 * @returns Liste des cellules de grille { latGrid, lngGrid } à interroger
 */
export function getGridCellsForRadius(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): Array<{ latGrid: number; lngGrid: number }> {
  // 1° latitude ≈ 111km, donc 0.1° ≈ 11.1km
  // Pour couvrir un rayon R, on doit chercher dans ceil(R / 11.1) cellules de chaque côté
  const cellSizeKm = 11.1;
  const cellsNeeded = Math.ceil(radiusKm / cellSizeKm);

  const centerLatGrid = Math.floor(centerLat * 10);
  const centerLngGrid = Math.floor(centerLng * 10);

  const cells: Array<{ latGrid: number; lngGrid: number }> = [];

  // Générer toutes les cellules dans le carré englobant
  for (let dLat = -cellsNeeded; dLat <= cellsNeeded; dLat++) {
    for (let dLng = -cellsNeeded; dLng <= cellsNeeded; dLng++) {
      cells.push({
        latGrid: centerLatGrid + dLat,
        lngGrid: centerLngGrid + dLng,
      });
    }
  }

  return cells;
}

/**
 * Calcule une approximation rapide de la distance (sans trigonométrie)
 * Utilisé pour le filtrage initial avant calcul Haversine précis
 * Précision: ±10% pour distances < 100km aux latitudes européennes
 *
 * @param lat1 Latitude point 1
 * @param lng1 Longitude point 1
 * @param lat2 Latitude point 2
 * @param lng2 Longitude point 2
 * @returns Distance approximative en km
 */
export function approximateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Approximation linéaire
  // 1° latitude ≈ 111km
  // 1° longitude ≈ 111km * cos(latitude moyenne)
  const avgLat = (lat1 + lat2) / 2;
  const latDiff = Math.abs(lat2 - lat1) * 111;
  const lngDiff = Math.abs(lng2 - lng1) * 111 * Math.cos(avgLat * Math.PI / 180);

  // Distance euclidienne approximative
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

/**
 * Vérifie rapidement si un point est potentiellement dans le rayon
 * (Bounding box check avant calcul Haversine précis)
 *
 * @param centerLat Centre de recherche - latitude
 * @param centerLng Centre de recherche - longitude
 * @param pointLat Point à tester - latitude
 * @param pointLng Point à tester - longitude
 * @param radiusKm Rayon en km
 * @returns true si le point est dans le bounding box (peut être dans le rayon)
 */
export function isInBoundingBox(
  centerLat: number,
  centerLng: number,
  pointLat: number,
  pointLng: number,
  radiusKm: number
): boolean {
  // Convertir le rayon en degrés (approximation)
  const latDelta = radiusKm / 111; // 1° lat ≈ 111km
  const lngDelta = radiusKm / (111 * Math.cos(centerLat * Math.PI / 180));

  return (
    pointLat >= centerLat - latDelta &&
    pointLat <= centerLat + latDelta &&
    pointLng >= centerLng - lngDelta &&
    pointLng <= centerLng + lngDelta
  );
}
