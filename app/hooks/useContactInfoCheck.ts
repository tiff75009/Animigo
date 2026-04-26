"use client";

import { useState, useEffect, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { detectContactInfo, getContactInfoWarning } from "@/app/lib/contentFilter";

export interface ContactCheckResult {
  /** Au moins un détecteur a trouvé un téléphone ou un email */
  hasViolation: boolean;
  /** Message lisible à afficher (regex ou Gemini) */
  message: string | null;
  /** Source de la détection : "regex" (instant) ou "gemini" (IA, ~500ms) */
  source: "regex" | "gemini" | null;
  /** True pendant qu'on attend le résultat Gemini */
  isCheckingGemini: boolean;
}

/**
 * Vérifie un texte avec :
 *   1. Regex locale (gratuit, instant) — verdict immédiat
 *   2. Gemini en background (debounced 1s) — confirmation / catch contournements
 *
 * Si la regex détecte → on garde son verdict (pas besoin d'appeler Gemini)
 * Si la regex passe → on appelle Gemini après debounce pour vérifier les
 * obfuscations créatives (numéros en lettres, etc.)
 *
 * Gemini est skippé si :
 *   - texte vide ou < 8 chars
 *   - toggle gemini_enabled = false (l'action retourne skipped=true)
 */
export function useContactInfoCheck(text: string | undefined): ContactCheckResult {
  const analyzeText = useAction(api.api.geminiTextAnalysis.analyzeTextForContact);
  const [geminiResult, setGeminiResult] = useState<{
    text: string;
    hasPhone: boolean;
    hasEmail: boolean;
    reason?: string;
  } | null>(null);
  const [isCheckingGemini, setIsCheckingGemini] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Verdict regex synchrone
  const regexWarning = getContactInfoWarning(text);
  const regexDetection = text ? detectContactInfo(text) : null;

  useEffect(() => {
    // Reset Gemini si le texte change
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Pas la peine d'appeler Gemini si :
    // - texte vide / trop court
    // - regex a déjà détecté (on a déjà notre verdict)
    if (!text || text.trim().length < 8 || regexDetection?.hasPhone || regexDetection?.hasEmail) {
      setGeminiResult(null);
      setIsCheckingGemini(false);
      return;
    }

    setIsCheckingGemini(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await analyzeText({ text });
        if (result.skipped || result.error) {
          setGeminiResult(null);
        } else {
          setGeminiResult({
            text,
            hasPhone: result.hasPhone,
            hasEmail: result.hasEmail,
            reason: result.reason,
          });
        }
      } catch (err) {
        console.error("[useContactInfoCheck] Gemini error:", err);
        setGeminiResult(null);
      } finally {
        setIsCheckingGemini(false);
      }
    }, 1000); // debounce 1s pour ne pas spammer Gemini pendant la frappe

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, analyzeText, regexDetection?.hasPhone, regexDetection?.hasEmail]);

  // Verdict final : regex en priorité (instant), sinon Gemini
  if (regexWarning) {
    return {
      hasViolation: true,
      message: regexWarning,
      source: "regex",
      isCheckingGemini: false,
    };
  }
  if (geminiResult && (geminiResult.hasPhone || geminiResult.hasEmail) && geminiResult.text === text) {
    let msg = "Coordonnées détectées par l'analyse IA";
    if (geminiResult.hasEmail && geminiResult.hasPhone) {
      msg = "Une adresse email et un numéro de téléphone ont été détectés.";
    } else if (geminiResult.hasEmail) {
      msg = "Une adresse email a été détectée.";
    } else if (geminiResult.hasPhone) {
      msg = "Un numéro de téléphone a été détecté.";
    }
    if (geminiResult.reason) msg += ` (${geminiResult.reason})`;
    return {
      hasViolation: true,
      message: msg,
      source: "gemini",
      isCheckingGemini: false,
    };
  }

  return {
    hasViolation: false,
    message: null,
    source: null,
    isCheckingGemini,
  };
}
