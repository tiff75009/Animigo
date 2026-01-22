"use client";

import { Package } from "lucide-react";

interface EmptyStateProps {
  onSeed: () => void;
}

export default function EmptyState({ onSeed }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
      <p className="text-slate-400 mb-4">Aucune catégorie pour le moment</p>
      <button
        onClick={onSeed}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Créer les catégories par défaut
      </button>
    </div>
  );
}
