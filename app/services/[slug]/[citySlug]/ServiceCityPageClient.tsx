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

        {/* Description Cards Section */}
        {page.servicePage.descriptionCards.length > 0 && (
          <section className="py-20 md:py-28 bg-white relative">
            {/* Subtle pattern */}
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: `radial-gradient(${categoryColor} 1px, transparent 1px)`,
                backgroundSize: "24px 24px"
              }}
            />

            <div className="max-w-7xl mx-auto px-4 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {page.servicePage.descriptionCards.map((card: DescriptionCard, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="group bg-background rounded-3xl p-8 border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-300"
                  >
                    {card.icon && (
                      <motion.span
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="text-4xl mb-4 block"
                      >
                        {card.icon}
                      </motion.span>
                    )}
                    <h3 className="text-xl font-bold text-foreground mb-3 font-nunito">
                      {card.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{card.content}</p>

                    {/* Subtle colored accent */}
                    <div
                      className="mt-6 w-12 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ backgroundColor: categoryColor }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Other Services in this City */}
        {filteredOtherServices && filteredOtherServices.length > 0 && (
          <section
            className="py-20 md:py-28 relative"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${categoryColor}08 50%, transparent 100%)`
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
          <section className="py-20 md:py-28 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: `${categoryColor}15` }}
                >
                  <MapPin className="w-6 h-6" style={{ color: categoryColor }} />
                </motion.div>
                <h2 className="text-3xl font-bold text-foreground mb-4 font-nunito">
                  {page.servicePage.title} dans d&apos;autres villes
                </h2>
              </motion.div>

              <div className="flex flex-wrap justify-center gap-3">
                {filteredOtherCities.slice(0, 20).map((city: OtherCity, index: number) => (
                  <motion.div
                    key={city.citySlug}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Link
                      href={`/services/${serviceSlug}/${city.citySlug}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-background rounded-full border border-slate-200 text-sm text-foreground hover:shadow-md transition-all"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = categoryColor;
                        e.currentTarget.style.color = categoryColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "";
                        e.currentTarget.style.color = "";
                      }}
                    >
                      <MapPin className="w-3 h-3" />
                      {city.cityName}
                    </Link>
                  </motion.div>
                ))}
                {filteredOtherCities.length > 20 && (
                  <Link
                    href={`/services/${serviceSlug}`}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: `${categoryColor}15`,
                      color: categoryColor
                    }}
                  >
                    +{filteredOtherCities.length - 20} villes
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

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
