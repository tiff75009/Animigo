"use client";

import { motion } from "framer-motion";
import { steps } from "@/app/lib/constants";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-card relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 right-10 text-6xl opacity-20 hidden lg:block">🐕</div>
      <div className="absolute bottom-10 left-10 text-6xl opacity-20 hidden lg:block">🐈</div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-4xl mb-4 block">✨</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Simple comme <span className="text-secondary">bonjour</span>
          </h2>
          <p className="text-text-light text-lg max-w-2xl mx-auto">
            En quelques étapes, trouvez le garde parfait pour votre animal.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line (desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-purple -translate-y-1/2 mx-auto max-w-4xl" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 relative">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.2, duration: 0.5 }}
                className="relative"
              >
                <div className="bg-background rounded-3xl p-8 text-center relative">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="text-sm font-bold text-text-light bg-background px-4 py-1 rounded-full border border-foreground/10">
                      Étape {step.number}
                    </span>
                  </div>

                  {/* Icon Circle */}
                  <motion.div
                    className={`w-20 h-20 ${step.color} rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <step.icon className="w-10 h-10 text-white" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-foreground mb-3 flex items-center justify-center gap-2">
                    {step.title}
                    <span className="text-2xl">{step.emoji}</span>
                  </h3>
                  <p className="text-text-light">
                    {step.description}
                  </p>
                </div>

                {/* Arrow (mobile) */}
                {index < steps.length - 1 && (
                  <div className="lg:hidden flex justify-center my-4">
                    <div className="text-3xl text-text-light">↓</div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
