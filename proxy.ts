import { NextRequest, NextResponse } from "next/server";

// Paths exclus du mode maintenance (toujours accessibles)
const EXCLUDED_PATHS = [
  "/maintenance",
  "/admin",
  "/api",
  "/_next",
  "/images",
  "/fonts",
  "/favicon",
];

// Extensions de fichiers statiques
const STATIC_EXTENSIONS = [
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".css",
  ".js",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
];

/**
 * Vérifie si le path est exclu du mode maintenance
 */
function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PATHS.some(
    (excluded) =>
      pathname === excluded ||
      pathname.startsWith(`${excluded}/`) ||
      pathname.startsWith(`${excluded}?`)
  );
}

/**
 * Vérifie si c'est un fichier statique
 */
function isStaticFile(pathname: string): boolean {
  return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

/**
 * Récupère l'URL de base pour les appels API
 */
function getBaseUrl(request: NextRequest): string {
  // En production, utiliser le host de la requête
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";

  if (host) {
    return `${protocol}://${host}`;
  }

  // Fallback pour le développement
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Bypass en développement local si configuré
  if (process.env.MAINTENANCE_BYPASS === "true") {
    return NextResponse.next();
  }

  // 1. Vérifier si path exclu → laisser passer
  if (isExcludedPath(pathname)) {
    return NextResponse.next();
  }

  // 2. Vérifier si fichier statique → laisser passer
  if (isStaticFile(pathname)) {
    return NextResponse.next();
  }

  // 2.5. En développement local (127.0.0.1 ou localhost), bypass
  const host = request.headers.get("host") || "";
  if (host.includes("localhost") || host.startsWith("127.0.0.1")) {
    return NextResponse.next();
  }

  try {
    // 3. Appeler l'API de statut maintenance
    const baseUrl = getBaseUrl(request);
    const statusUrl = `${baseUrl}/api/maintenance/status`;

    // Passer les headers de la requête originale pour obtenir la bonne IP
    const forwardedFor = request.headers.get("x-forwarded-for") || "";
    const realIp = request.headers.get("x-real-ip") || "";

    const response = await fetch(statusUrl, {
      headers: {
        "x-forwarded-for": forwardedFor,
        "x-real-ip": realIp,
      },
      // Cache court pour éviter trop de requêtes
      next: { revalidate: 5 },
    });

    if (!response.ok) {
      // En cas d'erreur API, fail-open (laisser passer)
      console.error(
        "Maintenance status check failed:",
        response.status,
        response.statusText
      );
      return NextResponse.next();
    }

    const data = await response.json();

    // 4. Si maintenance OFF ou IP approuvée → laisser passer
    if (!data.maintenanceEnabled || data.isApproved) {
      return NextResponse.next();
    }

    // 5. Mode maintenance ON et IP non approuvée → redirect vers /maintenance
    const maintenanceUrl = new URL("/maintenance", request.url);
    return NextResponse.redirect(maintenanceUrl);
  } catch (error) {
    // En cas d'erreur, fail-open (éviter blocage total du site)
    console.error("Proxy error:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
