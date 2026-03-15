// @ts-nocheck
/**
 * Rate limiting helper pour Convex mutations.
 * Utilise une fenêtre glissante avec la table `rateLimits`.
 */

/**
 * Vérifie et applique le rate limit.
 * @returns true si la requête est autorisée, false si rate limited.
 * @throws Error avec message si bloqué (pour retourner une erreur claire).
 */
export async function checkRateLimit(
  ctx: any,
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<void> {
  const now = Date.now();
  const windowStart = now - windowMs;

  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();

  if (existing) {
    // Filtrer les timestamps hors de la fenêtre
    const activeTimestamps = existing.timestamps.filter(
      (t: number) => t > windowStart
    );

    if (activeTimestamps.length >= maxRequests) {
      throw new Error("Trop de tentatives. Veuillez réessayer plus tard.");
    }

    // Ajouter le timestamp actuel
    await ctx.db.patch(existing._id, {
      timestamps: [...activeTimestamps, now],
      updatedAt: now,
    });
  } else {
    // Première requête pour cette clé
    await ctx.db.insert("rateLimits", {
      key,
      timestamps: [now],
      updatedAt: now,
    });
  }
}
