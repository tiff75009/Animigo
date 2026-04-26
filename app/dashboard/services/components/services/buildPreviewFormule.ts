import type { FormuleResult } from "@/app/components/platform/FormuleCard";
import type { LocalVariant } from "../VariantManager";
import type { AnnouncerPreviewData } from "./useAnnouncerPreviewData";
import { getVariantSessionPrice } from "@/app/lib/pricing";

interface ServiceCategoryLite {
  slug: string;
  name: string;
  icon?: string;
  isCapacityBased?: boolean;
  allowOvernightStay?: boolean;
  clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day";
}

export interface BuildPreviewArgs {
  category: ServiceCategoryLite | null;
  variant: LocalVariant | null;
  announcer: AnnouncerPreviewData;
  isSapEligible?: boolean;
  allowOvernightStay?: boolean;
  /** Description au niveau service (saisie en étape 1) — fallback si la variante n'en a pas. */
  serviceDescription?: string;
}

/**
 * Construit un FormuleResult partiel à partir des données du formulaire
 * et de l'annonceur connecté, pour alimenter l'aperçu <FormuleCardGrid>.
 *
 * Les champs non encore connus pendant la création (nextSlot, distance,
 * spotsLeft, capacity restante) sont laissés undefined → la card affiche
 * automatiquement un fallback "Dispo cette semaine".
 */
export function buildPreviewFormule({
  category,
  variant,
  announcer,
  isSapEligible,
  allowOvernightStay,
  serviceDescription,
}: BuildPreviewArgs): FormuleResult {
  // Photos uploadées par variante
  const servicePhotos =
    variant?.photos && variant.photos.length > 0
      ? variant.photos.map((url, order) => ({ url, order }))
      : undefined;

  // Prix & unité affichés.
  // - Garde (capacity-based) : prix journalier privilégié (pricing.daily)
  // - Collective ou multi-séances : prix réel d'UNE séance (price × duration / 60 si €/h)
  // - Standard : priceUnit + price tels que saisis
  const isGarde = !!category?.isCapacityBased;
  const isCollectiveOrMulti =
    variant?.sessionType === "collective" ||
    (variant?.numberOfSessions ?? 1) > 1;
  let displayPrice: number;
  let displayUnit: string;

  if (isGarde) {
    displayPrice =
      variant?.pricing?.daily ??
      variant?.pricing?.hourly ??
      variant?.price ??
      0;
    displayUnit = variant?.pricing?.daily
      ? "day"
      : variant?.priceUnit ?? "day";
  } else if (isCollectiveOrMulti && variant) {
    // Pour les formules collectives/multi-séances, afficher le prix RÉEL
    // d'une séance complète (en tenant compte de la durée).
    // On force priceUnit="flat" + pricingMode="per_session" sur la previewFormule
    // pour que tout consommateur (FormuleCardGrid, etc.) qui rappelle
    // getVariantSessionPrice retombe sur le même montant.
    displayPrice = getVariantSessionPrice(variant);
    displayUnit = "flat";
  } else {
    displayPrice = variant?.price ?? 0;
    displayUnit = variant?.priceUnit ?? "hour";
  }

  return {
    formuleId: "preview",
    formuleName: variant?.name?.trim() || "Nom de votre formule",
    formuleDescription:
      variant?.description?.trim() ||
      (variant?.objectives?.length
        ? variant.objectives.map((o) => o.text).join(" · ")
        : undefined) ||
      serviceDescription?.trim() ||
      undefined,
    price: displayPrice,
    priceUnit: displayUnit,
    duration: variant?.duration,
    // Si on a déjà calculé le prix par séance (collectif/multi),
    // on marque la previewFormule comme "per_session" pour que les
    // consommateurs aval n'appliquent pas une nouvelle fois ×duration/60.
    pricingMode: isCollectiveOrMulti
      ? "per_session"
      : (variant?.pricingMode as "per_session" | "per_hour" | undefined),
    sessionType: variant?.sessionType ?? "individual",
    serviceLocation: variant?.serviceLocation === "both" ? undefined : variant?.serviceLocation,
    numberOfSessions: variant?.numberOfSessions,
    serviceId: "preview",
    categorySlug: category?.slug ?? "",
    categoryName: category?.name ?? "Catégorie",
    categoryIcon: category?.icon,
    animalTypes: variant?.animalTypes ?? [],

    // Annonceur
    announcerId: announcer.id,
    announcerSlug: announcer.username,
    announcerFirstName: announcer.firstName,
    announcerLastName: announcer.lastName,
    announcerProfileImage: announcer.profileImage ?? undefined,
    announcerIsDisplayingLogo: announcer.isDisplayingLogo ?? false,
    announcerRating: announcer.rating,
    announcerReviewCount: announcer.reviewCount,
    announcerLocation: announcer.location,
    announcerVerified: announcer.verified,
    announcerStatusType: announcer.statusType,

    // SAP
    isSapEligible: isSapEligible || undefined,
    announcerSapApproved: announcer.sapApproved,

    // Pricing détaillé (multi-tarifs)
    pricing: variant?.pricing,
    clientBillingMode: category?.clientBillingMode,

    // Garde
    capacityInfo: category?.isCapacityBased
      ? {
          isCapacityBased: true,
          maxCapacity: variant?.maxAnimalsPerSession ?? 1,
          minRemainingCapacity: variant?.maxAnimalsPerSession ?? 1,
        }
      : undefined,
    gardeInfo:
      category?.isCapacityBased && allowOvernightStay
        ? { allowOvernightStay: true }
        : undefined,

    // Photos
    servicePhotos,

    // Disponibilités : non connues pendant la création
    nextSlot: undefined,
    collectiveSlots: undefined,
    spotsLeft: undefined,
    announcerDistance: undefined,
  };
}
