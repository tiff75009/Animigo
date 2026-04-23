"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

interface Photo {
  url: string;
  order?: number;
}

interface Props {
  photos: Photo[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  caption?: string;
}

/**
 * Galerie modale plein écran pour visualiser les photos.
 * - Click sur le backdrop ou bouton X pour fermer
 * - Touches ←/→ pour naviguer, Esc pour fermer
 * - Boutons précédent/suivant
 */
export function PhotoLightbox({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
  caption,
}: Props) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) setIndex(initialIndex);
  }, [isOpen, initialIndex]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  // Gestion clavier
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, goPrev, goNext]);

  // Lock body scroll quand ouvert — avec cleanup fort qui reset toujours
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      // Reset inconditionnel : évite qu'un scroll reste bloqué lors d'une
      // navigation pendant que le lightbox était ouvert.
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Safety net : cleanup au démontage du composant quoi qu'il arrive
  useEffect(() => {
    return () => {
      if (document.body.style.overflow === "hidden") {
        document.body.style.overflow = "";
      }
    };
  }, []);

  if (!photos.length) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Bouton fermer */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 rounded-full bg-white/95 hover:bg-white text-gray-900 flex items-center justify-center shadow-lg transition-all hover:scale-105 z-10"
            aria-label="Fermer la galerie"
            title="Fermer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Compteur */}
          {photos.length > 1 && (
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 px-3 py-1.5 rounded-full bg-white/95 text-xs font-semibold text-gray-900 shadow-lg z-10">
              {index + 1} / {photos.length}
            </div>
          )}

          {/* Caption */}
          {caption && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[90vw] px-3 py-1.5 rounded-full bg-white/95 text-xs font-medium text-gray-900 shadow-lg z-10 text-center truncate">
              {caption}
            </div>
          )}

          {/* Navigation gauche */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/95 hover:bg-white text-gray-900 flex items-center justify-center shadow-lg transition-all hover:scale-105 z-10"
              aria-label="Photo précédente"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Image */}
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative w-full h-full max-w-[90vw] max-h-[85vh] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[index].url}
              alt={`Photo ${index + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized
              priority
            />
          </motion.div>

          {/* Navigation droite */}
          {photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/95 hover:bg-white text-gray-900 flex items-center justify-center shadow-lg transition-all hover:scale-105 z-10"
              aria-label="Photo suivante"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Thumbnails (si plusieurs photos) */}
          {photos.length > 1 && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {photos.map((p, i) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex(i);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === index ? "bg-white w-6" : "bg-white/40 hover:bg-white/60"
                  }`}
                  aria-label={`Aller à la photo ${i + 1}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
