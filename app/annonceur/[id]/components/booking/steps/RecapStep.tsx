"use client";

import { motion } from "framer-motion";
import {
  Receipt,
  Package,
  CalendarCheck,
  MapPin,
  Home,
  Users,
  PawPrint,
  Plus,
  Moon,
} from "lucide-react";
import StepNav from "./StepNav";
import {
  formatPrice,
  formatDateDisplay,
} from "../pricing";
import {
  getCollectiveOrMultiSessionTotal,
  getVariantSessionPrice,
} from "@/app/lib/pricing";
import type { ServiceData, FormuleData, OptionData } from "../../types";
import type { BookingSelection, PriceBreakdown } from "../types";

// Taux de commission par statut (alignés sur lib/pricing)
const COMMISSION_RATES = {
  particulier: 0.15,
  micro_entrepreneur: 0.12,
  professionnel: 0.10,
} as const;
const STRIPE_FEE_RATE = 0.03;

interface CollectiveSlotInfo {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  availableSpots: number;
}

interface SelectedSession {
  date: string;
  startTime: string;
  endTime: string;
}

interface RecapStepProps {
  service: ServiceData;
  variant: FormuleData;
  bookingSelection: BookingSelection;
  isCollectiveFormule: boolean;
  isMultiSessionIndividual: boolean;
  collectiveSlots?: CollectiveSlotInfo[];
  selectedSessions?: SelectedSession[];
  numberOfSessions: number;
  animalCount: number;
  selectedOptions: OptionData[];
  priceBreakdown?: PriceBreakdown | null;
  announcerStatusType: "particulier" | "micro_entrepreneur" | "professionnel";
  announcerFirstName: string;
  announcerLastName: string;
  // Navigation
  onPrevStep: () => void;
  onNextStep: () => void;
  slideVariants: Record<string, { x: number; opacity: number }>;
  slideDirection: "left" | "right";
}

export default function RecapStep({
  service,
  variant,
  bookingSelection,
  isCollectiveFormule,
  isMultiSessionIndividual,
  collectiveSlots = [],
  selectedSessions = [],
  numberOfSessions,
  animalCount,
  selectedOptions,
  priceBreakdown,
  announcerStatusType,
  announcerFirstName,
  announcerLastName,
  onPrevStep,
  onNextStep,
  slideVariants,
  slideDirection,
}: RecapStepProps) {
  // Adaptation du variant pour le helper getVariantSessionPrice :
  // FormuleData utilise `unit` et non `priceUnit`. On fait le pont ici et
  // on prend `pricing.hourly` en fallback si `price` est manquant.
  const variantForPricing = {
    price: variant.price || variant.pricing?.hourly || variant.pricing?.daily || 0,
    priceUnit: variant.unit ?? "hour",
    duration: variant.duration ?? 60,
  };

  // Calcul du sous-total HT (annonceur)
  const sessionsCount = isCollectiveFormule
    ? Math.max(collectiveSlots.length, numberOfSessions || 1)
    : isMultiSessionIndividual
      ? Math.max(selectedSessions.length, numberOfSessions || 1)
      : 1;
  const sessionUnitPrice = (isCollectiveFormule || isMultiSessionIndividual)
    ? getVariantSessionPrice(variantForPricing)
    : variantForPricing.price;
  const optionsTotal = selectedOptions.reduce((sum, o) => sum + o.price, 0);

  // Pour les formules collectives/multi : recalcul depuis variant + sessions + animaux
  // Pour les formules garde/standard : on utilise priceBreakdown.subtotal qui inclut
  // base (jours) + nuits + options (déjà calculé par calculatePriceBreakdown)
  const subtotalHT = (isCollectiveFormule || isMultiSessionIndividual)
    ? getCollectiveOrMultiSessionTotal(variantForPricing, sessionsCount, Math.max(1, animalCount)) + optionsTotal
    : priceBreakdown
      ? priceBreakdown.subtotal * Math.max(1, animalCount)
      : sessionUnitPrice * Math.max(1, animalCount) + optionsTotal;

  const commissionRate = COMMISSION_RATES[announcerStatusType] ?? 0.15;
  const commission = Math.round(subtotalHT * commissionRate);
  const stripeFee = Math.round(subtotalHT * STRIPE_FEE_RATE);
  const totalClient = subtotalHT + commission + stripeFee;

  return (
    <motion.div
      key="recap"
      initial={slideDirection === "right" ? "enterFromRight" : "enterFromLeft"}
      animate="center"
      exit={slideDirection === "right" ? "exitToLeft" : "exitToRight"}
      variants={slideVariants}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="space-y-3"
    >
      <div
        className="bg-white p-[18px]"
        style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
      >
        {/* Header */}
        <div className="mb-4 flex items-start gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
          >
            <Receipt className="w-4 h-4" style={{ color: "#1f3a33" }} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
              Étape · Récapitulatif
            </div>
            <h3 className="text-base font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
              Vérifiez votre réservation
            </h3>
            <p className="text-[12px] text-[#6d6d68] mt-1">
              Avant de confirmer, vérifiez que tout est correct.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {/* Prestation */}
          <SectionCard
            eyebrow="Prestation"
            title={variant.name}
            icon={<Package className="w-3.5 h-3.5" />}
          >
            <SummaryRow
              label="Catégorie"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span>{service.categoryIcon}</span>
                  <span>{service.categoryName}</span>
                </span>
              }
            />
            {bookingSelection.serviceLocation === "announcer_home" && (
              <SummaryRow
                label="Lieu"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Home className="w-3 h-3" style={{ color: "#9c9484" }} />
                    Chez {announcerFirstName}
                    {announcerLastName ? ` ${announcerLastName.charAt(0)}.` : ""}
                  </span>
                }
              />
            )}
            {bookingSelection.serviceLocation === "client_home" && (
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

          {/* Créneaux */}
          {isCollectiveFormule && collectiveSlots.length > 0 ? (
            <SectionCard
              eyebrow="Créneaux collectifs"
              title={`${collectiveSlots.length} séance${collectiveSlots.length > 1 ? "s" : ""}`}
              icon={<CalendarCheck className="w-3.5 h-3.5" />}
            >
              <div className="space-y-1">
                {collectiveSlots
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((slot, i) => (
                    <SessionPill
                      key={slot._id}
                      index={i + 1}
                      label={`${formatDateDisplay(slot.date)} · ${slot.startTime} – ${slot.endTime}`}
                    />
                  ))}
              </div>
              {animalCount > 1 && (
                <div
                  className="flex items-center gap-2 mt-2 pt-2"
                  style={{ borderTop: "1px solid #f1ede3" }}
                >
                  <Users className="w-3 h-3" style={{ color: "#9c9484" }} />
                  <span className="text-[11px] text-[#6d6d68]">
                    {animalCount} animaux
                  </span>
                </div>
              )}
            </SectionCard>
          ) : isMultiSessionIndividual && selectedSessions.length > 0 ? (
            <SectionCard
              eyebrow="Séances planifiées"
              title={`${selectedSessions.length}/${numberOfSessions}`}
              icon={<CalendarCheck className="w-3.5 h-3.5" />}
            >
              <div className="space-y-1">
                {selectedSessions
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((s, i) => (
                    <SessionPill
                      key={`${s.date}-${s.startTime}`}
                      index={i + 1}
                      label={`${formatDateDisplay(s.date)} · ${s.startTime} – ${s.endTime}`}
                    />
                  ))}
              </div>
            </SectionCard>
          ) : bookingSelection.startDate ? (
            <SectionCard
              eyebrow="Date et horaires"
              title={formatDateDisplay(bookingSelection.startDate)}
              icon={<CalendarCheck className="w-3.5 h-3.5" />}
            >
              <p className="text-[12.5px]" style={{ color: "#3a3a38" }}>
                {bookingSelection.endDate &&
                bookingSelection.endDate !== bookingSelection.startDate ? (
                  <>
                    Du <strong>{formatDateDisplay(bookingSelection.startDate)}</strong>
                    {bookingSelection.startTime && (
                      <> à <strong>{bookingSelection.startTime}</strong></>
                    )}
                    <br />
                    jusqu&apos;au{" "}
                    <strong>{formatDateDisplay(bookingSelection.endDate)}</strong>
                    {bookingSelection.endTime && (
                      <> à <strong>{bookingSelection.endTime}</strong></>
                    )}
                  </>
                ) : (
                  <>
                    {bookingSelection.startTime && bookingSelection.endTime ? (
                      <>
                        De <strong>{bookingSelection.startTime}</strong> à{" "}
                        <strong>{bookingSelection.endTime}</strong>
                      </>
                    ) : bookingSelection.startTime ? (
                      <>
                        À <strong>{bookingSelection.startTime}</strong>
                      </>
                    ) : null}
                  </>
                )}
              </p>
              {bookingSelection.includeOvernightStay && (
                <p
                  className="text-[11px] mt-2 flex items-center gap-1"
                  style={{ color: "#3a6052" }}
                >
                  <Moon className="w-3 h-3" />
                  Garde de nuit incluse
                </p>
              )}
            </SectionCard>
          ) : null}

          {/* Options */}
          {selectedOptions.length > 0 && (
            <SectionCard
              eyebrow="Options additionnelles"
              title={`${selectedOptions.length} option${selectedOptions.length > 1 ? "s" : ""}`}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              <div className="space-y-1">
                {selectedOptions.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between text-[11.5px]"
                  >
                    <span style={{ color: "#3a3a38" }}>{opt.name}</span>
                    <span
                      className="font-medium tabular-nums"
                      style={{ color: "#1f3a33" }}
                    >
                      +{formatPrice(opt.price)}€
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ─── Décomposition prix ─── */}
        <div
          className="mt-5 pt-5"
          style={{ borderTop: "1px solid #f1ede3" }}
        >
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484] mb-2">
            Détail du prix
          </div>

          {/* Carte service */}
          <div
            className="p-3 mb-2"
            style={{ borderRadius: 12, background: "#fcfaf4", border: "1px solid #f1ede3" }}
          >
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-[12.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em]">
                {variant.name}
              </span>
              <span className="text-[14px] font-bold text-[#1f1f1d] tabular-nums">
                {formatPrice(
                  (isCollectiveFormule || isMultiSessionIndividual)
                    ? getCollectiveOrMultiSessionTotal(variantForPricing, sessionsCount, Math.max(1, animalCount))
                    : priceBreakdown
                      ? (priceBreakdown.baseAmount + priceBreakdown.nightsAmount) * Math.max(1, animalCount)
                      : sessionUnitPrice * Math.max(1, animalCount)
                )}€
              </span>
            </div>
            {(isCollectiveFormule || isMultiSessionIndividual) && (
              <p className="text-[11px]" style={{ color: "#6d6d68" }}>
                {formatPrice(sessionUnitPrice)}€ × {sessionsCount} séance
                {sessionsCount > 1 ? "s" : ""}
                {animalCount > 1 && ` × ${animalCount} animaux`}
              </p>
            )}
          </div>

          {/* Bloc fiscal */}
          <div
            className="p-3"
            style={{ borderRadius: 12, background: "#f5f9f6", border: "1px solid #cfdbd3" }}
          >
            <div className="space-y-1 text-[11.5px]">
              <FiscalLine label="Sous-total prestation" value={`${formatPrice(subtotalHT - optionsTotal)}€`} />
              {optionsTotal > 0 && (
                <FiscalLine label="Options" value={`+${formatPrice(optionsTotal)}€`} muted />
              )}
              <FiscalLine
                label={`Commission plateforme (${(commissionRate * 100).toFixed(0)} %)`}
                value={`+${formatPrice(commission)}€`}
                muted
              />
              <FiscalLine
                label={`Frais de paiement (${(STRIPE_FEE_RATE * 100).toFixed(0)} %)`}
                value={`+${formatPrice(stripeFee)}€`}
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
                className="text-[22px] font-bold tracking-[-0.02em] tabular-nums"
                style={{ color: "#1f3a33" }}
              >
                {formatPrice(totalClient)}€
              </span>
            </div>
          </div>
        </div>
      </div>

      <StepNav
        onPrevStep={onPrevStep}
        onNextStep={onNextStep}
        canProceed
        showNext
      />
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sous-composants
// ──────────────────────────────────────────────────────────────────

function SectionCard({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
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

function SessionPill({ index, label }: { index: number; label: string }) {
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
      <span className="font-medium text-[#1f3a33] capitalize flex-1 truncate">
        {label}
      </span>
    </div>
  );
}

function FiscalLine({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ color: muted ? "#6d6d68" : "#3a3a38" }}>{label}</span>
      <span
        className="tabular-nums font-medium"
        style={{ color: muted ? "#6d6d68" : "#1f1f1d" }}
      >
        {value}
      </span>
    </div>
  );
}
