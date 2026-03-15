import Link from "next/link";
import { PawPrint, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#FFF9F0", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}
    >
      <div className="mx-auto max-w-md text-center">
        <div className="relative mb-8 flex items-center justify-center">
          <span
            className="text-[10rem] font-bold leading-none select-none"
            style={{ color: "#FF6B6B", opacity: 0.15 }}
          >
            404
          </span>
          <PawPrint
            className="absolute"
            size={72}
            style={{ color: "#FF6B6B" }}
            strokeWidth={1.5}
          />
        </div>

        <h1
          className="mb-3 text-3xl font-bold"
          style={{ color: "#1e293b" }}
        >
          Page introuvable
        </h1>

        <p
          className="mb-8 text-lg"
          style={{ color: "#64748b" }}
        >
          Cette page n&apos;existe pas ou a été déplacée.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#FF6B6B" }}
        >
          <Home size={18} />
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
