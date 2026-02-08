"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Phone,
  AlertTriangle,
  Send,
  CheckCircle,
  Loader2,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

interface PhoneVerificationBannerProps {
  phone: string;
  token: string;
  onVerified: () => void;
}

export default function PhoneVerificationBanner({
  phone,
  token,
  onVerified,
}: PhoneVerificationBannerProps) {
  const [step, setStep] = useState<"initial" | "code_sent" | "verifying" | "verified">("initial");
  const [pinId, setPinId] = useState<string | null>(null);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendPhoneVerification = useAction(api.api.sms.sendPhoneVerification);
  const verifyPhoneCode = useAction(api.api.sms.verifyPhoneCode);
  const markUserPhoneVerified = useMutation(api.api.smsInternal.markUserPhoneVerified);
  const octopushConfig = useQuery(api.api.smsInternal.getOctopushConfig);

  const formatPhone = (p: string) => {
    // Afficher au format 06 XX XX XX XX
    const clean = p.replace(/\s/g, "");
    if (clean.startsWith("+33")) {
      const national = "0" + clean.slice(3);
      return national.replace(/(\d{2})(?=\d)/g, "$1 ");
    }
    return clean.replace(/(\d{2})(?=\d)/g, "$1 ");
  };

  const handleSendCode = async () => {
    setIsSending(true);
    setError(null);
    try {
      const result = await sendPhoneVerification({
        phone,
        octopushConfig: octopushConfig ?? undefined,
      });

      if (result.success && result.pinId) {
        setPinId(result.pinId);
        setStep("code_sent");
        // Focus premier input
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setError(result.error || "Impossible d'envoyer le SMS");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit quand tous les chiffres sont saisis
    const fullCode = newCode.join("");
    if (fullCode.length === 6) {
      handleVerifyCode(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setCode(newCode);
      handleVerifyCode(pasted);
    }
  };

  const handleVerifyCode = async (fullCode: string) => {
    if (!pinId) return;
    setStep("verifying");
    setError(null);

    try {
      const result = await verifyPhoneCode({
        pinId,
        code: fullCode,
        octopushConfig: octopushConfig ?? undefined,
      });

      if (result.success && result.verified) {
        // Marquer le téléphone comme vérifié dans la DB
        await markUserPhoneVerified({ token });
        setStep("verified");
        // Notifier le parent après un court délai pour l'animation
        setTimeout(() => onVerified(), 2000);
      } else {
        setError(result.error || "Code incorrect");
        setStep("code_sent");
        setCode(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de vérification");
      setStep("code_sent");
      setCode(["", "", "", "", "", ""]);
    }
  };

  if (step === "verified") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-green-800">Téléphone vérifié avec succès !</p>
            <p className="text-sm text-green-700">
              Vos services sont maintenant actifs et visibles par les clients.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-xl flex-shrink-0">
          <Phone className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="font-semibold text-amber-800">Vérification du téléphone requise</p>
          </div>
          <p className="text-sm text-amber-700 mb-4">
            Pour activer vos services et recevoir les notifications de réservation par SMS,
            veuillez vérifier votre numéro de téléphone.
          </p>

          {/* Numéro de téléphone */}
          <div className="bg-white rounded-xl border border-amber-200 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">Votre numéro de téléphone</p>
                <p className="text-lg font-bold text-foreground tracking-wide">
                  {formatPhone(phone)}
                </p>
              </div>
              <Link
                href="/dashboard/profil"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Modifier le numéro
              </Link>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === "initial" && (
              <motion.div
                key="send"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <button
                  onClick={handleSendCode}
                  disabled={isSending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSending ? "Envoi en cours..." : "Envoyer le code de vérification"}
                </button>
              </motion.div>
            )}

            {(step === "code_sent" || step === "verifying") && (
              <motion.div
                key="code"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-sm text-green-700 font-medium">
                    Code envoyé au {formatPhone(phone)}
                  </p>
                </div>

                <p className="text-sm text-slate-600">
                  Saisissez le code à 6 chiffres reçu par SMS :
                </p>

                {/* Champs code OTP */}
                <div className="flex gap-2 justify-start" onPaste={handlePaste}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={step === "verifying"}
                      className="w-11 h-13 text-center text-xl font-bold border-2 border-slate-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  ))}
                  {step === "verifying" && (
                    <div className="flex items-center ml-2">
                      <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={handleSendCode}
                    disabled={isSending}
                    className="text-sm text-amber-700 hover:text-amber-800 font-medium underline underline-offset-2"
                  >
                    Renvoyer le code
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Erreur */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-sm text-red-600 font-medium"
            >
              {error}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
