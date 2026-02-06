"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ShieldCheck,
  CalendarCheck,
  LayoutDashboard,
  Eye,
  Users,
  Repeat,
  Zap,
  ArrowRight,
  BadgeCheck,
  CreditCard,
  MessageSquare,
  Star,
  CheckCircle2,
  Heart,
  Home,
  Footprints,
  Building,
  Car,
  Pill,
  GraduationCap,
  Bath,
  Activity,
  HandHeart,
  ChevronDown,
  Clock,
  TrendingUp,
  Sparkles,
  ScanFace,
  Lock,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Navbar } from "@/app/components/navbar";
import { Footer } from "@/app/components/footer";

// ─── Données ──────────────────────────────────────────────────

const serviceCategories = [
  { emoji: "🏠", name: "Garde", icon: Home, color: "#FF6B6B", desc: "À domicile ou chez vous" },
  { emoji: "🚶", name: "Promenade", icon: Footprints, color: "#4ECDC4", desc: "Balades adaptées" },
  { emoji: "🛁", name: "Toilettage", icon: Bath, color: "#45B7D1", desc: "Soins & hygiène" },
  { emoji: "🎓", name: "Dressage", icon: GraduationCap, color: "#96CEB4", desc: "Éducation canine" },
  { emoji: "🏃", name: "Agilité", icon: Activity, color: "#BB8FCE", desc: "Sport & activités" },
  { emoji: "🚗", name: "Transport", icon: Car, color: "#F8B500", desc: "Accompagnement" },
  { emoji: "🏨", name: "Pension", icon: Building, color: "#DDA0DD", desc: "Hébergement" },
  { emoji: "👋", name: "Visites", icon: HandHeart, color: "#58D68D", desc: "Passages à domicile" },
  { emoji: "💊", name: "Soins", icon: Pill, color: "#85C1E9", desc: "Accompagnement véto" },
];

const faqItems = [
  {
    q: "L'inscription est-elle vraiment gratuite ?",
    a: "Oui, 100% gratuite. Pas de frais d'inscription, pas d'abonnement mensuel, pas de commission sur vos prestations. Vous gardez l'intégralité de vos revenus.",
  },
  {
    q: "Comment fonctionne le paiement ?",
    a: "Les clients paient au moment de la réservation via Stripe. L'argent est sécurisé et vous est viré automatiquement le 25 de chaque mois sur votre compte bancaire.",
  },
  {
    q: "Puis-je fixer mes propres tarifs ?",
    a: "Oui, vous personnalisez vos tarifs dans une fourchette de 20% autour du prix conseillé pour chaque prestation. Cela garantit des prix justes pour tous.",
  },
  {
    q: "Faut-il un SIRET pour s'inscrire ?",
    a: "Non. Vous pouvez vous inscrire comme pet-sitter particulier sans SIRET. Si vous avez un statut professionnel (auto-entrepreneur, société), vous bénéficierez du badge vérifié et d'une priorité dans les recherches.",
  },
  {
    q: "Comment fonctionne la vérification d'identité ?",
    a: "C'est simple et rapide : vous soumettez votre CNI (recto/verso) et un selfie avec un code unique. Notre IA vérifie automatiquement votre identité en quelques secondes. Le badge \"Vérifié\" apparaît sur votre profil et booste votre visibilité dans les recherches.",
  },
  {
    q: "Mes données personnelles sont-elles protégées ?",
    a: "Absolument. Animigo respecte le RGPD et les directives de la CNIL. Vos données personnelles ne sont jamais utilisées à des fins commerciales ni partagées avec des tiers. Vos documents de vérification sont traités de manière sécurisée et ne servent qu'à confirmer votre identité.",
  },
  {
    q: "Quelle est la politique d'annulation ?",
    a: "Vous configurez vous-même vos conditions d'annulation. Par défaut, l'annulation est gratuite jusqu'à 48h avant la prestation. Pour les services multi-séances, vous choisissez le mode de remboursement.",
  },
];

// ─── Hero ─────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-foreground" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20" />

      {/* Pattern subtil */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white' fill-opacity='1'%3E%3Ccircle cx='15' cy='15' r='6'/%3E%3Ccircle cx='30' cy='9' r='4.5'/%3E%3Ccircle cx='37' cy='19' r='4.5'/%3E%3Ccircle cx='9' cy='26' r='4.5'/%3E%3Cellipse cx='22' cy='30' rx='9' ry='10.5'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Texte */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-white"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/80">+2 000 pet-sitters nous font confiance</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] mb-6">
              Votre talent mérite
              <br />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                0% de commission
              </span>
            </h1>

            <p className="text-lg text-white/70 max-w-lg mb-8 leading-relaxed">
              Proposez vos services de garde, promenade, toilettage et plus
              encore. Paiement garanti via Stripe, planning intelligent, tableau
              de bord complet.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/inscription?type=annonceur_pro">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 group text-base px-7 w-full sm:w-auto"
                >
                  <BadgeCheck className="w-5 h-5 mr-2" />
                  Inscription pro
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/inscription?type=annonceur_particulier">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 text-base px-7 w-full sm:w-auto"
                >
                  Inscription particulier
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-white/50">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Gratuit
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Sans engagement
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                2 min
              </span>
            </div>
          </motion.div>

          {/* Bloc visuel - carte de revenus */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Carte principale */}
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Vos revenus mensuels</p>
                    <p className="text-white text-2xl font-bold">100% pour vous</p>
                  </div>
                </div>

                {/* Barres de revenus */}
                <div className="space-y-4">
                  {[
                    { label: "Garde à domicile", amount: "450€", width: "85%", color: "bg-primary" },
                    { label: "Promenades", amount: "280€", width: "55%", color: "bg-secondary" },
                    { label: "Toilettage", amount: "320€", width: "65%", color: "bg-purple-400" },
                    { label: "Dressage", amount: "180€", width: "35%", color: "bg-amber-400" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-white/70">{item.label}</span>
                        <span className="text-white font-semibold">{item.amount}</span>
                      </div>
                      <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: item.width }}
                          transition={{ duration: 1, delay: 0.8 }}
                          className={`h-full ${item.color} rounded-full`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-white/10 flex justify-between items-center">
                  <span className="text-white/60">Total mensuel</span>
                  <span className="text-3xl font-bold text-white">1 230€</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 justify-end">
                  <Zap className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs text-green-400">Commission : 0€</span>
                </div>
              </div>

              {/* Badge flottant */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl px-5 py-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Prochain virement</p>
                  <p className="text-sm font-bold text-foreground">Le 25 du mois</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Bandeau de confiance ─────────────────────────────────────

function TrustBar() {
  const items = [
    { icon: ShieldCheck, text: "Paiement Stripe sécurisé" },
    { icon: Zap, text: "0% de commission" },
    { icon: Lock, text: "Conforme RGPD & CNIL" },
    { icon: Star, text: "4.9/5 de satisfaction" },
  ];

  return (
    <section className="border-b border-gray-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100">
          {items.map((item) => (
            <div
              key={item.text}
              className="flex items-center justify-center gap-2.5 py-5"
            >
              <item.icon className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-foreground">
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Services proposés ────────────────────────────────────────

function ServicesSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-2xl mb-16"
        >
          <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">
            9 catégories disponibles
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Proposez les services qui vous ressemblent
          </h2>
          <p className="text-lg text-text-light">
            Choisissez vos prestations, définissez vos tarifs dans la fourchette
            conseillée, et commencez à recevoir des réservations.
          </p>
        </motion.div>

        {/* Grille de services */}
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-9 gap-4">
          {serviceCategories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: i * 0.04 }}
              className="group"
            >
              <div className="relative flex flex-col items-center gap-3 p-5 rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 bg-white">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300"
                  style={{ backgroundColor: `${cat.color}12` }}
                >
                  {cat.emoji}
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-foreground">
                    {cat.name}
                  </p>
                  <p className="text-[11px] text-text-light mt-0.5 hidden sm:block">
                    {cat.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Individuel + Collectif */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 grid sm:grid-cols-2 gap-4"
        >
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Repeat className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Services individuels</p>
              <p className="text-sm text-text-light">
                Séance unique ou packs multi-séances avec suivi automatique
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-secondary/5 border border-secondary/10">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Services collectifs</p>
              <p className="text-sm text-text-light">
                Séances de groupe avec places configurables et créneaux récurrents
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Bloc "0% commission" ─────────────────────────────────────

function ZeroCommissionSection() {
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-foreground to-foreground/95" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Gauche : gros chiffre */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center lg:text-left"
          >
            <div className="inline-block">
              <span className="text-[8rem] sm:text-[10rem] lg:text-[12rem] font-extrabold leading-none bg-gradient-to-br from-primary via-secondary to-primary bg-clip-text text-transparent">
                0%
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white -mt-4">
              de commission. Jamais.
            </p>
          </motion.div>

          {/* Droite : comparaison */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="space-y-5"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <p className="text-white/60 text-sm mb-4 uppercase tracking-wider font-medium">
                Comparaison sur 1 000€ de prestations
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <span className="text-white/70">Autres plateformes</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white line-through opacity-50">1 000€</span>
                    <span className="text-red-400 font-bold ml-3">800€</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-white font-medium">Animigo</span>
                  </div>
                  <div className="text-right">
                    <span className="text-green-400 font-bold text-xl">1 000€</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-white/10">
                <p className="text-sm text-white/50">
                  Soit <span className="text-green-400 font-bold">200€ de plus</span> dans votre poche chaque mois
                </p>
              </div>
            </div>

            <p className="text-sm text-white/40 leading-relaxed">
              Pas de frais d&apos;inscription, pas d&apos;abonnement, pas de commission.
              Nous gagnons uniquement via les frais de service facturés aux clients.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Fonctionnalités (alternées) ──────────────────────────────

const features = [
  {
    tag: "Planning",
    title: "Un planning qui travaille pour vous",
    description:
      "Définissez vos disponibilités, créneaux récurrents et jours de repos. Les clients ne voient que les créneaux ouverts et réservent en un clic.",
    points: [
      "Vue semaine, mois et liste",
      "Créneaux récurrents automatiques",
      "Synchronisation avec votre agenda",
    ],
    icon: CalendarCheck,
    color: "primary",
  },
  {
    tag: "Tableau de bord",
    title: "Tout piloter depuis un seul endroit",
    description:
      "Revenus, missions en cours, avis clients, statistiques de profil : votre activité résumée en un coup d'oeil.",
    points: [
      "Suivi des revenus en temps réel",
      "Historique complet des missions",
      "Statistiques de performance",
    ],
    icon: LayoutDashboard,
    color: "secondary",
  },
  {
    tag: "Paiements",
    title: "Paiement garanti, zéro effort",
    description:
      "Les clients paient au moment de la réservation. Votre argent est sécurisé et viré automatiquement le 25 de chaque mois.",
    points: [
      "Paiement Stripe sécurisé",
      "Virement automatique mensuel",
      "Historique et factures téléchargeables",
    ],
    icon: CreditCard,
    color: "primary",
  },
];

function FeaturesSection() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="max-w-2xl mb-20"
        >
          <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">
            Fonctionnalités
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Des outils pensés pour votre quotidien
          </h2>
        </motion.div>

        <div className="space-y-24">
          {features.map((feature, i) => {
            const isReversed = i % 2 !== 0;
            return (
              <motion.div
                key={feature.tag}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${isReversed ? "lg:direction-rtl" : ""}`}
              >
                {/* Texte */}
                <div className={isReversed ? "lg:order-2" : ""}>
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4 ${
                      feature.color === "primary"
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary/10 text-secondary"
                    }`}
                  >
                    <feature.icon className="w-3.5 h-3.5" />
                    {feature.tag}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-text-light leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  <ul className="space-y-3">
                    {feature.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-center gap-3 text-sm text-foreground"
                      >
                        <CheckCircle2
                          className={`w-5 h-5 flex-shrink-0 ${
                            feature.color === "primary"
                              ? "text-primary"
                              : "text-secondary"
                          }`}
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visuel */}
                <div className={isReversed ? "lg:order-1" : ""}>
                  <div
                    className={`rounded-3xl p-8 sm:p-10 ${
                      feature.color === "primary"
                        ? "bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10"
                        : "bg-gradient-to-br from-secondary/5 to-secondary/10 border border-secondary/10"
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-24 h-24 rounded-3xl flex items-center justify-center ${
                          feature.color === "primary"
                            ? "bg-primary/15"
                            : "bg-secondary/15"
                        }`}
                      >
                        <feature.icon
                          className={`w-12 h-12 ${
                            feature.color === "primary"
                              ? "text-primary"
                              : "text-secondary"
                          }`}
                        />
                      </div>
                    </div>
                    {/* Mini-stats mockup */}
                    <div className="mt-8 grid grid-cols-3 gap-3">
                      {(feature.tag === "Planning"
                        ? [
                            { label: "Cette semaine", value: "12", sub: "réservations" },
                            { label: "Disponibilité", value: "85%", sub: "des créneaux" },
                            { label: "Récurrent", value: "8", sub: "créneaux/sem" },
                          ]
                        : feature.tag === "Tableau de bord"
                          ? [
                              { label: "Ce mois", value: "1 230€", sub: "de revenus" },
                              { label: "Missions", value: "18", sub: "terminées" },
                              { label: "Avis", value: "4.9", sub: "★ moyenne" },
                            ]
                          : [
                              { label: "Encaissé", value: "1 230€", sub: "ce mois" },
                              { label: "Prochain", value: "25/02", sub: "virement" },
                              { label: "Commission", value: "0€", sub: "toujours" },
                            ]
                      ).map((stat) => (
                        <div
                          key={stat.label}
                          className="bg-white rounded-xl p-3 text-center shadow-sm"
                        >
                          <p className="text-lg font-bold text-foreground">
                            {stat.value}
                          </p>
                          <p className="text-[10px] text-text-light mt-0.5">
                            {stat.sub}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Badge vérifié ───────────────────────────────────────────

function VerificationSection() {
  const steps = [
    {
      num: "1",
      title: "Soumettez votre CNI",
      desc: "Prenez en photo le recto et le verso de votre pièce d'identité. Protégez-la avec le service gouvernemental Filigrane Facile.",
      icon: ShieldCheck,
      color: "primary",
    },
    {
      num: "2",
      title: "Selfie avec code unique",
      desc: "Prenez un selfie en tenant une feuille avec votre code de vérification. Notre IA compare votre visage avec votre pièce d'identité.",
      icon: ScanFace,
      color: "secondary",
    },
    {
      num: "3",
      title: "Badge automatique",
      desc: "Si tout est conforme, votre badge \"Identité vérifiée\" apparaît en quelques secondes sur votre profil. Sinon, un admin vérifie manuellement.",
      icon: BadgeCheck,
      color: "primary",
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Texte */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-4 bg-green-50 text-green-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              Confiance
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Obtenez votre badge{" "}
              <span className="text-secondary">&ldquo;Vérifié&rdquo;</span>
            </h2>
            <p className="text-text-light leading-relaxed mb-8">
              Les propriétaires font davantage confiance aux pet-sitters vérifiés.
              Notre système de vérification par IA est rapide, sécurisé et gratuit.
              Boostez votre visibilité et vos réservations.
            </p>

            {/* Avantages du badge */}
            <div className="space-y-3">
              {[
                "Priorité dans les résultats de recherche",
                "Badge visible sur votre profil et vos cartes",
                "Confiance accrue des propriétaires",
                "Vérification gratuite en moins de 30 secondes",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-3 text-sm text-foreground">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>

            {/* Mention RGPD/CNIL */}
            <div className="mt-6 flex items-start gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <Lock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text-light leading-relaxed">
                <span className="font-semibold text-foreground">Vie privée respectée.</span>{" "}
                Vos données personnelles ne sont jamais utilisées à des fins commerciales
                ni partagées avec des tiers. Conforme RGPD et directives CNIL.
              </p>
            </div>
          </motion.div>

          {/* Étapes visuelles */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="space-y-5"
          >
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex items-start gap-4 bg-background rounded-2xl p-5 border border-gray-100"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    step.color === "primary" ? "bg-primary/10" : "bg-secondary/10"
                  }`}
                >
                  <step.icon
                    className={`w-6 h-6 ${
                      step.color === "primary" ? "text-primary" : "text-secondary"
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-text-light">
                      ÉTAPE {step.num}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground mb-1">{step.title}</h3>
                  <p className="text-sm text-text-light leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Badge mockup */}
            <div className="flex justify-center pt-2">
              <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary rounded-full px-5 py-2.5 font-semibold text-sm">
                <BadgeCheck className="w-5 h-5" />
                Identité vérifiée
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Comment ça marche ────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Créez votre profil",
      desc: "Inscrivez-vous, ajoutez vos services et définissez vos disponibilités.",
      icon: Sparkles,
    },
    {
      num: "02",
      title: "Recevez des réservations",
      desc: "Les propriétaires vous trouvent et réservent directement en ligne.",
      icon: Eye,
    },
    {
      num: "03",
      title: "Soyez payé automatiquement",
      desc: "Le paiement est sécurisé dès la réservation et viré le 25 du mois.",
      icon: CreditCard,
    },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">
            Commencez aujourd&apos;hui
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            En 3 étapes simples
          </h2>
        </motion.div>

        <div className="relative">
          {/* Ligne de connexion (desktop) */}
          <div className="hidden md:block absolute top-14 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-primary via-secondary to-purple-500" />

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center relative"
              >
                <div className="relative z-10 w-14 h-14 rounded-2xl bg-white border-2 border-primary flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">
                  Étape {step.num}
                </span>
                <h3 className="text-lg font-bold text-foreground mt-2 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-text-light leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 text-center"
        >
          <Link href="/inscription?type=annonceur_pro">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white group text-base px-8"
            >
              Commencer maintenant
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Témoignages ──────────────────────────────────────────────

function Testimonials() {
  const items = [
    {
      text: "Depuis que je suis sur Animigo, j'ai doublé ma clientèle en 3 mois. Le planning est super intuitif et les paiements arrivent automatiquement.",
      name: "Sophie M.",
      role: "Pet-sitter pro, Lyon",
    },
    {
      text: "Enfin une plateforme sans commission ! Je garde 100% de ce que je gagne. Le tableau de bord est top pour suivre mon activité.",
      name: "Thomas R.",
      role: "Éducateur canin, Bordeaux",
    },
    {
      text: "J'adore le système de séances collectives. Je remplis mes cours d'agilité facilement et les inscriptions se font toutes seules.",
      name: "Marine L.",
      role: "Pet-sitter particulière, Nantes",
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-14"
        >
          <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">
            Témoignages
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Ils ont rejoint Animigo
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
            >
              <div className="flex items-center gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    className="w-4 h-4 text-yellow-400 fill-yellow-400"
                  />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-5">
                &ldquo;{item.text}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">
                    {item.name}
                  </p>
                  <p className="text-xs text-text-light">{item.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left"
      >
        <span className="font-semibold text-foreground pr-4">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-text-light flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-sm text-text-light leading-relaxed">{a}</p>
      </motion.div>
    </div>
  );
}

function FAQ() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-12"
        >
          <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Questions fréquentes
          </h2>
        </motion.div>

        <div className="bg-background rounded-2xl p-6 sm:p-8">
          {faqItems.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Final ────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-foreground" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="space-y-8"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Prêt à développer
            <br />
            votre activité ?
          </h2>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            Rejoignez +2 000 pet-sitters qui ont choisi Animigo. Créez votre
            profil en 2 minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/inscription?type=annonceur_pro">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 group text-base px-8"
              >
                <BadgeCheck className="w-5 h-5 mr-2" />
                Inscription pro
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/inscription?type=annonceur_particulier">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 text-base px-8"
              >
                Inscription particulier
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/40 pt-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Gratuit
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              0% commission
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Conforme RGPD & CNIL
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function ProPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <ServicesSection />
        <ZeroCommissionSection />
        <FeaturesSection />
        <VerificationSection />
        <HowItWorks />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
