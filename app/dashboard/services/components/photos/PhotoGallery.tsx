"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Star, Image as ImageIcon } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/app/lib/utils";

interface Photo {
  id: Id<"photos">;
  url?: string | null;
  title?: string;
  isProfilePhoto?: boolean;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onDelete: (photoId: Id<"photos">) => void;
  onSetAsProfile?: (photoId: Id<"photos">) => void;
}

export default function PhotoGallery({
  photos,
  onDelete,
  onSetAsProfile,
}: PhotoGalleryProps) {
  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="p-4 bg-foreground/5 rounded-full inline-block mb-4">
          <ImageIcon className="w-12 h-12 text-foreground/30" />
        </div>
        <p className="text-lg font-medium text-foreground">Aucune photo</p>
        <p className="text-sm text-text-light mt-1">
          Ajoutez des photos pour montrer votre environnement
        </p>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    >
      <AnimatePresence mode="popLayout">
        {photos.map((photo) => (
          <motion.div
            key={photo.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative aspect-square group"
          >
            {/* Image */}
            <div className="w-full h-full rounded-xl overflow-hidden bg-foreground/5">
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={photo.title || "Photo"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-foreground/30" />
                </div>
              )}
            </div>

            {/* Profile Photo Badge */}
            {photo.isProfilePhoto && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-accent text-amber-800 rounded-full text-xs font-medium flex items-center gap-1">
                <Star className="w-3 h-3" />
                Profil
              </div>
            )}

            {/* Hover Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="absolute inset-0 bg-foreground/60 rounded-xl flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {onSetAsProfile && !photo.isProfilePhoto && (
                <motion.button
                  onClick={() => onSetAsProfile(photo.id)}
                  className="p-2 bg-white text-foreground rounded-lg"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Définir comme photo de profil"
                >
                  <Star className="w-5 h-5" />
                </motion.button>
              )}
              <motion.button
                onClick={() => {
                  if (confirm("Supprimer cette photo ?")) {
                    onDelete(photo.id);
                  }
                }}
                className="p-2 bg-red-500 text-white rounded-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title="Supprimer"
              >
                <Trash2 className="w-5 h-5" />
              </motion.button>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
