"use client";

import { useState, memo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Euro,
  ChevronDown,
  Check,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Repeat,
  Loader2,
  ExternalLink,
  Package,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import Link from "next/link";

const CATEGORY_INFO: Record<string, { name: string; emoji: string }> = {
  garde: { name: "Garde", emoji: "🏠" },
  promenade: { name: "Promenade", emoji: "🚶" },
  toilettage: { name: "Toilettage", emoji: "🛁" },
  dressage: { name: "Dressage", emoji: "🎓" },
  agilite: { name: "Agilité", emoji: "🏃" },
  transport: { name: "Transport", emoji: "🚗" },
  pension: { name: "Pension", emoji: "🏨" },
  visite: { name: "Visite", emoji: "👋" },
  medical: { name: "Soins médicaux", emoji: "💊" },
  autre: { name: "Autre", emoji: "✨" },
};

const PRICE_UNIT_LABELS: Record<string, string> = {
  hour: "/h",
  half_day: "/½j",
  day: "/jour",
  week: "/sem",
  month: "/mois",
  flat: "",
};

function formatPriceCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }) + " €";
}

interface VariantInfo {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceUnit: string;
  pricing?: {
    hourly?: number;
    halfDaily?: number;
    daily?: number;
    weekly?: number;
    monthly?: number;
    nightly?: number;
  };
  duration?: number;
  numberOfSessions?: number;
  sessionType?: string;
  maxAnimalsPerSession?: number;
  isActive: boolean;
  isSapEligible?: boolean;
}

interface ServiceInfo {
  id: string;
  category: string;
  name: string;
  isActive: boolean;
  variants: VariantInfo[];
  options: {
    id: string;
    name: string;
    price: number;
    priceType: string;
    unitLabel?: string;
    isActive: boolean;
    variantId?: string;
  }[];
}

function getVariantDisplayPrice(variant: VariantInfo): { price: number; unitLabel: string; unitKey: string } {
  const p = variant.pricing;
  if (p?.daily) return { price: p.daily, unitLabel: "/jour", unitKey: "day" };
  if (p?.hourly) return { price: p.hourly, unitLabel: "/h", unitKey: "hour" };
  if (p?.halfDaily) return { price: p.halfDaily, unitLabel: "/½j", unitKey: "half_day" };
  if (p?.weekly) return { price: p.weekly, unitLabel: "/sem", unitKey: "week" };
  if (p?.monthly) return { price: p.monthly, unitLabel: "/mois", unitKey: "month" };
  return { price: variant.price, unitLabel: PRICE_UNIT_LABELS[variant.priceUnit] || "", unitKey: variant.priceUnit };
}

// Mini barre de comparaison pour une formule individuelle
function VariantPriceBar({ token, category, variant }: {
  token: string;
  category: string;
  variant: VariantInfo;
}) {
  const display = getVariantDisplayPrice(variant);

  const recommendation = useQuery(
    api.services.pricing.getPriceRecommendation,
    { token, category, priceUnit: display.unitKey as "hour" | "half_day" | "day" | "week" | "month" | "flat" }
  );

  if (!recommendation) {
    return <div className="h-1 bg-gray-100 rounded-full animate-pulse" />;
  }

  const { recommendedRange, avgPrice: recAvg } = recommendation;

  const effectiveMin = Math.min(recommendation.minPrice, display.price);
  const effectiveMax = Math.max(recommendation.maxPrice, display.price);
  const padding = (effectiveMax - effectiveMin) * 0.1 || 1;
  const barMin = effectiveMin - padding;
  const barMax = effectiveMax + padding;
  const barRange = barMax - barMin;

  const dotPosition = barRange > 0 ? ((display.price - barMin) / barRange) * 100 : 50;
  const zoneLeftPct = barRange > 0 ? ((recommendedRange.low - barMin) / barRange) * 100 : 10;
  const zoneRightPct = barRange > 0 ? ((recommendedRange.high - barMin) / barRange) * 100 : 90;
  const zoneWidthPct = zoneRightPct - zoneLeftPct;

  const isInRange = display.price >= recommendedRange.low && display.price <= recommendedRange.high;
  const isBelow = display.price < recommendedRange.low;

  const diffPercent = recAvg > 0
    ? Math.round(((display.price - recAvg) / recAvg) * 100)
    : 0;

  const statusColor = isInRange ? "green" : isBelow ? "amber" : "orange";

  return (
    <div className="space-y-1">
      <div className="relative h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="absolute top-0 h-full bg-green-200/80 rounded-full"
          style={{ left: `${Math.max(0, zoneLeftPct)}%`, width: `${Math.min(100, zoneWidthPct)}%` }}
        />
        <motion.div
          className={cn(
            "absolute w-2 h-2 rounded-full border border-white shadow-sm z-10",
            { green: "bg-green-500", amber: "bg-amber-500", orange: "bg-orange-500" }[statusColor]
          )}
          style={{ left: `calc(${dotPosition}% - 4px)`, top: `calc(50% - 4px)` }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring" }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-gray-400">
          {formatPriceCents(recommendedRange.low)} — {formatPriceCents(recommendedRange.high)}
        </span>
        <span className={cn(
          "flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded-full",
          {
            green: "bg-green-50 text-green-600",
            amber: "bg-amber-50 text-amber-600",
            orange: "bg-orange-50 text-orange-600",
          }[statusColor]
        )}>
          {isInRange ? (
            <><Check className="w-2 h-2" /> OK</>
          ) : isBelow ? (
            <><TrendingDown className="w-2 h-2" /> {diffPercent}%</>
          ) : (
            <><TrendingUp className="w-2 h-2" /> +{diffPercent}%</>
          )}
        </span>
      </div>
    </div>
  );
}

// Carte d'une formule individuelle
function VariantCard({ token, category, variant, options }: {
  token: string;
  category: string;
  variant: VariantInfo;
  options: ServiceInfo["options"];
}) {
  const display = getVariantDisplayPrice(variant);
  const isCollective = variant.sessionType === "collective";
  const isMultiSession = (variant.numberOfSessions || 1) > 1;
  const variantOptions = options.filter(o => o.isActive && (!o.variantId || o.variantId === variant.id));

  return (
    <div
      className="p-3 transition-colors"
      style={{
        borderRadius: 12,
        background: variant.isActive ? "#fff" : "#fcfaf4",
        border: "1px solid #f1ede3",
        opacity: variant.isActive ? 1 : 0.6,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Info formule */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-semibold truncate" style={{ color: "#1f1f1d" }}>
              {variant.name}
            </span>
            {!variant.isActive && (
              <span
                className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: "#f7f5ef", color: "#9c9484", border: "1px solid #ece9e1" }}
              >
                Inactive
              </span>
            )}
            {isCollective && (
              <span
                className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                style={{ background: "#f5f9f6", color: "#1f3a33", border: "1px solid #cfdbd3" }}
              >
                <Users className="w-2 h-2" />
                Collectif{variant.maxAnimalsPerSession ? ` (${variant.maxAnimalsPerSession} max)` : ""}
              </span>
            )}
            {isMultiSession && (
              <span
                className="text-[9px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                style={{ background: "#fcfaf4", color: "#6d6d68", border: "1px solid #ece9e1" }}
              >
                <Repeat className="w-2 h-2" />
                {variant.numberOfSessions} séances
              </span>
            )}
            {variant.isSapEligible && (
              <span
                className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ background: "#f5f9f6", color: "#1f3a33", border: "1px solid #cfdbd3" }}
              >
                SAP
              </span>
            )}
          </div>

          {/* Durée */}
          {variant.duration && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" style={{ color: "#9c9484" }} />
              <span className="text-[11px]" style={{ color: "#6d6d68" }}>
                {variant.duration} min
              </span>
            </div>
          )}

          {/* Multi-tarification */}
          {variant.pricing && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {variant.pricing.hourly && (
                <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                  {formatPriceCents(variant.pricing.hourly)}/h
                </span>
              )}
              {variant.pricing.halfDaily && (
                <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                  {formatPriceCents(variant.pricing.halfDaily)}/½j
                </span>
              )}
              {variant.pricing.daily && (
                <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                  {formatPriceCents(variant.pricing.daily)}/jour
                </span>
              )}
              {variant.pricing.weekly && (
                <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                  {formatPriceCents(variant.pricing.weekly)}/sem
                </span>
              )}
              {variant.pricing.monthly && (
                <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                  {formatPriceCents(variant.pricing.monthly)}/mois
                </span>
              )}
              {variant.pricing.nightly && (
                <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                  {formatPriceCents(variant.pricing.nightly)}/nuit
                </span>
              )}
            </div>
          )}
        </div>

        {/* Prix principal */}
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="text-sm font-bold text-gray-900 tabular-nums">
            {formatPriceCents(display.price)}
            <span className="text-[11px] font-medium text-gray-400">{display.unitLabel}</span>
          </span>
        </div>
      </div>

      {/* Barre de comparaison */}
      {variant.isActive && (
        <div className="mt-2.5">
          <VariantPriceBar token={token} category={category} variant={variant} />
        </div>
      )}

      {/* Options */}
      {variantOptions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1 mb-1">
            <Package className="w-2.5 h-2.5 text-gray-400" />
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Options</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {variantOptions.map(opt => (
              <span key={opt.id} className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md">
                {opt.name} · {formatPriceCents(opt.price)}
                {opt.priceType === "per_day" ? "/j" : opt.priceType === "per_unit" && opt.unitLabel ? `/${opt.unitLabel}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Section accordéon par catégorie
function CategorySection({ token, category, services }: {
  token: string;
  category: string;
  services: ServiceInfo[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const catInfo = CATEGORY_INFO[category] || { name: category, emoji: "🐾" };

  // Toutes les formules actives de cette catégorie
  const allVariants = services.flatMap(s => s.variants.filter(v => v.isActive && v.price > 0));
  const allOptions = services.flatMap(s => s.options);
  const totalFormules = allVariants.length;
  const inactiveCount = services.flatMap(s => s.variants).filter(v => !v.isActive).length;

  // Prix range
  const prices = allVariants.map(v => getVariantDisplayPrice(v).price);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const displayUnit = allVariants.length > 0 ? getVariantDisplayPrice(allVariants[0]).unitLabel : "";

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden transition-colors hover:border-gray-200">
      {/* En-tête cliquable */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50/50 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-lg flex-shrink-0">{catInfo.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{catInfo.name}</span>
            <span className="text-[10px] text-gray-400 font-medium">
              {totalFormules} formule{totalFormules > 1 ? "s" : ""}
              {inactiveCount > 0 && ` · ${inactiveCount} inactive${inactiveCount > 1 ? "s" : ""}`}
            </span>
          </div>
          {prices.length > 0 && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              {minPrice === maxPrice
                ? <>{formatPriceCents(minPrice)}<span className="text-gray-400">{displayUnit}</span></>
                : <>{formatPriceCents(minPrice)} — {formatPriceCents(maxPrice)}<span className="text-gray-400">{displayUnit}</span></>
              }
            </p>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </button>

      {/* Contenu déplié */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {services.map(service => (
                <div key={service.id}>
                  {/* Nom du service (si plusieurs dans la même catégorie) */}
                  {services.length > 1 && (
                    <div className="flex items-center justify-between mb-1.5 mt-1">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        {service.name}
                      </span>
                      <Link
                        href={`/dashboard/services?edit=${service.id}`}
                        className="text-[10px] text-primary font-medium hover:underline flex items-center gap-0.5"
                      >
                        Modifier <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  )}

                  {/* Liste des formules */}
                  <div className="space-y-1.5">
                    {service.variants
                      .filter(v => v.price > 0)
                      .map(variant => (
                        <VariantCard
                          key={variant.id}
                          token={token}
                          category={category}
                          variant={variant}
                          options={allOptions.filter(o => !o.variantId || o.variantId === variant.id)}
                        />
                      ))}
                  </div>
                </div>
              ))}

              {/* Lien édition (si une seule prestation) */}
              {services.length === 1 && (
                <Link
                  href={`/dashboard/services?edit=${services[0].id}`}
                  className="flex items-center justify-center gap-1 text-[11px] text-primary font-medium hover:underline py-1"
                >
                  Modifier les formules <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Composant principal — widget recap compact (style Google/Outlook)
const DashboardPricingCard = memo(function DashboardPricingCard({ token }: { token: string }) {
  const services = useQuery(api.services.services.getMyServices, { token });

  if (services === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#1f3a33" }} />
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div
        className="text-center py-5"
        style={{ background: "#fcfaf4", borderRadius: 10, border: "1px dashed #ece9e1" }}
      >
        <Euro className="w-6 h-6 mx-auto mb-1.5" style={{ color: "#cdc9c0" }} />
        <p className="text-[12px] m-0" style={{ color: "#6d6d68" }}>
          Aucun service configuré
        </p>
        <Link
          href="/dashboard/services"
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold mt-2 transition-opacity hover:opacity-80"
          style={{ color: "#1f3a33" }}
        >
          Ajouter un service <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  // Aplatir tous les services + variantes actifs
  const allActiveVariants: Array<{
    serviceId: string;
    category: string;
    serviceName: string;
    variant: VariantInfo;
  }> = [];
  for (const service of services) {
    if (!service.isActive) continue;
    for (const v of service.variants) {
      if (!v.isActive || (v.price ?? 0) <= 0) continue;
      allActiveVariants.push({
        serviceId: service.id,
        category: service.category,
        serviceName: service.name,
        variant: {
          id: v.id,
          name: v.name,
          description: v.description,
          price: v.price,
          priceUnit: v.priceUnit,
          pricing: v.pricing,
          duration: v.duration,
          numberOfSessions: v.numberOfSessions,
          sessionType: v.sessionType,
          maxAnimalsPerSession: v.maxAnimalsPerSession,
          isActive: v.isActive,
          isSapEligible: v.isSapEligible,
        },
      });
    }
  }

  if (allActiveVariants.length === 0) {
    return (
      <div
        className="text-center py-5"
        style={{ background: "#fcfaf4", borderRadius: 10, border: "1px dashed #ece9e1" }}
      >
        <Euro className="w-6 h-6 mx-auto mb-1.5" style={{ color: "#cdc9c0" }} />
        <p className="text-[12px] m-0" style={{ color: "#6d6d68" }}>
          Aucune formule active
        </p>
      </div>
    );
  }

  // Stats : nombre de prestations, nombre de formules, prix min/max
  const uniqueCategories = new Set(allActiveVariants.map((v) => v.category));
  const prices = allActiveVariants.map((v) => getVariantDisplayPrice(v.variant).price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Top 3 formules pour preview (par ordre, donc les plus récentes premières)
  const previewVariants = allActiveVariants.slice(0, 3);

  return (
    <div className="space-y-3">
      {/* ─── KPI compactes ─── */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="px-2.5 py-2"
          style={{ background: "#f5f9f6", borderRadius: 10, border: "1px solid #cfdbd3" }}
        >
          <div className="text-[14px] font-bold leading-none tabular-nums" style={{ color: "#1f3a33" }}>
            {allActiveVariants.length}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: "#1f3a33", opacity: 0.7 }}>
            formule{allActiveVariants.length > 1 ? "s" : ""} active{allActiveVariants.length > 1 ? "s" : ""}
          </div>
        </div>
        <div
          className="px-2.5 py-2"
          style={{ background: "#fcfaf4", borderRadius: 10, border: "1px solid #ece9e1" }}
        >
          <div className="text-[14px] font-bold leading-none tabular-nums" style={{ color: "#1f1f1d" }}>
            {minPrice === maxPrice
              ? formatPriceCents(minPrice)
              : `${formatPriceCents(minPrice).replace(" €", "")}–${formatPriceCents(maxPrice)}`}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: "#6d6d68" }}>
            sur {uniqueCategories.size} prestation{uniqueCategories.size > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* ─── Top formules (3 lignes compactes style row Google) ─── */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] mb-2" style={{ color: "#9c9484" }}>
          Aperçu des formules
        </p>
        <div className="space-y-1.5">
          {previewVariants.map(({ category, variant, serviceName }) => {
            const display = getVariantDisplayPrice(variant);
            const catInfo = CATEGORY_INFO[category] || { name: category, emoji: "🐾" };
            return (
              <div
                key={variant.id}
                className="flex items-center gap-2.5 px-2.5 py-2 transition-colors hover:bg-[#fcfaf4]"
                style={{ background: "#fff", border: "1px solid #f1ede3", borderRadius: 10 }}
              >
                <span className="text-[16px] leading-none flex-shrink-0">{catInfo.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold truncate m-0" style={{ color: "#1f1f1d" }}>
                    {variant.name}
                  </p>
                  <p className="text-[10.5px] truncate m-0 mt-0.5" style={{ color: "#6d6d68" }}>
                    {catInfo.name}
                    {serviceName && serviceName !== catInfo.name && ` · ${serviceName}`}
                    {variant.duration && ` · ${variant.duration} min`}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: "#1f3a33" }}>
                    {formatPriceCents(display.price)}
                  </span>
                  <span className="text-[10px] font-medium ml-0.5" style={{ color: "#9c9484" }}>
                    {display.unitLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {allActiveVariants.length > 3 && (
          <p className="text-[10.5px] mt-2 text-center" style={{ color: "#9c9484" }}>
            +{allActiveVariants.length - 3} autre{allActiveVariants.length - 3 > 1 ? "s" : ""} formule{allActiveVariants.length - 3 > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* ─── Lien gestion ─── */}
      <Link
        href="/dashboard/services"
        className="flex items-center justify-center gap-1.5 py-2 rounded-full text-[12px] font-semibold transition-colors hover:bg-[#f7f5ef]"
        style={{ color: "#1f3a33", border: "1px solid #ece9e1" }}
      >
        Gérer mes services
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
});

export default DashboardPricingCard;
