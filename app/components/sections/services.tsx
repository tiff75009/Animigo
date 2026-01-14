"use client";

import { motion } from "framer-motion";
import { Card, CardTitle, CardDescription } from "../ui/card";
import { Home, Footprints, Eye, Building, Car, Pill } from "lucide-react";

const services = [
  {
    icon: Home,
    title: "Garde à domicile",
    description: "Votre animal reste dans son environnement familier pendant votre absence.",
    color: "bg-primary/10 text-primary",
    emoji: "🏠",
  },
  {
    icon: Footprints,
    title: "Promenades",
    description: "Des balades quotidiennes adaptées aux besoins de votre compagnon.",
    color: "bg-secondary/10 text-secondary",
    emoji: "🚶",
  },
  {
    icon: Eye,
    title: "Visites quotidiennes",
    description: "Passages réguliers pour nourrir, câliner et vérifier que tout va bien.",
    color: "bg-accent/20 text-foreground",
    emoji: "👀",
  },
  {
    icon: Building,
    title: "Pension",
    description: "Hébergement chez un garde de confiance dans un environnement chaleureux.",
    color: "bg-purple/10 text-purple",
    emoji: "🏨",
  },
  {
    icon: Car,
    title: "Transport",
    description: "Accompagnement chez le vétérinaire ou pour tout autre déplacement.",
    color: "bg-primary/10 text-primary",
    emoji: "🚗",
  },
  {
    icon: Pill,
    title: "Soins spéciaux",
    description: "Prise en charge d'animaux nécessitant des soins ou une attention particulière.",
    color: "bg-secondary/10 text-secondary",
    emoji: "💊",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

export function Services() {
  return (
    <section id="services" className="py-24 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-background to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-4xl mb-4 block">🐾</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Tous les services pour vos{" "}
            <span className="text-primary">compagnons</span>
          </h2>
          <p className="text-text-light text-lg max-w-2xl mx-auto">
            Que vous ayez besoin d&apos;une garde ponctuelle ou régulière, nous avons
            la solution adaptée à chaque situation.
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {services.map((service, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="h-full">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl ${service.color} flex items-center justify-center flex-shrink-0`}
                  >
                    <service.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <CardTitle className="mb-2 flex items-center gap-2">
                      {service.title}
                      <span className="text-xl">{service.emoji}</span>
                    </CardTitle>
                    <CardDescription className="text-base">
                      {service.description}
                    </CardDescription>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
