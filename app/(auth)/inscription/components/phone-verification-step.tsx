"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/app/components/ui/button";
import { Loader2, ArrowLeft, Phone, RefreshCw } from "lucide-react";

interface PhoneVerificationStepProps {
  phone: string;
  pinId: string;
  onVerified: () => void;
  onBack: () => void;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\s/g, "");
  if (digits.length < 4) return phone;
  return digits.slice(0, 2) + " ** ** ** " + digits.slice(-2);
}

export function PhoneVerificationStep({
  phone,
  pinId: initialPinId,
  onVerified,
  onBack,
}: PhoneVerificationStepProps) {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [currentPinId, setCurrentPinId] = useState(initialPinId);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const verifyPhoneCode = useAction(api.api.sms.verifyPhoneCode);
  const sendPhoneVerification = useAction(api.api.sms.sendPhoneVerification);

  // Countdown pour le renvoi
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Focus le premier champ au montage
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Ne garder qu'un chiffre
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError("");

    // Auto-focus sur le champ suivant
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;

    const newCode = [...code];
    for (let i = 0; i < pasted.length && i < 6; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    setError("");

    // Focus le champ après le dernier chiffre collé
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = useCallback(async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Veuillez saisir le code complet à 6 chiffres");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const result = await verifyPhoneCode({ pinId: currentPinId, code: fullCode });
      if (result.success && result.verified) {
        onVerified();
      } else {
        setError(result.error || "Code incorrect");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Erreur de vérification. Réessayez.");
    } finally {
      setIsVerifying(false);
    }
  }, [code, currentPinId, verifyPhoneCode, onVerified]);

  // Auto-submit quand 6 chiffres saisis
  useEffect(() => {
    if (code.every((d) => d !== "") && !isVerifying) {
      handleVerify();
    }
  }, [code, isVerifying, handleVerify]);

  const handleResend = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    setError("");

    try {
      const result = await sendPhoneVerification({ phone });
      if (result.success && result.pinId) {
        setCurrentPinId(result.pinId);
        setCountdown(60);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setError(result.error || "Impossible de renvoyer le code");
      }
    } catch {
      setError("Erreur lors du renvoi. Réessayez.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Phone className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Vérification du téléphone
        </h2>
        <p className="text-text-light text-sm">
          Un code a été envoyé au{" "}
          <span className="font-medium text-foreground">{maskPhone(phone)}</span>
        </p>
      </div>

      {/* Champs code */}
      <div className="flex justify-center gap-2 sm:gap-3">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            className={`w-12 h-14 text-center text-xl font-bold bg-gray-100 rounded-xl border-2 focus:outline-none transition-colors ${
              error
                ? "border-red-400 focus:border-red-500"
                : digit
                ? "border-primary focus:border-primary"
                : "border-transparent focus:border-primary/50"
            }`}
            aria-label={`Chiffre ${index + 1} du code`}
          />
        ))}
      </div>

      {/* Erreur */}
      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}

      {/* Bouton vérifier */}
      <Button
        onClick={handleVerify}
        disabled={isVerifying || code.some((d) => !d)}
        className="w-full"
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Vérification...
          </>
        ) : (
          "Vérifier"
        )}
      </Button>

      {/* Actions secondaires */}
      <div className="flex flex-col items-center gap-3 text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || isResending}
          className={`flex items-center gap-1.5 transition-colors ${
            countdown > 0
              ? "text-text-light cursor-not-allowed"
              : "text-primary hover:text-primary/80 cursor-pointer"
          }`}
        >
          {isResending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {countdown > 0
            ? `Renvoyer le code (${countdown}s)`
            : "Renvoyer le code"}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-text-light hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Modifier le numéro
        </button>
      </div>
    </div>
  );
}
