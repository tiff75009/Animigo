"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { containerVariants, itemVariants } from "@/app/lib/animations";
import { Id } from "@/convex/_generated/dataModel";

interface SeoService {
  _id: Id<"seoServicePages">;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  heroImageUrl?: string;
  thumbnailUrl?: string;
  ctaPrimaryText: string;
  ctaPrimaryUrl: string;
  category?: {
    id: Id<"serviceCategories">;
    slug: string;
    name: string;
    icon?: string;
    color?: string;
  } | null;
}

export function SeoServicesSection() {
  const services = useQuery(api.seo.servicePages.list, {});

  // Don't render if no services or still loading
  if (services === undefined) {
    return (
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </section>
    );
  }

  // Don't render section if no SEO services configured
  if (services.length === 0) {
    return null;
  }

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-love-taking text-4xl sm:text-5xl md:text-6xl text-foreground mb-4">
            Decouvrez nos <span className="text-primary">services</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Des professionnels qualifies pour prendre soin de vos compagnons.
          </p>
        </motion.div>

        {/* Services Grid - 2 cards per row max */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {services.slice(0, 6).map((service: SeoService) => {
            // Utiliser la couleur de la catégorie ou une couleur par défaut
            const bgColor = service.category?.color || "#FF6B6B";

            return (
              <motion.div key={service._id} variants={itemVariants}>
                <Link href={`/services/${service.slug}`}>
                  <div
                    className="group relative rounded-3xl overflow-hidden aspect-[3/2] cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* Background Image (thumbnail) - centered */}
                    {(service.thumbnailUrl || service.heroImageUrl) && (
                      <Image
                        src={service.thumbnailUrl || service.heroImageUrl || ""}
                        alt={service.title}
                        fill
                        className="object-cover object-center"
                      />
                    )}

                    {/* Text Content - positioned top left */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-start">
                      <h3 className="font-love-taking text-3xl sm:text-4xl text-slate-900">
                        {service.title}
                      </h3>
                    </div>

                    {/* Hover arrow indicator */}
                    <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                        <ArrowRight className="w-5 h-5 text-foreground" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* View all link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Link
            href="/services"
            className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
          >
            Voir tous nos services
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
