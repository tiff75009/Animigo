"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  MapPin,
  Calendar,
  CalendarCheck,
  Clock,
  Users,
  CreditCard,
  Sparkles,
  Check,
  AlertCircle,
  Moon,
  Sun,
  Package,
  PawPrint,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/app/lib/utils";
import CancellationPolicyModal from "@/app/annonceur/[id]/components/booking/CancellationPolicyModal";
import {
  formatShortDate,
  formatTime,
  formatPrice,
  formatDuration,
  formatHoursDisplay,
  calculateEndTime,
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
  // Prix
  baseAmountHT: number;
  platformCommission: number;
  commissionRate: number;
  paymentFees: number;
  stripeFeeRate: number;
  vatRate: number;
  vatOnCommission: number;
  totalWithCommission: number;
  announcerStatusType: string;
  // Annulation
  acceptedCancellationPolicy: boolean;
  setAcceptedCancellationPolicy: (v: boolean) => void;
  cancellationServiceType: "uni_seance" | "garde" | "collectif" | "multi_seance";
  totalAmount: number;
  cancellationPolicy: { refundMode: string; commissionPercent: number } | null;
  clientCancellationInfo: { cancellationCount: number; secondAnnouncerPercent: number } | null;
  // Actions
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

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm overflow-hidden lg:sticky lg:top-24"
      >
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Récapitulatif
          </h2>
        </div>
        <div className="p-6">
          {/* Annonceur */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              {bookingData.announcer.profileImage ? (
                <Image
                  src={bookingData.announcer.profileImage}
                  alt={bookingData.announcer.firstName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl bg-primary/10">
                  👤
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground flex items-center gap-1 truncate">
                {bookingData.announcer.firstName} {bookingData.announcer.lastName.charAt(0)}.
                {bookingData.announcer.verified && (
                  <CheckCircle className="w-4 h-4 text-secondary flex-shrink-0" />
                )}
              </p>
              <p className="text-sm text-text-light flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {bookingData.announcer.city && bookingData.announcer.postalCode
                  ? `${bookingData.announcer.postalCode} ${bookingData.announcer.city}`
                  : bookingData.announcer.city || extractCity(bookingData.announcer.location)}
              </p>
              <span
                className={`inline-flex items-center mt-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
                  bookingData.announcer.statusType === "professionnel"
                    ? "bg-blue-100 text-blue-700"
                    : bookingData.announcer.statusType === "micro_entrepreneur"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {bookingData.announcer.statusType === "professionnel"
                  ? "Professionnel"
                  : bookingData.announcer.statusType === "micro_entrepreneur"
                  ? "Micro-entrepreneur"
                  : "Particulier"}
              </span>
            </div>
          </div>

          {/* Service */}
          <div className="py-4 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{bookingData.service.categoryIcon || "✨"}</span>
              <div>
                <p className="font-semibold text-foreground">
                  {bookingData.service.categoryName}
                </p>
                {bookingData.variant && (
                  <p className="text-sm text-text-light">{bookingData.variant.name}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {isCollectiveFormula && (
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Collective
                    </span>
                  )}
                  {isMultiSessionFormula && !isCollectiveFormula && (
                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      {numberOfSessions} séances
                    </span>
                  )}
                  {bookingData.serviceLocation === "client_home" && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      À domicile
                    </span>
                  )}
                  {bookingData.serviceLocation === "announcer_home" && (
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Chez le prestataire
                    </span>
                  )}
                </div>
                {bookingData.serviceLocation === "client_home" && address && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">{address}</p>
                    {(city || bookingData.guestAddress?.postalCode) && (
                      <p className="text-xs text-blue-600">
                        {[bookingData.guestAddress?.postalCode, city].filter(Boolean).join(" ")}
                      </p>
                    )}
                    {coordinates && bookingData.announcer.coordinates && (
                      <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {formatDistance(
                          calculateDistance(
                            bookingData.announcer.coordinates.lat,
                            bookingData.announcer.coordinates.lng,
                            coordinates.lat,
                            coordinates.lng
                          )
                        )} du pet-sitter
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dates et horaires */}
          <div className="py-4 border-b border-gray-100">
            {isCollectiveFormula && bookingData.collectiveSlots && bookingData.collectiveSlots.length > 0 ? (
              <CollectiveSlotsDisplay
                slots={bookingData.collectiveSlots}
                effectiveAnimalCount={effectiveAnimalCount}
              />
            ) : isMultiSessionFormula && bookingData.sessions && bookingData.sessions.length > 0 ? (
              <MultiSessionDisplay
                sessions={bookingData.sessions}
                numberOfSessions={numberOfSessions}
              />
            ) : (
              <SingleSessionDisplay
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
            <GuestAnimalDisplay guestAnimalData={guestAnimalData} />
          )}

          {/* Prix */}
          <div className="pt-4">
            {/* Formule collective ou multi-séances */}
            {(isCollectiveFormula || isMultiSessionFormula) && bookingData.variant && (() => {
              // Pour les formules collectives, utiliser le nombre réel de créneaux
              const actualSlots = isCollectiveFormula && bookingData.collectiveSlots?.length
                ? bookingData.collectiveSlots.length
                : numberOfSessions;
              const basePrice = isCollectiveFormula
                ? bookingData.variant.price * actualSlots * effectiveAnimalCount
                : bookingData.variant.price * numberOfSessions;

              return (
                <div className={`rounded-xl p-4 space-y-3 mb-3 ${isCollectiveFormula ? "bg-purple-50" : "bg-primary/5"}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className={`w-4 h-4 ${isCollectiveFormula ? "text-purple-600" : "text-primary"}`} />
                        <span className="font-medium text-foreground">
                          Formule : {bookingData.variant.name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 ml-6">
                        └ {formatPrice(bookingData.variant.price)} × {isCollectiveFormula ? actualSlots : numberOfSessions} {isCollectiveFormula ? "créneau" : "séance"}{(isCollectiveFormula ? actualSlots : numberOfSessions) > 1 ? (isCollectiveFormula ? "x" : "s") : ""}
                        {isCollectiveFormula && effectiveAnimalCount > 1 && ` × ${effectiveAnimalCount} animaux`}
                      </p>
                    </div>
                    <span className={`font-bold text-lg ${isCollectiveFormula ? "text-purple-700" : "text-primary"}`}>
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Formule uni-séance - Prix HT avec détail */}
            {priceCalculation && !isCollectiveFormula && !isMultiSessionFormula && (
              <UniSessionPriceDetail
                priceCalculation={priceCalculation}
                billingInfo={billingInfo}
                bookingData={bookingData}
                isMultiDay={isMultiDay}
                daysCount={daysCount}
                dailyRate={dailyRate}
                halfDayRate={halfDayRate}
                dayStartDisplay={dayStartDisplay}
                dayEndDisplay={dayEndDisplay}
              />
            )}

            {/* Options */}
            {selectedOptionIds.length > 0 && (
              <div className="space-y-2 mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Options</p>
                {selectedOptionIds.map((optId) => {
                  const opt = bookingData.availableOptions?.find(
                    (o: ServiceOption) => o.id === optId
                  );
                  if (!opt) return null;
                  return (
                    <div
                      key={optId}
                      className="flex justify-between text-sm text-secondary"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 flex items-center justify-center text-xs">✓</span>
                        {opt.name}
                      </span>
                      <span className="font-medium">+{formatPrice(opt.price)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Récapitulatif prix + Commissions + Total */}
            <div className="bg-gray-100 rounded-xl p-4 space-y-2">
              {/* Prix prestataire avec détail HT/TTC pour professionnels */}
              {announcerStatusType === "professionnel" ? (
                <>
                  {(() => {
                    const serviceVatRate = 20;
                    const serviceHT = Math.round(baseAmountHT / (1 + serviceVatRate / 100));
                    const serviceTVA = baseAmountHT - serviceHT;
                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Prix prestataire HT</span>
                          <span className="font-medium text-foreground">
                            {formatPrice(serviceHT)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>TVA prestation ({serviceVatRate}%)</span>
                          <span>{formatPrice(serviceTVA)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 font-medium">Prix prestataire TTC</span>
                          <span className="font-semibold text-foreground">
                            {formatPrice(baseAmountHT)}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Prix prestataire</span>
                  <span className="font-medium text-foreground">
                    {formatPrice(baseAmountHT)}
                  </span>
                </div>
              )}

              {announcerStatusType === "micro_entrepreneur" && (
                <p className="text-xs text-gray-500 italic">
                  TVA non applicable (art. 293 B du CGI)
                </p>
              )}

              <div className="flex justify-between text-sm text-gray-500">
                <span>Commission ({commissionRate}%)</span>
                <span>+{formatPrice(platformCommission)}</span>
              </div>

              {/* TVA sur commission — masquer si 0% */}
              {vatRate > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>TVA sur commission ({vatRate}%)</span>
                  <span>+{formatPrice(vatOnCommission)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm text-gray-500">
                <span>Frais de paiement ({stripeFeeRate}%)</span>
                <span>+{formatPrice(paymentFees)}</span>
              </div>

              <div className="border-t-2 border-primary/20 my-2" />

              <div className="flex justify-between">
                <span className="font-bold text-lg text-foreground">Total à payer</span>
                <span className="font-bold text-xl text-primary">
                  {formatPrice(totalWithCommission)}
                </span>
              </div>
            </div>
          </div>

          {/* Politique d'annulation */}
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="mt-0.5">
                <div
                  onClick={() => setAcceptedCancellationPolicy(!acceptedCancellationPolicy)}
                  className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center transition-colors border-2",
                    acceptedCancellationPolicy
                      ? "bg-primary border-primary text-white"
                      : "border-gray-300 bg-white"
                  )}
                >
                  {acceptedCancellationPolicy && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  J&apos;accepte la{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowCancellationPolicy(true);
                    }}
                    className="text-primary font-medium underline underline-offset-2 hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    politique d&apos;annulation
                  </button>
                </p>
              </div>
            </label>
          </div>

          {/* Bouton Confirmer */}
          <button
            onClick={onConfirm}
            disabled={isSubmitting || !acceptedCancellationPolicy}
            className={cn(
              "w-full mt-4 py-4 font-semibold rounded-xl transition-all flex items-center justify-center gap-2",
              isSubmitting || !acceptedCancellationPolicy
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-primary to-primary/90 text-white hover:shadow-lg hover:shadow-primary/30"
            )}
          >
            <Sparkles className="w-5 h-5" />
            Confirmer la réservation
          </button>

          {/* Erreur */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1">
                <p className="font-medium text-sm">{error}</p>
                {Object.keys(fieldErrors).length > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    Vérifiez les champs marqués en rouge ci-dessus
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Modal politique d'annulation */}
      <CancellationPolicyModal
        isOpen={showCancellationPolicy}
        onClose={() => setShowCancellationPolicy(false)}
        serviceType={cancellationServiceType}
        numberOfSessions={numberOfSessions}
        totalPrice={totalAmount}
        announcerPolicy={cancellationPolicy as { refundMode: "per_session" | "percentage_remaining"; commissionPercent: number } | null}
        clientInfo={clientCancellationInfo}
      />
    </>
  );
}

// --- Sub-components ---

function CollectiveSlotsDisplay({
  slots,
  effectiveAnimalCount,
}: {
  slots: CollectiveSlotData[];
  effectiveAnimalCount: number;
}) {
  return (
    <div className="p-3 bg-purple-50 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <CalendarCheck className="w-4 h-4 text-purple-600" />
        <span className="text-sm font-medium text-purple-800">
          {slots.length} créneau{slots.length > 1 ? "x" : ""} sélectionné{slots.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-1.5">
        {slots.map((slot, index) => (
          <div key={slot._id} className="flex items-center gap-2 text-sm">
            <span className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 text-xs flex items-center justify-center font-semibold">
              {index + 1}
            </span>
            <span className="text-gray-700 capitalize">
              {formatShortDate(slot.date)}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-purple-700 font-medium">
              {slot.startTime} - {slot.endTime}
            </span>
          </div>
        ))}
      </div>
      {effectiveAnimalCount > 1 && (
        <div className="mt-2 pt-2 border-t border-purple-200 flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          <span className="text-sm text-purple-700">
            {effectiveAnimalCount} animal{effectiveAnimalCount > 1 ? "aux" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

function MultiSessionDisplay({
  sessions,
  numberOfSessions,
}: {
  sessions: SessionData[];
  numberOfSessions: number;
}) {
  return (
    <div className="p-3 bg-primary/5 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <CalendarCheck className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          Séances planifiées ({sessions.length}/{numberOfSessions})
        </span>
      </div>
      <div className="space-y-1.5">
        {sessions.map((session, index) => (
          <div
            key={`${session.date}-${session.startTime}`}
            className="flex items-center gap-2 text-sm"
          >
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">
              {index + 1}
            </span>
            <span className="text-gray-700 capitalize">
              {formatShortDate(session.date)}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-primary font-medium">
              {session.startTime} - {session.endTime}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SingleSessionDisplay({
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
  return (
    <>
      <p className="text-xs font-medium text-text-light uppercase mb-2">Date et horaire</p>
      <div className="flex items-start gap-3">
        <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm text-foreground">
          {isMultiDay && bookingData.dates.startTime && bookingData.dates.endTime ? (
            <span>
              Du {formatShortDate(bookingData.dates.startDate)} à {formatTime(bookingData.dates.startTime)} jusqu&apos;au {formatShortDate(bookingData.dates.endDate)} à {formatTime(bookingData.dates.endTime)}
            </span>
          ) : bookingData.dates.startTime && bookingData.dates.endTime ? (
            <span>
              {formatShortDate(bookingData.dates.startDate)} de {formatTime(bookingData.dates.startTime)} à {formatTime(bookingData.dates.endTime)}
            </span>
          ) : bookingData.dates.startTime ? (
            <span>
              {formatShortDate(bookingData.dates.startDate)} à {formatTime(bookingData.dates.startTime)}
              {bookingData.variant?.duration && (
                <span className="text-text-light">
                  {" → "}{formatTime(calculateEndTime(bookingData.dates.startTime, bookingData.variant.duration))}
                  {" "}({formatDuration(bookingData.variant.duration)})
                </span>
              )}
            </span>
          ) : isMultiDay ? (
            <span>
              Du {formatShortDate(bookingData.dates.startDate)} au {formatShortDate(bookingData.dates.endDate)}
            </span>
          ) : (
            <span>{formatShortDate(bookingData.dates.startDate)}</span>
          )}

          {priceCalculation && (daysCount >= 1 || priceCalculation.firstDayHours > 0) && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-text-light">
              <Clock className="w-3 h-3" />
              <span>
                {billingInfo && (billingInfo.fullDays > 0 || billingInfo.halfDays > 0) ? (
                  <>
                    {billingInfo.fullDays > 0 && `${billingInfo.fullDays} journée${billingInfo.fullDays > 1 ? "s" : ""}`}
                    {billingInfo.fullDays > 0 && billingInfo.halfDays > 0 && " + "}
                    {billingInfo.halfDays > 0 && `${billingInfo.halfDays} demi-journée${billingInfo.halfDays > 1 ? "s" : ""}`}
                    {priceCalculation.nights > 0 && ` • ${priceCalculation.nights} nuit${priceCalculation.nights > 1 ? "s" : ""}`}
                  </>
                ) : daysCount > 1 ? (
                  <>
                    {daysCount} jour{daysCount > 1 ? "s" : ""}
                    {priceCalculation.nights > 0 && ` • ${priceCalculation.nights} nuit${priceCalculation.nights > 1 ? "s" : ""}`}
                  </>
                ) : priceCalculation.firstDayHours > 0 ? (
                  `Durée : ${formatHoursDisplay(priceCalculation.firstDayHours)}`
                ) : null}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function GuestAnimalDisplay({ guestAnimalData }: { guestAnimalData: GuestAnimalData }) {
  return (
    <div className="py-4 border-b border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <PawPrint className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-800">
          {guestAnimalData.type === "chien" ? "Votre chien" : guestAnimalData.type === "chat" ? "Votre chat" : "Votre animal"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 text-lg">
          {guestAnimalData.type === "chien" ? "🐕" : guestAnimalData.type === "chat" ? "🐱" : guestAnimalData.type === "nac" ? "🐹" : "🐾"}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {guestAnimalData.name}
          </p>
          <p className="text-xs text-text-light">
            {guestAnimalData.type === "chien" ? (
              guestAnimalData.isMixedBreed ? (
                guestAnimalData.primaryBreed && guestAnimalData.secondaryBreed
                  ? `${guestAnimalData.primaryBreed} x ${guestAnimalData.secondaryBreed}`
                  : guestAnimalData.primaryBreed
                    ? `Croisé ${guestAnimalData.primaryBreed}`
                    : "Croisé"
              ) : (
                guestAnimalData.breed || "Race non spécifiée"
              )
            ) : (
              <>
                {guestAnimalData.type === "chat" ? "Chat" : guestAnimalData.type === "nac" ? "NAC" : guestAnimalData.type}
                {guestAnimalData.breed && ` - ${guestAnimalData.breed}`}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function UniSessionPriceDetail({
  priceCalculation,
  billingInfo,
  bookingData,
  isMultiDay,
  daysCount,
  dailyRate,
  halfDayRate,
  dayStartDisplay,
  dayEndDisplay,
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
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2 mb-3">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Détail des tarifs HT</p>

      {billingInfo && (billingInfo.fullDays > 0 || billingInfo.halfDays > 0) ? (
        <div className="space-y-1.5">
          {daysCount === 1 ? (
            <div className="flex justify-between text-sm">
              <span className="text-text-light">
                └ {billingInfo.firstDayIsHalfDay ? "Demi-journée" : "Journée complète"} ({bookingData.dates.startTime ? formatTime(bookingData.dates.startTime) : dayStartDisplay} → {bookingData.dates.endTime ? formatTime(bookingData.dates.endTime) : dayEndDisplay})
              </span>
              <span className="font-medium">{formatPrice(billingInfo.firstDayIsHalfDay ? halfDayRate : dailyRate)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-text-light">
                  └ 1er jour : {billingInfo.firstDayIsHalfDay ? "demi-journée" : "journée"} ({bookingData.dates.startTime ? formatTime(bookingData.dates.startTime) : dayStartDisplay} → {dayEndDisplay})
                </span>
                <span className="font-medium">{formatPrice(billingInfo.firstDayIsHalfDay ? halfDayRate : dailyRate)}</span>
              </div>

              {daysCount > 2 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-light">
                    └ {daysCount - 2} jour{daysCount - 2 > 1 ? "s" : ""} complet{daysCount - 2 > 1 ? "s" : ""} ({dayStartDisplay} → {dayEndDisplay})
                  </span>
                  <span className="font-medium">{formatPrice(dailyRate * (daysCount - 2))}</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-text-light">
                  └ Dernier jour : {billingInfo.lastDayIsHalfDay ? "demi-journée" : "journée"} ({dayStartDisplay} → {bookingData.dates.endTime ? formatTime(bookingData.dates.endTime) : dayEndDisplay})
                </span>
                <span className="font-medium">{formatPrice(billingInfo.lastDayIsHalfDay ? halfDayRate : dailyRate)}</span>
              </div>
            </>
          )}

          <div className="flex justify-between pt-1 border-t border-gray-200/50 mt-1 text-xs text-gray-500">
            <span>
              {billingInfo.fullDays > 0 && `${billingInfo.fullDays} journée${billingInfo.fullDays > 1 ? "s" : ""} × ${formatPrice(dailyRate)}`}
              {billingInfo.fullDays > 0 && billingInfo.halfDays > 0 && " + "}
              {billingInfo.halfDays > 0 && `${billingInfo.halfDays} demi-journée${billingInfo.halfDays > 1 ? "s" : ""} × ${formatPrice(halfDayRate)}`}
            </span>
          </div>
        </div>
      ) : isMultiDay ? (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-text-light flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              <span>
                {formatShortDate(bookingData.dates.startDate)}
                <span className="text-gray-400 ml-1">
                  ({bookingData.dates.startTime ? `${formatTime(bookingData.dates.startTime)} → ${dayEndDisplay}` : ""})
                </span>
              </span>
            </span>
            <span className="font-medium">{formatPrice(priceCalculation.firstDayAmount)}</span>
          </div>

          {priceCalculation.fullDays > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-light flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>
                  {priceCalculation.fullDays} jour{priceCalculation.fullDays > 1 ? "s" : ""} complet{priceCalculation.fullDays > 1 ? "s" : ""}
                  <span className="text-gray-400 ml-1">({formatPrice(dailyRate)}/jour)</span>
                </span>
              </span>
              <span className="font-medium">{formatPrice(priceCalculation.fullDaysAmount)}</span>
            </div>
          )}

          {priceCalculation.lastDayHours > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-text-light flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>
                  {formatShortDate(bookingData.dates.endDate)}
                  <span className="text-gray-400 ml-1">
                    ({dayStartDisplay} → {bookingData.dates.endTime ? formatTime(bookingData.dates.endTime) : ""})
                  </span>
                </span>
              </span>
              <span className="font-medium">{formatPrice(priceCalculation.lastDayAmount)}</span>
            </div>
          )}
        </>
      ) : (
        priceCalculation.firstDayHours > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-text-light flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>
                {bookingData.dates.startTime && bookingData.dates.endTime ? (
                  <>
                    {formatTime(bookingData.dates.startTime)} → {formatTime(bookingData.dates.endTime)}
                    <span className="text-gray-400 ml-1">
                      ({formatHoursDisplay(priceCalculation.firstDayHours)}
                      {priceCalculation.hourlyRate > 0 && ` · ${formatPrice(priceCalculation.hourlyRate)}/h`})
                    </span>
                  </>
                ) : (
                  <>{formatHoursDisplay(priceCalculation.firstDayHours)} de prestation</>
                )}
              </span>
            </span>
            <span className="font-medium">{formatPrice(priceCalculation.firstDayAmount)}</span>
          </div>
        )
      )}

      {/* Nuits */}
      {bookingData.overnight?.includeOvernightStay && priceCalculation.nights > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-indigo-700 flex items-center gap-2">
            <Moon className="w-4 h-4" />
            <span>
              {priceCalculation.nights} nuit{priceCalculation.nights > 1 ? "s" : ""}
              {priceCalculation.nightlyRate > 0 && (
                <span className="text-indigo-400 ml-1">
                  ({formatPrice(priceCalculation.nightlyRate)}/nuit)
                </span>
              )}
            </span>
          </span>
          <span className="font-medium text-indigo-700">+{formatPrice(priceCalculation.nightsAmount)}</span>
        </div>
      )}
    </div>
  );
}
