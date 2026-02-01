"use client";

import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Page placeholder - à compléter plus tard
export default function AnimalProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const animalSlug = params.animalSlug as string;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-6xl mb-4">🐾</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Page animal en construction
        </h1>
        <p className="text-gray-500 mb-6">
          La page de profil détaillé de cet animal sera bientôt disponible.
        </p>
        <button
          onClick={() => router.push(`/profil/${slug}`)}
          className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
        >
          Retour au profil
        </button>
      </div>
    </div>
  );
}
