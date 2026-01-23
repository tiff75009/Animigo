"use client";

import { Clock, Info } from "lucide-react";

interface DurationBlockingSelectorProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export default function DurationBlockingSelector({
  value,
  onChange,
}: DurationBlockingSelectorProps) {
  return (
    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="font-medium text-white">
              Blocage basé sur la durée
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Active le calcul automatique du créneau bloqué en fonction de la
            durée de la formule et du temps de préparation de l&apos;annonceur.
          </p>

          {/* Exemple de calcul affiché quand activé */}
          {value && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-200">
                  <p className="font-medium mb-1">Exemple de calcul :</p>
                  <p className="text-amber-300/80">
                    Client réserve à <strong>10h00</strong>, durée{" "}
                    <strong>1h</strong>, buffer après <strong>30min</strong>
                  </p>
                  <p className="mt-1">
                    <span className="text-slate-400">Créneau bloqué :</span>{" "}
                    <strong className="text-amber-200">10h00 - 11h30</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Avertissement sur les formules */}
          {value && (
            <div className="mt-2 flex items-start gap-2 text-xs text-slate-500">
              <span className="text-amber-400">*</span>
              <span>
                Les formules de cette catégorie devront avoir une durée définie
                pour que le calcul fonctionne.
              </span>
            </div>
          )}
        </div>
      </label>
    </div>
  );
}
