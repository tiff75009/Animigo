"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Check, X } from "lucide-react";
import type { RegistrationData } from "../page";

interface CredentialsStepProps {
  data: RegistrationData;
  onChange: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CredentialsStep({
  data,
  onChange,
  onNext,
  onBack,
}: CredentialsStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation du mot de passe
  const passwordChecks = [
    { label: "Au moins 8 caractères", valid: data.password.length >= 8 },
    { label: "Une majuscule", valid: /[A-Z]/.test(data.password) },
    { label: "Une minuscule", valid: /[a-z]/.test(data.password) },
    { label: "Un chiffre", valid: /\d/.test(data.password) },
  ];

  const isPasswordValid = passwordChecks.every((check) => check.valid);
  const doPasswordsMatch =
    data.password === data.confirmPassword && data.confirmPassword.length > 0;

  const validateAndContinue = () => {
    const newErrors: Record<string, string> = {};

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email) {
      newErrors.email = "L'email est requis";
    } else if (!emailRegex.test(data.email)) {
      newErrors.email = "Adresse email invalide";
    }

    // Validation mot de passe
    if (!isPasswordValid) {
      newErrors.password = "Le mot de passe ne respecte pas les critères";
    }

    // Confirmation mot de passe
    if (!doPasswordsMatch) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-foreground font-medium">
          Créez vos identifiants de connexion
        </p>
      </div>

      {/* Email */}
      <Input
        type="email"
        value={data.email}
        onChange={(e) => onChange({ email: e.target.value })}
        placeholder="votre@email.com"
        label="Adresse email"
        icon={<Mail className="w-5 h-5" />}
        error={errors.email}
      />

      {/* Mot de passe */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Mot de passe
        </label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={data.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder="Créez un mot de passe"
            icon={<Lock className="w-5 h-5" />}
            error={errors.password}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-3 text-text-light hover:text-foreground transition-colors"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Indicateurs de force */}
        {data.password && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2 space-y-1"
          >
            {passwordChecks.map((check) => (
              <div
                key={check.label}
                className="flex items-center gap-2 text-xs"
              >
                {check.valid ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <X className="w-3.5 h-3.5 text-red-400" />
                )}
                <span
                  className={check.valid ? "text-green-600" : "text-text-light"}
                >
                  {check.label}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Confirmation mot de passe */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Confirmer le mot de passe
        </label>
        <div className="relative">
          <Input
            type={showConfirmPassword ? "text" : "password"}
            value={data.confirmPassword}
            onChange={(e) => onChange({ confirmPassword: e.target.value })}
            placeholder="Confirmez votre mot de passe"
            icon={<Lock className="w-5 h-5" />}
            error={errors.confirmPassword}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-3 text-text-light hover:text-foreground transition-colors"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Indicateur de correspondance */}
        {data.confirmPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs mt-1"
          >
            {doPasswordsMatch ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-600">
                  Les mots de passe correspondent
                </span>
              </>
            ) : (
              <>
                <X className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-500">
                  Les mots de passe ne correspondent pas
                </span>
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* Boutons */}
      <div className="flex gap-3 pt-4">
        <Button onClick={onBack} variant="outline" className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <Button
          onClick={validateAndContinue}
          disabled={!isPasswordValid || !doPasswordsMatch || !data.email}
          className="flex-1"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}
