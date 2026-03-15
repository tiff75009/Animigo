"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/app/components/ui/toast";
import { parseError } from "@/app/lib/errors";
import { setAuthToken } from "@/app/lib/authToken";

import { ShieldCheck, Eye, CalendarCheck, Zap, ArrowLeft, Search, Star, Lock, MessageCircle, Wallet, Calendar } from "lucide-react";
import { StepIndicator } from "./components/step-indicator";
import { AccountTypeStep } from "./components/account-type-step";
import { CredentialsStep } from "./components/credentials-step";
import { PersonalInfoStep } from "./components/personal-info-step";
import { ProInfoStep } from "./components/pro-info-step";
import { CguStep } from "./components/cgu-step";

const mobileAdvantagesByType: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }[]> = {
  annonceur_pro: [
    { icon: ShieldCheck, label: "Paiement garanti" },
    { icon: Eye, label: "Visibilité" },
    { icon: CalendarCheck, label: "Gestion simple" },
    { icon: Zap, label: "Facturation auto" },
  ],
  annonceur_particulier: [
    { icon: Wallet, label: "Revenus extra" },
    { icon: Calendar, label: "Planning flexible" },
    { icon: MessageCircle, label: "Messagerie" },
    { icon: ShieldCheck, label: "Paiement sécurisé" },
  ],
  utilisateur: [
    { icon: Search, label: "Pros vérifiés" },
    { icon: Star, label: "Avis certifiés" },
    { icon: Lock, label: "Paiement protégé" },
    { icon: MessageCircle, label: "Messagerie directe" },
  ],
  default: [
    { icon: ShieldCheck, label: "100% sécurisé" },
    { icon: Star, label: "Avis certifiés" },
    { icon: Zap, label: "Gratuit" },
    { icon: CalendarCheck, label: "Sans engagement" },
  ],
};

export type AccountType =
  | "annonceur_pro"
  | "annonceur_particulier"
  | "utilisateur";

export interface RegistrationData {
  accountType: AccountType | null;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  username: string;
  siret: string;
  companyName: string;
  // Classification entreprise (pour les pros)
  companyType?: "micro_enterprise" | "regular_company" | "unknown";
  isVatSubject?: boolean;
  legalForm?: string;
  // Données entreprise (de l'API société.com)
  companyAddress?: string;
  companyPostalCode?: string;
  companyCity?: string;
  activityCode?: string;
  activityLabel?: string;
  companyCreationDate?: string;
  phoneVerified: boolean;
  acceptCgu: boolean;
}

const initialData: RegistrationData = {
  accountType: null,
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  phone: "",
  username: "",
  siret: "",
  companyName: "",
  phoneVerified: false,
  acceptCgu: false,
};

const STORAGE_KEY = "animigo_inscription";

function getHashStep(): number | null {
  if (typeof window === "undefined") return null;
  const match = window.location.hash.match(/^#etape-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

function getSavedData(): RegistrationData | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export default function InscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RegistrationData>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  // Restaurer étape (hash) + données (sessionStorage) au montage
  useEffect(() => {
    const saved = getSavedData();
    const hashStep = getHashStep();

    if (saved && saved.accountType) {
      setData({ ...initialData, ...saved, password: "", confirmPassword: "" });
      if (hashStep && hashStep >= 1) {
        const maxSteps = saved.accountType === "annonceur_pro" ? 5 : 4;
        setStep(Math.min(hashStep, maxSteps));
      }
    }
  }, []);

  // Synchroniser le hash URL quand l'étape change
  useEffect(() => {
    window.location.hash = `etape-${step}`;
  }, [step]);

  // Sauvegarder les données dans sessionStorage (sans mot de passe)
  useEffect(() => {
    if (data.accountType) {
      const { password, confirmPassword, ...safeData } = data;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safeData));
    }
  }, [data]);

  // Pré-sélection du type via query param (?type=annonceur_pro)
  const hasTypeParam = searchParams.get("type") !== null;
  useEffect(() => {
    const typeParam = searchParams.get("type") as AccountType | null;
    if (typeParam && ["annonceur_pro", "annonceur_particulier", "utilisateur"].includes(typeParam)) {
      setData((prev) => ({ ...prev, accountType: typeParam }));
      setStep(2);
    }
  }, [searchParams]);

  const registerPro = useMutation(api.auth.register.registerPro);
  const registerParticulier = useMutation(api.auth.register.registerParticulier);
  const registerUtilisateur = useMutation(api.auth.register.registerUtilisateur);

  // Nombre d'étapes selon le type de compte
  const totalSteps = data.accountType === "annonceur_pro" ? 5 : 4;

  const updateData = (updates: Partial<RegistrationData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => {
    // Étape 1 ou étape 2 avec type pré-sélectionné via URL → retour accueil
    if (step <= 1 || (step === 2 && hasTypeParam)) {
      sessionStorage.removeItem(STORAGE_KEY);
      router.push("/");
      return;
    }
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      let result;

      if (data.accountType === "annonceur_pro") {
        result = await registerPro({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          username: data.username,
          siret: data.siret,
          companyName: data.companyName,
          // Classification entreprise
          companyType: data.companyType,
          isVatSubject: data.isVatSubject,
          legalForm: data.legalForm,
          // Données entreprise
          companyAddress: data.companyAddress,
          companyPostalCode: data.companyPostalCode,
          companyCity: data.companyCity,
          activityCode: data.activityCode,
          activityLabel: data.activityLabel,
          companyCreationDate: data.companyCreationDate,
          phoneVerified: data.phoneVerified,
          acceptCgu: data.acceptCgu,
        });
      } else if (data.accountType === "annonceur_particulier") {
        result = await registerParticulier({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          username: data.username,
          phoneVerified: data.phoneVerified,
          acceptCgu: data.acceptCgu,
        });
      } else {
        result = await registerUtilisateur({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          username: data.username,
          phoneVerified: data.phoneVerified,
          acceptCgu: data.acceptCgu,
        });
      }

      // Gérer le résultat
      if (!result.success) {
        const parsed = parseError(result.error);
        toast.error(parsed.title, parsed.message);
        return;
      }

      // Succès — nettoyer le sessionStorage
      sessionStorage.removeItem(STORAGE_KEY);
      toast.success("Compte créé", "Vérifiez votre email pour activer votre compte !");
      await setAuthToken(result.token);

      // Rediriger vers la page de confirmation email
      const emailParam = encodeURIComponent(data.email);
      router.push(`/inscription/confirmer-email?email=${emailParam}&type=${result.accountType}`);
    } catch (err: unknown) {
      // Erreur réseau ou autre
      const parsed = parseError(err);
      toast.error(parsed.title, parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    // Pour les annonceurs pro : 1.Type > 2.SIRET > 3.Credentials > 4.Personal > 5.CGU
    // Pour les autres : 1.Type > 2.Credentials > 3.Personal > 4.CGU
    const isPro = data.accountType === "annonceur_pro";

    switch (step) {
      case 1:
        return (
          <AccountTypeStep
            selectedType={data.accountType}
            onSelect={(type) => updateData({ accountType: type })}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 2:
        if (isPro) {
          // Étape SIRET en premier pour les pros
          return (
            <ProInfoStep
              data={data}
              onChange={updateData}
              onNext={nextStep}
              onBack={prevStep}
            />
          );
        }
        return (
          <CredentialsStep
            data={data}
            onChange={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        if (isPro) {
          return (
            <CredentialsStep
              data={data}
              onChange={updateData}
              onNext={nextStep}
              onBack={prevStep}
            />
          );
        }
        return (
          <PersonalInfoStep
            data={data}
            onChange={updateData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        if (isPro) {
          return (
            <PersonalInfoStep
              data={data}
              onChange={updateData}
              onNext={nextStep}
              onBack={prevStep}
            />
          );
        }
        return (
          <CguStep
            accepted={data.acceptCgu}
            onChange={(accepted) => updateData({ acceptCgu: accepted })}
            onSubmit={handleSubmit}
            onBack={prevStep}
            isLoading={isLoading}
          />
        );
      case 5:
        // Uniquement pour les pros (étape 5)
        return (
          <CguStep
            accepted={data.acceptCgu}
            onChange={(accepted) => updateData({ acceptCgu: accepted })}
            onSubmit={handleSubmit}
            onBack={prevStep}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Header mobile */}
      <div className="lg:hidden mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Accueil</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <span className="text-base">🐾</span>
            </div>
            <span className="text-lg font-extrabold">
              Anim<span className="text-primary">igo</span>
            </span>
          </Link>
        </div>

        {/* Bandeau avantages mobile - adapté au type de compte */}
        <div className="flex justify-center gap-3">
          {(mobileAdvantagesByType[data.accountType || "default"]).map((adv) => (
            <div
              key={adv.label}
              className="flex items-center gap-1 text-xs text-text-light"
            >
              <adv.icon className="w-3.5 h-3.5 text-primary" />
              <span>{adv.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Titre */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Créer votre compte
        </h1>
        <p className="text-text-light">
          Inscription gratuite, sans engagement
        </p>
      </motion.div>

      {/* Indicateur d'étapes */}
      {data.accountType && (
        <StepIndicator currentStep={step} totalSteps={totalSteps} />
      )}

      {/* Contenu de l'étape */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Lien connexion */}
      <div className="mt-8 text-center">
        <p className="text-text-light">
          Déjà un compte ?{" "}
          <Link
            href="/connexion"
            className="text-primary font-semibold hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
