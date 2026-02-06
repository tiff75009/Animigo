"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Building2,
  FileText,
  Shield,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export default function DevenirProPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [siret, setSiret] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const upgradeToProAccount = useMutation(api.planning.regularity.upgradeToProAccount);

  const regularityScore = useQuery(
    api.planning.regularity.getMyRegularityScore,
    token ? { token } : "skip"
  );

  // Validation locale du SIRET (14 chiffres)
  const isSiretValid = /^\d{14}$/.test(siret);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isSiretValid || !companyName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await upgradeToProAccount({
        token,
        siret,
        companyName: companyName.trim(),
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 shadow-sm text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Félicitations !
          </h1>
          <p className="text-text-light mb-6">
            Votre compte est désormais professionnel. Vous pouvez continuer
            votre activité sereinement sur Animigo.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Retour au dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // Si l'utilisateur n'est pas un annonceur particulier
  if (user && user.accountType !== "annonceur_particulier") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Vous êtes déjà professionnel
          </h1>
          <p className="text-text-light mb-6">
            Votre compte est déjà configuré en tant qu'annonceur professionnel.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Retour au dashboard
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    {
      icon: FileText,
      title: "Créez votre auto-entreprise",
      description:
        'Rendez-vous sur autoentrepreneur.urssaf.fr et choisissez l\'activité "Services aux animaux de compagnie" (code APE 9609Z).',
      link: "https://www.autoentrepreneur.urssaf.fr/portail/accueil/creer-mon-auto-entreprise.html",
      linkText: "Accéder au site URSSAF",
    },
    {
      icon: Building2,
      title: "Récupérez votre SIRET",
      description:
        "Après inscription, vous recevrez votre numéro SIRET (14 chiffres) par courrier sous 1 à 4 semaines. Vous pouvez aussi le trouver sur votre espace URSSAF.",
    },
    {
      icon: Shield,
      title: "Activez votre statut pro",
      description:
        "Renseignez votre SIRET et le nom de votre entreprise dans le formulaire ci-dessous pour passer en mode professionnel.",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Retour au dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Devenir auto-entrepreneur
          </h1>
          <p className="text-text-light text-sm">
            Régularisez votre situation en quelques étapes
          </p>
        </div>
      </div>

      {/* Alerte si score critique */}
      {regularityScore &&
        regularityScore.alertLevel === "critical" &&
        regularityScore.isBlocked && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Compte bloqué</p>
              <p className="text-sm text-red-700">
                Vous ne pouvez plus accepter de missions tant que vous n'avez
                pas régularisé votre situation en devenant auto-entrepreneur.
              </p>
            </div>
          </motion.div>
        )}

      {/* Guide étape par étape */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-secondary" />
          <h2 className="text-lg font-semibold text-foreground">
            Guide pas à pas
          </h2>
        </div>

        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <step.icon className="w-5 h-5 text-secondary" />
                </div>
                {index < steps.length - 1 && (
                  <div className="w-0.5 h-full bg-gray-200 mt-2" />
                )}
              </div>
              <div className="pb-6">
                <p className="text-xs font-medium text-secondary mb-1">
                  Étape {index + 1}
                </p>
                <h3 className="font-semibold text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-text-light">{step.description}</p>
                {step.link && (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-secondary font-medium mt-2 hover:underline"
                  >
                    {step.linkText}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Formulaire */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-foreground mb-6">
          Activer mon statut professionnel
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="siret"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Numéro SIRET
            </label>
            <input
              id="siret"
              type="text"
              inputMode="numeric"
              maxLength={14}
              value={siret}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setSiret(val);
              }}
              placeholder="12345678901234"
              className={`w-full px-4 py-3 rounded-xl border transition-colors text-base ${
                siret.length === 14
                  ? isSiretValid
                    ? "border-green-300 bg-green-50/50 focus:ring-green-500"
                    : "border-red-300 bg-red-50/50 focus:ring-red-500"
                  : "border-gray-200 focus:ring-primary"
              } focus:outline-none focus:ring-2`}
            />
            <p className="text-xs text-text-light mt-1">
              14 chiffres — Trouvez-le sur votre espace URSSAF ou sur{" "}
              <a
                href="https://www.societe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:underline"
              >
                societe.com
              </a>
            </p>
            {siret.length === 14 && !isSiretValid && (
              <p className="text-xs text-red-600 mt-1">
                Ce numéro SIRET n'est pas valide (vérification Luhn)
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="companyName"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Nom de l'entreprise
            </label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: Marie Dupont Services Animaliers"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary transition-colors text-base"
            />
            <p className="text-xs text-text-light mt-1">
              Le nom commercial de votre auto-entreprise
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!isSiretValid || !companyName.trim() || isSubmitting}
            className="w-full bg-secondary text-white py-3 rounded-xl font-semibold hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5" />
                Activer mon statut professionnel
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <h3 className="font-semibold text-blue-900 mb-2">
          Pourquoi devenir auto-entrepreneur ?
        </h3>
        <ul className="text-sm text-blue-700 space-y-1.5">
          <li>
            • <strong>Obligation légale</strong> — Au-delà de certains seuils,
            l'exercice régulier d'une activité requiert un statut professionnel
          </li>
          <li>
            • <strong>Protection sociale</strong> — Cotisations retraite,
            maladie et allocations familiales
          </li>
          <li>
            • <strong>Crédibilité</strong> — Un statut pro rassure vos clients
            et valorise votre profil
          </li>
          <li>
            • <strong>Fiscalité simplifiée</strong> — Régime micro-fiscal avec
            un taux forfaitaire de 22% sur le CA
          </li>
        </ul>
      </div>
    </div>
  );
}
