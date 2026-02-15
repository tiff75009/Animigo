"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, PawPrint, Plus } from "lucide-react";

interface AnimalData {
  id: string;
  name: string;
  type: string;
  breed?: string;
  profilePhoto?: string | null;
}

interface MyAnimalsProps {
  animals: AnimalData[];
  totalCount: number;
}

function getAnimalEmoji(type: string): string {
  const emojis: Record<string, string> = {
    chien: "🐕",
    chat: "🐱",
    oiseau: "🐦",
    rongeur: "🐹",
    reptile: "🦎",
    poisson: "🐠",
    cheval: "🐴",
    nac: "🐾",
    autre: "🐾",
  };
  return emojis[type.toLowerCase()] || "🐾";
}

function getAnimalLabel(type: string): string {
  const labels: Record<string, string> = {
    chien: "Chien",
    chat: "Chat",
    oiseau: "Oiseau",
    rongeur: "Rongeur",
    reptile: "Reptile",
    poisson: "Poisson",
    cheval: "Cheval",
    nac: "NAC",
    autre: "Autre",
  };
  return labels[type.toLowerCase()] || "Animal";
}

export function MyAnimals({ animals, totalCount }: MyAnimalsProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
            <PawPrint className="w-5 h-5 text-secondary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Mes animaux
            {totalCount > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">({totalCount})</span>
            )}
          </h3>
        </div>
        <Link
          href="/client/mes-animaux"
          className="text-primary font-medium text-sm flex items-center gap-1 hover:underline"
        >
          {totalCount > 0 ? "Voir tout" : "Ajouter"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {animals.length > 0 ? (
        <div className="space-y-2">
          {animals.map((animal) => (
            <Link
              key={animal.id}
              href="/client/mes-animaux"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {animal.profilePhoto ? (
                <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm">
                  <Image
                    src={animal.profilePhoto}
                    alt={animal.name}
                    width={44}
                    height={44}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-xl shadow-sm flex-shrink-0">
                  {getAnimalEmoji(animal.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{animal.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {animal.breed || getAnimalLabel(animal.type)}
                </p>
              </div>
              <span className="text-lg flex-shrink-0">{getAnimalEmoji(animal.type)}</span>
            </Link>
          ))}
          <Link
            href="/client/mes-animaux"
            className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-secondary hover:text-secondary transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Ajouter un animal
          </Link>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <PawPrint className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm mb-3">Aucun animal ajouté</p>
          <Link
            href="/client/mes-animaux"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors text-sm"
          >
            <PawPrint className="w-4 h-4" />
            Ajouter un animal
          </Link>
        </div>
      )}
    </div>
  );
}
