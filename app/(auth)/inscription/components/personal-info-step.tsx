"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { User, Phone, ArrowLeft, AtSign, Check, X, Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
  const [debouncedUsername, setDebouncedUsername] = useState(data.username);

  // Debounce pour la vérification d'unicité du username
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(data.username);
    }, 500);
    return () => clearTimeout(timer);
  }, [data.username]);

  // Vérification d'unicité en temps réel
  const usernameCheck = useQuery(
    api.auth.username.checkUsernameAvailability,
    debouncedUsername.trim().length >= 3 ? { username: debouncedUsername.trim() } : "skip"
  );

  // Formater le numéro de téléphone français
  const formatPhone = (value: string) => {
    // Détecter si l'utilisateur tape/colle un format international
    const trimmed = value.replace(/\s/g, "");
    let digits: string;

    if (trimmed.startsWith("+33")) {
      // +33 6 12... → convertir en 06 12...
      digits = "0" + trimmed.slice(3).replace(/\D/g, "");
    } else if (trimmed.startsWith("0033")) {
      // 0033 6 12... → convertir en 06 12...
      digits = "0" + trimmed.slice(4).replace(/\D/g, "");
    } else {
      digits = value.replace(/\D/g, "");
    }

    // Limiter à 10 chiffres
    digits = digits.slice(0, 10);

    // Formatter en XX XX XX XX XX
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

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ne garder que les caractères autorisés, en lowercase
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
    onChange({ username: value });
  };

  const validateAndContinue = () => {
    const newErrors: Record<string, string> = {};

    if (!data.firstName.trim()) {
      newErrors.firstName = "Le prénom est requis";
    }

    if (!data.lastName.trim()) {
      newErrors.lastName = "Le nom est requis";
    }

    // Validation username
    if (!data.username.trim()) {
      newErrors.username = "Le nom d'utilisateur est requis";
    } else if (data.username.trim().length < 3) {
      newErrors.username = "3 caractères minimum";
    } else if (usernameCheck && !usernameCheck.available) {
      newErrors.username = usernameCheck.error || "Ce nom d'utilisateur est déjà pris";
    }

    // Validation téléphone français (toujours normalisé en 0X par le formatter)
    const phoneDigits = data.phone.replace(/\s/g, "");
    if (!phoneDigits) {
      newErrors.phone = "Le numéro de téléphone est requis";
    } else if (phoneDigits.length < 10) {
      newErrors.phone = `Numéro incomplet (${phoneDigits.length}/10 chiffres). Formats acceptés : 06 XX XX XX XX, 07 XX XX XX XX, +33 6 XX XX XX XX`;
    } else if (!/^0[1-9]\d{8}$/.test(phoneDigits)) {
      newErrors.phone = "Numéro invalide. Formats acceptés : 06 XX XX XX XX, 07 XX XX XX XX, +33 6 XX XX XX XX";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  const usernameIsValid = data.username.trim().length >= 3 && usernameCheck?.available === true;
  const usernameIsChecking = data.username.trim().length >= 3 && debouncedUsername !== data.username;
  const usernameIsTaken = data.username.trim().length >= 3 && usernameCheck?.available === false && !usernameCheck?.error;

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

      {/* Username */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Nom d&apos;utilisateur
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light">
            <AtSign className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={data.username}
            onChange={handleUsernameChange}
            placeholder="jeandupont"
            maxLength={30}
            className={`w-full pl-10 pr-10 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 text-foreground ${
              errors.username
                ? "ring-2 ring-red-500 focus:ring-red-500"
                : usernameIsValid
                ? "ring-2 ring-green-500 focus:ring-green-500"
                : usernameIsTaken
                ? "ring-2 ring-red-500 focus:ring-red-500"
                : "focus:ring-primary/50"
            }`}
          />
          {/* Indicateur de statut */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {usernameIsChecking ? (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            ) : usernameIsValid ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : usernameIsTaken ? (
              <X className="w-4 h-4 text-red-500" />
            ) : null}
          </div>
        </div>
        {errors.username && (
          <p className="text-xs text-red-500 mt-1">{errors.username}</p>
        )}
        {usernameIsTaken && !errors.username && (
          <p className="text-xs text-red-500 mt-1">
            Ce nom est déjà pris{usernameCheck?.suggestion ? `. Essayez : ${usernameCheck.suggestion}` : ""}
          </p>
        )}
        {usernameIsValid && (
          <p className="text-xs text-green-600 mt-1">Disponible</p>
        )}
        <p className="text-xs text-text-light mt-1">
          Votre nom d&apos;utilisateur sera visible sur votre profil
        </p>
      </div>

      {/* Téléphone */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-foreground">
          Numéro de téléphone
        </label>
        <div className="flex gap-2">
          {/* Indicateur pays */}
          <div className="flex items-center gap-1.5 px-3 py-3 bg-gray-100 rounded-xl border-2 border-transparent text-sm text-foreground select-none shrink-0">
            <span className="text-base leading-none">🇫🇷</span>
            <span className="text-text-light">+33</span>
          </div>
          {/* Champ téléphone */}
          <div className="flex-1">
            <Input
              type="tel"
              value={data.phone}
              onChange={handlePhoneChange}
              placeholder="06 12 34 56 78"
              icon={<Phone className="w-5 h-5" />}
              error={errors.phone}
              maxLength={14}
            />
          </div>
        </div>
      </div>

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
          className="flex-1"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}
