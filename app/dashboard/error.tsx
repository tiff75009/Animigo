"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#FFF9F0", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
    >
      <div className="mx-auto max-w-md text-center">
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "rgba(255, 107, 107, 0.1)" }}
        >
          <AlertTriangle size={40} style={{ color: "#FF6B6B" }} />
        </div>

        <h1
          className="mb-3 text-2xl font-bold"
          style={{ color: "#1e293b" }}
        >
          Erreur dans le tableau de bord
        </h1>

        <p
          className="mb-8 text-base"
          style={{ color: "#64748b" }}
        >
          {error.message || "Quelque chose s'est mal passé. Veuillez réessayer."}
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#FF6B6B" }}
          >
            <RotateCcw size={18} />
            Réessayer
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border px-8 py-3 text-base font-semibold transition-opacity hover:opacity-80"
            style={{ borderColor: "#e2e8f0", color: "#64748b" }}
          >
            <Home size={18} />
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
