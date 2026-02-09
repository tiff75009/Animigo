"use client";

import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import { useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PawPrint, ShieldCheck, MapPin, Star } from "lucide-react";

function AnimatedNumber({ value, isDecimal = false }: { value: number; isDecimal?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 2000 });
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, motionValue, value]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        if (isDecimal) {
          ref.current.textContent = latest.toFixed(1);
        } else {
          ref.current.textContent = Math.floor(latest).toLocaleString("fr-FR");
        }
      }
    });
    return unsubscribe;
  }, [springValue, isDecimal]);

  return <span ref={ref}>0</span>;
}

const statsData = [
  {
    value: 10000,
    suffix: "+",
    label: "Animaux heureux",
    icon: PawPrint,
    gradient: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
    valueColor: "text-primary",
  },
  {
    value: 2500,
    suffix: "+",
    label: "Gardes vérifiés",
    icon: ShieldCheck,
    gradient: "from-secondary/20 to-secondary/5",
    iconColor: "text-secondary",
    valueColor: "text-secondary",
  },
  {
    value: 50,
    suffix: "+",
    label: "Villes couvertes",
    icon: MapPin,
    gradient: "from-purple-500/20 to-purple-500/5",
    iconColor: "text-purple-500",
    valueColor: "text-purple-500",
  },
  {
    value: 4.9,
    suffix: "/5",
    label: "Note moyenne",
    icon: Star,
    gradient: "from-amber-400/20 to-amber-400/5",
    iconColor: "text-amber-500",
    valueColor: "text-amber-500",
    isDecimal: true,
  },
];

export function Stats() {
  const siteName = useQuery(api.admin.config.getSiteName) ?? "Animigo";

  return (
    <section className="py-24 bg-card relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-love-taking text-4xl sm:text-5xl md:text-6xl text-foreground mb-4">
            La communaute <span className="text-secondary">{siteName}</span>
          </h2>
          <p className="text-text-light text-lg max-w-2xl mx-auto">
            Rejoignez des milliers de propriétaires et gardes satisfaits.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="relative bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
                >
                  {/* Gradient background subtil */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} rounded-2xl opacity-60`} />

                  <div className="relative z-10">
                    {/* Icône */}
                    <div className={`w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-4 ${stat.iconColor}`}>
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Valeur */}
                    <div className={`text-3xl md:text-4xl font-bold ${stat.valueColor} mb-1`}>
                      <AnimatedNumber value={stat.value} isDecimal={stat.isDecimal} />
                      {stat.suffix}
                    </div>

                    {/* Label */}
                    <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
