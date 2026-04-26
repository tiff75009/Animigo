"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  MapPin,
  CalendarCheck,
  Clock,
  Users,
  Sparkles,
  Check,
  AlertCircle,
  Moon,
  Package,
  PawPrint,
  ShieldCheck,
  Plus,
  Receipt,
} from "lucide-react";
import Image from "next/image";
import CancellationPolicyModal from "@/app/annonceur/[id]/components/booking/CancellationPolicyModal";
import {
  formatShortDate,
  formatTime,
  formatPrice,
  formatHoursDisplay,
  calculateEndTime,
  formatDuration,
  calculateDistance,
  formatDistance,
  extractCity,
} from "../utils";
import type {
  PendingBookingData,
  ServiceOption,
  PriceCalculationResult,
  BillingInfo,
  SessionData,
  CollectiveSlotData,
} from "../types";
import type { GuestAnimalData } from "@/app/components/animals";

interface ReservationSummaryProps {
  bookingData: PendingBookingData;
  isLoggedIn: boolean;
  isCollectiveFormula: boolean;
  isMultiSessionFormula: boolean;
  numberOfSessions: number;
  effectiveAnimalCount: number;
  isMultiDay: boolean;
  daysCount: number;
  priceCalculation: PriceCalculationResult | null;
  billingInfo: BillingInfo | null;
  selectedOptionIds: string[];
  address: string;
  coordinates: { lat: number; lng: number } | null;
  city: string | null;
  guestAnimalData: GuestAnimalData;
  baseAmountHT: number;
  platformCommission: number;
  commissionRate: number;
  paymentFees: number;
  stripeFeeRate: number;
  vatRate: number;
  vatOnCommission: number;
  totalWithCommission: number;
  announcerStatusType: string;
  isSapApplied?: boolean;
  sapVatRate?: number;
  acceptedCancellationPolicy: boolean;
  setAcceptedCancellationPolicy: (v: boolean) => void;
  cancellationServiceType: "uni_seance" | "garde" | "collectif" | "multi_seance";
  totalAmount: number;
  cancellationPolicy: { refundMode: string; commissionPercent: number } | null;
  clientCancellationInfo: { cancellationCount: number; secondAnnouncerPercent: number } | null;
  isSubmitting: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  onConfirm: () => void;
}

export default function ReservationSummary({
  bookingData,
  isLoggedIn,
  isCollectiveFormula,
  isMultiSessionFormula,
  numberOfSessions,
  effectiveAnimalCount,
  isMultiDay,
  daysCount,
  priceCalculation,
  billingInfo,
  selectedOptionIds,
  address,
  coordinates,
  city,
  guestAnimalData,
  baseAmountHT,
  platformCommission,
  commissionRate,
  paymentFees,
  stripeFeeRate,
  vatRate,
  vatOnCommission,
  totalWithCommission,
  announcerStatusType,
  acceptedCancellationPolicy,
  setAcceptedCancellationPolicy,
  cancellationServiceType,
  totalAmount,
  cancellationPolicy,
  clientCancellationInfo,
  isSubmitting,
  error,
  fieldErrors,
  onConfirm,
}: ReservationSummaryProps) {
  const [showCancellationPolicy, setShowCancellationPolicy] = useState(false);

  const dailyRate = priceCalculation?.dailyRate ?? 0;
  const halfDayRate = Math.round(dailyRate / 2);
  const dayStartDisplay = billingInfo?.dayStartTime?.replace(":", "h") || "8h00";
  const dayEndDisplay = billingInfo?.dayEndTime?.replace(":", "h") || "18h00";

  const announcerName = `${bookingData.announcer.firstName}${
    bookingData.announcer.lastName ? ` ${bookingData.announcer.lastName.charAt(0)}.` : ""
  }`;

  const statusLabel =
    bookingData.announcer.statusType === "professionnel"
      ? "Professionnel"
      : bookingData.announcer.statusType === "micro_entrepreneur"
        ? "Micro-entrepreneur"
        : "Particulier";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-[18px] lg:sticky lg:top-24"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        {/* Header */}
        <div className="mb-4">
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-1">
            Étape · Confirmation
          </div>
          <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
            Récapitulatif
          </h3>
          <p className="text-[12px] text-[#6d6d68] mt-1">
            Vérifiez les informations avant de finaliser le paiement.
          </p>
        </div>

        {/* Annonceur */}
        <div
          className="flex items-center gap-3 p-3 mb-3"
          style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
        >
          <div
            className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0"
            style={{ border: "1px solid #ece9e1" }}
          >
            {bookingData.announcer.profileImage ? (
              <Image
                src={bookingData.announcer.profileImage}
                alt={bookingData.announcer.firstName}
                fill
                className="object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-[15px] font-semibold"
                style={{ background: "#f5f9f6", color: "#1f3a33" }}
              >
                {bookingData.announcer.firstName.charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
              Pet-sitter
            </div>
            <p className="text-[14px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0 truncate flex items-center gap-1">
              {announcerName}
              {bookingData.announcer.verified && (
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1f3a33" }} />
              )}
            </p>
            <p className="text-[11px] text-[#6d6d68] flex items-center gap-1 truncate mt-0.5">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {bookingData.announcer.city && bookingData.announcer.postalCode
                ? `${bookingData.announcer.postalCode} ${bookingData.announcer.city}`
                : bookingData.announcer.city || extractCity(bookingData.announcer.location)}
            </p>
          </div>
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0"
            style={{ background: "#fff", color: "#3a3a38", border: "1px solid #dfdcd4" }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Section Prestation */}
        <SectionCard
          eyebrow="Prestation"
          title={bookingData.variant?.name || bookingData.service.categoryName}
          badge={
            isCollectiveFormula
              ? { label: "Collectif", tone: "purple" }
              : isMultiSessionFormula
                ? { label: `${numberOfSessions} séances`, tone: "primary" }
                : null
          }
        >
          <SummaryRow
            label="Catégorie"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span>{bookingData.service.categoryIcon || "✨"}</span>
                <span>{bookingData.service.categoryName}</span>
              </span>
            }
          />
          {bookingData.serviceLocation === "announcer_home" && (
            <SummaryRow
              label="Lieu"
              value={
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" style={{ color: "#9c9484" }} />
                  Chez {announcerName}
                </span>
              }
            />
          )}
          {bookingData.serviceLocation === "client_home" && (
            <SummaryRow
              label="Lieu"
              value={
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" style={{ color: "#9c9484" }} />
                  À votre domicile
                </span>
              }
            />
          )}
        </SectionCard>

        {/* Adresse client */}
        {bookingData.serviceLocation === "client_home" && address && (
          <div className="mt-3">
            <SectionCard eyebrow="Adresse" title={address} icon={<MapPin className="w-3.5 h-3.5" />}>
              {(city || bookingData.guestAddress?.postalCode) && (
                <p className="text-[11.5px]" style={{ color: "#6d6d68" }}>
                  {[bookingData.guestAddress?.postalCode, city].filter(Boolean).join(" ")}
                </p>
              )}
              {coordinates && bookingData.announcer.coordinates && (
                <p
                  className="text-[10.5px] mt-1 flex items-center gap-1"
                  style={{ color: "#9c9484" }}
                >
                  <MapPin className="w-3 h-3" />
                  {formatDistance(
                    calculateDistance(
                      bookingData.announcer.coordinates.lat,
                      bookingData.announcer.coordinates.lng,
                      coordinates.lat,
                      coordinates.lng
                    )
                  )}{" "}
                  du pet-sitter
                </p>
              )}
            </SectionCard>
          </div>
        )}

        {/* Section Dates */}
        <div className="mt-3">
          {isCollectiveFormula && bookingData.collectiveSlots && bookingData.collectiveSlots.length > 0 ? (
            <SectionCard
              eyebrow="Créneaux collectifs"
              title={`${bookingData.collectiveSlots.length} créneau${bookingData.collectiveSlots.length > 1 ? "x" : ""} sélectionné${bookingData.collectiveSlots.length > 1 ? "s" : ""}`}
              icon={<CalendarCheck className="w-3.5 h-3.5" />}
            >
              <div className="space-y-1">
                {bookingData.collectiveSlots
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((slot, index) => (
                    <SessionPill
                      key={slot._id}
                      index={index + 1}
                      date={formatShortDate(slot.date)}
                      time={`${slot.startTime} – ${slot.endTime}`}
                    />
                  ))}
              </div>
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
          ) : isMultiSessionFormula && bookingData.sessions && bookingData.sessions.length > 0 ? (
            <SectionCard
              eyebrow="Séances planifiées"
              title={`${bookingData.sessions.length} sur ${numberOfSessions}`}
              icon={<CalendarCheck className="w-3.5 h-3.5" />}
            >
              <div className="space-y-1">
                {bookingData.sessions
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((session, index) => (
                    <SessionPill
                      key={`${session.date}-${session.startTime}`}
                      index={index + 1}
                      date={formatShortDate(session.date)}
                      time={`${session.startTime} – ${session.endTime}`}
                    />
                  ))}
              </div>
            </SectionCard>
          ) : (
            <SingleSessionCard
              bookingData={bookingData}
              isMultiDay={isMultiDay}
              daysCount={daysCount}
              priceCalculation={priceCalculation}
              billingInfo={billingInfo}
            />
          )}
        </div>

        {/* Animal invité */}
        {!isLoggedIn && guestAnimalData.name && guestAnimalData.type && (
          <div className="mt-3">
            <SectionCard
              eyebrow="Votre animal"
              title={guestAnimalData.name}
              icon={<PawPrint className="w-3.5 h-3.5" />}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[15px] flex-shrink-0"
                  style={{ background: "#f5f9f6", color: "#1f3a33", border: "1px solid #cfdbd3" }}
                >
                  {guestAnimalData.type === "chien"
                    ? "🐕"
                    : guestAnimalData.type === "chat"
                      ? "🐱"
                      : guestAnimalData.type === "nac"
                        ? "🐹"
                        : "🐾"}
                </div>
                <p className="text-[11.5px]" style={{ color: "#6d6d68" }}>
                  {guestAnimalData.type === "chien"
                    ? guestAnimalData.isMixedBreed
                      ? guestAnimalData.primaryBreed && guestAnimalData.secondaryBreed
                        ? `${guestAnimalData.primaryBreed} × ${guestAnimalData.secondaryBreed}`
                        : guestAnimalData.primaryBreed
                          ? `Croisé ${guestAnimalData.primaryBreed}`
                          : "Croisé"
                      : guestAnimalData.breed || "Race non spécifiée"
                    : (
                        <>
                          {guestAnimalData.type === "chat"
                            ? "Chat"
                            : guestAnimalData.type === "nac"
                              ? "NAC"
                              : guestAnimalData.type}
                          {guestAnimalData.breed && ` · ${guestAnimalData.breed}`}
                        </>
                      )}
                </p>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ─── DÉTAIL PRIX ─────────────────────────────────────── */}
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

          {/* Carte service - collectif/multi */}
          {(isCollectiveFormula || isMultiSessionFormula) &&
            bookingData.variant &&
            (() => {
              const actualSlots =
                isCollectiveFormula && bookingData.collectiveSlots?.length
                  ? bookingData.collectiveSlots.length
                  : numberOfSessions;
              const basePrice = isCollectiveFormula
                ? bookingData.variant.price * actualSlots * effectiveAnimalCount
                : bookingData.variant.price * numberOfSessions * effectiveAnimalCount;

              return (
                <div
                  className="p-3 mb-2"
                  style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Package className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1f3a33" }} />
                      <span className="text-[12.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] truncate">
                        {bookingData.variant.name}
                      </span>
                    </div>
                    <span className="text-[14px] font-bold text-[#1f1f1d] tracking-[-0.01em] flex-shrink-0">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6d6d68]">
                    {formatPrice(bookingData.variant.price)} ×{" "}
                    {isCollectiveFormula ? actualSlots : numberOfSessions}{" "}
                    {isCollectiveFormula ? "créneau" : "séance"}
                    {(isCollectiveFormula ? actualSlots : numberOfSessions) > 1
                      ? isCollectiveFormula
                        ? "x"
                        : "s"
                      : ""}
                    {effectiveAnimalCount > 1 && ` × ${effectiveAnimalCount} animaux`}
                  </p>
                </div>
              );
            })()}

          {/* Carte service - uni-séance avec breakdown */}
          {priceCalculation && !isCollectiveFormula && !isMultiSessionFormula && (
            <UniSessionPriceCard
              priceCalculation={priceCalculation}
              billingInfo={billingInfo}
              bookingData={bookingData}
              isMultiDay={isMultiDay}
              daysCount={daysCount}
              dailyRate={dailyRate}
              halfDayRate={halfDayRate}
              dayStartDisplay={dayStartDisplay}
              dayEndDisplay={dayEndDisplay}
              effectiveAnimalCount={effectiveAnimalCount}
            />
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
                  const opt = bookingData.availableOptions?.find(
                    (o: ServiceOption) => o.id === optId
                  );
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

          {/* Bloc fiscal + total */}
          <div
            className="p-4"
            style={{ borderRadius: 12, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
          >
            {announcerStatusType === "professionnel" ? (
              (() => {
                const serviceVatRate = bookingData.variant?.isSapEligible ? 10 : 20;
                const serviceHT = Math.round(baseAmountHT / (1 + serviceVatRate / 100));
                const serviceTVA = baseAmountHT - serviceHT;
                return (
                  <>
                    <FiscalLine label="Prix prestataire HT" value={formatPrice(serviceHT)} />
                    <FiscalLine
                      label={`TVA prestation (${serviceVatRate} %)`}
                      value={formatPrice(serviceTVA)}
                      muted
                    />
                    <FiscalLine
                      label="Prix prestataire TTC"
                      value={formatPrice(baseAmountHT)}
                      strong
                    />
                  </>
                );
              })()
            ) : (
              <FiscalLine label="Prix prestataire" value={formatPrice(baseAmountHT)} />
            )}

            {announcerStatusType === "micro_entrepreneur" && (
              <p className="text-[10.5px] italic mt-1" style={{ color: "#6d6d68" }}>
                TVA non applicable (art. 293 B du CGI)
              </p>
            )}

            {bookingData.variant?.isSapEligible && (
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

            <div
              className="mt-3 pt-3 flex items-baseline justify-between"
              style={{ borderTop: "2px solid #1f3a33" }}
            >
              <div>
                <div
                  className="text-[10px] font-medium uppercase tracking-[0.1em]"
                  style={{ color: "#1f3a33" }}
                >
                  Total à payer
                </div>
                <p className="text-[10.5px]" style={{ color: "#6d6d68" }}>
                  Tout compris, sans surprise
                </p>
              </div>
              <span
                className="text-[22px] font-bold tracking-[-0.02em]"
                style={{ color: "#1f3a33" }}
              >
                {formatPrice(totalWithCommission)}
              </span>
            </div>
          </div>
        </div>

        {/* Politique d'annulation */}
        <div
          className="mt-4 p-3"
          style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
        >
          <button
            type="button"
            onClick={() => setAcceptedCancellationPolicy(!acceptedCancellationPolicy)}
            className="w-full flex items-start gap-2.5 text-left"
          >
            <div
              className="w-4.5 h-4.5 mt-0.5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                width: 18,
                height: 18,
                background: acceptedCancellationPolicy ? "#1f3a33" : "#fff",
                border: `1px solid ${acceptedCancellationPolicy ? "#1f3a33" : "#dfdcd4"}`,
              }}
            >
              {acceptedCancellationPolicy && <Check className="w-3 h-3 text-white" />}
            </div>
            <p className="text-[12px] flex-1" style={{ color: "#3a3a38" }}>
              J&apos;accepte la{" "}
              <span
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCancellationPolicy(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCancellationPolicy(true);
                  }
                }}
                className="font-semibold underline underline-offset-2 inline-flex items-center gap-1 cursor-pointer hover:opacity-80"
                style={{ color: "#1f3a33" }}
              >
                <ShieldCheck className="w-3 h-3" />
                politique d&apos;annulation
              </span>
            </p>
          </button>
        </div>

        {/* Bouton Confirmer */}
        <button
          onClick={onConfirm}
          disabled={isSubmitting || !acceptedCancellationPolicy}
          className="w-full mt-4 py-3.5 rounded-full transition-all flex items-center justify-center gap-2 text-[14px] font-semibold tracking-[-0.01em]"
          style={{
            background: isSubmitting || !acceptedCancellationPolicy ? "#dfdcd4" : "#1f3a33",
            color: isSubmitting || !acceptedCancellationPolicy ? "#9c9484" : "#f7f5ef",
            cursor: isSubmitting || !acceptedCancellationPolicy ? "not-allowed" : "pointer",
          }}
        >
          <Sparkles className="w-4 h-4" />
          {isSubmitting ? "Envoi en cours..." : "Confirmer la réservation"}
        </button>

        {/* Erreur */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 flex items-start gap-2"
            style={{
              borderRadius: 12,
              background: "#fdf0f0",
              border: "1px solid #f1cdcd",
              color: "#8a3a3a",
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[12px] font-medium">{error}</p>
              {Object.keys(fieldErrors).length > 0 && (
                <p className="text-[11px] mt-1 opacity-80">
                  Vérifiez les champs marqués en rouge ci-dessus.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>

      <CancellationPolicyModal
        isOpen={showCancellationPolicy}
        onClose={() => setShowCancellationPolicy(false)}
        serviceType={cancellationServiceType}
        numberOfSessions={numberOfSessions}
        totalPrice={totalAmount}
        announcerPolicy={
          cancellationPolicy as
            | { refundMode: "per_session" | "percentage_remaining"; commissionPercent: number }
            | null
        }
        clientInfo={clientCancellationInfo}
      />
    </>
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

function SingleSessionCard({
  bookingData,
  isMultiDay,
  daysCount,
  priceCalculation,
  billingInfo,
}: {
  bookingData: PendingBookingData;
  isMultiDay: boolean;
  daysCount: number;
  priceCalculation: PriceCalculationResult | null;
  billingInfo: BillingInfo | null;
}) {
  const startDate = formatShortDate(bookingData.dates.startDate);
  const endDate = formatShortDate(bookingData.dates.endDate);
  const startTime = bookingData.dates.startTime ? formatTime(bookingData.dates.startTime) : null;
  const endTime = bookingData.dates.endTime ? formatTime(bookingData.dates.endTime) : null;

  const title =
    isMultiDay && startTime && endTime
      ? `${startDate} → ${endDate}`
      : startTime && endTime
        ? startDate
        : startTime
          ? startDate
          : isMultiDay
            ? `${startDate} → ${endDate}`
            : startDate;

  return (
    <SectionCard
      eyebrow="Date et horaires"
      title={title}
      icon={<CalendarCheck className="w-3.5 h-3.5" />}
    >
      <div className="text-[12.5px]" style={{ color: "#3a3a38" }}>
        {isMultiDay && startTime && endTime ? (
          <>
            Du <strong className="text-[#1f1f1d]">{startDate}</strong> à{" "}
            <strong className="text-[#1f1f1d]">{startTime}</strong>
            <br />
            jusqu&apos;au <strong className="text-[#1f1f1d]">{endDate}</strong> à{" "}
            <strong className="text-[#1f1f1d]">{endTime}</strong>
          </>
        ) : startTime && endTime ? (
          <>
            De <strong className="text-[#1f1f1d]">{startTime}</strong> à{" "}
            <strong className="text-[#1f1f1d]">{endTime}</strong>
          </>
        ) : startTime ? (
          <>
            À <strong className="text-[#1f1f1d]">{startTime}</strong>
            {bookingData.variant?.duration && (
              <span style={{ color: "#9c9484" }}>
                {" → "}
                {formatTime(calculateEndTime(bookingData.dates.startTime!, bookingData.variant.duration))}{" "}
                ({formatDuration(bookingData.variant.duration)})
              </span>
            )}
          </>
        ) : null}
      </div>

      {priceCalculation && (daysCount >= 1 || priceCalculation.firstDayHours > 0) && (
        <div
          className="flex items-center gap-1.5 mt-2 pt-2 text-[11px]"
          style={{ borderTop: "1px solid #f1ede3", color: "#6d6d68" }}
        >
          <Clock className="w-3 h-3" />
          <span>
            {billingInfo && (billingInfo.fullDays > 0 || billingInfo.halfDays > 0) ? (
              <>
                {billingInfo.fullDays > 0 &&
                  `${billingInfo.fullDays} journée${billingInfo.fullDays > 1 ? "s" : ""}`}
                {billingInfo.fullDays > 0 && billingInfo.halfDays > 0 && " + "}
                {billingInfo.halfDays > 0 &&
                  `${billingInfo.halfDays} demi-journée${billingInfo.halfDays > 1 ? "s" : ""}`}
                {priceCalculation.nights > 0 &&
                  ` · ${priceCalculation.nights} nuit${priceCalculation.nights > 1 ? "s" : ""}`}
              </>
            ) : daysCount > 1 ? (
              <>
                {daysCount} jour{daysCount > 1 ? "s" : ""}
                {priceCalculation.nights > 0 &&
                  ` · ${priceCalculation.nights} nuit${priceCalculation.nights > 1 ? "s" : ""}`}
              </>
            ) : priceCalculation.firstDayHours > 0 ? (
              `Durée : ${formatHoursDisplay(priceCalculation.firstDayHours)}`
            ) : null}
          </span>
        </div>
      )}
    </SectionCard>
  );
}

function UniSessionPriceCard({
  priceCalculation,
  billingInfo,
  bookingData,
  isMultiDay,
  daysCount,
  dailyRate,
  halfDayRate,
  dayStartDisplay,
  dayEndDisplay,
  effectiveAnimalCount = 1,
}: {
  priceCalculation: PriceCalculationResult;
  billingInfo: BillingInfo | null;
  bookingData: PendingBookingData;
  isMultiDay: boolean;
  daysCount: number;
  dailyRate: number;
  halfDayRate: number;
  dayStartDisplay: string;
  dayEndDisplay: string;
  effectiveAnimalCount?: number;
}) {
  const variantName = bookingData.variant?.name || "Prestation";
  const total =
    priceCalculation.firstDayAmount +
    priceCalculation.fullDaysAmount +
    priceCalculation.lastDayAmount;
  const totalWithAnimals = effectiveAnimalCount > 1 ? total * effectiveAnimalCount : total;

  return (
    <div
      className="p-3 mb-2"
      style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Package className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#1f3a33" }} />
          <span className="text-[12.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] truncate">
            {variantName}
          </span>
        </div>
        <span className="text-[14px] font-bold text-[#1f1f1d] tracking-[-0.01em] flex-shrink-0 tabular-nums">
          {formatPrice(totalWithAnimals)}
        </span>
      </div>

      <div className="space-y-0.5">
        {billingInfo && (billingInfo.fullDays > 0 || billingInfo.halfDays > 0) ? (
          <>
            {daysCount === 1 ? (
              <BreakdownLine
                label={`${billingInfo.firstDayIsHalfDay ? "Demi-journée" : "Journée complète"} (${
                  bookingData.dates.startTime ? formatTime(bookingData.dates.startTime) : dayStartDisplay
                } → ${
                  bookingData.dates.endTime ? formatTime(bookingData.dates.endTime) : dayEndDisplay
                })`}
                value={formatPrice(billingInfo.firstDayIsHalfDay ? halfDayRate : dailyRate)}
              />
            ) : (
              <>
                <BreakdownLine
                  label={`1er jour : ${billingInfo.firstDayIsHalfDay ? "demi-journée" : "journée"} (${
                    bookingData.dates.startTime
                      ? formatTime(bookingData.dates.startTime)
                      : dayStartDisplay
                  } → ${dayEndDisplay})`}
                  value={formatPrice(billingInfo.firstDayIsHalfDay ? halfDayRate : dailyRate)}
                />
                {daysCount > 2 && (
                  <BreakdownLine
                    label={`${daysCount - 2} jour${daysCount - 2 > 1 ? "s" : ""} complet${daysCount - 2 > 1 ? "s" : ""} (${dayStartDisplay} → ${dayEndDisplay})`}
                    value={formatPrice(dailyRate * (daysCount - 2))}
                  />
                )}
                <BreakdownLine
                  label={`Dernier jour : ${billingInfo.lastDayIsHalfDay ? "demi-journée" : "journée"} (${dayStartDisplay} → ${
                    bookingData.dates.endTime ? formatTime(bookingData.dates.endTime) : dayEndDisplay
                  })`}
                  value={formatPrice(billingInfo.lastDayIsHalfDay ? halfDayRate : dailyRate)}
                />
              </>
            )}
          </>
        ) : isMultiDay ? (
          <>
            <BreakdownLine
              label={`${formatShortDate(bookingData.dates.startDate)}${
                bookingData.dates.startTime
                  ? ` (${formatTime(bookingData.dates.startTime)} → ${dayEndDisplay})`
                  : ""
              }`}
              value={formatPrice(priceCalculation.firstDayAmount)}
            />
            {priceCalculation.fullDays > 0 && (
              <BreakdownLine
                label={`${priceCalculation.fullDays} jour${priceCalculation.fullDays > 1 ? "s" : ""} complet${priceCalculation.fullDays > 1 ? "s" : ""} × ${formatPrice(dailyRate)}`}
                value={formatPrice(priceCalculation.fullDaysAmount)}
              />
            )}
            {priceCalculation.lastDayHours > 0 && (
              <BreakdownLine
                label={`${formatShortDate(bookingData.dates.endDate)}${
                  bookingData.dates.endTime
                    ? ` (${dayStartDisplay} → ${formatTime(bookingData.dates.endTime)})`
                    : ""
                }`}
                value={formatPrice(priceCalculation.lastDayAmount)}
              />
            )}
          </>
        ) : priceCalculation.firstDayHours > 0 ? (
          (() => {
            const hasValidHourly = priceCalculation.hourlyRate > 0;
            const label =
              bookingData.dates.startTime && bookingData.dates.endTime
                ? hasValidHourly
                  ? `${formatTime(bookingData.dates.startTime)} → ${formatTime(bookingData.dates.endTime)} (${formatHoursDisplay(priceCalculation.firstDayHours)} · ${formatPrice(priceCalculation.hourlyRate)}/h)`
                  : `Prestation forfaitaire (${formatTime(bookingData.dates.startTime)} → ${formatTime(bookingData.dates.endTime)})`
                : hasValidHourly
                  ? `${formatHoursDisplay(priceCalculation.firstDayHours)} de prestation`
                  : `Prestation forfaitaire (${formatHoursDisplay(priceCalculation.firstDayHours)})`;
            return <BreakdownLine label={label} value={formatPrice(priceCalculation.firstDayAmount)} />;
          })()
        ) : (
          <BreakdownLine label="Prestation forfaitaire" value={formatPrice(priceCalculation.firstDayAmount)} />
        )}

        {bookingData.overnight?.includeOvernightStay && priceCalculation.nights > 0 && (
          <div
            className="flex items-center justify-between text-[11.5px] pt-1 mt-1"
            style={{ borderTop: "1px solid #ece9e1" }}
          >
            <span className="flex items-center gap-1.5" style={{ color: "#6d6d68" }}>
              <Moon className="w-3 h-3" style={{ color: "#1f3a33" }} />
              {priceCalculation.nights} nuit{priceCalculation.nights > 1 ? "s" : ""}
              {priceCalculation.nightlyRate > 0 && (
                <span style={{ color: "#9c9484" }}>
                  · {formatPrice(priceCalculation.nightlyRate)}/nuit
                </span>
              )}
            </span>
            <span className="font-medium text-[#1f1f1d] tabular-nums">
              +{formatPrice(priceCalculation.nightsAmount)}
            </span>
          </div>
        )}

        {effectiveAnimalCount > 1 && (
          <div
            className="flex items-center justify-between text-[11.5px] pt-1 mt-1"
            style={{ borderTop: "1px solid #ece9e1" }}
          >
            <span style={{ color: "#6d6d68" }}>× {effectiveAnimalCount} animaux</span>
            <span className="font-medium text-[#1f1f1d] tabular-nums">
              {formatPrice(totalWithAnimals)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
