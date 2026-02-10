"use client";

import { useMemo } from "react";
import {
  Eye,
  Star,
  Clock,
  MessageCircle,
  Home,
  Car,
  MapPin,
  TreePine,
  Calendar,
  CheckCircle2,
  Layers,
  Users,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import type { AnnouncerData, ServiceData } from "./types";
import { animalEmojis } from "./types";
import {
  calculatePriceWithCommission,
  isGardeService,
  getFormuleBestPrice,
} from "./booking/pricing";

interface AnnouncerInsightCardProps {
  announcer: AnnouncerData;
  commissionRate: number;
}

// Helper : formater un prix en centimes → affichage euros
function fmtPrice(cents: number): string {
  const euros = cents / 100;
  if (euros % 1 !== 0) {
    return euros.toFixed(2).replace(".", ",") + "\u00A0\u20AC";
  }
  return euros.toFixed(0) + "\u00A0\u20AC";
}

// Helper : label unité de prix
const unitLabel: Record<string, string> = {
  heure: "/h",
  jour: "/jour",
  "demi-j": "/demi-j",
  semaine: "/sem",
  mois: "/mois",
  "": "",
};

// Helper : label statut pro
function statusLabel(s: AnnouncerData["statusType"]): string {
  switch (s) {
    case "professionnel":
      return "Pro";
    case "micro_entrepreneur":
      return "Micro";
    case "particulier":
      return "Particulier";
    default:
      return s;
  }
}

// Helper : couleur badge statut
function statusColor(s: AnnouncerData["statusType"]): string {
  switch (s) {
    case "professionnel":
      return "bg-blue-100 text-blue-700";
    case "micro_entrepreneur":
      return "bg-purple-100 text-purple-700";
    case "particulier":
      return "bg-gray-100 text-gray-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

// Helper: icône catégorie depuis emoji string
function CategoryIcon({ icon }: { icon: string }) {
  return <span className="text-base leading-none">{icon}</span>;
}

// Section wrapper
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {title}
      </h4>
      <div className="rounded-xl bg-gray-50 p-3 space-y-2">{children}</div>
    </div>
  );
}

// Ligne info
function InfoRow({
  icon,
  label,
  value,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-gray-500">
        {icon}
        {label}
      </span>
      <span className={cn("font-medium", muted ? "text-gray-400" : "text-gray-700")}>
        {value}
      </span>
    </div>
  );
}

// Obtenir la fourchette de prix d'un service (min/max avec commission)
function getServicePriceRange(
  service: ServiceData,
  commissionRate: number
): { min: number; max: number; unit: string; count: number } {
  const isGarde = isGardeService(service);
  let min = Infinity;
  let max = 0;
  let unit = "";

  for (const formule of service.formules) {
    const { price, unit: u } = getFormuleBestPrice(formule, isGarde);
    if (price <= 0) continue;
    const withComm = calculatePriceWithCommission(price, commissionRate);
    if (withComm < min) {
      min = withComm;
      unit = u;
    }
    if (withComm > max) max = withComm;
  }

  return {
    min: min === Infinity ? 0 : min,
    max,
    unit,
    count: service.formules.length,
  };
}

export default function AnnouncerInsightCard({
  announcer,
  commissionRate,
}: AnnouncerInsightCardProps) {
  // Données calculées
  const totalFormules = useMemo(
    () => announcer.services.reduce((sum, s) => sum + s.formules.length, 0),
    [announcer.services]
  );

  const serviceCategories = useMemo(
    () => announcer.services.map((s) => s.categoryName),
    [announcer.services]
  );

  const allAnimalTypes = useMemo(() => {
    const types = new Set<string>();
    announcer.acceptedAnimals?.forEach((a) => types.add(a.toLowerCase()));
    announcer.services.forEach((s) =>
      s.animalTypes?.forEach((a) => types.add(a.toLowerCase()))
    );
    return Array.from(types);
  }, [announcer.acceptedAnimals, announcer.services]);

  // Vérifier si un service propose individuel + collectif
  const hasMixedSessionTypes = useMemo(() => {
    for (const service of announcer.services) {
      const types = new Set(
        service.formules
          .map((f) => f.sessionType)
          .filter(Boolean)
      );
      if (types.size > 1) return true;
    }
    return false;
  }, [announcer.services]);

  // Année d'inscription
  const memberYear = useMemo(() => {
    if (!announcer.memberSince) return null;
    const date = new Date(announcer.memberSince);
    return isNaN(date.getTime()) ? announcer.memberSince : date.getFullYear().toString();
  }, [announcer.memberSince]);

  // Lieu du service dominant
  const serviceLocationLabel = useMemo(() => {
    const locations = new Set<string>();
    announcer.services.forEach((s) => {
      if (s.serviceLocation) locations.add(s.serviceLocation);
      s.formules.forEach((f) => {
        if (f.serviceLocation) locations.add(f.serviceLocation);
      });
    });
    if (locations.has("both") || (locations.has("announcer_home") && locations.has("client_home")))
      return "Chez le pro / A domicile";
    if (locations.has("client_home")) return "A domicile uniquement";
    if (locations.has("announcer_home")) return "Chez le pro uniquement";
    return null;
  }, [announcer.services]);

  return (
    <div className="sticky top-36 space-y-4">
      {/* Card principale */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 space-y-5">
        {/* Badge Vue annonceur */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4ECDC4]/10 w-fit">
          <Eye className="w-3.5 h-3.5 text-[#4ECDC4]" />
          <span className="text-xs font-medium text-[#4ECDC4]">
            Vue annonceur
          </span>
        </div>

        {/* === 1. Header — Profil résumé === */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-gray-900">
              {announcer.firstName}
            </h3>
            <span
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                statusColor(announcer.statusType)
              )}
            >
              {statusLabel(announcer.statusType)}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
            {/* Note */}
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="font-medium text-gray-700">
                {announcer.rating.toFixed(1)}
              </span>
              <span className="text-gray-400">({announcer.reviewCount})</span>
            </span>

            {/* Taux de réponse */}
            {announcer.responseRate > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                {announcer.responseRate}%
              </span>
            )}

            {/* Temps de réponse */}
            {announcer.responseTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {announcer.responseTime}
              </span>
            )}
          </div>
        </div>

        {/* === 2. Tarification === */}
        <Section title="Tarification">
          {announcer.services.map((service) => {
            const range = getServicePriceRange(service, commissionRate);
            if (range.min === 0) return null;

            const hasCollective = service.formules.some(
              (f) => f.sessionType === "collective"
            );
            const hasIndividual = service.formules.some(
              (f) => !f.sessionType || f.sessionType === "individual"
            );

            return (
              <div
                key={service.id as string}
                className="flex items-start justify-between gap-2 py-1"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <CategoryIcon icon={service.categoryIcon} />
                  <span className="text-sm text-gray-700 truncate">
                    {service.categoryName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-gray-900">
                    {range.min === range.max
                      ? fmtPrice(range.min)
                      : `${fmtPrice(range.min)} – ${fmtPrice(range.max)}`}
                    <span className="text-xs font-normal text-gray-400">
                      {unitLabel[range.unit] || ""}
                    </span>
                  </span>
                  {range.count > 1 && (
                    <span className="text-[10px] text-gray-400">
                      {range.count} formules
                    </span>
                  )}
                  {hasCollective && hasIndividual && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                      mixte
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-gray-400 pt-1">
            Prix TTC (commission {commissionRate}% incluse)
          </p>
        </Section>

        {/* === 3. Services & Animaux === */}
        <Section title="Services & Animaux">
          {/* Catégories */}
          <div className="flex flex-wrap gap-1.5">
            {serviceCategories.map((cat) => (
              <span
                key={cat}
                className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600"
              >
                {cat}
              </span>
            ))}
          </div>

          {/* Animaux acceptés */}
          {allAnimalTypes.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-gray-500">Animaux :</span>
              <div className="flex gap-1">
                {allAnimalTypes.map((type) => (
                  <span key={type} className="text-base" title={type}>
                    {animalEmojis[type] || "🐾"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Total formules */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-1">
            <Layers className="w-3 h-3" />
            {totalFormules} formule{totalFormules > 1 ? "s" : ""} au total
            {hasMixedSessionTypes && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px]">
                <Users className="w-2.5 h-2.5 inline mr-0.5" />
                individuel + collectif
              </span>
            )}
          </div>
        </Section>

        {/* === 4. Équipement & Logistique === */}
        <Section title="Équipement & Logistique">
          {/* Logement */}
          <InfoRow
            icon={<Home className="w-3.5 h-3.5" />}
            label="Logement"
            value={
              announcer.equipment.housingType === "house"
                ? `Maison${announcer.equipment.housingSize ? ` (${announcer.equipment.housingSize} m\u00B2)` : ""}`
                : announcer.equipment.housingType === "apartment"
                  ? `Appartement${announcer.equipment.housingSize ? ` (${announcer.equipment.housingSize} m\u00B2)` : ""}`
                  : "Non renseigné"
            }
            muted={!announcer.equipment.housingType}
          />

          {/* Jardin */}
          <InfoRow
            icon={<TreePine className="w-3.5 h-3.5" />}
            label="Jardin"
            value={
              announcer.equipment.hasGarden
                ? announcer.equipment.gardenSize
                  ? `Oui (${announcer.equipment.gardenSize})`
                  : "Oui"
                : "Non"
            }
            muted={!announcer.equipment.hasGarden}
          />

          {/* Véhicule */}
          <InfoRow
            icon={<Car className="w-3.5 h-3.5" />}
            label="Véhicule"
            value={announcer.equipment.hasVehicle ? "Oui" : "Non"}
            muted={!announcer.equipment.hasVehicle}
          />

          {/* Rayon d'intervention */}
          {announcer.radius != null && announcer.radius > 0 && (
            <InfoRow
              icon={<MapPin className="w-3.5 h-3.5" />}
              label="Rayon"
              value={`${announcer.radius} km`}
            />
          )}

          {/* Lieu du service */}
          {serviceLocationLabel && (
            <InfoRow
              icon={<MapPin className="w-3.5 h-3.5" />}
              label="Lieu"
              value={serviceLocationLabel}
            />
          )}
        </Section>

        {/* === 5. Activité === */}
        <Section title="Activité">
          {/* Membre depuis */}
          {memberYear && (
            <InfoRow
              icon={<Calendar className="w-3.5 h-3.5" />}
              label="Membre depuis"
              value={memberYear}
            />
          )}

          {/* Missions terminées */}
          {announcer.missionStats && announcer.missionStats.completed > 0 && (
            <InfoRow
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              label="Missions terminées"
              value={announcer.missionStats.completed}
            />
          )}

          {/* Prochaine dispo */}
          {announcer.availability.nextAvailable && (
            <InfoRow
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Prochaine dispo"
              value={
                announcer.availability.nextAvailable === "now"
                  ? "Disponible"
                  : new Date(announcer.availability.nextAvailable).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })
              }
            />
          )}
        </Section>
      </div>
    </div>
  );
}
