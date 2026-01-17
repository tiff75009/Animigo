"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { StepIndicator } from "./components/step-indicator";
import { AccountTypeStep } from "./components/account-type-step";
import { CredentialsStep } from "./components/credentials-step";
import { PersonalInfoStep } from "./components/personal-info-step";
import { ProInfoStep } from "./components/pro-info-step";
import { CguStep } from "./components/cgu-step";

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
  siret: string;
  companyName: string;
  // Classification entreprise (pour les pros)
  companyType?: "micro_enterprise" | "regular_company" | "unknown";
  isVatSubject?: boolean;
  legalForm?: string;
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
  siret: "",
  companyName: "",
  acceptCgu: false,
};

export default function InscriptionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RegistrationData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const registerPro = useMutation(api.auth.register.registerPro);
  const registerParticulier = useMutation(api.auth.register.registerParticulier);
  const registerUtilisateur = useMutation(api.auth.register.registerUtilisateur);

  // Nombre d'étapes selon le type de compte
  const totalSteps = data.accountType === "annonceur_pro" ? 5 : 4;

  const updateData = (updates: Partial<RegistrationData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    setError(null);
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result;

      if (data.accountType === "annonceur_pro") {
        result = await registerPro({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          siret: data.siret,
          companyName: data.companyName,
          // Classification entreprise
          companyType: data.companyType,
          isVatSubject: data.isVatSubject,
          legalForm: data.legalForm,
          acceptCgu: data.acceptCgu,
        });
      } else if (data.accountType === "annonceur_particulier") {
        result = await registerParticulier({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          acceptCgu: data.acceptCgu,
        });
      } else {
        result = await registerUtilisateur({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          acceptCgu: data.acceptCgu,
        });
      }

      // Stocker le token
      localStorage.setItem("auth_token", result.token);

      // Rediriger selon le type
      if (result.accountType === "utilisateur") {
        router.push("/recherche");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur est survenue";
      setError(errorMessage);
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
            error={error}
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
            error={error}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Header mobile */}
      <div className="lg:hidden text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center">
            <span className="text-xl">🐾</span>
          </div>
          <span className="text-2xl font-extrabold">
            Anim<span className="text-primary">igo</span>
          </span>
        </Link>
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
        <p className="text-text-light">Rejoignez la communauté Animigo</p>
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
