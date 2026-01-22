"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, PawPrint, ImageIcon } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface AnnouncerGalleryProps {
  gallery: string[];
  firstName: string;
  className?: string;
}

export default function AnnouncerGallery({
  gallery,
  firstName,
  className,
}: AnnouncerGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (gallery.length === 0) {
    return (
      <section className={className}>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="p-2 bg-primary/10 rounded-lg">
            <PawPrint className="w-5 h-5 text-primary" />
          </span>
          Galerie photos
        </h2>
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune photo pour le moment</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={className}>
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="p-2 bg-primary/10 rounded-lg">
            <PawPrint className="w-5 h-5 text-primary" />
          </span>
          Galerie photos
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {gallery.slice(0, 6).map((photo, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLightboxIndex(index)}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden",
                index === 0 && "col-span-2 row-span-2"
              )}
            >
              <Image
                src={photo}
                alt={`Photo ${index + 1} de ${firstName}`}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
              {index === 5 && gallery.length > 6 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    +{gallery.length - 6}
                  </span>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(Math.max(0, lightboxIndex - 1));
              }}
              className="absolute left-4 p-2 text-white/80 hover:text-white transition-colors disabled:opacity-30"
              disabled={lightboxIndex === 0}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-4xl aspect-video mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={gallery[lightboxIndex]}
                alt={`Photo ${lightboxIndex + 1}`}
                fill
                className="object-contain"
              />
            </motion.div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(Math.min(gallery.length - 1, lightboxIndex + 1));
              }}
              className="absolute right-4 p-2 text-white/80 hover:text-white transition-colors disabled:opacity-30"
              disabled={lightboxIndex === gallery.length - 1}
            >
              <ChevronRight className="w-8 h-8" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
              {lightboxIndex + 1} / {gallery.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
