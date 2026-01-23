// Utilitaires pour l'authentification

// Hash password avec PBKDF2 (Web Crypto API disponible dans Convex)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // Générer un salt aléatoire
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Hash avec PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${saltHex}:${hashHex}`;
}

// Vérifier un mot de passe
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const computedHash = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHash === hashHex;
}

// Générer un token de session
export function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Validation SIRET (14 chiffres, algorithme de Luhn)
export function validateSiret(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(siret[i], 10);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

// Validation email
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validation téléphone français
export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, "");
  return /^(0[1-9]|(\+33|0033)[1-9])\d{8}$/.test(cleaned);
}

// Validation mot de passe (min 8 car, 1 maj, 1 min, 1 chiffre)
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Le mot de passe doit contenir au moins 8 caractères");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une majuscule");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins une minuscule");
  }
  if (!/\d/.test(password)) {
    errors.push("Le mot de passe doit contenir au moins un chiffre");
  }

  return { valid: errors.length === 0, errors };
}

// Normaliser une chaîne pour créer un slug
// Supprime les accents, met en minuscule, remplace les espaces par des tirets
function normalizeForSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
    .replace(/[^a-z0-9\s-]/g, "") // Garder seulement lettres, chiffres, espaces, tirets
    .replace(/\s+/g, "-") // Remplacer espaces par tirets
    .replace(/-+/g, "-") // Supprimer tirets multiples
    .replace(/^-|-$/g, ""); // Supprimer tirets début/fin
}

// Générer un slug unique pour un utilisateur
// Format: "prenom-ville" ou "prenom-ville-2" si déjà pris
// Si pas de ville: "prenom" ou "prenom-2"
export async function generateUniqueSlug(
  db: any,
  firstName: string,
  city?: string | null,
  excludeUserId?: string
): Promise<string> {
  // Construire le slug de base: prenom-ville ou juste prenom
  const parts = [firstName];
  if (city && city.trim()) {
    parts.push(city.trim());
  }
  const baseSlug = normalizeForSlug(parts.join(" "));

  // Vérifier si le slug de base est disponible
  const existingBase = await db
    .query("users")
    .withIndex("by_slug", (q: any) => q.eq("slug", baseSlug))
    .first();

  // Si pas d'existant, ou si c'est le même utilisateur (mise à jour)
  if (!existingBase || (excludeUserId && existingBase._id === excludeUserId)) {
    return baseSlug;
  }

  // Sinon, chercher le prochain numéro disponible
  let counter = 2;
  while (true) {
    const candidateSlug = `${baseSlug}-${counter}`;
    const existing = await db
      .query("users")
      .withIndex("by_slug", (q: any) => q.eq("slug", candidateSlug))
      .first();

    // Disponible si pas d'existant ou si c'est le même utilisateur
    if (!existing || (excludeUserId && existing._id === excludeUserId)) {
      return candidateSlug;
    }
    counter++;

    // Sécurité : éviter boucle infinie (très improbable)
    if (counter > 1000) {
      // Fallback avec timestamp
      return `${baseSlug}-${Date.now()}`;
    }
  }
}
