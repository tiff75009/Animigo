import { action, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { getRegionFromDepartment } from "../utils/location";

// Query interne pour récupérer la clé API Google Maps
export const getApiKeyInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("systemConfig")
      .filter((q) => q.eq(q.field("key"), "google_maps_api_key"))
      .first();
    return config?.value || null;
  },
});

// Types pour les prédictions d'autocomplete
interface AutocompletePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

// Types pour les détails d'un lieu
interface PlaceDetails {
  address: string;
  city: string;
  postalCode: string;
  department: string;
  region: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  placeId: string;
}

// Recherche d'adresses avec autocomplete (Places API)
export const searchAddress = action({
  args: {
    query: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    predictions?: AutocompletePrediction[];
    error?: string;
  }> => {
    if (!args.query || args.query.length < 3) {
      return { success: true, predictions: [] };
    }

    // Récupérer la clé API
    const apiKey = await ctx.runQuery(internal.api.googleMaps.getApiKeyInternal);
    console.log("Google Maps API Key:", apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : "NOT CONFIGURED");

    if (!apiKey) {
      return {
        success: false,
        error: "API Google Maps non configurée",
      };
    }

    try {
      // Construire l'URL de l'API Places Autocomplete
      const params = new URLSearchParams({
        input: args.query,
        key: apiKey,
        types: "address",
        components: "country:fr", // Limiter à la France
        language: "fr",
      });

      if (args.sessionToken) {
        params.append("sessiontoken", args.sessionToken);
      }

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
      console.log("Google Maps API URL:", url.replace(apiKey, "API_KEY_HIDDEN"));

      const response = await fetch(url);

      if (!response.ok) {
        console.log("Google Maps API HTTP error:", response.status);
        return {
          success: false,
          error: `Erreur API Google Maps (${response.status})`,
        };
      }

      const data = await response.json();
      console.log("Google Maps API response status:", data.status);
      if (data.error_message) {
        console.log("Google Maps API error_message:", data.error_message);
      }

      if (data.status === "REQUEST_DENIED") {
        return {
          success: false,
          error: `Clé API refusée: ${data.error_message || "Vérifiez les restrictions de la clé"}`,
        };
      }

      if (data.status === "OVER_QUERY_LIMIT") {
        return {
          success: false,
          error: "Quota API Google Maps dépassé",
        };
      }

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        return {
          success: false,
          error: `Erreur Google Maps: ${data.status}`,
        };
      }

      // Transformer les prédictions
      const predictions: AutocompletePrediction[] = (data.predictions || []).map(
        (p: {
          place_id: string;
          description: string;
          structured_formatting?: {
            main_text?: string;
            secondary_text?: string;
          };
        }) => ({
          placeId: p.place_id,
          description: p.description,
          mainText: p.structured_formatting?.main_text || p.description,
          secondaryText: p.structured_formatting?.secondary_text || "",
        })
      );

      return { success: true, predictions };
    } catch (error) {
      console.error("Erreur searchAddress:", error);
      return {
        success: false,
        error: "Impossible de contacter l'API Google Maps",
      };
    }
  },
});

// Récupérer les détails d'un lieu (coordonnées, adresse structurée)
export const getPlaceDetails = action({
  args: {
    placeId: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    details?: PlaceDetails;
    error?: string;
  }> => {
    // Récupérer la clé API
    const apiKey = await ctx.runQuery(internal.api.googleMaps.getApiKeyInternal);

    if (!apiKey) {
      return {
        success: false,
        error: "API Google Maps non configurée",
      };
    }

    try {
      // Construire l'URL de l'API Place Details
      const params = new URLSearchParams({
        place_id: args.placeId,
        key: apiKey,
        fields: "formatted_address,geometry,address_components",
        language: "fr",
      });

      if (args.sessionToken) {
        params.append("sessiontoken", args.sessionToken);
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?${params}`
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Erreur API Google Maps (${response.status})`,
        };
      }

      const data = await response.json();

      if (data.status !== "OK") {
        return {
          success: false,
          error: `Erreur Google Maps: ${data.status}`,
        };
      }

      const result = data.result;
      const addressComponents = result.address_components || [];

      // Extraire les composants d'adresse
      let postalCode = "";
      let city = "";
      let department = "";
      let streetNumber = "";
      let route = "";

      for (const component of addressComponents) {
        const types = component.types as string[];

        if (types.includes("postal_code")) {
          postalCode = component.long_name;
        }
        if (types.includes("locality")) {
          city = component.long_name;
        }
        if (types.includes("administrative_area_level_2")) {
          // Département en France
          department = component.short_name;
        }
        if (types.includes("street_number")) {
          streetNumber = component.long_name;
        }
        if (types.includes("route")) {
          route = component.long_name;
        }
      }

      // Si pas de département trouvé, l'extraire du code postal
      if (!department && postalCode.length >= 2) {
        department = postalCode.substring(0, 2);
        // Cas spéciaux pour la Corse
        if (postalCode.startsWith("20")) {
          const postalNum = parseInt(postalCode, 10);
          if (postalNum >= 20000 && postalNum <= 20199) {
            department = "2A"; // Corse-du-Sud
          } else if (postalNum >= 20200 && postalNum <= 20999) {
            department = "2B"; // Haute-Corse
          }
        }
      }

      // Récupérer la région à partir du département
      const region = getRegionFromDepartment(department);

      // Construire l'adresse
      const addressParts = [];
      if (streetNumber) addressParts.push(streetNumber);
      if (route) addressParts.push(route);
      const address = addressParts.join(" ") || result.formatted_address || "";

      // Coordonnées
      const coordinates = {
        lat: result.geometry?.location?.lat || 0,
        lng: result.geometry?.location?.lng || 0,
      };

      const details: PlaceDetails = {
        address,
        city,
        postalCode,
        department,
        region,
        coordinates,
        placeId: args.placeId,
      };

      return { success: true, details };
    } catch (error) {
      console.error("Erreur getPlaceDetails:", error);
      return {
        success: false,
        error: "Impossible de contacter l'API Google Maps",
      };
    }
  },
});

// Géocodage d'une adresse (texte vers coordonnées)
export const geocodeAddress = action({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    coordinates?: { lat: number; lng: number };
    formattedAddress?: string;
    error?: string;
  }> => {
    if (!args.address) {
      return { success: false, error: "Adresse requise" };
    }

    // Récupérer la clé API
    const apiKey = await ctx.runQuery(internal.api.googleMaps.getApiKeyInternal);

    if (!apiKey) {
      return {
        success: false,
        error: "API Google Maps non configurée",
      };
    }

    try {
      const params = new URLSearchParams({
        address: args.address,
        key: apiKey,
        components: "country:FR",
        language: "fr",
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Erreur API Geocoding (${response.status})`,
        };
      }

      const data = await response.json();

      if (data.status !== "OK" || !data.results?.length) {
        return {
          success: false,
          error: "Adresse non trouvée",
        };
      }

      const result = data.results[0];

      return {
        success: true,
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
        formattedAddress: result.formatted_address,
      };
    } catch (error) {
      console.error("Erreur geocodeAddress:", error);
      return {
        success: false,
        error: "Impossible de contacter l'API Geocoding",
      };
    }
  },
});
