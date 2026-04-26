"use client";

import { useState, useMemo, useEffect, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, LayoutGrid, List, ChevronDown, Sparkles, Info, Receipt } from "lucide-react";
import {
  FormuleCardGrid,
  FormuleCardList,
} from "@/app/components/platform/FormuleCard";

// Taux à conserver synchronisés avec FormuleCard.tsx
const COMMISSION_RATES = {
  particulier: 0.15,
  micro_entrepreneur: 0.12,
  professionnel: 0.10,
} as const;
const STRIPE_FEE_RATE = 0.03;

const PRICE_UNIT_LABELS: Record<string, string> = {
  hour: "heure",
  half_day: "demi-journée",
  day: "jour",
  week: "semaine",
  month: "mois",
  flat: "forfait",
  night: "nuit",
};

function formatPriceCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}
import { useAnnouncerPreviewData } from "./useAnnouncerPreviewData";
import { buildPreviewFormule } from "./buildPreviewFormule";
import type { LocalVariant } from "../VariantManager";

interface ServiceCategoryLite {
  slug: string;
  name: string;
  icon?: string;
  isCapacityBased?: boolean;
  allowOvernightStay?: boolean;
  clientBillingMode?: "exact_hourly" | "round_half_day" | "round_full_day";
}

interface ServiceCardPreviewProps {
  category: ServiceCategoryLite | null;
  variants: LocalVariant[];
  isSapEligible?: boolean;
  allowOvernightStay?: boolean;
  /** Description saisie en étape 1 (service) — fallback si la variante n'en a pas */
  serviceDescription?: string;
  // Étape courante du wizard pour adapter le message contextuel
  currentStep?: 1 | 2 | 3;
}

type PreviewView = "grid" | "list";

/**
 * Panneau d'aperçu live affichant la card formule telle qu'elle apparaîtra
 * sur la page /recherche. Réutilise FormuleCardGrid/FormuleCardList pour
 * une fidélité 100 %, en désactivant les interactions (favori, lien, etc.).
 */
export function ServiceCardPreview({
  category,
  variants,
  isSapEligible = false,
  allowOvernightStay = false,
  serviceDescription,
  currentStep = 1,
}: ServiceCardPreviewProps) {
  const { announcer, isLoading } = useAnnouncerPreviewData();
  const [view, setView] = useState<PreviewView>("grid");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset l'index si les variantes changent (suppression, ajout)
  useEffect(() => {
    if (selectedIndex >= variants.length && variants.length > 0) {
      setSelectedIndex(variants.length - 1);
    } else if (variants.length === 0 && selectedIndex !== 0) {
      setSelectedIndex(0);
    }
  }, [variants.length, selectedIndex]);

  const selectedVariant = variants[selectedIndex] ?? null;

  const previewFormule = useMemo(() => {
    if (!announcer) return null;
    return buildPreviewFormule({
      category,
      variant: selectedVariant,
      announcer,
      isSapEligible,
      allowOvernightStay,
      serviceDescription,
    });
  }, [announcer, category, selectedVariant, isSapEligible, allowOvernightStay, serviceDescription]);

  // Message contextuel selon l'étape
  const contextMessage = (() => {
    if (currentStep === 1) {
      return category
        ? "Catégorie sélectionnée — passez à l'étape 2 pour voir le détail."
        : "Sélectionnez une catégorie pour voir l'aperçu se construire.";
    }
    if (currentStep === 2) {
      return "Modifiez les champs à gauche, l'aperçu se met à jour en direct.";
    }
    return "Les options apparaîtront dans le détail de la formule sur la page annonceur.";
  })();

  return (
    <div className="space-y-3">
      {/* Header sticky en haut du panel scrollable */}
      <div
        className="sticky top-0 z-20 -mx-5 px-5 pt-5 pb-3 space-y-3"
        style={{
          background:
            "linear-gradient(to bottom, #fcfaf4 85%, rgba(252,250,244,0))",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex items-start gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#f5f9f6", border: "1px solid #cfdbd3" }}
            >
              <Eye className="w-3.5 h-3.5" style={{ color: "#1f3a33" }} />
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
                Aperçu live · Recherche
              </div>
              <h3 className="text-[13.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
                Voilà ce que verront les clients
              </h3>
            </div>
          </div>

          {/* Toggle vue Grille / Liste */}
          <div
            className="inline-flex items-center p-0.5 flex-shrink-0"
            style={{ borderRadius: 999, background: "#fff", border: "1px solid #ece9e1" }}
          >
            <button
              type="button"
              onClick={() => setView("grid")}
              className="w-6 h-6 inline-flex items-center justify-center rounded-full transition-colors"
              style={view === "grid" ? { background: "#1f3a33", color: "#f7f5ef" } : { color: "#9c9484" }}
              title="Vue grille"
            >
              <LayoutGrid className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className="w-6 h-6 inline-flex items-center justify-center rounded-full transition-colors"
              style={view === "list" ? { background: "#1f3a33", color: "#f7f5ef" } : { color: "#9c9484" }}
              title="Vue liste"
            >
              <List className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Sélecteur de variante (si plusieurs) */}
        {variants.length > 1 && (
          <div className="relative">
            <select
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(Number(e.target.value))}
              className="w-full appearance-none px-3 py-2 pr-8 text-[12px] font-medium cursor-pointer focus:outline-none"
              style={{
                borderRadius: 10,
                background: "#fff",
                border: "1px solid #dfdcd4",
                color: "#1f1f1d",
              }}
            >
              {variants.map((v, idx) => (
                <option key={v.localId} value={idx}>
                  Aperçu : {v.name?.trim() || `Formule ${idx + 1}`}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
              style={{ color: "#9c9484" }}
            />
          </div>
        )}
      </div>

      {/* Contenu preview */}
      <div className="relative">
        {variants.length === 0 || !category ? (
          <EmptyPreviewState category={category} />
        ) : isLoading || !previewFormule ? (
          <PreviewSkeleton />
        ) : (
          <div className="relative">
            {/* Filigrane "Aperçu" */}
            <div
              className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-medium uppercase tracking-[0.1em] pointer-events-none"
              style={{
                background: "rgba(31,58,51,0.85)",
                color: "#f7f5ef",
                backdropFilter: "blur(4px)",
              }}
            >
              <Sparkles className="w-2.5 h-2.5" />
              Aperçu
            </div>

            {/* Wrapper non-interactif (bloque favori, liens, lightbox) */}
            <div
              className="select-none overflow-hidden"
              style={{ pointerEvents: "none" }}
              aria-hidden="true"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${view}-${selectedIndex}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  {view === "grid" ? (
                    <FormuleCardGrid
                      formule={previewFormule}
                      index={0}
                      isFavorite={false}
                      isAnnouncer
                    />
                  ) : (
                    // Vue Liste : la card est conçue pour ≥640 px de large.
                    // Dans le panel ~360 px, on la rend dans un viewport
                    // virtuel de 720 px puis on la réduit à 50 % via
                    // transform:scale, ce qui préserve le layout horizontal
                    // (sm:flex-row activé). Compensation hauteur via overflow
                    // hidden + marginBottom négatif calculé dynamiquement.
                    <CompactListWrapper>
                      <FormuleCardList
                        formule={previewFormule}
                        index={0}
                        isFavorite={false}
                        isAnnouncer
                      />
                    </CompactListWrapper>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Décomposition du prix : adaptée au type de formule
          - Uni-séance : décomposition unitaire (prix → commission → frais → total)
          - Collective / multi-séances : décomposition pour TOUTES les séances */}
      {previewFormule && previewFormule.price > 0 && (
        <PriceBreakdown
          announcerPrice={previewFormule.price}
          priceUnit={previewFormule.priceUnit}
          statusType={previewFormule.announcerStatusType}
          sessionsCount={
            previewFormule.sessionType === "collective" ||
            (previewFormule.numberOfSessions ?? 1) > 1
              ? previewFormule.numberOfSessions ?? 1
              : 1
          }
        />
      )}

      {/* Banner contextuel + dispo info */}
      <div
        className="p-2.5 flex items-start gap-2 text-[11px]"
        style={{
          borderRadius: 10,
          background: "#fcfaf4",
          border: "1px solid #f1ede3",
          color: "#6d6d68",
        }}
      >
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "#9c9484" }} />
        <div className="flex-1 leading-[1.5]">
          <p className="m-0">{contextMessage}</p>
          {variants.length > 0 && category && (
            <p className="m-0 mt-1 italic" style={{ color: "#9c9484" }}>
              Votre disponibilité réelle s&apos;affichera après configuration dans Planning.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Décomposition du prix annonceur → prix client
// ──────────────────────────────────────────────────────────────────

function PriceBreakdown({
  announcerPrice,
  priceUnit,
  statusType,
  sessionsCount = 1,
}: {
  /** Prix HT par séance (en centimes) */
  announcerPrice: number;
  priceUnit: string;
  statusType: "particulier" | "micro_entrepreneur" | "professionnel";
  /** Nombre de séances obligatoires (>1 pour collectif/multi) */
  sessionsCount?: number;
}) {
  const commissionRate = COMMISSION_RATES[statusType] ?? 0.15;
  const isMulti = sessionsCount > 1;

  // Calculs UNITAIRES (par séance)
  const sessionCommission = Math.round(announcerPrice * commissionRate);
  const sessionStripe = Math.round(announcerPrice * STRIPE_FEE_RATE);
  const sessionClientPrice = announcerPrice + sessionCommission + sessionStripe;

  // Calculs TOTAUX (toutes séances, pour les formules collectives/multi)
  const announcerTotal = announcerPrice * sessionsCount;
  const totalCommission = sessionCommission * sessionsCount;
  const totalStripe = sessionStripe * sessionsCount;
  const clientTotal = sessionClientPrice * sessionsCount;

  const unitLabel = isMulti
    ? "séance"
    : PRICE_UNIT_LABELS[priceUnit] || priceUnit;

  const statusLabel =
    statusType === "professionnel"
      ? "Pro"
      : statusType === "micro_entrepreneur"
        ? "Micro-entrepreneur"
        : "Particulier";

  return (
    <div
      className="p-3"
      style={{
        borderRadius: 12,
        background: "#fff",
        border: "1px solid #ece9e1",
      }}
    >
      <div className="flex items-center gap-1.5 mb-2.5">
        <Receipt className="w-3.5 h-3.5" style={{ color: "#1f3a33" }} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#9c9484]">
            Décomposition du prix
          </div>
          <h4 className="text-[12.5px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0">
            {isMulti
              ? `Total pour ${sessionsCount} séances obligatoires`
              : "Pourquoi cette différence ?"}
          </h4>
        </div>
      </div>

      <div className="space-y-1">
        {/* Tarif annonceur (vert pastel = ce que vous percevez) */}
        <div
          className="p-2"
          style={{
            borderRadius: 8,
            background: "#f5f9f6",
            border: "1px solid #cfdbd3",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div
                className="text-[10px] font-medium uppercase tracking-[0.05em]"
                style={{ color: "#3a6052" }}
              >
                Votre tarif {isMulti ? "(total perçu)" : ""}
              </div>
              <p className="text-[11px] m-0" style={{ color: "#6d6d68" }}>
                {isMulti
                  ? `${sessionsCount} × ${formatPriceCents(announcerPrice)}/séance`
                  : "Vous percevez 100 % de ce montant"}
              </p>
            </div>
            <span
              className="text-[14px] font-semibold tabular-nums"
              style={{ color: "#1f3a33" }}
            >
              {formatPriceCents(announcerTotal)}
              {!isMulti && (
                <span className="text-[10px] font-normal" style={{ color: "#3a6052" }}>
                  {" "}/ {unitLabel}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Frais (à la charge du client) — calculés sur le total */}
        <div
          className="px-2 py-1.5 space-y-0.5"
          style={{ background: "#fcfaf4", borderRadius: 8 }}
        >
          <BreakdownLine
            label={`Commission plateforme (${(commissionRate * 100).toFixed(0)} %, ${statusLabel})`}
            value={`+${formatPriceCents(totalCommission)}`}
          />
          <BreakdownLine
            label={`Frais de paiement (${(STRIPE_FEE_RATE * 100).toFixed(0)} %)`}
            value={`+${formatPriceCents(totalStripe)}`}
          />
        </div>

        {/* Total payé par le client */}
        <div
          className="p-2 mt-1"
          style={{
            borderRadius: 8,
            background: "#1f3a33",
            color: "#f7f5ef",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div
                className="text-[10px] font-medium uppercase tracking-[0.05em]"
                style={{ color: "rgba(247,245,239,0.7)" }}
              >
                {isMulti ? "Total payé par le client" : "Prix affiché côté client"}
              </div>
              <p
                className="text-[10.5px] m-0"
                style={{ color: "rgba(247,245,239,0.6)" }}
              >
                {isMulti
                  ? `${sessionsCount} séances × ${formatPriceCents(sessionClientPrice)}`
                  : "C'est ce que verra l'internaute sur la recherche"}
              </p>
            </div>
            <span className="text-[15px] font-bold tabular-nums">
              {formatPriceCents(clientTotal)}
              {!isMulti && (
                <span
                  className="text-[10px] font-normal"
                  style={{ color: "rgba(247,245,239,0.7)" }}
                >
                  {" "}/ {unitLabel}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      <p
        className="text-[10.5px] mt-2 italic leading-[1.4]"
        style={{ color: "#9c9484" }}
      >
        {isMulti
          ? `Le client paie l'intégralité du forfait (${sessionsCount} séances) à la réservation. Les commissions et frais sont à sa charge en sus.`
          : `Les commissions et frais sont payés en sus par le client. Votre revenu reste ${formatPriceCents(announcerPrice)} par ${unitLabel}.`}
      </p>
    </div>
  );
}

function BreakdownLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span style={{ color: "#6d6d68" }}>{label}</span>
      <span className="font-medium tabular-nums" style={{ color: "#1f1f1d" }}>
        {value}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Wrapper compact pour la vue Liste
// Rend la FormuleCardList dans un viewport virtuel large (640 px)
// puis applique transform:scale pour la ramener à la largeur du parent,
// en mesurant la hauteur native pour compenser l'espace blanc bas.
// ──────────────────────────────────────────────────────────────────

function CompactListWrapper({ children }: { children: React.ReactNode }) {
  const VIRTUAL_WIDTH = 640;
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (!containerRef.current || !innerRef.current) return;
    const measure = () => {
      const containerWidth = containerRef.current?.clientWidth ?? VIRTUAL_WIDTH;
      const newScale = Math.min(1, containerWidth / VIRTUAL_WIDTH);
      setScale(newScale);
      const innerHeight = innerRef.current?.scrollHeight ?? 0;
      setScaledHeight(innerHeight * newScale);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{ height: scaledHeight }}
    >
      <div
        ref={innerRef}
        style={{
          width: VIRTUAL_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sous-composants
// ──────────────────────────────────────────────────────────────────

function EmptyPreviewState({ category }: { category: ServiceCategoryLite | null }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center p-6 min-h-[280px]"
      style={{
        borderRadius: 14,
        background: "repeating-linear-gradient(45deg, #fcfaf4, #fcfaf4 8px, #f7f5ef 8px, #f7f5ef 16px)",
        border: "1px dashed #dfdcd4",
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
        style={{ background: "#fff", border: "1px solid #ece9e1" }}
      >
        <Eye className="w-5 h-5" style={{ color: "#9c9484" }} />
      </div>
      <p className="text-[13px] font-semibold text-[#1f1f1d] tracking-[-0.01em] m-0 mb-1">
        Aperçu en attente
      </p>
      <p className="text-[11.5px] m-0 max-w-[240px]" style={{ color: "#6d6d68" }}>
        {!category
          ? "Choisissez une catégorie à l'étape 1 pour démarrer la prévisualisation."
          : "Ajoutez une formule à l'étape 2 pour voir la card apparaître ici."}
      </p>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div
      className="bg-white p-4 animate-pulse"
      style={{ borderRadius: 14, border: "1px solid #ece9e1" }}
    >
      <div className="flex gap-3 mb-3">
        <div
          className="w-14 h-14 rounded-full flex-shrink-0"
          style={{ background: "#f1ede3" }}
        />
        <div className="flex-1 space-y-2">
          <div className="h-3 rounded w-1/3" style={{ background: "#f1ede3" }} />
          <div className="h-2.5 rounded w-1/2" style={{ background: "#f7f5ef" }} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 rounded w-2/3" style={{ background: "#f1ede3" }} />
        <div className="h-2.5 rounded w-full" style={{ background: "#f7f5ef" }} />
        <div className="h-2.5 rounded w-3/4" style={{ background: "#f7f5ef" }} />
      </div>
      <div className="grid grid-cols-3 gap-1 mt-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded" style={{ background: "#f1ede3" }} />
        ))}
      </div>
      <div
        className="mt-4 pt-3 flex items-center justify-between"
        style={{ borderTop: "1px solid #f7f5ef" }}
      >
        <div className="h-4 rounded w-20" style={{ background: "#f1ede3" }} />
        <div className="h-7 rounded-full w-20" style={{ background: "#f1ede3" }} />
      </div>
    </div>
  );
}
