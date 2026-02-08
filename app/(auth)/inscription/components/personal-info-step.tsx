"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { User, Phone, ArrowLeft, AtSign, Check, X, Loader2, ShieldCheck, Clock, RefreshCw } from "lucide-react";
import { useQuery, useAction } from "convex/react";
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

  // Phone verification state
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "sending" | "code_sent" | "verifying" | "verified" | "skipped">(
    data.phoneVerified ? "verified" : "idle"
  );
  const [pinId, setPinId] = useState("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendPhoneVerification = useAction(api.api.sms.sendPhoneVerification);
  const verifyPhoneCode = useAction(api.api.sms.verifyPhoneCode);

  // Récupérer la config Infobip pour la passer aux actions (contourne le bug ctx.runQuery sur self-hosted)
  const infobipConfig = useQuery(api.api.smsInternal.getInfobipConfig);

  // Debounce username
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(data.username);
    }, 500);
    return () => clearTimeout(timer);
  }, [data.username]);

  const usernameCheck = useQuery(
    api.auth.username.checkUsernameAvailability,
    debouncedUsername.trim().length >= 3 ? { username: debouncedUsername.trim() } : "skip"
  );

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Phone format helpers
  const formatPhone = (value: string) => {
    const trimmed = value.replace(/\s/g, "");
    let digits: string;
    if (trimmed.startsWith("+33")) {
      digits = "0" + trimmed.slice(3).replace(/\D/g, "");
    } else if (trimmed.startsWith("0033")) {
      digits = "0" + trimmed.slice(4).replace(/\D/g, "");
    } else {
      digits = value.replace(/\D/g, "");
    }
    digits = digits.slice(0, 10);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  };

  const isPhoneValid = () => {
    const digits = data.phone.replace(/\s/g, "");
    return /^0[1-9]\d{8}$/.test(digits);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    onChange({ phone: formatted });
    // Reset verification if phone changes
    if (phoneStatus !== "idle" && phoneStatus !== "skipped") {
      setPhoneStatus("idle");
      setPinId("");
      setCode(["", "", "", "", "", ""]);
      setCodeError("");
      onChange({ phoneVerified: false });
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
    onChange({ username: value });
  };

  // Send SMS
  const handleSendSms = async () => {
    setPhoneStatus("sending");
    setCodeError("");
    try {
      const result = await sendPhoneVerification({
        phone: data.phone,
        infobipConfig: infobipConfig ?? undefined,
      });
      if (result.success && result.pinId) {
        setPinId(result.pinId);
        setPhoneStatus("code_sent");
        setCountdown(60);
        setCode(["", "", "", "", "", ""]);
        setTimeout(() => codeRefs.current[0]?.focus(), 100);
      } else {
        setPhoneStatus("idle");
        setErrors((prev) => ({ ...prev, phone: result.error || "Impossible d'envoyer le SMS" }));
      }
    } catch (err: any) {
      setPhoneStatus("idle");
      const msg = err?.message?.includes("Server Error")
        ? "Service SMS indisponible. Vous pouvez continuer en cliquant \"Plus tard\"."
        : "Erreur lors de l'envoi du SMS";
      setErrors((prev) => ({ ...prev, phone: msg }));
    }
  };

  // Skip verification
  const handleSkip = () => {
    setPhoneStatus("skipped");
    onChange({ phoneVerified: false });
  };

  // Code input handlers
  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setCodeError("");
    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted.length) return;
    const newCode = [...code];
    for (let i = 0; i < pasted.length && i < 6; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    setCodeError("");
    codeRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // Verify code
  const handleVerifyCode = useCallback(async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setCodeError("Saisissez le code complet à 6 chiffres");
      return;
    }
    setPhoneStatus("verifying");
    setCodeError("");
    try {
      const result = await verifyPhoneCode({
        pinId,
        code: fullCode,
        infobipConfig: infobipConfig ? { apiKey: infobipConfig.apiKey, baseUrl: infobipConfig.baseUrl } : undefined,
      });
      if (result.success && result.verified) {
        setPhoneStatus("verified");
        onChange({ phoneVerified: true });
      } else {
        setPhoneStatus("code_sent");
        setCodeError(result.error || "Code incorrect");
        setCode(["", "", "", "", "", ""]);
        codeRefs.current[0]?.focus();
      }
    } catch {
      setPhoneStatus("code_sent");
      setCodeError("Erreur de vérification");
    }
  }, [code, pinId, verifyPhoneCode, onChange, infobipConfig]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (phoneStatus === "code_sent" && code.every((d) => d !== "")) {
      handleVerifyCode();
    }
  }, [code, phoneStatus, handleVerifyCode]);

  // Resend SMS
  const handleResend = async () => {
    if (countdown > 0) return;
    setIsResending(true);
    setCodeError("");
    try {
      const result = await sendPhoneVerification({
        phone: data.phone,
        infobipConfig: infobipConfig ?? undefined,
      });
      if (result.success && result.pinId) {
        setPinId(result.pinId);
        setCountdown(60);
        setCode(["", "", "", "", "", ""]);
        codeRefs.current[0]?.focus();
      } else {
        setCodeError(result.error || "Impossible de renvoyer le code");
      }
    } catch {
      setCodeError("Erreur lors du renvoi");
    } finally {
      setIsResending(false);
    }
  };

  // Form validation
  const validateAndContinue = () => {
    const newErrors: Record<string, string> = {};

    if (!data.firstName.trim()) newErrors.firstName = "Le prénom est requis";
    if (!data.lastName.trim()) newErrors.lastName = "Le nom est requis";

    if (!data.username.trim()) {
      newErrors.username = "Le nom d'utilisateur est requis";
    } else if (data.username.trim().length < 3) {
      newErrors.username = "3 caractères minimum";
    } else if (usernameCheck && !usernameCheck.available) {
      newErrors.username = usernameCheck.error || "Ce nom d'utilisateur est déjà pris";
    }

    const phoneDigits = data.phone.replace(/\s/g, "");
    if (!phoneDigits) {
      newErrors.phone = "Le numéro de téléphone est requis";
    } else if (phoneDigits.length < 10) {
      newErrors.phone = `Numéro incomplet (${phoneDigits.length}/10 chiffres)`;
    } else if (!/^0[1-9]\d{8}$/.test(phoneDigits)) {
      newErrors.phone = "Numéro invalide";
    }

    // Le téléphone doit être vérifié ou explicitement ignoré
    if (!newErrors.phone && phoneStatus !== "verified" && phoneStatus !== "skipped") {
      newErrors.phone = "Veuillez vérifier votre numéro ou cliquer sur \"Plus tard\"";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  const usernameIsValid = data.username.trim().length >= 3 && usernameCheck?.available === true;
  const usernameIsChecking = data.username.trim().length >= 3 && debouncedUsername !== data.username;
  const usernameIsTaken = data.username.trim().length >= 3 && usernameCheck?.available === false && !usernameCheck?.error;
  const phoneValid = isPhoneValid();
  const showVerifyButtons = phoneValid && phoneStatus === "idle";
  const showCodeInput = phoneStatus === "code_sent" || phoneStatus === "verifying";

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
          <div className="flex items-center gap-1.5 px-3 py-3 bg-gray-100 rounded-xl border-2 border-transparent text-sm text-foreground select-none shrink-0">
            <span className="text-base leading-none">🇫🇷</span>
            <span className="text-text-light">+33</span>
          </div>
          <div className="flex-1">
            <Input
              type="tel"
              value={data.phone}
              onChange={handlePhoneChange}
              placeholder="06 12 34 56 78"
              icon={<Phone className="w-5 h-5" />}
              error={errors.phone}
              maxLength={14}
              disabled={showCodeInput}
            />
          </div>
        </div>

        {/* Boutons vérifier / plus tard — apparaissent quand le format est bon */}
        {showVerifyButtons && (
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={handleSendSms}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Vérifier le téléphone
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-text-light text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              <Clock className="w-4 h-4" />
              Plus tard
            </button>
          </div>
        )}

        {/* Envoi en cours */}
        {phoneStatus === "sending" && (
          <div className="flex items-center gap-2 mt-2 text-sm text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            Envoi du code SMS...
          </div>
        )}

        {/* Saisie du code SMS */}
        {showCodeInput && (
          <div className="mt-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
            <p className="text-sm text-foreground font-medium">
              Code envoyé au {data.phone}
            </p>

            {/* 6 champs code */}
            <div className="flex justify-center gap-2">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  onPaste={i === 0 ? handleCodePaste : undefined}
                  disabled={phoneStatus === "verifying"}
                  className={`w-10 h-12 text-center text-lg font-bold bg-white rounded-xl border-2 focus:outline-none transition-colors ${
                    codeError
                      ? "border-red-400 focus:border-red-500"
                      : digit
                      ? "border-primary focus:border-primary"
                      : "border-gray-200 focus:border-primary/50"
                  }`}
                  aria-label={`Chiffre ${i + 1}`}
                />
              ))}
            </div>

            {/* Vérification en cours */}
            {phoneStatus === "verifying" && (
              <div className="flex items-center justify-center gap-2 text-sm text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                Vérification...
              </div>
            )}

            {/* Erreur */}
            {codeError && (
              <p className="text-red-500 text-xs text-center">{codeError}</p>
            )}

            {/* Renvoyer / Modifier */}
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || isResending}
                className={`flex items-center gap-1 ${
                  countdown > 0 ? "text-text-light cursor-not-allowed" : "text-primary hover:text-primary/80"
                }`}
              >
                {isResending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {countdown > 0 ? `Renvoyer (${countdown}s)` : "Renvoyer le code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhoneStatus("idle");
                  setCode(["", "", "", "", "", ""]);
                  setCodeError("");
                }}
                className="text-text-light hover:text-foreground"
              >
                Modifier le numéro
              </button>
            </div>
          </div>
        )}

        {/* Badge vérifié */}
        {phoneStatus === "verified" && (
          <div className="flex items-center gap-1.5 mt-2 text-sm text-green-600 font-medium">
            <Check className="w-4 h-4" />
            Numéro vérifié
          </div>
        )}

        {/* Badge ignoré */}
        {phoneStatus === "skipped" && (
          <div className="flex items-center justify-between mt-2">
            <span className="flex items-center gap-1.5 text-sm text-text-light">
              <Clock className="w-4 h-4" />
              Vérification reportée
            </span>
            <button
              type="button"
              onClick={() => setPhoneStatus("idle")}
              className="text-xs text-primary hover:text-primary/80"
            >
              Vérifier maintenant
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-text-light">
        Votre numéro sera utilisé pour la sécurité de votre compte et les notifications importantes.
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
          disabled={showCodeInput || phoneStatus === "sending"}
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}
