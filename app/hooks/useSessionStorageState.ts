"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Hook équivalent à `useState` qui persiste la valeur dans `sessionStorage`.
 *
 * - Survit à un F5 (rafraîchissement de page)
 * - Réinitialisé à la fermeture de l'onglet (sessionStorage scope)
 * - Idéal pour la progression d'un wizard sans pollution d'URL
 *
 * Sécurité :
 * - SSR-safe : la valeur initiale est utilisée tant que `window` n'est pas dispo
 * - L'hydratation se fait dans un `useEffect` pour éviter les mismatches
 * - Le serializer/deserializer par défaut est `JSON.stringify` / `JSON.parse`
 *
 * @param key Clé sessionStorage. Préfixer pour éviter les collisions (ex. `"booking:announcer:abc"`)
 * @param initialValue Valeur initiale si rien en storage (ou si parsing échoue)
 */
export function useSessionStorageState<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  // On stocke la valeur initiale telle quelle pendant le SSR, puis on
  // ré-hydrate côté client dans un useEffect (évite les hydration mismatches).
  const [value, setValue] = useState<T>(initialValue);
  const hasHydrated = useRef(false);

  // Hydratation : au premier mount côté client, on lit le storage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw !== null) {
        setValue(JSON.parse(raw) as T);
      }
    } catch (e) {
      // Parsing échoué (ancien schéma stocké, etc.) : on garde initialValue
      // et on nettoie l'entrée corrompue.
      console.warn(`[useSessionStorageState] Reset clé invalide "${key}":`, e);
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    } finally {
      hasHydrated.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Écriture : à chaque changement de `value`, après hydratation.
  useEffect(() => {
    if (!hasHydrated.current) return;
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Quota dépassé / mode privé sans storage : on ne casse rien
      console.warn(`[useSessionStorageState] Échec écriture "${key}":`, e);
    }
  }, [key, value]);

  // Reset explicite (vide le storage et restaure initialValue)
  const reset = useCallback(() => {
    setValue(initialValue);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, setValue, reset];
}
