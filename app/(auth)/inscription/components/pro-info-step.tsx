"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Building2,
  Hash,
  ArrowLeft,
  Info,
  Loader2,
  CheckCircle,
  XCircle,
  MapPin,
  Briefcase,
  BadgeCheck,
  Receipt,
} from "lucide-react";
import type { RegistrationData } from "../page";

interface ProInfoStepProps {
  data: RegistrationData;
  onChange: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface SiretVerificationResult {
  valid: boolean;
  companyName?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  legalForm?: string;
  activityCode?: string;
  activityLabel?: string;
  creationDate?: string;
  isActive?: boolean;
  // Classification entreprise
  companyType?: "micro_enterprise" | "regular_company" | "unknown";
  isVatSubject?: boolean;
  error?: string;
}

// Validation SIRET locale (algorithme de Luhn)
function validateSiretLocal(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(siret[i], 10);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function ProInfoStep({
  data,
  onChange,
  onNext,
  onBack,
}: ProInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<SiretVerificationResult | null>(null);
  const [hasVerified, setHasVerified] = useState(false);

  const verifySiret = useAction(api.api.societe.verifySiret);

  // Formater le SIRET (groupes de 3-3-3-5)
  const formatSiret = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 14)}`;
  };

  // Vérifier le SIRET via l'API
  const handleVerifySiret = useCallback(async () => {
    const siret = data.siret.replace(/\D/g, "");

    if (siret.length !== 14) return;
    if (!validateSiretLocal(siret)) {
      setVerificationResult({
        valid: false,
        error: "Numéro SIRET invalide (checksum incorrecte)",
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const result = await verifySiret({ siret });
      console.log("Résultat vérification SIRET:", result);
      setVerificationResult(result);
      setHasVerified(true);

      // Auto-remplir les informations si trouvées
      if (result.valid) {
        const updates: Partial<RegistrationData> = {};

        if (result.companyName) {
          console.log("Mise à jour du nom entreprise:", result.companyName);
          updates.companyName = result.companyName;
        }

        // Classification entreprise
        if (result.companyType) {
          updates.companyType = result.companyType;
        }
        if (result.isVatSubject !== undefined) {
          updates.isVatSubject = result.isVatSubject;
        }
        if (result.legalForm) {
          updates.legalForm = result.legalForm;
        }

        if (Object.keys(updates).length > 0) {
          onChange(updates);
        }
      }
    } catch (error) {
      setVerificationResult({
        valid: false,
        error: "Erreur lors de la vérification",
      });
    } finally {
      setIsVerifying(false);
    }
  }, [data.siret, verifySiret, onChange]);

  // Déclencher la vérification quand le SIRET est complet
  useEffect(() => {
    const siret = data.siret.replace(/\D/g, "");
    if (siret.length === 14 && !hasVerified) {
      const timer = setTimeout(() => {
        handleVerifySiret();
      }, 500); // Debounce 500ms
      return () => clearTimeout(timer);
    }
  }, [data.siret, hasVerified, handleVerifySiret]);

  const handleSiretChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    onChange({ siret: rawValue });
    setHasVerified(false);
    setVerificationResult(null);
  };

  const validateAndContinue = () => {
    const newErrors: Record<string, string> = {};

    if (!data.siret) {
      newErrors.siret = "Le numéro SIRET est requis";
    } else if (!validateSiretLocal(data.siret)) {
      newErrors.siret = "Numéro SIRET invalide";
    }

    if (!data.companyName.trim()) {
      newErrors.companyName = "Le nom de la société est requis";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  // Vérifier si l'entreprise est active (non liquidée)
  const isCompanyActive = verificationResult?.isActive !== false;

  const isValid =
    data.siret.length === 14 &&
    validateSiretLocal(data.siret) &&
    data.companyName.trim() &&
    isCompanyActive;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-foreground font-medium">
          Informations professionnelles
        </p>
      </div>

      {/* Info box */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex gap-3"
      >
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            Pourquoi ces informations ?
          </p>
          <p className="text-text-light mt-1">
            En tant que professionnel, votre SIRET nous permet de vérifier votre
            activité et d&apos;afficher un badge de confiance sur votre profil.
          </p>
        </div>
      </motion.div>

      {/* SIRET */}
      <div>
        <div className="relative">
          <Input
            type="text"
            value={formatSiret(data.siret)}
            onChange={handleSiretChange}
            placeholder="123 456 789 00012"
            label="Numéro SIRET"
            icon={<Hash className="w-5 h-5" />}
            error={errors.siret}
            maxLength={17}
          />
          {/* Indicateur de vérification */}
          <div className="absolute right-3 top-9">
            {isVerifying && (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            )}
            {!isVerifying && verificationResult?.valid && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            {!isVerifying && verificationResult && !verificationResult.valid && (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>

        {/* Résultat de la vérification */}
        <AnimatePresence>
          {verificationResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              {verificationResult.valid ? (
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-600 font-medium mb-2">
                    <CheckCircle className="w-4 h-4" />
                    Entreprise vérifiée
                  </div>
                  {verificationResult.companyName && (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <Building2 className="w-4 h-4 text-text-light" />
                        {verificationResult.companyName}
                      </div>
                      {verificationResult.city && (
                        <div className="flex items-center gap-2 text-text-light">
                          <MapPin className="w-4 h-4" />
                          {verificationResult.postalCode} {verificationResult.city}
                        </div>
                      )}
                      {verificationResult.activityLabel && (
                        <div className="flex items-center gap-2 text-text-light">
                          <Briefcase className="w-4 h-4" />
                          {verificationResult.activityLabel}
                        </div>
                      )}
                      {/* Classification entreprise */}
                      {verificationResult.companyType && verificationResult.companyType !== "unknown" && (
                        <div className="mt-3 p-3 rounded-lg border bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                          <div className="flex items-center gap-2">
                            <BadgeCheck className="w-4 h-4 text-primary" />
                            <span className="font-medium text-foreground">
                              {verificationResult.companyType === "micro_enterprise"
                                ? "Micro-entreprise"
                                : "Société"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-text-light">
                            <Receipt className="w-4 h-4" />
                            {verificationResult.isVatSubject
                              ? "Assujettie à la TVA"
                              : "Non assujettie à la TVA"}
                          </div>
                          {verificationResult.legalForm && (
                            <p className="text-xs text-text-light mt-1 ml-6">
                              {verificationResult.legalForm}
                            </p>
                          )}
                        </div>
                      )}
                      {verificationResult.isActive === false && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-red-500 font-medium text-sm">
                            ⛔ Entreprise radiée ou liquidée
                          </p>
                          <p className="text-red-400 text-xs mt-1">
                            Cette entreprise n&apos;est plus en activité. Vous ne pouvez pas vous inscrire avec ce SIRET.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {verificationResult.error && (
                    <p className="text-xs text-text-light mt-2">
                      {verificationResult.error}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 text-red-500 font-medium">
                    <XCircle className="w-4 h-4" />
                    {verificationResult.error || "SIRET non vérifié"}
                  </div>
                  <p className="text-xs text-text-light mt-2">
                    Vérifiez le numéro ou continuez avec une vérification manuelle.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-text-light">
            14 chiffres - Trouvez-le sur{" "}
            <a
              href="https://www.societe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              societe.com
            </a>
          </p>
          {data.siret.length === 14 && !isVerifying && (
            <button
              type="button"
              onClick={handleVerifySiret}
              className="text-xs text-primary hover:underline"
            >
              Revérifier
            </button>
          )}
        </div>
      </div>

      {/* Nom de société */}
      <div className="relative">
        <Input
          type="text"
          value={data.companyName}
          onChange={(e) => onChange({ companyName: e.target.value })}
          placeholder="Ma Société SAS"
          label={
            verificationResult?.companyName
              ? "Nom de la société (récupéré automatiquement)"
              : "Nom de la société"
          }
          icon={<Building2 className="w-5 h-5" />}
          error={errors.companyName}
          disabled={isVerifying}
        />
        {verificationResult?.companyName && data.companyName === verificationResult.companyName && (
          <div className="absolute right-3 top-9">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
        )}
      </div>
      {verificationResult?.companyName && data.companyName !== verificationResult.companyName && (
        <button
          type="button"
          onClick={() => onChange({ companyName: verificationResult.companyName! })}
          className="text-xs text-primary hover:underline -mt-4"
        >
          Utiliser le nom officiel : {verificationResult.companyName}
        </button>
      )}

      {/* Message si entreprise non active */}
      {verificationResult?.isActive === false && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
        >
          <p className="text-red-500 font-semibold">
            Inscription impossible
          </p>
          <p className="text-red-400 text-sm mt-1">
            Vous ne pouvez pas vous inscrire en tant qu&apos;annonceur professionnel avec une entreprise radiée ou en liquidation.
          </p>
        </motion.div>
      )}

      {/* Boutons */}
      <div className="flex gap-3 pt-4">
        <Button onClick={onBack} variant="outline" className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <Button
          onClick={validateAndContinue}
          disabled={!isValid || isVerifying}
          className="flex-1"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Vérification...
            </>
          ) : !isCompanyActive ? (
            "Entreprise inactive"
          ) : (
            "Continuer"
          )}
        </Button>
      </div>
    </div>
  );
}
