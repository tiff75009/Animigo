"use client";

import { useState, useCallback } from "react";

interface Coordinates {
  lat: number;
  lng: number;
}

interface UseGeolocationReturn {
  coordinates: Coordinates | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => Promise<Coordinates | null>;
}

export function useGeolocation(): UseGeolocationReturn {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async (): Promise<Coordinates | null> => {
    if (!navigator.geolocation) {
      setError("La géolocalisation n'est pas supportée par votre navigateur");
      return null;
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: Coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCoordinates(coords);
          setIsLoading(false);
          resolve(coords);
        },
        (err) => {
          let errorMessage = "Erreur de géolocalisation";
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = "Vous avez refusé l'accès à votre position";
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = "Position non disponible";
              break;
            case err.TIMEOUT:
              errorMessage = "Délai d'attente dépassé";
              break;
          }
          setError(errorMessage);
          setIsLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes cache
        }
      );
    });
  }, []);

  return {
    coordinates,
    isLoading,
    error,
    requestLocation,
  };
}
