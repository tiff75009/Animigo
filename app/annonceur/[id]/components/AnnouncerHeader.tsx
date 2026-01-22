"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Heart, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/app/lib/utils";

interface AnnouncerHeaderProps {
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export default function AnnouncerHeader({
  isFavorite,
  onToggleFavorite,
}: AnnouncerHeaderProps) {
  const router = useRouter();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Profil annonceur - Animigo",
          url: window.location.href,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline font-medium">Retour aux annonces</span>
        </button>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onToggleFavorite}
            className={cn(
              "p-2.5 rounded-full transition-colors",
              isFavorite ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleShare}
            className="p-2.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
