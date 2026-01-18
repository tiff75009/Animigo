"use client";

import { motion } from "framer-motion";
import { Camera, Info } from "lucide-react";
import PhotoUploader from "../photos/PhotoUploader";
import PhotoGallery from "../photos/PhotoGallery";
import SectionCard from "../shared/SectionCard";
import { Id } from "@/convex/_generated/dataModel";
import { containerVariants, itemVariants } from "@/app/lib/animations";

interface Photo {
  id: Id<"photos">;
  url?: string | null;
  title?: string;
  description?: string;
  order?: number;
  isProfilePhoto?: boolean;
  createdAt?: number;
}

interface PhotosTabProps {
  photos: Photo[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (photoId: Id<"photos">) => void;
  isUploading: boolean;
}

export default function PhotosTab({
  photos,
  onUpload,
  onDelete,
  isUploading,
}: PhotosTabProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Info Banner */}
      <motion.div
        variants={itemVariants}
        className="flex items-start gap-3 p-4 bg-secondary/10 border border-secondary/20 rounded-xl"
      >
        <Info className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-secondary">Conseils pour vos photos</p>
          <p className="text-sm text-secondary/80 mt-1">
            Ajoutez des photos de votre espace d'accueil, jardin, équipements...
            Les propriétaires aiment voir où leur animal sera gardé.
          </p>
        </div>
      </motion.div>

      {/* Upload Section */}
      <motion.div variants={itemVariants}>
        <SectionCard
          title="Ajouter des photos"
          description="Montrez votre environnement aux propriétaires"
          icon={Camera}
          iconColor="primary"
        >
          <PhotoUploader
            onUpload={onUpload}
            isUploading={isUploading}
          />
        </SectionCard>
      </motion.div>

      {/* Gallery Section */}
      <motion.div variants={itemVariants}>
        <SectionCard
          title="Ma galerie"
          description={`${photos.length} photo${photos.length > 1 ? "s" : ""}`}
          icon={Camera}
          iconColor="secondary"
        >
          <PhotoGallery
            photos={photos}
            onDelete={onDelete}
          />
        </SectionCard>
      </motion.div>
    </motion.div>
  );
}
