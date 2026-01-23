// Helper functions for the platform

export function formatPrice(cents: number): string {
  const euros = cents / 100;
  // Si le montant a des centimes, les afficher
  if (euros % 1 !== 0) {
    return euros.toFixed(2).replace(".", ",") + "\u00A0€";
  }
  return euros.toFixed(0) + "\u00A0€";
}

export function extractCity(location: string): string {
  if (!location) return "";

  const parts = location.split(",").map((p) => p.trim());

  // Format: "123 Rue Example, 75001 Paris, France"
  // We want to extract "Paris"

  for (const part of parts) {
    // Check for French postal code pattern: "75001 Paris"
    const postalCodeMatch = part.match(/^\d{5}\s+(.+)$/);
    if (postalCodeMatch) {
      return postalCodeMatch[1];
    }
  }

  // If we have multiple parts, the city is usually the second part (after street address)
  // or we can look for a part that doesn't start with a number (not a street address)
  if (parts.length >= 2) {
    // Skip the first part if it looks like a street address (starts with number)
    const firstPart = parts[0];
    if (/^\d/.test(firstPart)) {
      // First part is street, second should be postal code + city
      const secondPart = parts[1];
      // Extract city from "75001 Paris" format
      const cityMatch = secondPart.match(/^\d{5}\s+(.+)$/);
      if (cityMatch) {
        return cityMatch[1];
      }
      // If no postal code, just return the second part
      return secondPart;
    }
    // First part doesn't start with number, it might be the city directly
    return firstPart;
  }

  return parts[0] || location;
}

export function formatDistance(distance: number | undefined): string | null {
  if (distance === undefined || distance === null) return null;

  // Pour la vie privée, ne pas afficher les distances précises en dessous de 1 km
  if (distance < 1) {
    return "à moins d'1 km";
  } else {
    return `à environ ${Math.round(distance)} km`;
  }
}

export const priceUnitLabels: Record<string, string> = {
  hour: "/h",
  day: "/jour",
  week: "/sem",
  month: "/mois",
  flat: "",
};
