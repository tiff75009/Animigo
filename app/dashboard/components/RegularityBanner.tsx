"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Info,
} from "lucide-react";

interface RegularityScoreData {
  alertLevel: "ok" | "attention" | "warning" | "critical";
  score: number;
  monthlyMissions: number;
  annualRevenue: number;
  consecutiveActiveMonths: number;
  uniqueClients: number;
  isBlocked: boolean;
  isBannerDismissed: boolean;
  graceRemainingMs: number | null;
  graceDeadline?: number;
}

interface RegularityBannerProps {
  data: RegularityScoreData;
  token: string;
}

export default function RegularityBanner({ data, token }: RegularityBannerProps) {
  if (data.alertLevel === "ok") {
    return null;
  }

  const formatDaysRemaining = (ms: number) => {
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    return days <= 1 ? "1 jour" : `${days} jours`;
  };

  // --- ATTENTION (jaune) ---
  if (data.alertLevel === "attention") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="bg-amber-100 rounded-xl p-2 flex-shrink-0">
            <Info className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-900 mb-1">
              Votre activité se développe bien !
            </p>
            <p className="text-sm text-amber-700 mb-3">
              Si vous continuez à ce rythme, la loi française vous demandera de créer un statut d'auto-entrepreneur.
              Pas de panique, c'est simple et rapide — on vous guide.
            </p>
            <Link
              href="/dashboard/devenir-pro"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 hover:text-amber-900 hover:underline"
            >
              En savoir plus
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- WARNING (orange) ---
  if (data.alertLevel === "warning") {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="bg-orange-100 rounded-xl p-2 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-orange-900 mb-1">
              Vous devriez passer auto-entrepreneur
            </p>
            <p className="text-sm text-orange-700 mb-3">
              Votre niveau d'activité dépasse ce qu'un particulier peut faire légalement.
              Pour continuer à utiliser Animigo sereinement, nous vous recommandons de créer votre auto-entreprise.
              C'est gratuit et ça prend 15 minutes en ligne.
            </p>
            <Link
              href="/dashboard/devenir-pro"
              className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors"
            >
              Devenir auto-entrepreneur
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- CRITICAL (rouge) ---
  const graceProgress =
    data.graceRemainingMs !== null && data.graceDeadline
      ? Math.max(0, Math.min(100, (1 - data.graceRemainingMs / (30 * 24 * 60 * 60 * 1000)) * 100))
      : null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="bg-red-100 rounded-xl p-2 flex-shrink-0">
          <ShieldAlert className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          {data.isBlocked ? (
            <>
              <p className="font-semibold text-red-900 mb-1">
                Vous ne pouvez plus accepter de missions
              </p>
              <p className="text-sm text-red-700 mb-3">
                Votre activité nécessite un statut professionnel.
                Créez votre auto-entreprise et renseignez votre SIRET pour débloquer votre compte.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-red-900 mb-1">
                Action requise — Créez votre auto-entreprise
              </p>
              <p className="text-sm text-red-700 mb-3">
                Votre activité nécessite un statut professionnel.
                {data.graceRemainingMs !== null && (
                  <> Vous avez encore <strong>{formatDaysRemaining(data.graceRemainingMs)}</strong> pour régulariser votre situation, après quoi vous ne pourrez plus accepter de missions.</>
                )}
              </p>

              {/* Barre de progression */}
              {graceProgress !== null && (
                <div className="mb-3">
                  <div className="w-full h-2 bg-red-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${graceProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          <Link
            href="/dashboard/devenir-pro"
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
          >
            {data.isBlocked ? "Débloquer mon compte" : "Devenir auto-entrepreneur"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
