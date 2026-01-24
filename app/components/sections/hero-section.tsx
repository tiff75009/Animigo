"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Home, Scissors, ArrowRight } from "lucide-react";

export function HeroSection() {
  const router = useRouter();

  return (
    <section className="relative min-h-[85vh] bg-background overflow-hidden flex flex-col">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />

      {/* Decorative blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 pt-8 relative z-10 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-end w-full">
          {/* Left side - Text content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left lg:col-span-3 pb-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-foreground/5 mb-6"
            >
              <span className="text-xl">🐾</span>
              <span className="text-sm font-medium text-foreground/70">La plateforme des amoureux des animaux</span>
            </motion.div>

            {/* Main title with Love Taking font */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-love-taking text-5xl md:text-6xl lg:text-7xl text-foreground mb-6 leading-tight"
            >
              Prenez soin de vos{" "}
              <span className="text-primary">compagnons</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg md:text-xl text-text-light mb-8 max-w-lg"
            >
              Trouvez des gardiens et prestataires de confiance pour vos animaux,
              partout en France.
            </motion.p>

            {/* CTA Buttons - smaller */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={() => router.push("/recherche?mode=garde")}
                className="group flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all hover:scale-105"
              >
                <Home className="w-4 h-4" />
                <span>Rechercher une garde</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => router.push("/recherche?mode=services")}
                className="group flex items-center justify-center gap-2 px-6 py-3 bg-white text-foreground font-semibold rounded-full shadow-lg border-2 border-foreground/10 hover:border-secondary hover:shadow-xl transition-all hover:scale-105"
              >
                <Scissors className="w-4 h-4 text-secondary" />
                <span>Faire appel à un service</span>
                <ArrowRight className="w-4 h-4 text-secondary group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </motion.div>

          {/* Spacer for image */}
          <div className="hidden lg:block lg:col-span-2" />
        </div>
      </div>

      {/* Right side - Image absolutely positioned at bottom */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="absolute bottom-0 right-0 hidden lg:block w-[45%] xl:w-[40%] h-[70%] pointer-events-none"
      >
        <Image
          src="/header.svg"
          alt="Animigo - Services animaliers"
          fill
          className="object-contain object-right-bottom"
          priority
        />
      </motion.div>

      {/* Mobile image (below content) */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="lg:hidden px-4"
      >
        <div className="relative w-full max-w-sm mx-auto aspect-square">
          <Image
            src="/header.svg"
            alt="Animigo - Services animaliers"
            fill
            className="object-contain object-bottom"
            priority
          />
        </div>
      </motion.div>
    </section>
  );
}
