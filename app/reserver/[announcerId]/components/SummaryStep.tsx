"use client";

import React from "react";
import Image from "next/image";
import {
  AlertCircle,
  Clock,
  MapPin,
  Moon,
  Home,
  CalendarCheck,
  Users,
  Package,
  Plus,
  PawPrint,
  Edit2,
  Receipt,
  Check,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { ServiceDetail, ServiceVariant } from "./FormulaStep";
import type { ServiceOption } from "./OptionsStep";
import type { GuestDogData } from "./GuestDogVerification";
import AddressSection from "./AddressSection";
import { GuestAddressSelector } from "@/app/annonceur/[id]/components/booking";
import type { GuestAddress } from "@/app/annonceur/[id]/components/booking/types";

// Type pour les séances multi-sessions
interface SelectedSession {
  date: string;
  startTime: string;
  endTime: string;
}

// Type pour les créneaux collectifs
interface CollectiveSlotInfo {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
}

// Type pour les animaux de l'utilisateur (correspondant au retour de getUserAnimals)
interface UserAnimal {
  id: string;
  name: string;
  type: string;
  emoji?: string;
  breed?: string;
  primaryPhotoUrl?: string | null;
}

// Price calculation result interface (must match page.tsx)
interface PriceBreakdown {
  firstDayAmount: number;
  firstDayHours: number;
  firstDayIsFullDay: boolean;
  fullDays: number;
  fullDaysAmount: number;
  lastDayAmount: number;
  lastDayHours: number;
  lastDayIsFullDay: boolean;
  nightsAmount: number;
  nights: number;
  optionsAmount: number;
  totalAmount: number;
  hourlyRate: number;
  dailyRate: number;
  nightlyRate: number;
}

interface AnnouncerData {
  firstName: string;
  lastName?: string;
  profileImage: string | null;
  location: string;
  city?: string | null;
  postalCode?: string | null;
}

interface SummaryStepProps {
  announcer: AnnouncerData;
  selectedService: ServiceDetail;
  selectedVariant: ServiceVariant;
  selectedDate: string;
  selectedEndDate: string | null;
  selectedTime: string | null;
  selectedEndTime: string | null;
  includeOvernightStay: boolean;
  days: number;
  selectedOptionIds: string[];
  priceBreakdown: PriceBreakdown;
  serviceLocation: "announcer_home" | "client_home" | null;
  commissionRate?: number;
  isCollectiveFormula?: boolean;
  collectiveSlots?: CollectiveSlotInfo[];
  animalCount?: number;
  isMultiSessionIndividual?: boolean;
  selectedSessions?: SelectedSession[];
  userAnimals?: UserAnimal[] | null;
  selectedAnimalIds?: string[];
  sessionToken?: string | null;
  selectedAddressId?: string | null;
  onAddressSelect?: (addressId: string | null, addressData?: {
    address: string;
    city?: string;
    postalCode?: string;
    coordinates?: { lat: number; lng: number };
  }) => void;
  guestAddress?: GuestAddress | null;
  onGuestAddressChange?: (address: GuestAddress | null) => void;
  announcerCoordinates?: { lat: number; lng: number };
  guestDogData?: GuestDogData | null;
  billingInfo?: {
    billingUnit?: string;
    fullDays: number;
    halfDays: number;
    firstDayIsHalfDay?: boolean;
    lastDayIsHalfDay?: boolean;
  };
  clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day";
  stripeFeeRate?: number;
  vatRate?: number;
  isSapApplied?: boolean;
  sapVatRate?: number;
  announcerStatusType?: "particulier" | "micro_entrepreneur" | "professionnel";
  error: string | null;
}

// Helper functions
function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatHours(hours: number): string {
  if (hours === Math.floor(hours)) {
    return `${hours}h`;
  }
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h${minutes.toString().padStart(2, "0")}`;
}

export default function SummaryStep({
  announcer,
  selectedService,
  selectedVariant,
  selectedDate,
  selectedEndDate,
  selectedTime,
  selectedEndTime,
  includeOvernightStay,
  days,
  selectedOptionIds,
  priceBreakdown,
  serviceLocation,
  commissionRate = 15,
  isCollectiveFormula = false,
  collectiveSlots = [],
  animalCount = 1,
  isMultiSessionIndividual = false,
  selectedSessions = [],
  userAnimals = null,
  selectedAnimalIds = [],
  sessionToken = null,
  selectedAddressId = null,
  onAddressSelect,
  guestAddress = null,
  onGuestAddressChange,
  announcerCoordinates,
  guestDogData = null,
  billingInfo,
  clientBillingMode,
  stripeFeeRate = 3,
  vatRate = 20,
  isSapApplied = false,
  sapVatRate = 20,
  announcerStatusType = "particulier",
  error,
}: SummaryStepProps) {
  const isMultiDay = selectedEndDate && selectedEndDate !== selectedDate;

  // Déterminer le type de formule
  const isCollective = isCollectiveFormula || selectedVariant.sessionType === "collective";
  const isMultiSession = isMultiSessionIndividual || (!isCollective && (selectedVariant.numberOfSessions || 1) > 1);
  const numberOfSessions = selectedVariant.numberOfSessions || 1;
  const actualSlotCount = isCollective && collectiveSlots.length > 0 ? collectiveSlots.length : numberOfSessions;

  // Filtrer les animaux sélectionnés
  const selectedAnimals = userAnimals?.filter(animal => selectedAnimalIds.includes(animal.id)) || [];
  const effectiveAnimalCount = selectedAnimals.length > 0 ? selectedAnimals.length : animalCount;

  // Formater l'heure (9:00 -> 9h, 14:30 -> 14h30)
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    return minutes === "00" ? `${parseInt(hours)}h` : `${parseInt(hours)}h${minutes}`;
  };

  // Calculer la durée totale en heures
  const calculateTotalHours = () => {
    if (!selectedTime) return 0;

    const startParts = selectedTime.split(":").map(Number);
    const startHour = startParts[0] + startParts[1] / 60;

    if (selectedEndTime) {
      const endParts = selectedEndTime.split(":").map(Number);
      const endHour = endParts[0] + endParts[1] / 60;

      if (isMultiDay) {
        const firstDayHours = 20 - startHour;
        const lastDayHours = endHour - 8;
        const middleDays = days - 2;
        return firstDayHours + (middleDays > 0 ? middleDays * 8 : 0) + lastDayHours;
      } else {
        return endHour - startHour;
      }
    }
    return 0;
  };

  const totalHours = calculateTotalHours();

  const getLocationLabel = () => {
    if (!serviceLocation) return null;
    return serviceLocation === "client_home"
      ? "À votre domicile"
      : `Chez ${announcer.firstName}${announcer.lastName ? ` ${announcer.lastName.charAt(0)}.` : ""}`;
  };

  return (
    <div
      className="bg-white p-[18px]"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
          Étape · Confirmation
        </div>
        <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
          Récapitulatif de votre réservation
        </h3>
        <p className="text-[12px] text-[#6d6d68] mt-1">
          Vérifiez les informations ci-dessous avant de finaliser le paiement.
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div
          className="mb-4 p-3 flex items-start gap-2 text-[12px]"
          style={{
            borderRadius: 12,
            background: "#fdf0f0",
            border: "1px solid #f1cdcd",
            color: "#8a3a3a",
          }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Annonceur */}
      <div
        className="flex items-center gap-3 p-3 mb-4"
        style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
      >
        <div
          className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0"
          style={{ border: "1px solid #ece9e1" }}
        >
          {announcer.profileImage ? (
            <Image
              src={announcer.profileImage}
              alt={announcer.firstName}
              fill
              className="object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-[15px] font-semibold"
              style={{ background: "#f5f9f6", color: "#1f3a33" }}
            >
              {announcer.firstName.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
            Pet-sitter
          </div>
          <p className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] truncate m-0">
            {announcer.firstName} {announcer.lastName?.charAt(0)}.
          </p>
          <p className="text-[11px] text-[#6d6d68] flex items-center gap-1 truncate mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {announcer.city && announcer.postalCode
              ? `${announcer.postalCode} ${announcer.city}`
              : announcer.city || announcer.location}
          </p>
        </div>
      </div>

      {/* Section Prestation */}
      <SectionCard
        eyebrow="Prestation"
        title={selectedVariant.name}
        badge={
          isCollective
            ? { label: "Collectif", tone: "purple" }
            : isMultiSession
              ? { label: `${numberOfSessions} séances`, tone: "primary" }
              : null
        }
      >
        <SummaryRow
          label="Catégorie"
          value={
            <span className="inline-flex items-center gap-1.5">
              <span>{selectedService.categoryIcon}</span>
              <span>{selectedService.categoryName}</span>
            </span>
          }
        />

        {/* Lieu : chez l'annonceur */}
        {serviceLocation === "announcer_home" && (
          <SummaryRow
            label="Lieu de prestation"
            value={
              <span className="inline-flex items-center gap-1">
                <Home className="w-3 h-3" style={{ color: "#9c9484" }} />
                {getLocationLabel()}
              </span>
            }
          />
        )}
      </SectionCard>

      {/* Section Adresse — utilisateur connecté */}
      {serviceLocation === "client_home" && sessionToken && onAddressSelect && (
        <div className="mt-3">
          <SectionCard eyebrow="Adresse de prestation" title="À votre domicile">
            <AddressSection
              sessionToken={sessionToken}
              serviceLocation={serviceLocation}
              announcerLocation={announcer.location}
              selectedAddressId={selectedAddressId}
              onAddressSelect={onAddressSelect}
            />
          </SectionCard>
        </div>
      )}

      {/* Section Adresse — utilisateur invité */}
      {serviceLocation === "client_home" && !sessionToken && onGuestAddressChange && (
        <div className="mt-3">
          <SectionCard eyebrow="Adresse de prestation" title="À votre domicile">
            {guestAddress?.address ? (
              <div
                className="p-3 flex items-start justify-between gap-2"
                style={{ borderRadius: 10, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#1f3a33" }} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#1f3a33] tracking-[-0.01em]">
                      Adresse confirmée
                    </p>
                    <p className="text-[12px] text-[#3a3a38] mt-0.5 truncate">
                      {guestAddress.address}
                    </p>
                    {(guestAddress.city || guestAddress.postalCode) && (
                      <p className="text-[11px] text-[#6d6d68] mt-0.5">
                        {guestAddress.postalCode}
                        {guestAddress.postalCode && guestAddress.city ? " " : ""}
                        {guestAddress.city}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onGuestAddressChange(null)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-white flex-shrink-0"
                  style={{ color: "#1f3a33" }}
                  title="Modifier l'adresse"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <GuestAddressSelector
                guestAddress={guestAddress}
                announcerCoordinates={announcerCoordinates}
                onAddressChange={onGuestAddressChange}
              />
            )}
          </SectionCard>
        </div>
      )}

      {/* Section Dates / Créneaux */}
      <div className="mt-3">
        {isCollective ? (
          <SectionCard
            eyebrow="Créneaux collectifs"
            title={
              collectiveSlots.length > 0
                ? `${collectiveSlots.length} créneau${collectiveSlots.length > 1 ? "x" : ""} sélectionné${collectiveSlots.length > 1 ? "s" : ""}`
                : "Séances collectives"
            }
            icon={<CalendarCheck className="w-3.5 h-3.5" />}
          >
            {collectiveSlots.length > 0 ? (
              <div className="space-y-1">
                {collectiveSlots
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((slot, index) => (
                    <SessionPill
                      key={slot._id}
                      index={index + 1}
                      date={formatDate(slot.date)}
                      time={`${slot.startTime} – ${slot.endTime}`}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-[12px] text-[#9c9484] animate-pulse">
                Chargement des créneaux...
              </p>
            )}
            {effectiveAnimalCount > 1 && (
              <div
                className="flex items-center gap-2 mt-2 pt-2"
                style={{ borderTop: "1px solid #f1ede3" }}
              >
                <Users className="w-3.5 h-3.5" style={{ color: "#9c9484" }} />
                <span className="text-[11px] text-[#6d6d68]">
                  {effectiveAnimalCount} animal{effectiveAnimalCount > 1 ? "aux" : ""}
                </span>
              </div>
            )}
          </SectionCard>
        ) : isMultiSession ? (
          <SectionCard
            eyebrow="Séances planifiées"
            title={
              selectedSessions.length > 0
                ? `${selectedSessions.length} sur ${numberOfSessions} séance${numberOfSessions > 1 ? "s" : ""}`
                : `${numberOfSessions} séance${numberOfSessions > 1 ? "s" : ""} à planifier`
            }
            icon={<CalendarCheck className="w-3.5 h-3.5" />}
          >
            {selectedSessions.length > 0 ? (
              <div className="space-y-1">
                {selectedSessions
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((session, index) => (
                    <SessionPill
                      key={`${session.date}-${session.startTime}`}
                      index={index + 1}
                      date={formatDate(session.date)}
                      time={`${session.startTime} – ${session.endTime}`}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-[12px] text-[#9c9484] animate-pulse">
                Chargement des séances...
              </p>
            )}
          </SectionCard>
        ) : (
          <SectionCard
            eyebrow="Date et horaires"
            title={
              isMultiDay && selectedTime && selectedEndTime
                ? `${formatDate(selectedDate)} → ${formatDate(selectedEndDate!)}`
                : selectedTime && selectedEndTime
                  ? formatDate(selectedDate)
                  : selectedTime
                    ? formatDate(selectedDate)
                    : isMultiDay
                      ? `${formatDate(selectedDate)} → ${formatDate(selectedEndDate!)}`
                      : formatDate(selectedDate)
            }
            icon={<CalendarCheck className="w-3.5 h-3.5" />}
          >
            <div className="text-[12.5px] text-[#3a3a38] capitalize">
              {isMultiDay && selectedTime && selectedEndTime ? (
                <>
                  Du <strong className="text-[#1f1f1d]">{formatDate(selectedDate)}</strong> à{" "}
                  <strong className="text-[#1f1f1d]">{formatTime(selectedTime)}</strong>
                  <br />
                  jusqu&apos;au <strong className="text-[#1f1f1d]">{formatDate(selectedEndDate!)}</strong> à{" "}
                  <strong className="text-[#1f1f1d]">{formatTime(selectedEndTime)}</strong>
                </>
              ) : selectedTime && selectedEndTime ? (
                <>
                  De <strong className="text-[#1f1f1d]">{formatTime(selectedTime)}</strong> à{" "}
                  <strong className="text-[#1f1f1d]">{formatTime(selectedEndTime)}</strong>
                </>
              ) : selectedTime ? (
                <>
                  À <strong className="text-[#1f1f1d]">{formatTime(selectedTime)}</strong>
                </>
              ) : null}
            </div>

            {/* Durée */}
            {(days >= 1 || totalHours > 0) && (
              <div
                className="flex items-center gap-1.5 mt-2 pt-2 text-[11px]"
                style={{ borderTop: "1px solid #f1ede3", color: "#6d6d68" }}
              >
                <Clock className="w-3 h-3" />
                <span>
                  {(() => {
                    const isHalfDayBilling =
                      billingInfo?.billingUnit === "half_day" ||
                      billingInfo?.billingUnit === "day" ||
                      billingInfo?.firstDayIsHalfDay ||
                      billingInfo?.lastDayIsHalfDay ||
                      clientBillingMode === "round_half_day";

                    if (isHalfDayBilling && billingInfo) {
                      const fullDays = billingInfo.fullDays ?? 0;
                      const halfDays = billingInfo.halfDays ?? 0;
                      const parts: string[] = [];
                      if (fullDays > 0) parts.push(`${fullDays} journée${fullDays > 1 ? "s" : ""}`);
                      if (halfDays > 0) parts.push(`${halfDays} demi-journée${halfDays > 1 ? "s" : ""}`);
                      const durationStr = parts.length > 0 ? parts.join(" + ") : `${days} jour${days > 1 ? "s" : ""}`;
                      if (includeOvernightStay && priceBreakdown.nights > 0) {
                        return `${durationStr} · ${priceBreakdown.nights} nuit${priceBreakdown.nights > 1 ? "s" : ""}`;
                      }
                      return durationStr;
                    }

                    if (days > 1) {
                      let result = `${days} jour${days > 1 ? "s" : ""}`;
                      if (includeOvernightStay && priceBreakdown.nights > 0) {
                        result += ` · ${priceBreakdown.nights} nuit${priceBreakdown.nights > 1 ? "s" : ""}`;
                      }
                      return result;
                    } else if (totalHours > 0) {
                      return `Durée : ${totalHours.toFixed(1).replace(".0", "")}h`;
                    }
                    return null;
                  })()}
                </span>
              </div>
            )}
          </SectionCard>
        )}
      </div>

      {/* Section Animaux — utilisateurs connectés */}
      {selectedAnimals.length > 0 && (
        <div className="mt-3">
          <SectionCard
            eyebrow={selectedAnimals.length > 1 ? "Animaux concernés" : "Animal concerné"}
            title={`${selectedAnimals.length} ${selectedAnimals.length > 1 ? "animaux" : "animal"}`}
            icon={<PawPrint className="w-3.5 h-3.5" />}
          >
            <div className="space-y-2">
              {selectedAnimals.map((animal) => (
                <div key={animal.id} className="flex items-center gap-2.5">
                  {animal.primaryPhotoUrl ? (
                    <Image
                      src={animal.primaryPhotoUrl}
                      alt={animal.name}
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                      style={{ border: "1px solid #ece9e1" }}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[13px]"
                      style={{ background: "#f5f9f6", color: "#1f3a33", border: "1px solid #cfdbd3" }}
                    >
                      {animal.emoji || animal.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] truncate">
                      {animal.name}
                    </p>
                    <p className="text-[10.5px] text-[#9c9484] truncate">
                      {animal.type}
                      {animal.breed ? ` · ${animal.breed}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {selectedAnimals.length > 1 && (
              <p
                className="text-[10.5px] mt-2 pt-2 italic"
                style={{ borderTop: "1px solid #f1ede3", color: "#9c9484" }}
              >
                Le prix est ajusté pour {selectedAnimals.length} animaux
              </p>
            )}
          </SectionCard>
        </div>
      )}

      {/* Section Animaux — invité */}
      {!sessionToken && guestDogData && (
        <div className="mt-3">
          <SectionCard
            eyebrow="Votre chien"
            title={
              guestDogData.isMixedBreed
                ? guestDogData.dominantBreed
                  ? `Croisé ${guestDogData.dominantBreed}`
                  : "Croisé"
                : guestDogData.breed || "Race non spécifiée"
            }
            icon={<PawPrint className="w-3.5 h-3.5" />}
          >
            <p className="text-[11.5px] text-[#6d6d68]">
              {guestDogData.size === "small" && "Petit chien (< 10 kg)"}
              {guestDogData.size === "medium" && "Chien moyen (10–25 kg)"}
              {guestDogData.size === "large" && "Grand chien (> 25 kg)"}
              {guestDogData.isMixedBreed && guestDogData.weight && ` · ${guestDogData.weight} kg`}
            </p>
          </SectionCard>
        </div>
      )}

      {/* ─── DÉTAIL DU PRIX ──────────────────────────────────── */}
      <div className="mt-5 pt-5" style={{ borderTop: "1px solid #f1ede3" }}>
        <div className="mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4" style={{ color: "#1f3a33" }} />
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
              Détail du prix
            </div>
            <h4 className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              Composition du tarif
            </h4>
          </div>
        </div>

        {/* Carte service */}
        <div
          className="p-3 mb-2"
          style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
        >
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Package className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1f3a33" }} />
              <span className="text-[12.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] truncate">
                {selectedVariant.name}
              </span>
            </div>
            <span className="text-[14px] font-bold text-[#1f1f1d] tracking-[-0.01em] flex-shrink-0">
              {isCollective
                ? formatPrice(Math.round(selectedVariant.price * actualSlotCount * effectiveAnimalCount))
                : isMultiSession
                  ? formatPrice(Math.round(selectedVariant.price * numberOfSessions * effectiveAnimalCount))
                  : formatPrice(
                      (priceBreakdown.firstDayAmount + priceBreakdown.fullDaysAmount + priceBreakdown.lastDayAmount) *
                        effectiveAnimalCount
                    )}
            </span>
          </div>

          {/* Détail du calcul */}
          {isCollective ? (
            <p className="text-[11px] text-[#6d6d68]">
              {formatPrice(selectedVariant.price)} × {actualSlotCount} créneau
              {actualSlotCount > 1 ? "x" : ""}
              {effectiveAnimalCount > 1 && ` × ${effectiveAnimalCount} animaux`}
            </p>
          ) : isMultiSession ? (
            <p className="text-[11px] text-[#6d6d68]">
              {formatPrice(selectedVariant.price)} × {numberOfSessions} séance
              {numberOfSessions > 1 ? "s" : ""}
              {effectiveAnimalCount > 1 && ` × ${effectiveAnimalCount} animaux`}
            </p>
          ) : (
            <div className="text-[11px] text-[#6d6d68] space-y-0.5">
              {(() => {
                const dayStart = selectedService.dayStartTime || "08:00";
                const dayEnd = selectedService.dayEndTime || "18:00";
                const dailyRate = priceBreakdown.dailyRate;
                const halfDayRate = Math.round(dailyRate / 2);

                const isHalfDayBilling =
                  billingInfo?.billingUnit === "half_day" ||
                  billingInfo?.billingUnit === "day" ||
                  billingInfo?.firstDayIsHalfDay ||
                  billingInfo?.lastDayIsHalfDay ||
                  clientBillingMode === "round_half_day";

                if (isHalfDayBilling && billingInfo && days >= 1) {
                  const fullDays = billingInfo.fullDays ?? 0;
                  const halfDays = billingInfo.halfDays ?? 0;
                  const firstDayIsHalf = billingInfo.firstDayIsHalfDay ?? false;
                  const lastDayIsHalf = billingInfo.lastDayIsHalfDay ?? false;
                  const lines: React.ReactNode[] = [];
                  const dayStartDisplay = dayStart.replace(":", "h");
                  const dayEndDisplay = dayEnd.replace(":", "h");

                  if (days === 1) {
                    const startDisplay = selectedTime ? formatTime(selectedTime) : dayStartDisplay;
                    const endDisplay = selectedEndTime ? formatTime(selectedEndTime) : dayEndDisplay;
                    if (firstDayIsHalf || halfDays === 1) {
                      lines.push(
                        <BreakdownLine
                          key="single"
                          label={`Demi-journée (${startDisplay} → ${endDisplay})`}
                          value={formatPrice(halfDayRate)}
                        />
                      );
                    } else {
                      lines.push(
                        <BreakdownLine
                          key="single"
                          label={`Journée complète (${startDisplay} → ${endDisplay})`}
                          value={formatPrice(dailyRate)}
                        />
                      );
                    }
                  } else {
                    const startDisplay = selectedTime ? formatTime(selectedTime) : dayStartDisplay;
                    if (firstDayIsHalf) {
                      lines.push(
                        <BreakdownLine
                          key="first"
                          label={`1er jour : demi-journée (${startDisplay} → ${dayEndDisplay})`}
                          value={formatPrice(halfDayRate)}
                        />
                      );
                    } else {
                      lines.push(
                        <BreakdownLine
                          key="first"
                          label={`1er jour : journée (${startDisplay} → ${dayEndDisplay})`}
                          value={formatPrice(dailyRate)}
                        />
                      );
                    }

                    if (days > 2) {
                      const middleDays = days - 2;
                      if (middleDays > 0) {
                        lines.push(
                          <BreakdownLine
                            key="middle"
                            label={`${middleDays} jour${middleDays > 1 ? "s" : ""} complet${middleDays > 1 ? "s" : ""} (${dayStartDisplay} → ${dayEndDisplay})`}
                            value={formatPrice(dailyRate * middleDays)}
                          />
                        );
                      }
                    }

                    const endDisplay = selectedEndTime ? formatTime(selectedEndTime) : dayEndDisplay;
                    if (lastDayIsHalf) {
                      lines.push(
                        <BreakdownLine
                          key="last"
                          label={`Dernier jour : demi-journée (${dayStartDisplay} → ${endDisplay})`}
                          value={formatPrice(halfDayRate)}
                        />
                      );
                    } else {
                      lines.push(
                        <BreakdownLine
                          key="last"
                          label={`Dernier jour : journée (${dayStartDisplay} → ${endDisplay})`}
                          value={formatPrice(dailyRate)}
                        />
                      );
                    }
                  }

                  return lines;
                }

                if (days > 1 && dailyRate > 0) {
                  return (
                    <BreakdownLine
                      label={`${days} jours × ${formatPrice(dailyRate)}/jour`}
                      value={formatPrice(dailyRate * days)}
                    />
                  );
                } else if (priceBreakdown.firstDayHours > 0 && priceBreakdown.hourlyRate > 0) {
                  return (
                    <BreakdownLine
                      label={`${formatHours(priceBreakdown.firstDayHours)} × ${formatPrice(priceBreakdown.hourlyRate)}/h`}
                      value={formatPrice(priceBreakdown.firstDayAmount)}
                    />
                  );
                }
                // Fallback : tarif forfaitaire (pas de calcul horaire/journalier valide)
                const totalAmount =
                  priceBreakdown.firstDayAmount + priceBreakdown.fullDaysAmount + priceBreakdown.lastDayAmount;
                if (priceBreakdown.firstDayHours > 0) {
                  return (
                    <BreakdownLine
                      label={`Prestation forfaitaire (${formatHours(priceBreakdown.firstDayHours)})`}
                      value={formatPrice(totalAmount)}
                    />
                  );
                }
                return <BreakdownLine label="Prestation forfaitaire" value={formatPrice(totalAmount)} />;
              })()}
            </div>
          )}
        </div>

        {/* Nuits */}
        {!isCollective && !isMultiSession && includeOvernightStay && priceBreakdown.nights > 0 && (
          <div
            className="p-3 mb-2 flex items-center justify-between gap-3"
            style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Moon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1f3a33" }} />
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
                  Garde de nuit
                </p>
                <p className="text-[11px] text-[#6d6d68]">
                  {priceBreakdown.nights} nuit{priceBreakdown.nights > 1 ? "s" : ""} × {formatPrice(priceBreakdown.nightlyRate)}/nuit
                  {effectiveAnimalCount > 1 && ` × ${effectiveAnimalCount} animaux`}
                </p>
              </div>
            </div>
            <span className="text-[13px] font-semibold text-[#1f1f1d] flex-shrink-0">
              +{formatPrice(priceBreakdown.nightsAmount * effectiveAnimalCount)}
            </span>
          </div>
        )}

        {/* Options */}
        {selectedOptionIds.length > 0 && (
          <div
            className="p-3 mb-2"
            style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Plus className="w-3.5 h-3.5" style={{ color: "#1f3a33" }} />
              <span className="text-[12.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
                Options additionnelles
              </span>
            </div>
            <div className="space-y-0.5">
              {selectedOptionIds.map((optId) => {
                const opt = selectedService.options.find((o: ServiceOption) => o.id === optId);
                if (!opt) return null;
                return (
                  <BreakdownLine
                    key={optId}
                    label={opt.name}
                    value={`+${formatPrice(opt.price)}`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Carte synthèse fiscale + total */}
        <div
          className="p-4"
          style={{ borderRadius: 12, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
        >
          {(() => {
            const optionsAmount = selectedOptionIds.reduce((sum, optId) => {
              const opt = selectedService.options.find((o: ServiceOption) => o.id === optId);
              return sum + (opt?.price || 0);
            }, 0);

            const serviceAmount = isCollective
              ? Math.round(selectedVariant.price * actualSlotCount * effectiveAnimalCount) + optionsAmount
              : isMultiSession
                ? Math.round(selectedVariant.price * numberOfSessions * effectiveAnimalCount) + optionsAmount
                : priceBreakdown.totalAmount * effectiveAnimalCount;

            const isVatSubject = announcerStatusType === "professionnel";
            const serviceVatRate = selectedVariant.isSapEligible ? 10 : 20;

            const serviceHT = isVatSubject ? Math.round(serviceAmount / (1 + serviceVatRate / 100)) : serviceAmount;
            const serviceTVA = isVatSubject ? serviceAmount - serviceHT : 0;

            const platformCommission = Math.round((serviceAmount * commissionRate) / 100);
            const vatOnCommission = Math.round((platformCommission * vatRate) / 100);
            const paymentFees = Math.round((serviceAmount * stripeFeeRate) / 100);
            const totalTTC = serviceAmount + platformCommission + vatOnCommission + paymentFees;

            return (
              <>
                {isVatSubject ? (
                  <>
                    <FiscalLine label="Prix prestataire HT" value={formatPrice(serviceHT)} />
                    <FiscalLine label={`TVA prestation (${serviceVatRate} %)`} value={formatPrice(serviceTVA)} muted />
                    <FiscalLine
                      label="Prix prestataire TTC"
                      value={formatPrice(serviceAmount)}
                      strong
                    />
                  </>
                ) : (
                  <FiscalLine label="Prix prestataire" value={formatPrice(serviceAmount)} />
                )}

                {announcerStatusType === "micro_entrepreneur" && (
                  <p className="text-[10.5px] italic mt-1" style={{ color: "#6d6d68" }}>
                    TVA non applicable (art. 293 B du CGI)
                  </p>
                )}

                {selectedVariant.isSapEligible && (
                  <div
                    className="flex items-center gap-1.5 mt-2 px-2 py-1 inline-flex"
                    style={{ borderRadius: 999, background: "#fff", border: "1px solid #cfdbd3" }}
                  >
                    <Check className="w-3 h-3" style={{ color: "#1f3a33" }} />
                    <span className="text-[10.5px] font-medium" style={{ color: "#1f3a33" }}>
                      TVA réduite SAP : 10 % au lieu de 20 %
                    </span>
                  </div>
                )}

                <div className="mt-2 pt-2 space-y-0.5" style={{ borderTop: "1px solid #cfdbd3" }}>
                  <FiscalLine
                    label={`Commission plateforme (${commissionRate} %)`}
                    value={`+${formatPrice(platformCommission)}`}
                    muted
                  />
                  {vatRate > 0 && (
                    <FiscalLine
                      label={`TVA sur commission (${vatRate} %)`}
                      value={`+${formatPrice(vatOnCommission)}`}
                      muted
                    />
                  )}
                  <FiscalLine
                    label={`Frais de paiement (${stripeFeeRate} %)`}
                    value={`+${formatPrice(paymentFees)}`}
                    muted
                  />
                </div>

                {/* Total à payer */}
                <div
                  className="mt-3 pt-3 flex items-baseline justify-between"
                  style={{ borderTop: "2px solid #1f3a33" }}
                >
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.1em]" style={{ color: "#1f3a33" }}>
                      Total à payer
                    </div>
                    <p className="text-[10.5px]" style={{ color: "#6d6d68" }}>
                      Tout compris, sans surprise
                    </p>
                  </div>
                  <span className="text-[22px] font-bold tracking-[-0.02em]" style={{ color: "#1f3a33" }}>
                    {formatPrice(totalTTC)}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sous-composants
// ──────────────────────────────────────────────────────────────────

function SectionCard({
  eyebrow,
  title,
  icon,
  badge,
  children,
}: {
  eyebrow: string;
  title: string;
  icon?: React.ReactNode;
  badge?: { label: string; tone: "purple" | "primary" } | null;
  children: React.ReactNode;
}) {
  const badgeStyle = badge
    ? badge.tone === "purple"
      ? { background: "#f3eafa", color: "#5e3a8a", border: "1px solid #e0cef0" }
      : { background: "#f5f9f6", color: "#2f4a3f", border: "1px solid #cfdbd3" }
    : null;

  return (
    <div
      className="p-3"
      style={{ borderRadius: 12, background: "#fff", border: "1px solid #ece9e1" }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div
            className="text-[10px] font-medium uppercase tracking-[0.1em] flex items-center gap-1.5"
            style={{ color: "#9c9484" }}
          >
            {icon && <span style={{ color: "#9c9484" }}>{icon}</span>}
            {eyebrow}
          </div>
          <h4 className="text-[13.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0 mt-0.5 capitalize truncate">
            {title}
          </h4>
        </div>
        {badge && badgeStyle && (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0"
            style={badgeStyle}
          >
            {badge.label}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      className="flex justify-between items-center text-[12px] py-1.5"
      style={{ borderTop: "1px solid #f7f5ef" }}
    >
      <span style={{ color: "#6d6d68" }}>{label}</span>
      <span className="font-semibold text-[#1f1f1d] tracking-[-0.01em]">{value}</span>
    </div>
  );
}

function SessionPill({
  index,
  date,
  time,
}: {
  index: number;
  date: string;
  time: string;
}) {
  return (
    <div
      className="flex items-center gap-2 p-2 text-[12px]"
      style={{ borderRadius: 10, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
    >
      <span
        className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold flex-shrink-0"
        style={{ background: "#1f3a33", color: "#f7f5ef" }}
      >
        {index}
      </span>
      <span className="font-semibold text-[#1f1f1d] capitalize flex-1 truncate tracking-[-0.01em]">
        {date}
      </span>
      <span className="text-[11.5px] font-medium" style={{ color: "#1f3a33" }}>
        {time}
      </span>
    </div>
  );
}

function BreakdownLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-[11.5px]">
      <span style={{ color: "#6d6d68" }}>{label}</span>
      <span className="font-medium text-[#1f1f1d] tabular-nums">{value}</span>
    </div>
  );
}

function FiscalLine({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between items-center text-[12px]">
      <span style={{ color: muted ? "#6d6d68" : "#3a3a38", fontWeight: strong ? 600 : 400 }}>
        {label}
      </span>
      <span
        className="tabular-nums"
        style={{
          color: strong ? "#1f1f1d" : muted ? "#6d6d68" : "#1f1f1d",
          fontWeight: strong ? 700 : 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}
