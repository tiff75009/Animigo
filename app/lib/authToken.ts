/**
 * Gestion des tokens d'authentification via cookies httpOnly.
 * Remplace localStorage pour protéger contre les attaques XSS.
 *
 * Les tokens sont stockés dans des cookies httpOnly (côté serveur)
 * et mis en cache en mémoire (côté client) pour les requêtes Convex.
 */

// Cache mémoire (non accessible depuis le DOM/console, contrairement à localStorage)
let authTokenCache: string | null = null;
let adminTokenCache: string | null = null;
let initialized = false;

/**
 * Initialise les tokens depuis les cookies httpOnly.
 * Appelé une seule fois au démarrage de l'app.
 */
export async function initAuthTokens(): Promise<{
  authToken: string | null;
  adminToken: string | null;
}> {
  if (typeof window === "undefined") {
    return { authToken: null, adminToken: null };
  }

  try {
    const res = await fetch("/api/auth/token", { credentials: "include" });
    if (!res.ok) return { authToken: null, adminToken: null };

    const data = await res.json();
    authTokenCache = data.authToken || null;
    adminTokenCache = data.adminToken || null;
    initialized = true;

    return { authToken: authTokenCache, adminToken: adminTokenCache };
  } catch {
    return { authToken: null, adminToken: null };
  }
}

/** Récupère le token auth depuis le cache mémoire */
export function getAuthToken(): string | null {
  // Fallback localStorage pendant la migration
  if (!initialized && typeof window !== "undefined") {
    const lsToken = localStorage.getItem("auth_token");
    if (lsToken) return lsToken;
  }
  return authTokenCache;
}

/** Récupère le token admin depuis le cache mémoire */
export function getAdminToken(): string | null {
  if (!initialized && typeof window !== "undefined") {
    const lsToken = localStorage.getItem("admin_token");
    if (lsToken) return lsToken;
  }
  return adminTokenCache;
}

/** Stocke le token auth dans un cookie httpOnly + cache mémoire */
export async function setAuthToken(token: string): Promise<void> {
  authTokenCache = token;

  // Stocker dans le cookie httpOnly
  try {
    await fetch("/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, type: "auth" }),
      credentials: "include",
    });
  } catch {
    // Fallback silencieux
  }

  // Nettoyer localStorage (migration progressive)
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
  }
}

/** Stocke le token admin dans un cookie httpOnly + cache mémoire */
export async function setAdminToken(token: string): Promise<void> {
  adminTokenCache = token;
  authTokenCache = token;

  try {
    await fetch("/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, type: "admin" }),
      credentials: "include",
    });
  } catch {
    // Fallback silencieux
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("auth_token");
  }
}

/** Supprime les tokens (déconnexion) */
export async function clearAuthTokens(type: "all" | "admin" | "auth" = "all"): Promise<void> {
  if (type === "all" || type === "auth") {
    authTokenCache = null;
  }
  if (type === "all" || type === "admin") {
    adminTokenCache = null;
  }

  try {
    await fetch("/api/auth/token", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
      credentials: "include",
    });
  } catch {
    // Fallback silencieux
  }

  // Nettoyer localStorage
  if (typeof window !== "undefined") {
    if (type === "all" || type === "auth") localStorage.removeItem("auth_token");
    if (type === "all" || type === "admin") localStorage.removeItem("admin_token");
    if (type === "all") localStorage.removeItem("user");
  }
}
