"use client";

import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Search, Heart, Shield } from "lucide-react";
import { floatingAnimals } from "@/app/lib/constants";
import { containerVariantsDelayed, itemVariants } from "@/app/lib/animations";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="blob absolute w-96 h-96 bg-primary/20 -top-20 -left-20"
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="blob absolute w-80 h-80 bg-secondary/20 top-1/3 -right-10"
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <motion.div
          className="blob absolute w-72 h-72 bg-accent/30 bottom-20 left-1/4"
          animate={{
            x: [0, 20, 0],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        <motion.div
          className="blob absolute w-64 h-64 bg-purple/15 bottom-1/3 right-1/4"
          animate={{
            x: [0, -25, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
      </div>

      {/* Floating Animals */}
      {floatingAnimals.map((animal, index) => (
        <motion.div
          key={index}
          className="absolute text-4xl md:text-5xl pointer-events-none select-none hidden md:block"
          style={{ left: animal.x, top: animal.y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: 0.8,
            scale: 1,
            y: [0, -15, 0],
          }}
          transition={{
            opacity: { delay: animal.delay + 0.5, duration: 0.5 },
            scale: { delay: animal.delay + 0.5, duration: 0.5, type: "spring" },
            y: {
              delay: animal.delay + 1,
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        >
          {animal.emoji}
        </motion.div>
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          variants={containerVariantsDelayed}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Badge */}
          <motion.div variants={itemVariants}>
            <Badge variant="primary" className="text-base px-4 py-2">
              <Heart className="w-4 h-4 mr-2 inline" />
              +10 000 animaux heureux
            </Badge>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-tight"
          >
            Votre animal mérite{" "}
            <span className="text-primary relative">
              le meilleur ami
              <motion.svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
              >
                <motion.path
                  d="M2 10 Q 150 -5, 298 10"
                  fill="none"
                  stroke="#FFE66D"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </motion.svg>
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl md:text-2xl text-text-light max-w-2xl mx-auto"
          >
            Trouvez le professionnel idéal pour votre animal.{" "}
            <span className="text-foreground font-medium">
              Garde, toilettage, promenade
            </span>{" "}
            et plus encore !
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button variant="primary" size="lg" className="group">
              <Search className="w-5 h-5 mr-2" />
              Rechercher un service
            </Button>
            <Button variant="outline" size="lg">
              Je propose mes services
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-6 pt-8 text-text-light"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-secondary" />
              <span className="text-sm">Gardes vérifiés</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              <span className="text-sm">Assurance incluse</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⭐</span>
              <span className="text-sm">4.9/5 note moyenne</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{
          opacity: { delay: 2 },
          y: { delay: 2, duration: 1.5, repeat: Infinity },
        }}
      >
        <div className="w-6 h-10 border-2 border-foreground/30 rounded-full flex justify-center">
          <motion.div
            className="w-1.5 h-3 bg-primary rounded-full mt-2"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}
