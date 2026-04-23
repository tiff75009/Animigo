"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import {
  MapPin,
  Calendar as CalendarIcon,
  LocateFixed,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  BadgeCheck,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useGeolocation } from "@/app/hooks/useGeolocation";
import {
  IllusDogHug,
  IllusCatCare,
  IllusPuppyWalk,
  IllusGrooming,
  IllusTraining,
  IllusTransport,
  IllusOvernight,
  IllusHealth,
  IllusAgility,
  IllusGeneric,
} from "./hero-illustrations";

type Coords = { lat: number; lng: number };

type IllusComponent = (props: { isHovered: boolean }) => React.ReactElement;

const ILLUSTRATION_CYCLE: IllusComponent[] = [
  IllusDogHug,
  IllusCatCare,
  IllusPuppyWalk,
  IllusGrooming,
];

function pickIllustration(
  slug: string,
  parentSlug: string | null | undefined,
  index: number
): IllusComponent {
  const s = `${slug} ${parentSlug ?? ""}`.toLowerCase();
  // Ordre : matches spécifiques en premier (agilité AVANT dressage car "educ" est générique)
  if (/(agilit|agility|parcours|sport|cani[-_ ]?cross|cani-?sport)/.test(s)) return IllusAgility;
  if (/(chat|cat)/.test(s) || /visite/.test(s)) return IllusCatCare;
  if (/(pension|nuit|overnight|long[-_ ]?sejour)/.test(s)) return IllusOvernight;
  if (/(toilettage|groom|bain|shampo)/.test(s)) return IllusGrooming;
  if (/(transport|taxi)/.test(s)) return IllusTransport;
  if (/(veto|sante|health|soin|medical|veterin)/.test(s)) return IllusHealth;
  if (/(dressage|educ|training|comporte)/.test(s)) return IllusTraining;
  if (/(garde|sitting|keeper)/.test(s)) return IllusDogHug;
  if (/(promenade|balade|walk)/.test(s)) return IllusPuppyWalk;
  // Fallback : soit le générique, soit un cycle pour variété visuelle
  if (index >= ILLUSTRATION_CYCLE.length) return IllusGeneric;
  return ILLUSTRATION_CYCLE[index % ILLUSTRATION_CYCLE.length];
}

function emojiForSlug(slug: string, fallback?: string | null) {
  const s = slug.toLowerCase();
  if (/(garde|pension|sitting)/.test(s)) return "🐕";
  if (/(chat|visite|cat)/.test(s)) return "🐈";
  if (/(promenade|balade|walk)/.test(s)) return "🐾";
  if (/(toilettage|groom)/.test(s)) return "✂️";
  if (/(dressage|educ)/.test(s)) return "🦴";
  if (/(transport)/.test(s)) return "🚗";
  return fallback || "🐾";
}

function modeForSlug(slug: string): "garde" | "services" {
  return /(garde|pension|sitting)/.test(slug.toLowerCase()) ? "garde" : "services";
}

export function HeroSection() {
  const router = useRouter();
  const reverseGeocode = useAction(api.api.googleMaps.reverseGeocode);
  const { requestLocation, isLoading: isGeoLoading } = useGeolocation();

  const [coords, setCoords] = useState<Coords | null>(null);
  const [ville, setVille] = useState("");
  const [service, setService] = useState<string | null>(null);
  const [dateDu, setDateDu] = useState("");
  const [dateAu, setDateAu] = useState("");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const autoGeoTriggeredRef = useRef(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Catégories dynamiques (+ counts éventuellement filtrés par proximité)
  const categories = useQuery(
    api.public.homepageCategories.getHomepageCategories,
    coords ? { coordinates: coords, radiusKm: 50 } : { radiusKm: 50 }
  );
  const isLoadingCats = categories === undefined;
  type Category = NonNullable<typeof categories>[number];

  // Sélection par défaut : première catégorie
  useEffect(() => {
    if (!service && categories && categories.length > 0) {
      setService(categories[0].slug);
    }
  }, [categories, service]);

  // Auto-géolocalisation au chargement
  // On ne déclenche automatiquement que si la permission est déjà "granted",
  // pour éviter de pop-up le prompt navigateur dès l'arrivée sur la home.
  useEffect(() => {
    if (autoGeoTriggeredRef.current) return;
    autoGeoTriggeredRef.current = true;

    const permissions = (navigator as Navigator & {
      permissions?: {
        query: (d: { name: "geolocation" }) => Promise<{ state: PermissionState }>;
      };
    }).permissions;

    const run = async (silent: boolean) => {
      const c = await requestLocation();
      if (!c) {
        if (!silent) setGeoError("Autorisez la localisation dans votre navigateur");
        return;
      }
      setCoords(c);
      try {
        setIsReverseGeocoding(true);
        const res = await reverseGeocode({ lat: c.lat, lng: c.lng });
        if (res?.city) setVille(res.city);
      } catch {
        // silencieux au chargement
      } finally {
        setIsReverseGeocoding(false);
      }
    };

    if (permissions?.query) {
      permissions
        .query({ name: "geolocation" })
        .then((p) => {
          if (p.state === "granted") run(true);
        })
        .catch(() => void 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGeoloc = async () => {
    setGeoError(null);
    const c = await requestLocation();
    if (!c) {
      setGeoError("Autorisez la localisation dans votre navigateur");
      return;
    }
    setCoords(c);
    try {
      setIsReverseGeocoding(true);
      const res = await reverseGeocode({ lat: c.lat, lng: c.lng });
      if (res?.city) setVille(res.city);
      else setGeoError("Ville introuvable, saisissez-la manuellement");
    } catch {
      setGeoError("Impossible de récupérer la ville");
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleSubmit = () => {
    const slug = service ?? categories?.[0]?.slug ?? "garde";
    const mode = modeForSlug(slug);
    const params = new URLSearchParams();
    params.set("mode", mode);
    params.set("category", slug);
    if (dateDu) params.set("startDate", dateDu);
    if (dateAu) params.set("endDate", dateAu);
    // Single-date fallback si seule une date fournie
    if (!dateDu && !dateAu) {
      // rien
    } else if (dateDu && !dateAu) {
      params.set("date", dateDu);
    }
    router.push(`/recherche?${params.toString()}`);
  };

  // Pills = toutes les catégories (max 6 pour la lisibilité)
  const pills = useMemo(() => (categories ?? []).slice(0, 6), [categories]);

  // Vignettes = 4 catégories principales (2 lignes × 2 colonnes à droite de la search card)
  const vignettes = useMemo(() => (categories ?? []).slice(0, 4), [categories]);

  const trustItems: { icon: LucideIcon; label: string }[] = [
    { icon: ShieldCheck, label: "Profils vérifiés par IA" },
    { icon: CreditCard, label: "Paiement sécurisé" },
    { icon: BadgeCheck, label: "Avis 100 % certifiés" },
    { icon: Receipt, label: "Crédit d'impôt 50 %" },
  ];

  return (
    <section className="relative bg-background overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 pointer-events-none" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-10 pb-16">
        {/* Eyebrow + Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-foreground/10 rounded-full mb-5 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
            <span className="text-[11px] font-medium text-text-light tracking-wide">
              {ville ? `Prestataires près de ${ville}` : "Nouveau · Service de garde de nuit"}
            </span>
          </div>

          <h1 className="font-sans font-bold text-4xl sm:text-5xl md:text-6xl lg:text-[80px] leading-[0.95] tracking-[-0.035em] text-foreground max-w-4xl">
            Chaque patte mérite<br />
            <span className="font-love-taking text-primary font-normal">
              quelqu&apos;un qui l&apos;écoute.
            </span>
          </h1>
        </motion.div>

        {/* Bento grid */}
        <div className="grid gap-3.5 mb-8 lg:grid-cols-[1.4fr_1fr_1fr] lg:grid-rows-[200px_200px]">
          {/* Search card — span 2 rows */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:row-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-foreground/10 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary mb-3">
                Trouver un prestataire
              </div>
              <p className="text-sm text-text-light mb-4 leading-relaxed">
                Garde, toilettage, dressage… on vous met en relation en moins de 2 minutes.
              </p>

              {/* Service pills — dynamiques */}
              <div className="flex flex-wrap gap-1.5 mb-4" role="radiogroup" aria-label="Type de service">
                {isLoadingCats
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <span
                        key={i}
                        className="h-7 w-20 rounded-full bg-background/70 animate-pulse"
                      />
                    ))
                  : pills.map((cat: Category) => {
                      const active = service === cat.slug;
                      return (
                        <button
                          key={cat.slug}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setService(cat.slug)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 ${
                            active
                              ? "bg-foreground text-white"
                              : "bg-background text-foreground hover:bg-foreground/5"
                          }`}
                        >
                          <span className="text-sm leading-none">
                            {emojiForSlug(cat.slug, cat.icon)}
                          </span>
                          {cat.name}
                        </button>
                      );
                    })}
              </div>

              {/* Ville */}
              <div className="flex items-center gap-2.5 border-[1.5px] border-foreground/10 rounded-xl px-3.5 py-2.5 mb-2 focus-within:border-primary/50 transition-colors">
                <MapPin className="w-4 h-4 text-text-light shrink-0" />
                <input
                  type="text"
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  placeholder="Où ? (ex. Paris 11e)"
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-text-light/70"
                  aria-label="Ville"
                />
                <button
                  type="button"
                  onClick={handleGeoloc}
                  disabled={isGeoLoading || isReverseGeocoding}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background text-primary text-[11px] font-semibold hover:bg-primary/10 transition-colors disabled:opacity-60 shrink-0"
                  aria-label="Me localiser"
                >
                  <LocateFixed
                    className={`w-3 h-3 ${isGeoLoading || isReverseGeocoding ? "animate-spin" : ""}`}
                  />
                  Me localiser
                </button>
              </div>
              {geoError && <p className="text-[11px] text-primary mb-2 px-1">{geoError}</p>}

              {/* Dates */}
              <div className="flex items-center gap-2.5 border-[1.5px] border-foreground/10 rounded-xl px-3.5 py-2.5 mb-2 focus-within:border-primary/50 transition-colors">
                <CalendarIcon className="w-4 h-4 text-text-light shrink-0" />
                <input
                  type="date"
                  value={dateDu}
                  min={today}
                  onChange={(e) => setDateDu(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground"
                  aria-label="Date de début"
                />
                <span className="text-text-light text-sm">→</span>
                <input
                  type="date"
                  value={dateAu}
                  min={dateDu || today}
                  onChange={(e) => setDateAu(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-foreground"
                  aria-label="Date de fin"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              className="mt-4 w-full inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white font-semibold text-[15px] py-3.5 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all hover:scale-[1.01]"
            >
              Lancer la recherche
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Vignettes dynamiques (4 catégories) */}
          {isLoadingCats
            ? Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                  className="relative rounded-3xl h-[200px] bg-foreground/5 animate-pulse"
                />
              ))
            : vignettes.map((cat: Category, i: number) => {
                const Illus = pickIllustration(cat.slug, cat.parentSlug, i);
                const mode = modeForSlug(cat.slug);
                const href = `/recherche?mode=${mode}&category=${cat.slug}${
                  coords ? `&radius=50` : ""
                }`;
                return (
                  <motion.button
                    key={cat.slug}
                    type="button"
                    onClick={() => router.push(href)}
                    onMouseEnter={() => setHoveredCard(cat.slug)}
                    onMouseLeave={() => setHoveredCard((h) => (h === cat.slug ? null : h))}
                    onFocus={() => setHoveredCard(cat.slug)}
                    onBlur={() => setHoveredCard((h) => (h === cat.slug ? null : h))}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.05 }}
                    className="hero-card group relative rounded-3xl overflow-hidden h-[200px] text-left focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label={`Voir les prestataires ${cat.name}`}
                  >
                    <Illus isHovered={hoveredCard === cat.slug} />
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full text-[11px] font-semibold text-foreground shadow-sm">
                      {emojiForSlug(cat.slug, cat.icon)} {cat.name}
                    </span>
                    {cat.count > 0 && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 bg-foreground/90 backdrop-blur-sm rounded-full text-[11px] font-semibold text-white shadow-sm">
                        <Users className="w-3 h-3" />
                        {cat.count} {coords ? "à proximité" : "disponibles"}
                      </span>
                    )}
                  </motion.button>
                );
              })}
        </div>

        {/* Trust row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-text-light"
        >
          {trustItems.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-secondary" />
              {label}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
