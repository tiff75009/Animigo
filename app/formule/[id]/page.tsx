"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Shield,
  Clock,
  MapPin,
  Home,
  Car,
  Users,
  User,
  PawPrint,
  Calendar,
  Sparkles,
  FileCheck,
  ChevronRight,
  ImageIcon,
  Moon,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Navbar } from "@/app/components/navbar";
import { Footer } from "@/app/components/footer";
import { PhotoLightbox } from "@/app/components/platform/PhotoLightbox";
import { getVariantSessionPrice } from "@/app/lib/pricing";
import { getPriceWithCommission } from "@/app/components/platform/FormuleCard";
import { cn } from "@/app/lib/utils";

type FormulePhoto = { url: string; order: number };
type FormuleObjective = { icon: string; text: string };
type FormuleOption = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceType: string;
  unitLabel: string | null;
  maxQuantity: number | null;
};

const animalEmojiMap: Record<string, string> = {
  chien: "🐕",
  chat: "🐈",
  oiseau: "🐦",
  rongeur: "🐰",
  poisson: "🐠",
  reptile: "🦎",
  nac: "🦔",
};

const locationLabels: Record<string, string> = {
  announcer_home: "Chez l'annonceur",
  client_home: "Chez le client",
  both: "Chez vous ou chez l'annonceur",
};

const priceUnitLabels: Record<string, string> = {
  hour: "heure",
  half_day: "demi-journée",
  day: "jour",
  week: "semaine",
  month: "mois",
  flat: "prestation",
};

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
}

export default function FormuleDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const variantId = resolvedParams.id as Id<"serviceVariants">;
  const data = useQuery(api.public.formuleDetails.getVariantDetails, { variantId });

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <div className="animate-pulse text-text-light">Chargement…</div>
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Formule introuvable</h1>
          <p className="text-text-light mb-6">
            Cette formule n&apos;existe plus ou n&apos;est plus disponible.
          </p>
          <Link
            href="/recherche"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux résultats
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const { variant, service, category, announcer, options } = data;
  const announcerSlug = announcer.slug || announcer.id;
  const bookingUrl = `/annonceur/${announcerSlug}?formule=${variant.id}`;
  const profileUrl = `/annonceur/${announcerSlug}`;

  const isCollective = variant.sessionType === "collective";
  const isGarde = !!category?.isCapacityBased;

  const photos = variant.photos;
  const hasPhotos = photos.length > 0;
  const priceLabel = priceUnitLabels[variant.priceUnit] ?? variant.priceUnit;
  const typeBadgeStyle =
    announcer.statusType === "particulier"
      ? { background: "#f3ecdf", color: "#6b4f25" }
      : { background: "#eaf0ed", color: "#2f4a3f" };
  const typeLabel =
    announcer.statusType === "professionnel"
      ? "Professionnel"
      : announcer.statusType === "micro_entrepreneur"
      ? "Micro-entrepreneur"
      : "Particulier";

  const cityLabel = announcer.city || null;
  const categoryName = category?.name ?? "Service";
  const categorySlug = category?.slug ?? service.category;
  const categoryLink = `/recherche?categorie=${categorySlug}`;

  return (
    <div className="min-h-screen bg-[#faf8f2]">
      <Navbar />

      {/* JSON-LD : Service + LocalBusiness + Breadcrumb */}
      <FormuleJsonLd
        variantName={variant.name}
        variantDescription={variant.description}
        price={variant.price}
        photos={photos}
        announcerName={announcer.firstName}
        announcerSlug={announcerSlug}
        announcerVerified={announcer.verified}
        cityLabel={cityLabel}
        categoryName={categoryName}
        categoryLink={categoryLink}
        rating={announcer.rating}
        reviewCount={announcer.reviewCount}
      />

      {/* Breadcrumb sémantique */}
      <nav
        aria-label="Fil d'Ariane"
        className="max-w-6xl mx-auto px-4 sm:px-6 pt-4"
      >
        <ol className="flex items-center gap-1.5 text-xs text-text-light flex-wrap">
          <li>
            <Link href="/" className="hover:text-foreground transition-colors">
              Accueil
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link
              href={categoryLink}
              className="hover:text-foreground transition-colors"
            >
              {categoryName}
            </Link>
          </li>
          {cityLabel && (
            <>
              <li aria-hidden="true">›</li>
              <li>
                <Link
                  href={`/recherche?categorie=${categorySlug}&ville=${encodeURIComponent(cityLabel)}`}
                  className="hover:text-foreground transition-colors"
                >
                  {cityLabel}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">›</li>
          <li className="text-foreground font-medium truncate max-w-[200px]">
            {variant.name}
          </li>
        </ol>
        <Link
          href="/recherche"
          className="inline-flex items-center gap-1.5 text-sm text-text-light hover:text-foreground transition-colors mt-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux résultats
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-10">
          {/* ═══════════════ COLONNE GAUCHE ═══════════════ */}
          <div className="space-y-6">
            {/* Header : catégorie + titre */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-2 flex-wrap mb-3">
                {category && (
                  <Link
                    href={categoryLink}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold hover:bg-primary/15 transition-colors"
                  >
                    <span>{category.icon || "✨"}</span>
                    {category.name}
                  </Link>
                )}
                {cityLabel && (
                  <Link
                    href={`/recherche?categorie=${categorySlug}&ville=${encodeURIComponent(cityLabel)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-semibold hover:bg-secondary/15 transition-colors"
                  >
                    <MapPin className="w-3 h-3" />
                    {cityLabel}
                  </Link>
                )}
              </div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-[#9c9484] font-medium mb-1">
                {announcer.firstName} propose
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
                {variant.name}
                {cityLabel && (
                  <span className="block text-xl sm:text-2xl font-semibold text-text-light mt-1.5">
                    à {cityLabel}
                  </span>
                )}
              </h1>
              {variant.description && (
                <p className="text-base text-text-light mt-3 leading-relaxed">
                  {variant.description}
                </p>
              )}
            </motion.div>

            {/* Galerie photos */}
            {hasPhotos ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="grid grid-cols-3 gap-2 sm:gap-3 rounded-2xl overflow-hidden"
              >
                {photos.map((photo: FormulePhoto, i: number) => (
                  <button
                    key={`${photo.url}-${i}`}
                    type="button"
                    onClick={() => {
                      setLightboxIndex(i);
                      setLightboxOpen(true);
                    }}
                    className={cn(
                      "relative bg-gray-100 overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary/50 group/photo",
                      i === 0 ? "col-span-3 sm:col-span-2 sm:row-span-2 aspect-[16/9] sm:aspect-square" : "aspect-square"
                    )}
                  >
                    <Image
                      src={photo.url}
                      alt={`${variant.name} ${i + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover group-hover/photo:scale-105 transition-transform duration-500"
                      unoptimized
                      priority={i === 0}
                    />
                    {i === 0 && photos.length > 1 && (
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-white/95 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-sm">
                        <ImageIcon className="w-3 h-3" />
                        Voir {photos.length} photos
                      </div>
                    )}
                  </button>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 flex flex-col items-center justify-center text-text-light">
                <ImageIcon className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm">Aucune photo pour cette formule</p>
              </div>
            )}

            {/* Caractéristiques principales */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-white rounded-2xl border border-[#ece9e1] p-5 sm:p-6"
            >
              <h2 className="text-lg font-bold text-foreground mb-4">À propos de cette formule</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {variant.duration && (
                  <DetailRow icon={<Clock className="w-4 h-4" />} label="Durée">
                    {formatDuration(variant.duration)}
                    {variant.numberOfSessions > 1 && " par séance"}
                  </DetailRow>
                )}
                {variant.numberOfSessions > 1 && (
                  <DetailRow icon={<Sparkles className="w-4 h-4" />} label="Séances">
                    {variant.numberOfSessions} séances
                    {variant.sessionInterval && ` · ${variant.sessionInterval}j entre chaque`}
                  </DetailRow>
                )}
                <DetailRow
                  icon={isCollective ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  label="Type"
                >
                  {isCollective ? "Séance collective" : "Séance individuelle"}
                  {isCollective && variant.maxAnimalsPerSession && ` · max ${variant.maxAnimalsPerSession} animaux`}
                </DetailRow>
                {variant.serviceLocation && (
                  <DetailRow
                    icon={
                      variant.serviceLocation === "client_home" ? (
                        <Car className="w-4 h-4" />
                      ) : (
                        <Home className="w-4 h-4" />
                      )
                    }
                    label="Lieu"
                  >
                    {locationLabels[variant.serviceLocation]}
                  </DetailRow>
                )}
                {service.allowOvernightStay && (
                  <DetailRow icon={<Moon className="w-4 h-4" />} label="Garde de nuit">
                    Disponible
                  </DetailRow>
                )}
                {variant.animalTypes.length > 0 && (
                  <DetailRow icon={<PawPrint className="w-4 h-4" />} label="Animaux acceptés">
                    <div className="flex flex-wrap gap-1.5">
                      {variant.animalTypes.map((type: string) => (
                        <span
                          key={type}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-100 rounded-full text-[11px] font-medium text-amber-700 capitalize"
                        >
                          {animalEmojiMap[type] || "🐾"} {type}
                        </span>
                      ))}
                    </div>
                  </DetailRow>
                )}
              </div>
            </motion.div>

            {/* Activités / objectifs */}
            {variant.objectives.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-white rounded-2xl border border-[#ece9e1] p-5 sm:p-6"
              >
                <h2 className="text-lg font-bold text-foreground mb-4">
                  {isGarde ? "Activités proposées" : "Objectifs de la prestation"}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {variant.objectives.map((obj: FormuleObjective, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-[#faf8f2] rounded-xl"
                    >
                      <span className="text-2xl">{obj.icon}</span>
                      <span className="text-sm font-medium text-foreground">{obj.text}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Inclus dans la prestation */}
            {variant.includedFeatures.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="bg-white rounded-2xl border border-[#ece9e1] p-5 sm:p-6"
              >
                <h2 className="text-lg font-bold text-foreground mb-4">Inclus</h2>
                <ul className="space-y-2">
                  {variant.includedFeatures.map((feature: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                      <FileCheck className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Options additionnelles */}
            {options.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="bg-white rounded-2xl border border-[#ece9e1] p-5 sm:p-6"
              >
                <h2 className="text-lg font-bold text-foreground mb-1">Options additionnelles</h2>
                <p className="text-xs text-text-light mb-4">
                  À ajouter au moment de la réservation
                </p>
                <div className="space-y-3">
                  {options.map((opt: FormuleOption) => (
                    <div
                      key={opt.id}
                      className="flex items-start justify-between gap-4 p-3 border border-gray-100 rounded-xl"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-foreground">{opt.name}</div>
                        {opt.description && (
                          <p className="text-xs text-text-light mt-0.5 leading-relaxed">
                            {opt.description}
                          </p>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-primary whitespace-nowrap">
                        {formatPrice(opt.price)}
                        <span className="text-[11px] text-text-light font-normal">
                          {opt.priceType === "per_day"
                            ? " / jour"
                            : opt.priceType === "per_unit"
                            ? ` / ${opt.unitLabel || "unité"}`
                            : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SAP éligible */}
            {variant.isSapEligible && announcer.sapApproved && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 sm:p-6 flex items-start gap-3"
              >
                <FileCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    Éligible au crédit d&apos;impôt SAP
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    Cette prestation est éligible au crédit d&apos;impôt de 50 % sur les services à la
                    personne. TVA réduite à 10 %.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* ═══════════════ COLONNE DROITE (sticky CTA) ═══════════════ */}
          <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
            {/* Carte annonceur */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-white rounded-2xl border border-[#ece9e1] p-5"
            >
              <div className="flex items-start gap-3">
                <Link href={profileUrl} className="relative flex-shrink-0">
                  <div
                    className="w-14 h-14 rounded-full overflow-hidden bg-white"
                    style={{ border: "1px solid rgba(0,0,0,0.05)" }}
                  >
                    {announcer.profileImageUrl ? (
                      <Image
                        src={announcer.profileImageUrl}
                        alt={announcer.firstName}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-xl font-semibold"
                        style={{
                          background: "linear-gradient(135deg, #e8efe9, #d4e0d2)",
                          color: "#3a5a40",
                        }}
                      >
                        {announcer.firstName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {announcer.verified && (
                    <div
                      className="absolute flex items-center justify-center"
                      style={{
                        bottom: -2,
                        right: -2,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "#1f3a33",
                        border: "2px solid #fff",
                      }}
                    >
                      <Shield className="text-white" style={{ width: 10, height: 10 }} />
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium mb-1"
                    style={typeBadgeStyle}
                  >
                    {typeLabel}
                  </span>
                  <Link href={profileUrl}>
                    <div className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate">
                      {announcer.firstName}
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 text-xs text-text-light mt-0.5">
                    <Star className="w-2.5 h-2.5 fill-foreground text-foreground" />
                    <b className="text-foreground">{announcer.rating.toFixed(1)}</b>
                    <span>({announcer.reviewCount} avis)</span>
                  </div>
                </div>
              </div>
              {announcer.bio && (
                <p className="text-xs text-text-light mt-3 leading-relaxed line-clamp-3">
                  {announcer.bio}
                </p>
              )}
              {announcer.city && (
                <div className="flex items-center gap-1.5 text-xs text-text-light mt-3">
                  <MapPin className="w-3 h-3" />
                  {announcer.city}
                </div>
              )}
              <Link
                href={profileUrl}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Voir le profil complet
                <ChevronRight className="w-3 h-3" />
              </Link>
            </motion.div>

            {/* Carte prix + CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-white rounded-2xl border border-[#ece9e1] p-5"
            >
              {(() => {
                // Calcule le prix d'une séance complète (selon priceUnit/duration/pricingMode)
                const sessionPrice = getVariantSessionPrice(variant);
                // Prix client = prix annonceur + commission + frais
                const clientSessionPrice = getPriceWithCommission(
                  sessionPrice,
                  announcer.statusType
                );
                const sessions = variant.numberOfSessions ?? 1;
                const isMulti =
                  variant.sessionType === "collective" || sessions > 1;
                return (
                  <>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-3xl font-bold text-foreground tracking-tight">
                        {formatPrice(clientSessionPrice)}
                      </span>
                      <span className="text-sm text-text-light">
                        / {sessions > 1 || variant.sessionType === "collective" ? "séance" : priceLabel}
                      </span>
                    </div>
                    {isMulti && sessions > 1 && (
                      <div
                        className="mt-2 mb-3 p-3 rounded-xl"
                        style={{
                          background: "#1f3a33",
                          color: "#f7f5ef",
                        }}
                      >
                        <div
                          className="text-[10px] font-medium uppercase tracking-[0.1em]"
                          style={{ color: "rgba(247,245,239,0.7)" }}
                        >
                          Total à payer
                        </div>
                        <div className="flex items-baseline justify-between gap-2 mt-0.5">
                          <span className="text-[20px] font-bold tracking-[-0.02em]">
                            {formatPrice(clientSessionPrice * sessions)}
                          </span>
                          <span
                            className="text-[10.5px]"
                            style={{ color: "rgba(247,245,239,0.7)" }}
                          >
                            {sessions} séances × {formatPrice(clientSessionPrice)}
                          </span>
                        </div>
                        <p
                          className="text-[10.5px] mt-1.5 leading-[1.4]"
                          style={{ color: "rgba(247,245,239,0.7)" }}
                        >
                          Le client paie l&apos;intégralité du forfait à la réservation.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}

              <Link href={bookingUrl} className="block w-full mt-4">
                <button
                  className="w-full px-5 py-3 rounded-full text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{ background: "#1f3a33", color: "#f7f5ef" }}
                >
                  <Calendar className="w-4 h-4" />
                  Réserver cette formule
                </button>
              </Link>

              <Link
                href={profileUrl}
                className="block w-full mt-2 text-center text-xs text-text-light hover:text-foreground py-2 transition-colors"
              >
                Voir toutes les formules
                {service.siblingVariantsCount > 1 && ` (${service.siblingVariantsCount})`}
              </Link>
            </motion.div>

            {/* Trust elements */}
            <div className="text-xs text-text-light space-y-1.5 px-2">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-secondary" />
                Profil vérifié par IA
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-3.5 h-3.5 text-secondary" />
                Paiement sécurisé
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Galerie modale */}
      {hasPhotos && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          caption={variant.name}
        />
      )}

      <Footer />
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-text-light mb-1 flex items-center gap-1.5">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

/**
 * SEO : injecte JSON-LD Service + LocalBusiness + BreadcrumbList,
 * et met à jour <title> et <meta description> côté client (la page est
 * "use client" car alimentée par useQuery — pas de generateMetadata
 * possible sans dupliquer la requête côté serveur).
 */
function FormuleJsonLd({
  variantName,
  variantDescription,
  price,
  photos,
  announcerName,
  announcerSlug,
  announcerVerified,
  cityLabel,
  categoryName,
  categoryLink,
  rating,
  reviewCount,
}: {
  variantName: string;
  variantDescription: string | null;
  price: number;
  photos: FormulePhoto[];
  announcerName: string;
  announcerSlug: string;
  announcerVerified: boolean;
  cityLabel: string | null;
  categoryName: string;
  categoryLink: string;
  rating: number;
  reviewCount: number;
}) {
  const firstPhotoUrl = photos[0]?.url ?? null;

  // Titre + meta description + OG + canonical dynamiques (référencement)
  useEffect(() => {
    const cityPart = cityLabel ? ` à ${cityLabel}` : "";
    const title = `${variantName}${cityPart} · ${announcerName} | Animigo`;
    document.title = title;
    const desc =
      (variantDescription?.slice(0, 155) ||
        `${categoryName}${cityPart} proposé par ${announcerName} sur Animigo. À partir de ${(price / 100).toFixed(2)} €.`).trim();
    const url = window.location.href;
    const ogImage = firstPhotoUrl || `${window.location.origin}/og-default.jpg`;

    const setMeta = (selector: string, attr: string, attrValue: string, content: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta('meta[name="description"]', "name", "description", desc);
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", desc);
    setMeta('meta[property="og:type"]', "property", "og:type", "product");
    setMeta('meta[property="og:url"]', "property", "og:url", url);
    setMeta('meta[property="og:image"]', "property", "og:image", ogImage);
    setMeta('meta[property="og:locale"]', "property", "og:locale", "fr_FR");
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", desc);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage);

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url.split("?")[0]);
  }, [variantName, variantDescription, cityLabel, announcerName, categoryName, price, firstPhotoUrl]);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://animigo.fr";
  const profileUrl = `${origin}/annonceur/${announcerSlug}`;
  const breadcrumbItems = [
    { name: "Accueil", url: `${origin}/` },
    { name: categoryName, url: `${origin}${categoryLink}` },
    ...(cityLabel
      ? [
          {
            name: cityLabel,
            url: `${origin}${categoryLink}&ville=${encodeURIComponent(cityLabel)}`,
          },
        ]
      : []),
    { name: variantName, url: typeof window !== "undefined" ? window.location.href : "" },
  ];

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: variantName,
    description: variantDescription || `${categoryName} proposé par ${announcerName}`,
    serviceType: categoryName,
    image: photos.map((p) => p.url),
    provider: {
      "@type": "LocalBusiness",
      name: announcerName,
      url: profileUrl,
      ...(cityLabel && {
        address: {
          "@type": "PostalAddress",
          addressLocality: cityLabel,
          addressCountry: "FR",
        },
      }),
      ...(announcerVerified && { identifier: "verified" }),
    },
    ...(cityLabel && {
      areaServed: {
        "@type": "City",
        name: cityLabel,
      },
    }),
    offers: {
      "@type": "Offer",
      price: (price / 100).toFixed(2),
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: typeof window !== "undefined" ? window.location.href : "",
    },
    ...(reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.toFixed(1),
        reviewCount,
      },
    }),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url && i < breadcrumbItems.length - 1 && { item: item.url }),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  );
}
