"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { User, Phone, ArrowLeft } from "lucide-react";
import type { RegistrationData } from "../page";

interface PersonalInfoStepProps {
  data: RegistrationData;
  onChange: (updates: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PersonalInfoStep({
  data,
  onChange,
  onNext,
  onBack,
}: PersonalInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Formater le numéro de téléphone
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 6)
      return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
    if (digits.length <= 8)
      return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    onChange({ phone: formatted });
  };

  const validateAndContinue = () => {
    const newErrors: Record<string, string> = {};

    if (!data.firstName.trim()) {
      newErrors.firstName = "Le prénom est requis";
    }

    if (!data.lastName.trim()) {
      newErrors.lastName = "Le nom est requis";
    }

    // Validation téléphone français
    const phoneDigits = data.phone.replace(/\s/g, "");
    if (!phoneDigits) {
      newErrors.phone = "Le numéro de téléphone est requis";
    } else if (!/^(0[1-9]|(\+33|0033)[1-9])\d{8}$/.test(phoneDigits)) {
      newErrors.phone = "Numéro de téléphone invalide";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  const isValid =
    data.firstName.trim() &&
    data.lastName.trim() &&
    data.phone.replace(/\s/g, "").length >= 10;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-foreground font-medium">
          Parlez-nous un peu de vous
        </p>
      </div>

      {/* Prénom et Nom */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="text"
          value={data.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
          placeholder="Jean"
          label="Prénom"
          icon={<User className="w-5 h-5" />}
          error={errors.firstName}
        />
        <Input
          type="text"
          value={data.lastName}
          onChange={(e) => onChange({ lastName: e.target.value })}
          placeholder="Dupont"
          label="Nom"
          error={errors.lastName}
        />
      </div>

      {/* Téléphone */}
      <Input
        type="tel"
        value={data.phone}
        onChange={handlePhoneChange}
        placeholder="06 12 34 56 78"
        label="Numéro de téléphone"
        icon={<Phone className="w-5 h-5" />}
        error={errors.phone}
        maxLength={14}
      />

      <p className="text-xs text-text-light">
        Votre numéro sera utilisé uniquement pour la sécurité de votre compte et
        les notifications importantes.
      </p>

      {/* Boutons */}
      <div className="flex gap-3 pt-4">
        <Button onClick={onBack} variant="outline" className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <Button
          onClick={validateAndContinue}
          disabled={!isValid}
          className="flex-1"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}
