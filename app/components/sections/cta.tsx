"use client";

import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { ArrowRight, Heart } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background with gradient and pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-purple">
        {/* Paw pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='8'/%3E%3Ccircle cx='40' cy='12' r='6'/%3E%3Ccircle cx='50' cy='25' r='6'/%3E%3Ccircle cx='12' cy='35' r='6'/%3E%3Cellipse cx='30' cy='40' rx='12' ry='14'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '80px 80px',
          }} />
        </div>
      </div>

      {/* Floating elements */}
      <motion.div
        className="absolute top-10 left-10 text-6xl opacity-20"
        animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
      >
        🐕
      </motion.div>
      <motion.div
        className="absolute bottom-10 right-10 text-6xl opacity-20"
        animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
      >
        🐈
      </motion.div>
      <motion.div
        className="absolute top-1/2 right-20 text-5xl opacity-20 hidden lg:block"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        🐰
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Icon */}
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block"
          >
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto">
              <Heart className="w-10 h-10 text-white fill-white" />
            </div>
          </motion.div>

          {/* Title */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Prêt à rejoindre l&apos;aventure ?
          </h2>

          {/* Subtitle */}
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Inscrivez-vous gratuitement en 2 minutes et rejoignez la plus grande
            communauté de garde d&apos;animaux en France.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 shadow-xl group"
              >
                Je cherche un garde
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-primary"
              >
                Je deviens garde
              </Button>
            </motion.div>
          </div>

          {/* Trust note */}
          <p className="text-white/70 text-sm pt-4">
            ✓ Inscription gratuite &nbsp; ✓ Sans engagement &nbsp; ✓ Support 7j/7
          </p>
        </motion.div>
      </div>
    </section>
  );
}
