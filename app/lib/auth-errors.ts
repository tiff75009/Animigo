export const AUTH_ERRORS = {
  // Validation
  INVALID_EMAIL: "Adresse email invalide",
  INVALID_PASSWORD:
    "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre",
  INVALID_PHONE: "Numéro de téléphone invalide (format: 06 12 34 56 78)",
  INVALID_SIRET: "Numéro SIRET invalide (14 chiffres)",
  PASSWORDS_DONT_MATCH: "Les mots de passe ne correspondent pas",
  REQUIRED_FIELD: "Ce champ est obligatoire",
  CGU_REQUIRED: "Vous devez accepter les conditions générales d'utilisation",

  // Auth
  EMAIL_EXISTS: "Un compte existe déjà avec cette adresse email",
  SIRET_EXISTS: "Ce numéro SIRET est déjà utilisé",
  INVALID_CREDENTIALS: "Email ou mot de passe incorrect",
  ACCOUNT_DISABLED: "Ce compte a été désactivé",
  SESSION_EXPIRED: "Votre session a expiré, veuillez vous reconnecter",

  // Génériques
  NETWORK_ERROR: "Erreur de connexion, vérifiez votre connexion internet",
  UNKNOWN_ERROR: "Une erreur inattendue s'est produite",
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERRORS;

export function getAuthErrorMessage(code: AuthErrorCode | string): string {
  if (code in AUTH_ERRORS) {
    return AUTH_ERRORS[code as AuthErrorCode];
  }
  return AUTH_ERRORS.UNKNOWN_ERROR;
}
