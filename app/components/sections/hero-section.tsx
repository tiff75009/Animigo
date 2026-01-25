"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Home, Scissors, ArrowRight } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

// Floating service icons data
const floatingServices = [
  { id: "garde", emoji: "🏠", label: "Garde", category: "garde", color: "from-orange-400 to-orange-500" },
  { id: "toilettage", emoji: "✂️", label: "Toilettage", category: "toilettage", color: "from-pink-400 to-pink-500" },
  { id: "promenade", emoji: "🦮", label: "Promenade", category: "promenade", color: "from-green-400 to-green-500" },
  { id: "veterinaire", emoji: "💉", label: "Vétérinaire", category: "veterinaire", color: "from-blue-400 to-blue-500" },
  { id: "education", emoji: "🎓", label: "Éducation", category: "education", color: "from-purple-400 to-purple-500" },
  { id: "transport", emoji: "🚗", label: "Transport", category: "transport", color: "from-yellow-400 to-yellow-500" },
  { id: "pension", emoji: "🏡", label: "Pension", category: "pension", color: "from-teal-400 to-teal-500" },
  { id: "photographie", emoji: "📸", label: "Photo", category: "photographie", color: "from-indigo-400 to-indigo-500" },
];

// Positions for floating icons (percentage based) - more centered
const iconPositions = [
  { top: "12%", left: "15%", delay: 0 },
  { top: "8%", right: "25%", delay: 0.2 },
  { top: "30%", left: "8%", delay: 0.4 },
  { top: "50%", right: "18%", delay: 0.6 },
  { top: "75%", left: "20%", delay: 0.8 },
  { top: "22%", right: "35%", delay: 1 },
  { top: "60%", left: "25%", delay: 1.2 },
  { top: "42%", right: "28%", delay: 1.4 },
];

// Floating Service Icon Component
function FloatingServiceIcon({
  service,
  position,
  onClick,
}: {
  service: typeof floatingServices[0];
  position: typeof iconPositions[0];
  onClick: () => void;
}) {
  // Random animation values for unique movement
  const floatDuration = 3 + Math.random() * 2; // 3-5 seconds
  const floatDistance = 8 + Math.random() * 8; // 8-16 pixels
  const rotateAmount = 3 + Math.random() * 4; // 3-7 degrees

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -floatDistance, 0],
        rotate: [-rotateAmount, rotateAmount, -rotateAmount],
      }}
      transition={{
        opacity: { duration: 0.5, delay: position.delay },
        scale: { duration: 0.5, delay: position.delay, type: "spring", stiffness: 200 },
        y: { duration: floatDuration, repeat: Infinity, ease: "easeInOut", delay: position.delay },
        rotate: { duration: floatDuration * 1.5, repeat: Infinity, ease: "easeInOut", delay: position.delay },
      }}
      whileHover={{
        scale: 1.15,
        rotate: 0,
      }}
      whileTap={{ scale: 0.95 }}
      className={`absolute z-20 group cursor-pointer pointer-events-auto`}
      style={{
        top: position.top,
        left: position.left,
        right: position.right,
      }}
    >
      {/* Pulse/ripple effect on hover */}
      <span className="absolute inset-0 rounded-full bg-white/30 scale-0 group-hover:scale-150 opacity-100 group-hover:opacity-0 transition-all duration-500 ease-out" />

      <div className={`relative flex items-center gap-2 px-3 py-2 bg-gradient-to-r ${service.color} rounded-full shadow-lg backdrop-blur-sm border border-white/20 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-black/20`}>
        <span className="text-xl md:text-2xl">{service.emoji}</span>
        <span className="text-xs md:text-sm font-medium text-white opacity-0 max-w-0 group-hover:opacity-100 group-hover:max-w-[80px] overflow-hidden transition-all duration-300 whitespace-nowrap">
          {service.label}
        </span>
      </div>
    </motion.button>
  );
}

// Flip Words Component - inspiré de Aceternity UI
const flipWords = ["compagnons", "petits amours", "fidèles amis", "trésors"];

function FlipWords() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % flipWords.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={flipWords[currentIndex]}
        initial={{ opacity: 0, y: 20, rotateX: -90, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -20, rotateX: 90, filter: "blur(8px)" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="inline-block bg-gradient-to-r from-primary via-pink-500 to-secondary bg-clip-text text-transparent"
      >
        {flipWords[currentIndex]}
      </motion.span>
    </AnimatePresence>
  );
}

// Text Generate Effect - inspiré de Aceternity UI
function TextGenerateEffect({ words }: { words: string }) {
  const wordsArray = words.split(" ");

  return (
    <span className="inline">
      {wordsArray.map((word, idx) => (
        <motion.span
          key={word + idx}
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{
            duration: 0.4,
            delay: idx * 0.15,
            ease: "easeOut",
          }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

export function HeroSection() {
  const router = useRouter();

  return (
    <section className="relative min-h-[calc(100vh-7rem)] lg:min-h-[calc(100vh-4rem)] bg-background overflow-hidden flex flex-col">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />

      {/* Decorative blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

      {/* Floating Service Icons - hidden on mobile */}
      <div className="hidden md:block z-20 pointer-events-none">
        {floatingServices.map((service, index) => (
          <FloatingServiceIcon
            key={service.id}
            service={service}
            position={iconPositions[index]}
            onClick={() => router.push(`/recherche?category=${service.category}`)}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 pt-8 relative z-10 flex-1 flex items-center pointer-events-none">
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

            {/* Main title with Love Taking font - animated */}
            <h1 className="font-love-taking text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-foreground mb-6 leading-tight">
              <span className="block">
                <TextGenerateEffect words="Prenez soin de vos" />
              </span>
              <span className="block whitespace-nowrap">
                <FlipWords />
              </span>
            </h1>

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
                className="group flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-primary/90 text-white font-semibold rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all hover:scale-105 pointer-events-auto"
              >
                <Home className="w-4 h-4" />
                <span>Rechercher une garde</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => router.push("/recherche?mode=services")}
                className="group flex items-center justify-center gap-2 px-6 py-3 bg-white text-foreground font-semibold rounded-full shadow-lg border-2 border-foreground/10 hover:border-secondary hover:shadow-xl transition-all hover:scale-105 pointer-events-auto"
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
