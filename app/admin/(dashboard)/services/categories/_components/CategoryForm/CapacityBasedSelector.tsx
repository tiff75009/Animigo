"use client";

import { Users } from "lucide-react";

interface CapacityBasedSelectorProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/**
 * Sélecteur pour activer le mode "basé sur la capacité" pour une catégorie parente.
 * Ce mode permet aux annonceurs de gérer plusieurs animaux simultanément
 * au lieu de bloquer entièrement le créneau horaire.
 */
export default function CapacityBasedSelector({
  value,
  onChange,
  disabled,
}: CapacityBasedSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">
        Mode de réservation
      </label>

      <div className="grid grid-cols-1 gap-3">
        {/* Option : Mode standard (bloque le créneau) */}
        <button
          type="button"
          onClick={() => onChange(false)}
          disabled={disabled}
          className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
            !value
              ? "border-blue-500 bg-blue-500/10"
              : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
              !value ? "border-blue-500" : "border-slate-600"
            }`}
          >
            {!value && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
          </div>
          <div className="flex-1">
            <p className={`font-medium ${!value ? "text-white" : "text-slate-300"}`}>
              Mode standard
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Un seul service à la fois. Le créneau horaire est bloqué pendant la prestation.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Recommandé pour : Toilettage, Promenade, Transport...
            </p>
          </div>
        </button>

        {/* Option : Mode capacité (garde d'animaux) */}
        <button
          type="button"
          onClick={() => onChange(true)}
          disabled={disabled}
          className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
            value
              ? "border-purple-500 bg-purple-500/10"
              : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
              value ? "border-purple-500" : "border-slate-600"
            }`}
          >
            {value && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
          </div>
          <div className="flex-1">
            <p className={`font-medium ${value ? "text-white" : "text-slate-300"}`}>
              <span className="inline-flex items-center gap-2">
                <Users className="w-4 h-4" />
                Mode garde (capacité)
              </span>
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Plusieurs animaux peuvent être gardés simultanément selon la capacité maximale définie par l'annonceur.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Recommandé pour : Garde à domicile, Pension, Hébergement...
            </p>

            {value && (
              <div className="mt-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <p className="text-xs text-purple-300">
                  <strong>Fonctionnement :</strong> La capacité maximale est définie dans le profil de l'annonceur
                  (section "Animaux acceptés" → "Capacité maximale"). Les réservations seront autorisées tant que
                  le nombre d'animaux gardés sur le créneau ne dépasse pas cette limite.
                </p>
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
