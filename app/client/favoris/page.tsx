"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  Star,
  Navigation,
  Trash2,
  ChevronRight,
  Loader2,
  HeartOff,
  Search,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/app/hooks/useAuth";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/app/components/ui/toast";
import { cn } from "@/app/lib/utils";

// Type pour les favoris
interface Favorite {
  _id: Id<"favorites">;
  formuleId: Id<"serviceVariants">;
  formuleName: string;
  announcerId: Id<"users">;
  announcerName: string;
  announcerSlug?: string;
  categorySlug: string;
  categoryName: string;
  price: number;
  priceUnit: string;
  currentPrice: number;
  currentPriceUnit: string;
  isAvailable: boolean;
  announcerProfileImage: string | null;
  categoryIcon?: string;
}

// Prix avec commission
const COMMISSION_RATES: Record<string, number> = {
  particulier: 0.15,
  micro_entrepreneur: 0.12,
  professionnel: 0.10,
};

function formatPrice(cents: number): string {
  const euros = cents / 100;
  if (euros % 1 !== 0) {
    return euros.toFixed(2).replace(".", ",") + "\u00A0€";
  }
  return euros.toFixed(0) + "\u00A0€";
}

const priceUnitLabels: Record<string, string> = {
  hour: "heure",
  half_day: "demi-journée",
  day: "jour",
  week: "semaine",
  month: "mois",
  flat: "",
};

export default function FavorisPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const favorites = useQuery(
    api.client.favorites.list,
    token ? { token } : "skip"
  );

  const removeFavorite = useMutation(api.client.favorites.remove);

  const handleRemove = async (formuleId: Id<"serviceVariants">, formuleName: string) => {
    if (!token) return;

    try {
      await removeFavorite({ token, formuleId });
      toastSuccess(`${formuleName} retiré des favoris`);
    } catch {
      toastError("Erreur lors de la suppression");
    }
  };

  if (authLoading || favorites === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <Heart className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes favoris</h1>
            <p className="text-sm text-gray-500">
              {favorites.length} formule{favorites.length > 1 ? "s" : ""} sauvegardée{favorites.length > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Liste des favoris */}
      {favorites.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 px-4"
        >
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HeartOff className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun favori pour le moment
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Parcourez les services disponibles et cliquez sur le cœur pour sauvegarder vos formules préférées.
          </p>
          <Link href="/recherche">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20"
            >
              <Search className="w-5 h-5" />
              Découvrir les services
            </motion.button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {(favorites as Favorite[]).map((favorite, index) => (
              <motion.div
                key={favorite._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                layout
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Avatar annonceur */}
                  <Link
                    href={`/annonceur/${favorite.announcerSlug || favorite.announcerId}`}
                    className="relative flex-shrink-0"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 ring-2 ring-white shadow-md">
                      {favorite.announcerProfileImage ? (
                        <Image
                          src={favorite.announcerProfileImage}
                          alt={favorite.announcerName}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                          <span className="text-2xl">👤</span>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Infos formule */}
                  <div className="flex-1 min-w-0">
                    {/* Catégorie */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        {favorite.categoryIcon && <span>{favorite.categoryIcon}</span>}
                        {favorite.categoryName}
                      </span>
                      {!favorite.isAvailable && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                          Indisponible
                        </span>
                      )}
                    </div>

                    {/* Nom formule */}
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                      {favorite.formuleName}
                    </h3>

                    {/* Annonceur */}
                    <p className="text-sm text-gray-500">
                      par <span className="font-medium">{favorite.announcerName}</span>
                    </p>
                  </div>

                  {/* Prix */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-gray-900">
                      {formatPrice(favorite.currentPrice)}
                    </div>
                    {favorite.currentPriceUnit && priceUnitLabels[favorite.currentPriceUnit] && (
                      <div className="text-xs text-gray-400">
                        par {priceUnitLabels[favorite.currentPriceUnit]}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Supprimer */}
                    <motion.button
                      onClick={() => handleRemove(favorite.formuleId, favorite.formuleName)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </motion.button>

                    {/* Voir */}
                    <Link
                      href={`/annonceur/${favorite.announcerSlug || favorite.announcerId}?formule=${favorite.formuleId}`}
                    >
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "px-4 py-2.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all",
                          favorite.isAvailable
                            ? "bg-primary text-white shadow-md shadow-primary/20"
                            : "bg-gray-100 text-gray-500"
                        )}
                      >
                        Voir
                        <ChevronRight className="w-4 h-4" />
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
