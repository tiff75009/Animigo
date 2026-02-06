"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  ScanFace,
  BadgeCheck,
  CreditCard,
  Star,
  Lock,
  ArrowRight,
} from "lucide-react";

const verificationSteps = [
  {
    icon: ShieldCheck,
    title: "Pièce d'identité",
    description: "Chaque pet-sitter soumet sa CNI recto/verso pour vérification",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: ScanFace,
    title: "Reconnaissance faciale",
    description: "Un selfie avec code unique est analysé par notre IA pour confirmer l'identité",
    color: "text-secondary",
    bg: "bg-secondary/10",
  },
  {
    icon: BadgeCheck,
    title: "Badge vérifié",
    description: "Le badge apparaît sur le profil pour une confiance immédiate",
    color: "text-purple",
    bg: "bg-purple/10",
  },
];

const trustPillars = [
  {
    icon: ShieldCheck,
    title: "Identité vérifiée par IA",
    description:
      "Notre système de vérification automatique analyse la pièce d'identité et compare le visage par intelligence artificielle. Chaque annonceur vérifié affiche un badge de confiance.",
    stat: "100%",
    statLabel: "vérifiés par IA",
  },
  {
    icon: Star,
    title: "Avis certifiés",
    description:
      "Seuls les clients ayant effectué une réservation peuvent laisser un avis. Impossible de tricher : chaque note est liée à une mission réelle.",
    stat: "4.9/5",
    statLabel: "note moyenne",
  },
  {
    icon: CreditCard,
    title: "Paiement 100% sécurisé",
    description:
      "Le paiement est bloqué jusqu'à la fin de la prestation. En cas de problème, vous êtes remboursé. Transactions gérées par Stripe.",
    stat: "0€",
    statLabel: "de risque",
  },
];

export function TrustSection() {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background subtil */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-white" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Lock className="w-4 h-4" />
            Sécurité & confiance
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Vos animaux entre de{" "}
            <span className="text-secondary">bonnes mains</span>
          </h2>
          <p className="text-text-light text-lg max-w-2xl mx-auto">
            Chaque pet-sitter passe par un processus de vérification rigoureux
            avant de pouvoir proposer ses services.
          </p>
        </motion.div>

        {/* Processus de vérification - timeline horizontale */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="mb-20"
        >
          <div className="relative">
            {/* Ligne de connexion desktop */}
            <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-0.5">
              <div className="h-full bg-gradient-to-r from-primary via-secondary to-purple rounded-full" />
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {verificationSteps.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="text-center relative"
                >
                  <div
                    className={`relative z-10 w-24 h-24 rounded-3xl ${step.bg} flex items-center justify-center mx-auto mb-5 shadow-sm`}
                  >
                    <step.icon className={`w-10 h-10 ${step.color}`} />
                  </div>

                  {/* Flèche entre les étapes (mobile) */}
                  {i < verificationSteps.length - 1 && (
                    <div className="md:hidden flex justify-center my-2">
                      <ArrowRight className="w-5 h-5 text-gray-300 rotate-90" />
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-text-light leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* 3 piliers de confiance */}
        <div className="grid md:grid-cols-3 gap-6">
          {trustPillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-background rounded-2xl p-6 border border-gray-100"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <pillar.icon className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{pillar.title}</h3>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-extrabold text-secondary">
                      {pillar.stat}
                    </span>
                    <span className="text-xs text-text-light">
                      {pillar.statLabel}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-text-light leading-relaxed">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Mention RGPD / CNIL */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <div className="inline-flex items-center gap-2 text-xs text-text-light bg-gray-50 rounded-full px-4 py-2">
            <Lock className="w-3.5 h-3.5" />
            Données protégées conformément au RGPD et aux directives de la CNIL. Aucune donnée personnelle n&apos;est utilisée à des fins commerciales.
          </div>
        </motion.div>
      </div>
    </section>
  );
}
