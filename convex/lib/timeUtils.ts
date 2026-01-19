// Utilitaires pour la gestion des créneaux horaires

/**
 * Convertir une heure "HH:MM" en minutes depuis minuit
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Ajouter des minutes à une heure "HH:MM"
 * Retourne le résultat au format "HH:MM"
 */
export function addMinutesToTime(time: string, minutes: number): string {
  const totalMinutes = parseTimeToMinutes(time) + minutes;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Vérifier si deux créneaux horaires se chevauchent sur une même journée
 * Les créneaux sont au format "HH:MM"
 */
export function timeSlotsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);
  // Chevauchement si : début1 < fin2 ET fin1 > début2
  return s1 < e2 && e1 > s2;
}

/**
 * Type pour représenter une mission avec dates et heures optionnelles
 */
export interface MissionTimeSlot {
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  startTime?: string; // "HH:MM"
  endTime?: string; // "HH:MM"
}

/**
 * Vérifier si deux missions se chevauchent (dates + heures)
 *
 * Logique :
 * - Si les dates ne se chevauchent pas du tout → pas de conflit
 * - Si une mission couvre plusieurs jours → blocage journée entière
 * - Si les deux missions sont sur le même jour unique → vérifier les heures
 * - Si pas d'heures définies → fallback sur journée entière (00:00-23:59)
 */
export function missionsOverlap(m1: MissionTimeSlot, m2: MissionTimeSlot): boolean {
  // Pas de chevauchement de dates = pas de conflit
  if (m1.startDate > m2.endDate || m1.endDate < m2.startDate) {
    return false;
  }

  // Si une des missions couvre plusieurs jours, on bloque la journée entière
  // (on ne peut pas être à 2 endroits différents)
  const m1MultiDay = m1.startDate !== m1.endDate;
  const m2MultiDay = m2.startDate !== m2.endDate;

  if (m1MultiDay || m2MultiDay) {
    // Pour les missions multi-jours, on vérifie seulement le chevauchement de dates
    return true;
  }

  // Les deux missions sont sur un seul jour chacune
  // Vérifier si c'est le même jour
  if (m1.startDate === m2.startDate) {
    // Même jour unique - vérifier les heures
    // Si pas d'heures définies, fallback sur journée entière
    const t1Start = m1.startTime || "00:00";
    const t1End = m1.endTime || "23:59";
    const t2Start = m2.startTime || "00:00";
    const t2End = m2.endTime || "23:59";

    return timeSlotsOverlap(t1Start, t1End, t2Start, t2End);
  }

  // Jours différents mais dans la même plage de dates
  // Cela ne devrait pas arriver si les deux sont single-day, mais par sécurité
  return false;
}
