"use client";

/**
 * Cache côté client pour les résultats de recherche
 * Évite les appels API redondants quand les filtres n'ont pas changé
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache global partagé entre tous les hooks
const searchCache = new Map<string, CacheEntry<unknown>>();

// TTL par défaut : 2 minutes
const DEFAULT_TTL_MS = 2 * 60 * 1000;

// Taille max du cache (évite les fuites mémoire)
const MAX_CACHE_SIZE = 100;

/**
 * Génère une clé de cache à partir des arguments de recherche
 */
export function generateCacheKey(prefix: string, args: Record<string, unknown>): string {
  // Trier les clés pour garantir une clé stable
  const sortedArgs = Object.keys(args)
    .sort()
    .reduce((acc, key) => {
      const value = args[key];
      // Ignorer les valeurs undefined/null
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

  return `${prefix}:${JSON.stringify(sortedArgs)}`;
}

/**
 * Récupère une entrée du cache si elle existe et n'est pas expirée
 */
export function getFromCache<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  const entry = searchCache.get(key) as CacheEntry<T> | undefined;

  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now - entry.timestamp > ttlMs) {
    // Entrée expirée, la supprimer
    searchCache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Ajoute une entrée au cache
 */
export function setInCache<T>(key: string, data: T): void {
  // Nettoyer le cache si trop gros
  if (searchCache.size >= MAX_CACHE_SIZE) {
    // Supprimer les entrées les plus anciennes
    const entries = Array.from(searchCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Supprimer la moitié des entrées les plus anciennes
    const toDelete = entries.slice(0, Math.floor(MAX_CACHE_SIZE / 2));
    for (const [k] of toDelete) {
      searchCache.delete(k);
    }
  }

  searchCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Invalide une entrée du cache
 */
export function invalidateCache(key: string): void {
  searchCache.delete(key);
}

/**
 * Invalide toutes les entrées avec un préfixe donné
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of searchCache.keys()) {
    if (key.startsWith(prefix)) {
      searchCache.delete(key);
    }
  }
}

/**
 * Vide tout le cache
 */
export function clearCache(): void {
  searchCache.clear();
}

/**
 * Retourne les stats du cache (pour debug)
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: searchCache.size,
    keys: Array.from(searchCache.keys()),
  };
}
