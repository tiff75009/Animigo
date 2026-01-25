"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Heart, Shield, Users, Star } from "lucide-react";
import Image from "next/image";

interface AboutGopattesProps {
  categoryColor?: string;
  videoId?: string;
  thumbnailUrl?: string;
}

export function AboutGopattesSection({
  categoryColor = "#FF6B6B",
  videoId = "dQw4w9WgXcQ", // Placeholder - à remplacer par la vraie vidéo
  thumbnailUrl = "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800&q=80",
}: AboutGopattesProps) {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const features = [
    {
      icon: Heart,
      title: "Passion animale",
      description: "Des professionnels qui aiment vraiment les animaux",
    },
    {
      icon: Shield,
      title: "Confiance garantie",
      description: "Tous nos prestataires sont vérifiés et assurés",
    },
    {
      icon: Users,
      title: "Communauté active",
      description: "Des milliers de propriétaires nous font confiance",
    },
    {
      icon: Star,
      title: "Excellence",
      description: "Un service 5 étoiles pour vos compagnons",
    },
  ];

  return (
    <>
      <section className="py-24 md:py-32 bg-white relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.07]"
            style={{ backgroundColor: categoryColor }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.05]"
            style={{ backgroundColor: categoryColor }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Video */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              {/* Video container */}
              <div
                className="relative aspect-video rounded-3xl overflow-hidden cursor-pointer group"
                onClick={() => setIsVideoOpen(true)}
                style={{
                  boxShadow: `0 30px 80px -20px ${categoryColor}40`,
                }}
              >
                {/* Thumbnail */}
                <Image
                  src={thumbnailUrl}
                  alt="Découvrez Gopattes"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Overlay gradient */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity duration-300 group-hover:opacity-80"
                />

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    {/* Pulse animation */}
                    <motion.div
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 0, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: categoryColor }}
                    />
                    {/* Button */}
                    <div
                      className="relative w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-2xl transition-shadow duration-300 group-hover:shadow-[0_0_60px_rgba(255,255,255,0.3)]"
                      style={{ backgroundColor: categoryColor }}
                    >
                      <Play className="w-8 h-8 md:w-10 md:h-10 text-white fill-white ml-1" />
                    </div>
                  </motion.div>
                </div>

                {/* Bottom text */}
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-white/90 text-sm font-medium">
                    Regarder notre histoire
                  </p>
                </div>
              </div>

              {/* Floating badge */}
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4, type: "spring" }}
                className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-4 shadow-xl border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${categoryColor}15` }}
                  >
                    <Heart className="w-6 h-6" style={{ color: categoryColor }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">+10k</p>
                    <p className="text-xs text-muted-foreground">animaux heureux</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Right: Content */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
                style={{
                  backgroundColor: `${categoryColor}10`,
                  color: categoryColor,
                }}
              >
                <span className="text-lg">🐾</span>
                Notre mission
              </motion.div>

              {/* Title */}
              <h2 className="font-love-taking text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6">
                Nous sommes{" "}
                <span style={{ color: categoryColor }}>Gopattes</span>
              </h2>

              {/* Description */}
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Chez Gopattes, nous croyons que chaque animal mérite les meilleurs soins.
                Notre plateforme connecte les propriétaires d&apos;animaux avec des professionnels
                passionnés et vérifiés, pour des services de qualité en toute confiance.
              </p>

              <p className="text-muted-foreground mb-8 leading-relaxed">
                Que vous cherchiez un gardien pour vos vacances, un promeneur quotidien
                ou un toiletteur expert, notre communauté de prestataires certifiés
                est là pour prendre soin de vos compagnons comme s&apos;ils étaient les leurs.
              </p>

              {/* Features grid */}
              <div className="grid grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${categoryColor}10` }}
                    >
                      <feature.icon
                        className="w-5 h-5"
                        style={{ color: categoryColor }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {feature.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      <AnimatePresence>
        {isVideoOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setIsVideoOpen(false)}
          >
            {/* Close button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              onClick={() => setIsVideoOpen(false)}
            >
              <X className="w-6 h-6" />
            </motion.button>

            {/* Video container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                title="Gopattes - Notre histoire"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
