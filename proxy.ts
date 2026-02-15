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
 * Normaliser l'IP (enlever le préfixe IPv6-mapped)
 */
function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }
  return ip;
}

/**
 * Récupérer l'IP du client depuis les headers de la requête originale
 */
function getClientIp(request: NextRequest): string {
  const headersToCheck = [
    "cf-connecting-ip",       // Cloudflare
    "true-client-ip",         // Akamai/Cloudflare Enterprise
    "x-vercel-forwarded-for", // Vercel
    "x-vercel-ip",            // Vercel (alternative)
    "x-real-ip",              // Nginx
    "x-forwarded-for",        // Standard
  ];

  for (const header of headersToCheck) {
    const value = request.headers.get(header);
    if (value) {
      const ip = value.split(",")[0].trim();
      if (ip) return normalizeIp(ip);
    }
  }

  return "unknown";
}

/**
 * Récupère l'URL de base pour les appels API
 */
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";

  if (host) {
    return `${protocol}://${host}`;
  }

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
    // 3. Déterminer l'IP du client depuis les headers originaux du middleware
    const clientIp = getClientIp(request);

    // 4. Appeler l'API de statut en passant l'IP explicitement
    //    (les headers IP se perdent lors d'un fetch interne)
    const baseUrl = getBaseUrl(request);
    const statusUrl = `${baseUrl}/api/maintenance/status?middlewareIp=${encodeURIComponent(clientIp)}`;

    const response = await fetch(statusUrl);

    if (!response.ok) {
      console.error("Maintenance status check failed:", response.status);
      return NextResponse.next();
    }

    const data = await response.json();

    // 5. Si maintenance OFF ou IP approuvée → laisser passer
    if (!data.maintenanceEnabled || data.isApproved) {
      return NextResponse.next();
    }

    // 6. Mode maintenance ON et IP non approuvée → redirect vers /maintenance
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
