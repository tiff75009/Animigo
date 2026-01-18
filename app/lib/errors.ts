/**
 * Utilitaires de gestion des erreurs
 * Parse les erreurs Convex et retourne des messages utilisateur-friendly
 */

// Mapping des messages d'erreur techniques vers des messages utilisateur
const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  // Authentification
  "Identifiants invalides": {
    title: "Connexion échouée",
    message: "Email ou mot de passe incorrect. Veuillez réessayer.",
  },
  "Session invalide ou expirée": {
    title: "Session expirée",
    message: "Votre session a expiré. Veuillez vous reconnecter.",
  },
  "Ce compte a été désactivé": {
    title: "Compte désactivé",
    message: "Ce compte a été désactivé. Contactez l'administrateur.",
  },
  "Utilisateur inactif": {
    title: "Compte inactif",
    message: "Votre compte est inactif. Contactez le support.",
  },
  "Accès refusé: droits administrateur requis": {
    title: "Accès refusé",
    message: "Vous n'avez pas les droits nécessaires pour cette action.",
  },

  // Inscription
  "Email déjà utilisé": {
    title: "Email déjà utilisé",
    message: "Un compte existe déjà avec cette adresse email.",
  },
  "Mot de passe trop faible": {
    title: "Mot de passe trop faible",
    message: "Le mot de passe doit contenir au moins 8 caractères.",
  },

  // Profil / Services
  "Profil non trouvé": {
    title: "Profil introuvable",
    message: "Le profil demandé n'existe pas ou a été supprimé.",
  },
  "Service non trouvé": {
    title: "Service introuvable",
    message: "Le service demandé n'existe pas ou a été supprimé.",
  },

  // Réseau / Technique
  "Failed to fetch": {
    title: "Erreur de connexion",
    message: "Impossible de contacter le serveur. Vérifiez votre connexion.",
  },
  "Network request failed": {
    title: "Erreur réseau",
    message: "La connexion au serveur a échoué. Réessayez dans quelques instants.",
  },
  "Server Error": {
    title: "Erreur serveur",
    message: "Le serveur a rencontré une erreur. Réessayez dans quelques instants.",
  },
  "Internal Server Error": {
    title: "Erreur serveur",
    message: "Une erreur interne s'est produite. Réessayez plus tard.",
  },
};

// Messages par défaut selon le type d'erreur
const DEFAULT_ERRORS = {
  network: {
    title: "Erreur de connexion",
    message: "Impossible de contacter le serveur.",
  },
  validation: {
    title: "Données invalides",
    message: "Veuillez vérifier les informations saisies.",
  },
  unauthorized: {
    title: "Non autorisé",
    message: "Vous devez vous connecter pour effectuer cette action.",
  },
  forbidden: {
    title: "Accès refusé",
    message: "Vous n'avez pas les droits nécessaires.",
  },
  notFound: {
    title: "Introuvable",
    message: "La ressource demandée n'existe pas.",
  },
  generic: {
    title: "Une erreur est survenue",
    message: "Veuillez réessayer. Si le problème persiste, contactez le support.",
  },
};

/**
 * Extrait le message d'erreur depuis une erreur Convex ou standard
 */
function extractErrorMessage(error: unknown): string {
  // Convex errors ont une propriété 'data' avec le message
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;

    // ConvexError stocke le message dans 'data'
    if ("data" in err && typeof err.data === "string") {
      return err.data;
    }

    // Parfois dans 'message'
    if ("message" in err && typeof err.message === "string") {
      let message = err.message;
      // Nettoyer les préfixes Convex
      message = message.replace(/^Uncaught ConvexError:\s*/i, "");
      message = message.replace(/^Uncaught Error:\s*/i, "");
      message = message.replace(/^ConvexError:\s*/i, "");
      message = message.replace(/^Error:\s*/i, "");
      return message.trim();
    }
  }

  if (error instanceof Error) {
    let message = error.message;
    message = message.replace(/^Uncaught ConvexError:\s*/i, "");
    message = message.replace(/^Uncaught Error:\s*/i, "");
    message = message.replace(/^ConvexError:\s*/i, "");
    message = message.replace(/^Error:\s*/i, "");
    return message.trim();
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
}

/**
 * Parse une erreur et retourne un message user-friendly
 */
export function parseError(error: unknown): { title: string; message: string } {
  const rawMessage = extractErrorMessage(error);

  // Debug en dev
  if (process.env.NODE_ENV === "development") {
    console.log("[Error Parser] Raw error:", error);
    console.log("[Error Parser] Extracted message:", rawMessage);
  }

  // Chercher dans le mapping (correspondance exacte)
  if (rawMessage && ERROR_MESSAGES[rawMessage]) {
    return ERROR_MESSAGES[rawMessage];
  }

  // Chercher une correspondance partielle
  const lowerMessage = rawMessage.toLowerCase();
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value;
    }
  }

  // Détecter le type d'erreur par mots-clés
  if (
    lowerMessage.includes("fetch") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("connexion") ||
    lowerMessage.includes("server error")
  ) {
    return DEFAULT_ERRORS.network;
  }

  if (
    lowerMessage.includes("session") ||
    lowerMessage.includes("token") ||
    lowerMessage.includes("authentif")
  ) {
    return DEFAULT_ERRORS.unauthorized;
  }

  if (
    lowerMessage.includes("accès") ||
    lowerMessage.includes("permission") ||
    lowerMessage.includes("refusé")
  ) {
    return DEFAULT_ERRORS.forbidden;
  }

  if (lowerMessage.includes("trouvé") || lowerMessage.includes("existe pas")) {
    return DEFAULT_ERRORS.notFound;
  }

  // Si on a un message raw, l'utiliser comme message d'erreur
  if (rawMessage && rawMessage.length > 0 && rawMessage.length < 200) {
    return {
      title: "Erreur",
      message: rawMessage,
    };
  }

  // Message générique en dernier recours
  return DEFAULT_ERRORS.generic;
}

/**
 * Vérifie si l'erreur est une erreur de session expirée
 */
export function isSessionExpiredError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  return (
    message.includes("session invalide") ||
    message.includes("session expirée") ||
    message.includes("expired")
  );
}

/**
 * Vérifie si l'erreur est une erreur réseau
 */
export function isNetworkError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  return (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("connexion")
  );
}
