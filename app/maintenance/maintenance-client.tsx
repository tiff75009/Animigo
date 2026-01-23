"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Shield, Calendar, CreditCard, Loader2, Home, PartyPopper } from "lucide-react";

const floatingEmojis = [
  { emoji: "🐕", delay: 0, x: "10%", y: "20%" },
  { emoji: "🐈", delay: 0.5, x: "85%", y: "15%" },
  { emoji: "🐦", delay: 1, x: "15%", y: "70%" },
  { emoji: "🐹", delay: 1.5, x: "80%", y: "75%" },
  { emoji: "🐰", delay: 2, x: "50%", y: "85%" },
  { emoji: "🦜", delay: 0.8, x: "90%", y: "45%" },
  { emoji: "🐢", delay: 1.2, x: "5%", y: "45%" },
];

const features = [
  {
    icon: Shield,
    title: "Gardes vérifiés",
    description: "Tous nos gardiens sont vérifiés et évalués",
  },
  {
    icon: CreditCard,
    title: "Paiement sécurisé",
    description: "Vos transactions sont 100% sécurisées",
  },
  {
    icon: Calendar,
    title: "Réservation instantanée",
    description: "Trouvez un gardien en quelques clics",
  },
];

export default function MaintenanceClient() {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États pour la détection d'IP
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [isLoadingIp, setIsLoadingIp] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);

  // Récupérer l'IP publique via ipify
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        setClientIp(data.ip);

        // Vérifier si l'IP est approuvée
        setIsCheckingApproval(true);
        const statusResponse = await fetch(`/api/maintenance/check-ip?ip=${data.ip}`);
        const statusData = await statusResponse.json();
        setIsApproved(statusData.isApproved);
      } catch (err) {
        console.error("Erreur lors de la récupération de l'IP:", err);
        setClientIp(null);
      } finally {
        setIsLoadingIp(false);
        setIsCheckingApproval(false);
      }
    };

    fetchIp();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Veuillez entrer votre nom");
      return;
    }

    if (!clientIp) {
      setError("Impossible de détecter votre adresse IP");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/maintenance/request-visit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim(), ipAddress: clientIp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la demande");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 -right-40 w-96 h-96 bg-secondary/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <motion.div
          className="absolute -bottom-20 left-1/3 w-72 h-72 bg-accent/15 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 15, 0],
            y: [0, -25, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </div>

      {/* Floating emojis */}
      {floatingEmojis.map((item, index) => (
        <motion.div
          key={index}
          className="absolute text-4xl pointer-events-none select-none"
          style={{ left: item.x, top: item.y }}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: item.delay,
          }}
        >
          {item.emoji}
        </motion.div>
      ))}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <h1 className="text-5xl md:text-6xl font-bold">
            <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              Gopattes
            </span>
          </h1>
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${
            isApproved
              ? "bg-secondary/10 text-secondary border-secondary/20"
              : "bg-primary/10 text-primary border-primary/20"
          }`}>
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              isApproved ? "bg-secondary" : "bg-primary"
            }`} />
            {isApproved ? "Accès autorisé" : "Site en construction"}
          </span>
        </motion.div>

        {/* Si IP approuvée, afficher le message de bienvenue */}
        {isApproved ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-full max-w-md"
          >
            <div className="bg-card p-8 rounded-2xl border border-secondary/20 shadow-lg text-center">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <PartyPopper className="w-8 h-8 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Bienvenue !
              </h2>
              <p className="text-text-light mb-6">
                Votre adresse IP est autorisée. Vous pouvez accéder au site.
              </p>
              {clientIp && (
                <p className="text-xs text-text-light/60 mb-4 font-mono">
                  IP : {clientIp}
                </p>
              )}
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-full hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                <Home className="w-5 h-5" />
                Accéder au site
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Main title */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-2xl md:text-4xl font-bold text-foreground text-center max-w-2xl mb-6"
            >
              Bientôt, trouvez le{" "}
              <span className="text-secondary">gardien idéal</span> pour votre
              animal
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-text-light text-center max-w-lg mb-10"
            >
              La plateforme qui connecte les propriétaires d'animaux avec des gardes
              de confiance. Nous préparons quelque chose d'extraordinaire pour vous
              et vos compagnons.
            </motion.p>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-3xl w-full"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="flex flex-col items-center text-center p-4 bg-card rounded-2xl border border-primary/10 shadow-sm"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center mb-3">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-text-light">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="w-full max-w-md"
            >
              {isLoadingIp || isCheckingApproval ? (
                <div className="bg-card p-6 rounded-2xl border border-primary/10 shadow-lg text-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                  <p className="text-text-light">Détection de votre adresse IP...</p>
                </div>
              ) : !submitted ? (
                <div className="bg-card p-6 rounded-2xl border border-primary/10 shadow-lg">
                  <h3 className="text-lg font-semibold text-foreground text-center mb-4">
                    Demander un accès anticipé
                  </h3>
                  {clientIp && (
                    <p className="text-xs text-text-light/60 text-center mb-4 font-mono">
                      Votre IP : {clientIp}
                    </p>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-foreground mb-2"
                      >
                        Votre nom
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jean Dupont"
                        className="w-full px-4 py-3 rounded-xl border border-primary/20 bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                        disabled={isSubmitting}
                      />
                    </div>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-red-500 text-sm"
                      >
                        {error}
                      </motion.p>
                    )}
                    <button
                      type="submit"
                      disabled={isSubmitting || !clientIp}
                      className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-full hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        "Demander l'accès"
                      )}
                    </button>
                  </form>
                  <p className="text-xs text-text-light text-center mt-4">
                    Votre demande sera examinée par notre équipe.
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-card p-8 rounded-2xl border border-secondary/20 shadow-lg text-center"
                >
                  <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-secondary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Demande envoyée !
                  </h3>
                  <p className="text-text-light">
                    Nous avons bien reçu votre demande d'accès. Un administrateur
                    l'examinera prochainement.
                  </p>
                </motion.div>
              )}
            </motion.div>
          </>
        )}

        {/* Admin link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-12"
        >
          <Link
            href="/admin/connexion"
            className="text-sm text-text-light hover:text-primary transition-colors"
          >
            Administration
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
