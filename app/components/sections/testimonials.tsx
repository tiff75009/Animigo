"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Card } from "../ui/card";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Marie Dupont",
    animal: "Luna (Labrador)",
    avatar: "👩‍🦰",
    animalEmoji: "🐕",
    rating: 5,
    text: "Sophie a gardé Luna pendant 2 semaines. Elle m'envoyait des photos tous les jours et Luna était tellement heureuse ! Je recommande à 100%.",
  },
  {
    id: 2,
    name: "Thomas Martin",
    animal: "Mochi (Chat Persan)",
    avatar: "👨",
    animalEmoji: "🐈",
    rating: 5,
    text: "Première fois que je confie Mochi et j'étais stressé. Paul a été super patient et professionnel. Mon chat s'est senti comme à la maison.",
  },
  {
    id: 3,
    name: "Léa Bernard",
    animal: "Caramel (Lapin)",
    avatar: "👩",
    animalEmoji: "🐰",
    rating: 5,
    text: "Pas facile de trouver quelqu'un pour un lapin ! Claire connaît bien les NAC et Caramel a adoré son séjour. Merci Animigo !",
  },
  {
    id: 4,
    name: "Lucas Petit",
    animal: "Rocky & Max (Bergers)",
    avatar: "👨‍🦱",
    animalEmoji: "🐕",
    rating: 5,
    text: "Avoir 2 gros chiens à faire garder, ce n'est pas simple. Julie les a emmenés en randonnée tous les jours, ils étaient ravis !",
  },
  {
    id: 5,
    name: "Emma Rousseau",
    animal: "Kiwi (Perruche)",
    avatar: "👩‍🦳",
    animalEmoji: "🦜",
    rating: 5,
    text: "Marc a l'habitude des oiseaux et ça se voit. Kiwi chantait quand je suis revenue le chercher. Service impeccable !",
  },
];

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section id="testimonials" className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 text-8xl opacity-5">❤️</div>
        <div className="absolute bottom-20 right-10 text-8xl opacity-5">⭐</div>
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
          <span className="text-4xl mb-4 block">💬</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Ils nous font <span className="text-primary">confiance</span>
          </h2>
          <p className="text-text-light text-lg max-w-2xl mx-auto">
            Des milliers de propriétaires heureux partagent leur expérience.
          </p>
        </motion.div>

        {/* Testimonials Carousel */}
        <div className="relative max-w-4xl mx-auto">
          {/* Main testimonial */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Card hover={false} className="p-8 md:p-12 relative">
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 w-12 h-12 text-primary/20" />

              {/* Rating */}
              <div className="flex gap-1 mb-6">
                {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-6 h-6 fill-accent text-accent"
                  />
                ))}
              </div>

              {/* Text */}
              <p className="text-xl md:text-2xl text-foreground mb-8 leading-relaxed">
                &ldquo;{testimonials[currentIndex].text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-3xl">
                  {testimonials[currentIndex].avatar}
                </div>
                <div>
                  <div className="font-bold text-lg text-foreground">
                    {testimonials[currentIndex].name}
                  </div>
                  <div className="text-text-light flex items-center gap-2">
                    <span>{testimonials[currentIndex].animalEmoji}</span>
                    {testimonials[currentIndex].animal}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={prevTestimonial}
              className="w-12 h-12 bg-card rounded-full flex items-center justify-center shadow-lg hover:bg-primary hover:text-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-primary w-8"
                      : "bg-foreground/20 hover:bg-foreground/40"
                  }`}
                />
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={nextTestimonial}
              className="w-12 h-12 bg-card rounded-full flex items-center justify-center shadow-lg hover:bg-primary hover:text-white transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
