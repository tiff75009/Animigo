"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Navbar } from "@/app/components/navbar";
import { Footer } from "@/app/components/footer";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Loader2,
  ArrowRight,
  Check,
  MapPin,
  FileX,
  Users,
  Star,
  Award,
} from "lucide-react";
import Image from "next/image";
import { AboutGopattesSection } from "@/app/components/sections/about-gopattes-section";

interface OtherCity {
  citySlug: string;
  cityName: string;
  region: string;
  title: string;
}

interface OtherService {
  serviceSlug: string;
  serviceTitle: string;
  title: string;
}

interface ServiceFeature {
  icon?: string;
  title: string;
  description?: string;
}

interface DescriptionCard {
  title: string;
  content: string;
  icon?: string;
}

interface Props {
  serviceSlug: string;
  citySlug: string;
}

export default function ServiceCityPageClient({ serviceSlug, citySlug }: Props) {
  const page = useQuery(api.seo.serviceCityPages.getByServiceAndCity, {
    serviceSlug,
    citySlug,
  });

  // Autres villes pour ce service
  const otherCities = useQuery(api.seo.serviceCityPages.listByService, {
    serviceSlug,
  });

  // Autres services pour cette ville
  const otherServices = useQuery(api.seo.serviceCityPages.listByCity, {
    citySlug,
  });

  // Loading state
  if (page === undefined) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background">
          <div className="max-w-7xl mx-auto px-4 py-32 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Not found
  if (page === null) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto px-4 py-32">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <FileX className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Page non trouvee
              </h1>
              <p className="text-muted-foreground mb-6">
                Ce service n&apos;est pas disponible dans cette ville.
              </p>
              <Link
                href={`/services/${serviceSlug}`}
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                Voir le service
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Filter out current city from other cities list
  const filteredOtherCities = otherCities?.filter((c: OtherCity) => c.citySlug !== citySlug);

  // Filter out current service from other services list
  const filteredOtherServices = otherServices?.filter((s: OtherService) => s.serviceSlug !== serviceSlug);

  // Couleur de la catégorie
  const categoryColor = page.servicePage.category?.color || "#FF6B6B";

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background overflow-hidden">
        {/* Hero Section - Split Layout */}
        <section
          className="relative min-h-[600px] lg:min-h-[700px]"
          style={{
            background: `linear-gradient(135deg, ${categoryColor}12 0%, ${categoryColor}05 40%, transparent 70%)`
          }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Main blob */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.15 }}
              transition={{ duration: 1 }}
              className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full blur-3xl"
              style={{ backgroundColor: categoryColor }}
            />
            {/* Secondary blob */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.08 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="absolute top-1/2 -left-32 w-[400px] h-[400px] rounded-full blur-3xl"
              style={{ backgroundColor: categoryColor }}
            />
            {/* Floating shapes */}
            <motion.div
              animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-32 right-[20%] w-4 h-4 rounded-full opacity-30"
              style={{ backgroundColor: categoryColor }}
            />
            <motion.div
              animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-48 right-[10%] w-3 h-3 rounded-full opacity-20"
              style={{ backgroundColor: categoryColor }}
            />
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-32 left-[15%] w-5 h-5 rounded-full opacity-20"
              style={{ backgroundColor: categoryColor }}
            />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[600px] lg:min-h-[700px] py-8">

              {/* Left: Content */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="order-2 lg:order-1"
              >
                {/* Location badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                  style={{
                    backgroundColor: `${categoryColor}15`,
                    color: categoryColor
                  }}
                >
                  <MapPin className="w-4 h-4" />
                  {page.city.name}, {page.city.region}
                </motion.div>

                {/* Title */}
                <h1 className="font-love-taking text-4xl sm:text-5xl lg:text-6xl text-foreground mb-4">
                  {page.title}
                </h1>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg text-muted-foreground mb-6 max-w-xl"
                >
                  {page.description}
                </motion.p>

                {/* Local Stats */}
                {page.localStats && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap gap-4 mb-8"
                  >
                    {page.localStats.announcersCount && (
                      <div
                        className="flex items-center gap-2 px-4 py-2 rounded-xl"
                        style={{ backgroundColor: `${categoryColor}10` }}
                      >
                        <Users className="w-5 h-5" style={{ color: categoryColor }} />
                        <span className="text-foreground font-semibold">
                          {page.localStats.announcersCount}
                        </span>
                        <span className="text-muted-foreground text-sm">prestataires</span>
                      </div>
                    )}
                    {page.localStats.averageRating && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <span className="text-foreground font-semibold">
                          {page.localStats.averageRating.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground text-sm">note moyenne</span>
                      </div>
                    )}
                    {page.localStats.completedMissions && (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50">
                        <Award className="w-5 h-5 text-green-500" />
                        <span className="text-foreground font-semibold">
                          {page.localStats.completedMissions}
                        </span>
                        <span className="text-muted-foreground text-sm">missions</span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Features Checklist */}
                {page.servicePage.features.length > 0 && (
                  <div className="space-y-3 mb-8">
                    {page.servicePage.features.slice(0, 4).map((feature: ServiceFeature, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.08 }}
                        className="flex items-start gap-3 group"
                      >
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                          style={{ backgroundColor: `${categoryColor}15` }}
                        >
                          <Check className="w-4 h-4" style={{ color: categoryColor }} />
                        </motion.div>
                        <span className="font-medium text-foreground">
                          {feature.title}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex flex-wrap gap-4"
                >
                  <Link
                    href={`${page.servicePage.ctaPrimaryUrl}&city=${citySlug}`}
                    className="group inline-flex items-center gap-2 px-6 py-3 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
                    style={{
                      backgroundColor: categoryColor,
                      boxShadow: `0 10px 30px -10px ${categoryColor}50`
                    }}
                  >
                    {page.servicePage.ctaPrimaryText}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  {page.servicePage.ctaSecondaryText && page.servicePage.ctaSecondaryUrl && (
                    <Link
                      href={page.servicePage.ctaSecondaryUrl}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white text-foreground border-2 border-slate-200 rounded-full font-semibold hover:border-slate-300 hover:shadow-md transition-all"
                    >
                      {page.servicePage.ctaSecondaryText}
                    </Link>
                  )}
                </motion.div>
              </motion.div>

              {/* Right: Image */}
              <motion.div
                initial={{ opacity: 0, x: 30, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="order-1 lg:order-2 flex justify-center lg:justify-end pr-4"
              >
                <div className="relative w-full max-w-md lg:max-w-lg">
                  {/* Main image container */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden"
                    style={{
                      boxShadow: `0 25px 60px -15px ${categoryColor}35`
                    }}
                  >
                    {page.servicePage.heroImageUrl ? (
                      <Image
                        src={page.servicePage.heroImageUrl}
                        alt={page.title}
                        fill
                        className="object-cover"
                        priority
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${categoryColor}30, ${categoryColor}15)`
                        }}
                      >
                        <span className="text-7xl">
                          {page.servicePage.category?.icon || "✨"}
                        </span>
                      </div>
                    )}

                    {/* Shine effect overlay */}
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        background: "linear-gradient(135deg, white 0%, transparent 40%)"
                      }}
                    />
                  </motion.div>

                  {/* Floating city badge */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                    className="absolute -bottom-3 -left-3 px-4 py-2 rounded-xl flex items-center gap-2 shadow-xl bg-white"
                    style={{
                      boxShadow: `0 10px 30px -5px ${categoryColor}30`
                    }}
                  >
                    <MapPin className="w-4 h-4" style={{ color: categoryColor }} />
                    <span className="font-semibold text-foreground">{page.city.name}</span>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Description Cards Section - "Vous allez nous aimer" */}
        {page.servicePage.descriptionCards.length > 0 && (
          <section className="py-24 md:py-32 bg-white relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {/* Gradient orb - top only */}
              <div
                className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10"
                style={{ backgroundColor: categoryColor }}
              />
              {/* Subtle pattern */}
              <div
                className="absolute inset-0 opacity-[0.015]"
                style={{
                  backgroundImage: `radial-gradient(${categoryColor} 1px, transparent 1px)`,
                  backgroundSize: "32px 32px"
                }}
              />
            </div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
              {/* Section Header */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                {/* Decorative sparkles */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="flex items-center justify-center gap-2 mb-6"
                >
                  <span className="text-2xl">✨</span>
                  <div
                    className="px-4 py-1.5 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${categoryColor}10`,
                      color: categoryColor
                    }}
                  >
                    Pourquoi nous choisir
                  </div>
                  <span className="text-2xl">✨</span>
                </motion.div>

                <h2 className="font-love-taking text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6">
                  Vous allez nous{" "}
                  <span
                    className="relative inline-block"
                    style={{ color: categoryColor }}
                  >
                    aimer
                    {/* Underline decoration */}
                    <motion.svg
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                      className="absolute -bottom-2 left-0 w-full h-3"
                      viewBox="0 0 100 10"
                      preserveAspectRatio="none"
                    >
                      <motion.path
                        d="M0,5 Q25,0 50,5 T100,5"
                        fill="none"
                        stroke={categoryColor}
                        strokeWidth="3"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                      />
                    </motion.svg>
                  </span>
                </h2>

                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Decouvrez ce qui fait de nous le choix prefere des proprietaires d&apos;animaux a {page.city.name}
                </p>
              </motion.div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {page.servicePage.descriptionCards.map((card: DescriptionCard, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: index * 0.15, duration: 0.5 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="group relative"
                  >
                    {/* Card */}
                    <div
                      className="relative bg-gradient-to-br from-white to-slate-50 rounded-3xl p-8 border border-slate-100 hover:border-transparent transition-all duration-500 h-full"
                      style={{
                        boxShadow: "0 4px 20px -5px rgba(0,0,0,0.05)"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = `0 25px 50px -15px ${categoryColor}25`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "0 4px 20px -5px rgba(0,0,0,0.05)";
                      }}
                    >
                      {/* Number badge */}
                      <div
                        className="absolute -top-4 -right-4 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ backgroundColor: categoryColor }}
                      >
                        0{index + 1}
                      </div>

                      {/* Icon */}
                      {card.icon && (
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300"
                          style={{
                            backgroundColor: `${categoryColor}10`,
                          }}
                        >
                          <span className="text-4xl">{card.icon}</span>
                        </motion.div>
                      )}

                      {/* Title */}
                      <h3 className="text-xl font-bold text-foreground mb-4 font-nunito group-hover:text-foreground transition-colors">
                        {card.title}
                      </h3>

                      {/* Content */}
                      <p className="text-muted-foreground leading-relaxed">
                        {card.content}
                      </p>

                      {/* Bottom accent line */}
                      <div className="mt-6 flex items-center gap-2">
                        <div
                          className="h-1 rounded-full transition-all duration-500 group-hover:w-12"
                          style={{
                            backgroundColor: categoryColor,
                            width: "24px"
                          }}
                        />
                        <div
                          className="w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          style={{ backgroundColor: categoryColor }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Other Services in this City */}
        {filteredOtherServices && filteredOtherServices.length > 0 && (
          <section
            className="py-16 md:py-24 relative"
            style={{
              background: `linear-gradient(180deg, rgb(248 250 252) 0%, ${categoryColor}06 50%, rgb(248 250 252) 100%)`
            }}
          >
            <div className="max-w-7xl mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl font-bold text-foreground mb-4 font-nunito">
                  Autres services a {page.city.name}
                </h2>
              </motion.div>

              <div className="flex flex-wrap justify-center gap-3">
                {filteredOtherServices.slice(0, 10).map((service: OtherService, index: number) => (
                  <motion.div
                    key={service.serviceSlug}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/services/${service.serviceSlug}/${citySlug}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 text-sm text-foreground hover:shadow-md transition-all"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = categoryColor;
                        e.currentTarget.style.color = categoryColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "";
                        e.currentTarget.style.color = "";
                      }}
                    >
                      {service.serviceTitle}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Other Cities for this Service */}
        {filteredOtherCities && filteredOtherCities.length > 0 && (
          <section className="py-20 md:py-28 bg-slate-50 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute top-20 left-10 w-72 h-72 rounded-full blur-[100px] opacity-20"
                style={{ backgroundColor: categoryColor }}
              />
              <div
                className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-[120px] opacity-15"
                style={{ backgroundColor: categoryColor }}
              />
              {/* Dotted pattern */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `radial-gradient(${categoryColor} 1px, transparent 1px)`,
                  backgroundSize: "30px 30px"
                }}
              />
            </div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", damping: 15 }}
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                  style={{
                    backgroundColor: categoryColor,
                    boxShadow: `0 20px 40px -15px ${categoryColor}50`
                  }}
                >
                  <MapPin className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="font-love-taking text-4xl sm:text-5xl text-foreground mb-4">
                  {page.servicePage.title} dans{" "}
                  <span style={{ color: categoryColor }}>d&apos;autres villes</span>
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Ce service est egalement disponible dans {filteredOtherCities.length} autres villes
                </p>
              </motion.div>

              {/* Featured cities - first 6 as cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10"
              >
                {filteredOtherCities.slice(0, 6).map((city: OtherCity, index: number) => (
                  <motion.div
                    key={city.citySlug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/services/${serviceSlug}/${city.citySlug}`}
                      className="group block bg-white rounded-2xl p-5 border border-slate-200 hover:border-transparent hover:shadow-xl transition-all duration-300 text-center relative overflow-hidden"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = `0 20px 40px -15px ${categoryColor}30`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "";
                      }}
                    >
                      {/* Hover background */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                        style={{ backgroundColor: categoryColor }}
                      />

                      {/* Icon */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: `${categoryColor}10` }}
                      >
                        <MapPin
                          className="w-6 h-6 transition-colors duration-300"
                          style={{ color: categoryColor }}
                        />
                      </div>

                      {/* City name */}
                      <h3 className="font-semibold text-foreground group-hover:text-foreground transition-colors">
                        {city.cityName}
                      </h3>

                      {/* Region */}
                      <p className="text-xs text-muted-foreground mt-1">
                        {city.region}
                      </p>

                      {/* Arrow on hover */}
                      <div
                        className="absolute bottom-3 right-3 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0"
                        style={{ backgroundColor: categoryColor }}
                      >
                        <ArrowRight className="w-3 h-3 text-white" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              {/* Other cities as pills */}
              {filteredOtherCities.length > 6 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm"
                >
                  <p className="text-sm font-medium text-muted-foreground mb-4 text-center">
                    Et aussi disponible dans :
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {filteredOtherCities.slice(6, 24).map((city: OtherCity, index: number) => (
                      <motion.div
                        key={city.citySlug}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + index * 0.02 }}
                      >
                        <Link
                          href={`/services/${serviceSlug}/${city.citySlug}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all duration-200 bg-slate-100 text-slate-700 hover:text-white"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = categoryColor;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "";
                            e.currentTarget.style.color = "";
                          }}
                        >
                          <MapPin className="w-3 h-3" />
                          {city.cityName}
                        </Link>
                      </motion.div>
                    ))}
                    {filteredOtherCities.length > 24 && (
                      <Link
                        href={`/services/${serviceSlug}`}
                        className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: categoryColor }}
                      >
                        +{filteredOtherCities.length - 24} autres villes
                      </Link>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </section>
        )}

        {/* About Gopattes Section */}
        <AboutGopattesSection categoryColor={categoryColor} />

        {/* Final CTA Section */}
        <section
          className="py-20 md:py-28 text-white relative overflow-hidden"
          style={{ backgroundColor: categoryColor }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/2 -right-1/4 w-[600px] h-[600px] rounded-full border border-white/10"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-1/2 -left-1/4 w-[500px] h-[500px] rounded-full border border-white/10"
            />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent" />
          </div>

          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 font-nunito">
                Trouvez votre prestataire a {page.city.name}
              </h2>
              <p className="text-white/80 mb-10 text-lg max-w-2xl mx-auto">
                Des professionnels certifies vous attendent dans votre ville.
              </p>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={`${page.servicePage.ctaPrimaryUrl}&city=${citySlug}`}
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-white rounded-full font-semibold shadow-xl hover:shadow-2xl transition-all"
                  style={{ color: categoryColor }}
                >
                  {page.servicePage.ctaPrimaryText}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
