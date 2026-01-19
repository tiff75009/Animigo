"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Plus, X, Star, ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface Photo {
  storageId: Id<"_storage">;
  url: string;
  isPrimary: boolean;
  order: number;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  token: string;
  maxPhotos?: number;
  animalName?: string;
}

export default function PhotoGallery({
  photos,
  onPhotosChange,
  token,
  maxPhotos = 6,
  animalName = "l'animal",
}: PhotoGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.animals.generateUploadUrl);
  const deletePhoto = useMutation(api.animals.deletePhoto);

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const remainingSlots = maxPhotos - photos.length;
      if (remainingSlots <= 0) return;

      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      setIsUploading(true);

      try {
        const newPhotos: Photo[] = [];

        for (const file of filesToUpload) {
          // Vérifier le type de fichier
          if (!file.type.startsWith("image/")) continue;

          // Vérifier la taille (max 5MB)
          if (file.size > 5 * 1024 * 1024) continue;

          // Générer l'URL d'upload
          const uploadUrl = await generateUploadUrl({ token });

          // Upload le fichier
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!response.ok) continue;

          const { storageId } = await response.json();

          // Créer l'objet photo avec URL temporaire
          const objectUrl = URL.createObjectURL(file);
          newPhotos.push({
            storageId: storageId as Id<"_storage">,
            url: objectUrl,
            isPrimary: photos.length === 0 && newPhotos.length === 0, // Première photo = principale
            order: photos.length + newPhotos.length,
          });
        }

        if (newPhotos.length > 0) {
          onPhotosChange([...photos, ...newPhotos]);
        }
      } catch (error) {
        console.error("Erreur lors de l'upload:", error);
      } finally {
        setIsUploading(false);
      }
    },
    [photos, maxPhotos, token, generateUploadUrl, onPhotosChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleRemovePhoto = async (index: number) => {
    const photoToRemove = photos[index];

    try {
      // Supprimer du storage
      await deletePhoto({ token, storageId: photoToRemove.storageId });
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }

    // Mettre à jour la liste locale
    const newPhotos = photos.filter((_, i) => i !== index);

    // Si on a supprimé la photo principale et qu'il reste des photos
    if (photoToRemove.isPrimary && newPhotos.length > 0) {
      newPhotos[0].isPrimary = true;
    }

    // Réordonner
    newPhotos.forEach((photo, i) => {
      photo.order = i;
    });

    onPhotosChange(newPhotos);
  };

  const handleSetPrimary = (index: number) => {
    const newPhotos = photos.map((photo, i) => ({
      ...photo,
      isPrimary: i === index,
    }));
    onPhotosChange(newPhotos);
  };

  const handleReorder = (newOrder: Photo[]) => {
    const reorderedPhotos = newOrder.map((photo, index) => ({
      ...photo,
      order: index,
    }));
    onPhotosChange(reorderedPhotos);
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <span>📸</span>
          Photos de {animalName}
        </h4>
        <span className="text-xs text-gray-500">
          {photos.length}/{maxPhotos} photos
        </span>
      </div>

      {/* Galerie */}
      <div
        className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
          isDraggingOver
            ? "border-primary bg-primary/5"
            : "border-gray-200 hover:border-gray-300"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {photos.length > 0 ? (
          <Reorder.Group
            axis="x"
            values={photos}
            onReorder={handleReorder}
            className="flex flex-wrap gap-3"
          >
            <AnimatePresence mode="popLayout">
              {photos.map((photo, index) => (
                <Reorder.Item
                  key={photo.storageId}
                  value={photo}
                  className="relative"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative w-20 h-20 rounded-lg overflow-hidden group cursor-grab active:cursor-grabbing"
                  >
                    <Image
                      src={photo.url}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-cover"
                    />

                    {/* Badge photo principale */}
                    {photo.isPrimary && (
                      <div className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 rounded-full p-0.5">
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                    )}

                    {/* Overlay avec actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {/* Définir comme principale */}
                      {!photo.isPrimary && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrimary(index);
                          }}
                          className="p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                          title="Définir comme photo principale"
                        >
                          <Star className="w-3.5 h-3.5 text-yellow-500" />
                        </button>
                      )}

                      {/* Supprimer */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(index);
                        }}
                        className="p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
                        title="Supprimer"
                      >
                        <X className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </motion.div>
                </Reorder.Item>
              ))}
            </AnimatePresence>

            {/* Bouton ajouter */}
            {canAddMore && (
              <motion.button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-400">Ajouter</span>
                  </>
                )}
              </motion.button>
            )}
          </Reorder.Group>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-6 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-10 h-10 text-gray-300 animate-spin mb-2" />
                <p className="text-sm text-gray-500">Upload en cours...</p>
              </>
            ) : (
              <>
                <ImageIcon className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 mb-1">
                  Glissez-déposez des photos ici
                </p>
                <p className="text-xs text-gray-400">
                  ou cliquez pour sélectionner (max {maxPhotos} photos, 5MB chacune)
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Input file caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Légende */}
      {photos.length > 0 && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-400 fill-current" />
          = Photo principale (affichée en miniature). Glissez pour réordonner.
        </p>
      )}
    </div>
  );
}
