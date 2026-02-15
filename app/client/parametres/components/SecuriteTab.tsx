"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, AlertTriangle, Check, Loader2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/app/lib/utils";

interface SecuriteTabProps {
  token: string | null;
}

export function SecuriteTab({ token }: SecuriteTabProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const changePassword = useMutation(api.auth.session.changePassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (passwords.new !== passwords.confirm) {
      setMessage({ type: "error", text: "Les mots de passe ne correspondent pas" });
      return;
    }

    if (passwords.new.length < 8) {
      setMessage({ type: "error", text: "Le mot de passe doit contenir au moins 8 caractères" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await changePassword({
        token,
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });

      setMessage({ type: "success", text: "Mot de passe modifié avec succès" });
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { level: 0, label: "", color: "" };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const levels = [
      { level: 0, label: "", color: "" },
      { level: 1, label: "Faible", color: "bg-red-500" },
      { level: 2, label: "Moyen", color: "bg-yellow-500" },
      { level: 3, label: "Bon", color: "bg-blue-500" },
      { level: 4, label: "Fort", color: "bg-green-500" },
    ];
    return levels[strength];
  };

  const strength = getPasswordStrength(passwords.new);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Changer de mot de passe</h2>
        <p className="text-sm text-gray-500">Assurez-vous d&apos;utiliser un mot de passe unique et sécurisé</p>
      </div>

      <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Mot de passe actuel
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? "text" : "password"}
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-foreground"
            >
              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-foreground"
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {passwords.new && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i <= strength.level ? strength.color : "bg-gray-200"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">Force : {strength.label}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Confirmer le nouveau mot de passe
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {passwords.confirm && passwords.new !== passwords.confirm && (
            <p className="mt-1 text-sm text-red-500">Les mots de passe ne correspondent pas</p>
          )}
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-3 rounded-xl flex items-center gap-2",
              message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}
          >
            {message.type === "success" ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            {message.text}
          </motion.div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !passwords.current || !passwords.new || !passwords.confirm}
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Changer le mot de passe
        </button>
      </form>

      <div className="pt-6 border-t border-gray-100">
        <div className="flex items-start gap-4 p-4 bg-red-50 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-700">Zone de danger</h3>
            <p className="text-sm text-red-600 mt-1">
              La suppression de votre compte est irréversible et entraînera la perte de toutes vos données.
            </p>
            <button className="mt-3 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
              Supprimer mon compte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
