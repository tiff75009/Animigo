"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { PawPrint, ImageIcon } from "lucide-react";
import { cn } from "@/app/lib/utils";
import ImageLightbox from "@/app/components/ui/ImageLightbox";

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
      <ImageLightbox
        images={gallery}
        currentIndex={lightboxIndex ?? 0}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
        altPrefix={`Photo de ${firstName}`}
      />
    </>
  );
}
