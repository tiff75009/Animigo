"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Camera,
  Upload,
  X,
  Loader2,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useCloudinary } from "@/app/hooks/useCloudinary";

interface AvatarUploadProps {
  currentImageUrl?: string | null;
  onUploadComplete: (url: string) => Promise<void>;
  onRemove?: () => Promise<void>;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-20 h-20",
  md: "w-28 h-28 sm:w-32 sm:h-32",
  lg: "w-32 h-32 sm:w-40 sm:h-40",
};

export default function AvatarUpload({
  currentImageUrl,
  onUploadComplete,
  onRemove,
  size = "md",
  className,
}: AvatarUploadProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadImage, uploadState, isConfigured } = useCloudinary();

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Valider le type de fichier
      if (!file.type.startsWith("image/")) {
        setError("Veuillez sélectionner une image");
        return;
      }

      // Valider la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("L'image ne doit pas dépasser 5 Mo");
        return;
      }

      setError(null);
      setSelectedFile(file);

      // Créer un aperçu
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      // Valider le type de fichier
      if (!file.type.startsWith("image/")) {
        setError("Veuillez sélectionner une image");
        return;
      }

      // Valider la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("L'image ne doit pas dépasser 5 Mo");
        return;
      }

      setError(null);
      setSelectedFile(file);

      // Créer un aperçu
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    if (!isConfigured) {
      setError("Cloudinary n'est pas configuré");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const url = await uploadImage(selectedFile, "animigo/users/avatars");

      if (!url) {
        throw new Error("Échec de l'upload de l'image");
      }

      await onUploadComplete(url);
      setIsModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;

    setIsSaving(true);
    setError(null);

    try {
      await onRemove();
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Avatar avec bouton de modification */}
      <div className={cn("relative group", className)}>
        <div
          className={cn(
            "rounded-2xl overflow-hidden bg-gray-100 ring-4 ring-gray-50",
            sizeClasses[size]
          )}
        >
          {currentImageUrl ? (
            <Image
              src={currentImageUrl}
              alt="Photo de profil"
              width={144}
              height={144}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Bouton d'édition */}
        <button
          type="button"
          onClick={handleOpenModal}
          className={cn(
            "absolute inset-0 bg-black/40 rounded-2xl",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "flex items-center justify-center cursor-pointer"
          )}
        >
          <Camera className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Modal d'upload */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Photo de profil
                </h3>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Zone de drop */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={cn(
                  "border-2 border-dashed rounded-xl p-6",
                  "transition-colors cursor-pointer",
                  previewUrl
                    ? "border-primary bg-primary/5"
                    : "border-gray-300 hover:border-gray-400"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-32 rounded-full overflow-hidden mb-4">
                      <Image
                        src={previewUrl}
                        alt="Aperçu"
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Cliquez pour changer d&apos;image
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-gray-100 rounded-xl mb-3">
                      <ImagePlus className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Glissez une image ici
                    </p>
                    <p className="text-xs text-gray-500">
                      ou cliquez pour parcourir
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      JPG, PNG ou WebP • Max 5 Mo
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Message d'erreur */}
              {error && (
                <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
              )}

              {/* Progress */}
              {uploadState.isUploading && (
                <div className="mt-4">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    Upload en cours... {uploadState.progress}%
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 mt-6">
                {currentImageUrl && onRemove && (
                  <motion.button
                    type="button"
                    onClick={handleRemove}
                    disabled={isSaving}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg",
                      "bg-red-50 text-red-600 hover:bg-red-100",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "transition-colors"
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </motion.button>
                )}

                <div className="flex-1" />

                <motion.button
                  type="button"
                  onClick={handleClose}
                  disabled={isSaving}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg",
                    "bg-gray-100 text-gray-700 hover:bg-gray-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-colors"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Annuler
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleUpload}
                  disabled={!selectedFile || isSaving || uploadState.isUploading}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg",
                    "bg-primary text-white hover:bg-primary/90",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-colors"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSaving || uploadState.isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Enregistrer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
