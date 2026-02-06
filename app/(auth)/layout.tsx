"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  TrendingUp,
  CalendarCheck,
  Eye,
  Zap,
  Heart,
  Clock,
  Users,
  Star,
  Search,
  MessageCircle,
  CreditCard,
  PawPrint,
  BadgeCheck,
} from "lucide-react";
import { AuthRedirect } from "@/app/components/auth-redirect";

type PanelVariant = "pro" | "particulier" | "utilisateur" | "connexion" | "default";

interface Advantage {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

interface PanelContent {
  title: string;
  subtitle: string;
  advantages: Advantage[];
  testimonial: Testimonial;
  badge?: string;
  gradient: string;
}

const panelContents: Record<Exclude<PanelVariant, "connexion">, PanelContent> = {
  pro: {
    title: "Développez votre activité",
    subtitle: "Rejoignez +2 000 pet-sitters qui développent leur activité grâce à Animigo",
    gradient: "from-primary via-secondary to-purple",
    badge: "100% gratuit, sans commission cachée",
    advantages: [
      {
        icon: ShieldCheck,
        title: "Paiement garanti",
        description: "Recevez vos paiements automatiquement chaque mois via Stripe",
      },
      {
        icon: Eye,
        title: "Visibilité immédiate",
        description: "Soyez trouvé par des milliers de propriétaires près de chez vous",
      },
      {
        icon: CalendarCheck,
        title: "Gestion simplifiée",
        description: "Planning, messagerie, facturation : tout est inclus gratuitement",
      },
      {
        icon: Zap,
        title: "Sans engagement",
        description: "Inscription gratuite, sans exclusivité. Vous restez libre",
      },
    ],
    testimonial: {
      quote: "Depuis que je suis sur Animigo, j\u2019ai doubl\u00e9 ma client\u00e8le. Les paiements tombent automatiquement et je peux me concentrer sur ce que j\u2019aime : m\u2019occuper des animaux.",
      name: "Sophie M.",
      role: "Pet-sitter professionnelle, Lyon",
    },
  },
  particulier: {
    title: "Gagnez un revenu extra",
    subtitle: "Transformez votre passion pour les animaux en activité complémentaire",
    gradient: "from-secondary via-primary/80 to-purple",
    badge: "Flexible et sans engagement",
    advantages: [
      {
        icon: Clock,
        title: "Horaires flexibles",
        description: "Choisissez quand vous êtes disponible, gardez le contrôle de votre emploi du temps",
      },
      {
        icon: CreditCard,
        title: "Paiement sécurisé",
        description: "Recevez vos paiements directement sur votre compte bancaire",
      },
      {
        icon: Users,
        title: "Communauté bienveillante",
        description: "Rejoignez une communauté de passionnés d\u2019animaux près de chez vous",
      },
      {
        icon: Zap,
        title: "Démarrez facilement",
        description: "Inscription en 2 minutes, sans diplôme ni SIRET nécessaire",
      },
    ],
    testimonial: {
      quote: "Je garde des chiens le week-end et après mes cours. C\u2019est un excellent compl\u00e9ment de revenu et je fais ce que j\u2019adore !",
      name: "Lucas T.",
      role: "Étudiant et pet-sitter, Bordeaux",
    },
  },
  utilisateur: {
    title: "Trouvez le gardien idéal",
    subtitle: "Des milliers de pet-sitters vérifiés à deux pas de chez vous",
    gradient: "from-purple via-primary to-secondary",
    badge: "Paiement 100% sécurisé",
    advantages: [
      {
        icon: BadgeCheck,
        title: "Gardiens vérifiés",
        description: "Tous nos pet-sitters sont vérifiés : identité, avis et compétences validés",
      },
      {
        icon: Star,
        title: "Avis certifiés",
        description: "Consultez les avis de vrais propriétaires pour choisir en toute confiance",
      },
      {
        icon: ShieldCheck,
        title: "Paiement protégé",
        description: "Ne payez qu\u2019après la prestation. Remboursement garanti en cas de problème",
      },
      {
        icon: MessageCircle,
        title: "Messagerie directe",
        description: "Échangez avec votre pet-sitter avant, pendant et après la garde",
      },
    ],
    testimonial: {
      quote: "J\u2019ai trouv\u00e9 une pet-sitter formidable pour mon chat en 10 minutes. Elle m\u2019envoie des photos tous les jours, je pars en vacances l\u2019esprit tranquille !",
      name: "Marie D.",
      role: "Propriétaire de Moustache, Paris",
    },
  },
  default: {
    title: "Rejoignez Animigo",
    subtitle: "La première plateforme de garde d\u2019animaux en France",
    gradient: "from-primary via-secondary to-purple",
    advantages: [
      {
        icon: PawPrint,
        title: "Tous les animaux",
        description: "Chiens, chats, rongeurs, oiseaux... tous les compagnons sont les bienvenus",
      },
      {
        icon: Search,
        title: "Trouvez facilement",
        description: "Recherchez par localisation, type de service et disponibilités",
      },
      {
        icon: ShieldCheck,
        title: "100% sécurisé",
        description: "Paiements protégés, pet-sitters vérifiés, support 7j/7",
      },
      {
        icon: Zap,
        title: "Gratuit",
        description: "Inscription gratuite pour tous, sans engagement ni frais cachés",
      },
    ],
    testimonial: {
      quote: "Animigo a chang\u00e9 notre quotidien ! Que ce soit pour la garde ou les promenades, on trouve toujours quelqu\u2019un de confiance.",
      name: "Julie & Thomas",
      role: "Propriétaires de Max (berger australien)",
    },
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInscription = pathname === "/inscription";

  // Déterminer la variante du panneau gauche
  let variant: PanelVariant = "connexion";
  if (isInscription) {
    const typeParam = searchParams.get("type");
    if (typeParam === "annonceur_pro") variant = "pro";
    else if (typeParam === "annonceur_particulier") variant = "particulier";
    else if (typeParam === "utilisateur") variant = "utilisateur";
    else variant = "default";
  }

  const isConnexion = variant === "connexion";
  const content = !isConnexion ? panelContents[variant] : null;

  return (
    <AuthRedirect>
    <div className="min-h-screen bg-background flex">
      {/* Panneau gauche - Décoratif */}
      <div className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br ${isConnexion ? "from-primary via-secondary to-purple" : content!.gradient} relative overflow-hidden`}>
        {/* Blobs décoratifs */}
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.2, 0.4] }}
          transition={{ duration: 7, repeat: Infinity }}
        />

        {/* Contenu */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center w-full max-w-lg"
          >
            <Link href="/" className="inline-block mb-8">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🐾</span>
                </div>
                <span className="text-3xl font-extrabold">Animigo</span>
              </div>
            </Link>

            {isConnexion ? (
              <>
                <h1 className="text-4xl font-bold mb-4">
                  Bienvenue dans la famille !
                </h1>
                <p className="text-xl text-white/80 max-w-md">
                  Rejoignez des milliers de passionnés d&apos;animaux sur la
                  première plateforme de garde en France
                </p>

                {/* Stats */}
                <div className="mt-12 flex justify-center gap-8">
                  {[
                    { value: "15K+", label: "Gardes" },
                    { value: "50K+", label: "Missions" },
                    { value: "4.9", label: "Note moyenne" },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="text-center"
                    >
                      <div className="text-3xl font-bold">{stat.value}</div>
                      <div className="text-sm text-white/70">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Animaux flottants */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-around pb-8">
                  {["🐕", "🐈", "🐰", "🦜"].map((emoji, i) => (
                    <motion.span
                      key={i}
                      className="text-4xl"
                      animate={{ y: [0, -15, 0] }}
                      transition={{
                        duration: 2 + i * 0.5,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h1 className="text-4xl font-bold mb-3">
                  {content!.title}
                </h1>
                <p className="text-lg text-white/80 max-w-md mx-auto">
                  {content!.subtitle}
                </p>

                {/* Avantages */}
                <div className="mt-10 space-y-4 text-left">
                  {content!.advantages.map((advantage, i) => (
                    <motion.div
                      key={advantage.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                        <advantage.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{advantage.title}</p>
                        <p className="text-xs text-white/70 mt-0.5">
                          {advantage.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Témoignage */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-left"
                >
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-300 text-sm">&#9733;</span>
                    ))}
                  </div>
                  <p className="text-sm text-white/90 italic">
                    &ldquo;{content!.testimonial.quote}&rdquo;
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Heart className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{content!.testimonial.name}</p>
                      <p className="text-xs text-white/60">{content!.testimonial.role}</p>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>

          {/* Badge en bas */}
          {!isConnexion && content!.badge && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="absolute bottom-6 left-0 right-0 text-center"
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm text-white/80">{content!.badge}</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Panneau droit - Formulaire */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
    </AuthRedirect>
  );
}
