"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Navbar } from "@/app/components/navbar";
import { Footer } from "@/app/components/footer";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import { Id } from "@/convex/_generated/dataModel";

interface ServiceFeature {
  icon?: string;
  title: string;
  description?: string;
}

interface SeoService {
  _id: Id<"seoServicePages">;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  heroImageUrl?: string;
  ctaPrimaryText: string;
  ctaPrimaryUrl: string;
  features: ServiceFeature[];
  category?: {
    id: Id<"serviceCategories">;
    slug: string;
    name: string;
    icon?: string;
    color?: string;
  } | null;
}

export default function ServicesPage() {
  const services = useQuery(api.seo.servicePages.list, {});

  if (services === undefined) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24">
          <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24">
        {/* Hero Section */}
        <section className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-nunito">
                Nos services pour vos animaux
              </h1>
              <p className="text-lg text-muted-foreground">
                Découvrez tous les services proposés par nos professionnels certifiés.
                Garde, promenade, toilettage et bien plus encore.
              </p>
            </motion.div>

            {/* Services Grid */}
            {services.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun service disponible pour le moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map((service: SeoService, index: number) => (
                  <motion.div
                    key={service._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link href={`/services/${service.slug}`}>
                      <div className="group bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                        {/* Image */}
                        <div className="relative h-48 bg-gradient-to-br from-primary/10 to-secondary/10">
                          {service.heroImageUrl ? (
                            <Image
                              src={service.heroImageUrl}
                              alt={service.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Sparkles className="w-16 h-16 text-primary/30" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-6">
                          <h2 className="text-xl font-bold text-foreground mb-2 font-nunito group-hover:text-primary transition-colors">
                            {service.title}
                          </h2>
                          {service.subtitle && (
                            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                              {service.subtitle}
                            </p>
                          )}
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                            {service.description}
                          </p>

                          {/* Features preview */}
                          {service.features.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {service.features.slice(0, 3).map((feature: ServiceFeature, i: number) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/5 text-primary text-xs rounded-full"
                                >
                                  {feature.icon && <span>{feature.icon}</span>}
                                  {feature.title}
                                </span>
                              ))}
                              {service.features.length > 3 && (
                                <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-full">
                                  +{service.features.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* CTA */}
                          <div className="flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all">
                            <span>Découvrir</span>
                            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-foreground mb-4 font-nunito">
                Vous ne trouvez pas ce que vous cherchez ?
              </h2>
              <p className="text-muted-foreground mb-8">
                Explorez notre moteur de recherche pour trouver le prestataire idéal près de chez vous.
              </p>
              <Link
                href="/recherche"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-full font-semibold hover:bg-primary/90 transition-colors"
              >
                Rechercher un prestataire
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
