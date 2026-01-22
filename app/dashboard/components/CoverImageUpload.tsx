"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Cropper, { Area } from "react-easy-crop";
import {
  Camera,
  X,
  Loader2,
  ImageIcon,
  ZoomIn,
  ZoomOut,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useCloudinary } from "@/app/hooks/useCloudinary";

// Taille minimum requise pour la bannière
const MIN_WIDTH = 1200;
const MIN_HEIGHT = 400;
const ASPECT_RATIO = 3 / 1; // Ratio bannière

interface CoverImageUploadProps {
  currentImageUrl?: string | null;
  onUploadComplete: (url: string) => Promise<void>;
  onRemove?: () => Promise<void>;
  className?: string;
}

// Fonction pour créer l'image croppée
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob | null> {
  const image = new Image();
  image.src = imageSrc;

  await new Promise((resolve) => {
    image.onload = resolve;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  // Taille de sortie (on garde le ratio mais on s'assure d'avoir au moins MIN dimensions)
  const outputWidth = Math.max(pixelCrop.width, MIN_WIDTH);
  const outputHeight = Math.max(pixelCrop.height, MIN_HEIGHT);

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/jpeg",
      0.9
    );
  });
}

export default function CoverImageUpload({
  currentImageUrl,
  onUploadComplete,
  onRemove,
  className,
}: CoverImageUploadProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, uploadState, isConfigured } = useCloudinary();

  // Pour éviter les erreurs SSR avec createPortal
  useEffect(() => {
    setMounted(true);
  }, []);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Valider le type
      if (!file.type.startsWith("image/")) {
        setError("Veuillez sélectionner une image (JPG, PNG, WebP)");
        return;
      }

      // Valider la taille du fichier (max 10MB pour les bannières)
      if (file.size > 10 * 1024 * 1024) {
        setError("L'image ne doit pas dépasser 10 Mo");
        return;
      }

      // Lire l'image et vérifier les dimensions
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Vérifier les dimensions minimales
          if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
            setError(
              `L'image doit faire au minimum ${MIN_WIDTH}x${MIN_HEIGHT} pixels. Votre image : ${img.width}x${img.height}`
            );
            return;
          }

          setImageDimensions({ width: img.width, height: img.height });
          setImageSrc(event.target?.result as string);
          setError(null);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    []
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      // Créer un faux event pour réutiliser la logique
      const fakeEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      handleFileSelect(fakeEvent);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsSaving(true);
    setError(null);

    try {
      // Créer l'image croppée
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) {
        throw new Error("Erreur lors du recadrage");
      }

      // Convertir en File
      const croppedFile = new File([croppedBlob], "cover.jpg", {
        type: "image/jpeg",
      });

      // Upload vers Cloudinary
      const url = await uploadImage(croppedFile, "animigo/covers");
      if (!url) {
        throw new Error("Échec de l'upload");
      }

      await onUploadComplete(url);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;

    setIsSaving(true);
    try {
      await onRemove();
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la suppression"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setError(null);
    setImageDimensions(null);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Boutons d'action */}
      <div className={cn("flex gap-2", className)}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <motion.button
          onClick={handleOpenModal}
          disabled={!isConfigured}
          className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-gray-700 rounded-xl font-medium shadow-lg transition-colors disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Camera className="w-4 h-4" />
          <span className="hidden sm:inline">
            {currentImageUrl ? "Modifier la couverture" : "Ajouter une couverture"}
          </span>
        </motion.button>
        {currentImageUrl && onRemove && (
          <motion.button
            onClick={handleRemove}
            disabled={isSaving}
            className="p-2 bg-red-500/90 hover:bg-red-500 text-white rounded-xl shadow-lg transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <X className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Modal de crop - rendu via Portal pour éviter les problèmes de z-index */}
      {mounted && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4"
              onClick={handleClose}
            >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Photo de couverture
                  </h3>
                  <p className="text-sm text-gray-500">
                    Taille minimum : {MIN_WIDTH}x{MIN_HEIGHT} pixels
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                {!imageSrc ? (
                  /* Zone de drop */
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-12 cursor-pointer",
                      "transition-colors hover:border-primary hover:bg-primary/5",
                      error ? "border-red-300 bg-red-50" : "border-gray-300"
                    )}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div
                        className={cn(
                          "p-4 rounded-2xl mb-4",
                          error ? "bg-red-100" : "bg-gray-100"
                        )}
                      >
                        {error ? (
                          <AlertTriangle className="w-10 h-10 text-red-500" />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-gray-400" />
                        )}
                      </div>
                      {error ? (
                        <>
                          <p className="text-sm font-medium text-red-700 mb-1">
                            Image non valide
                          </p>
                          <p className="text-sm text-red-600">{error}</p>
                          <p className="text-xs text-red-500 mt-3">
                            Cliquez pour sélectionner une autre image
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-base font-medium text-gray-700 mb-1">
                            Glissez une image ici
                          </p>
                          <p className="text-sm text-gray-500">
                            ou cliquez pour parcourir
                          </p>
                          <div className="mt-4 flex flex-col gap-1 text-xs text-gray-400">
                            <span>JPG, PNG ou WebP • Max 10 Mo</span>
                            <span className="font-medium text-primary">
                              Minimum {MIN_WIDTH}x{MIN_HEIGHT} pixels
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Zone de crop */
                  <div className="space-y-4">
                    {/* Dimensions de l'image */}
                    {imageDimensions && (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <span>
                          Image : {imageDimensions.width}x{imageDimensions.height} px
                        </span>
                        <span className="text-green-600 font-medium">✓ Valide</span>
                      </div>
                    )}

                    {/* Cropper */}
                    <div className="relative h-80 bg-gray-900 rounded-xl overflow-hidden">
                      <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={ASPECT_RATIO}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        cropShape="rect"
                        showGrid={true}
                        style={{
                          containerStyle: {
                            borderRadius: "0.75rem",
                          },
                        }}
                      />
                    </div>

                    {/* Contrôle du zoom */}
                    <div className="flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ZoomOut className="w-5 h-5 text-gray-600" />
                      </button>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-48 accent-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ZoomIn className="w-5 h-5 text-gray-600" />
                      </button>
                      <span className="text-sm text-gray-500 w-12">
                        {Math.round(zoom * 100)}%
                      </span>
                    </div>

                    {/* Bouton changer d'image */}
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setImageSrc(null);
                          setError(null);
                          fileInputRef.current?.click();
                        }}
                        className="text-sm text-primary hover:underline"
                      >
                        Choisir une autre image
                      </button>
                    </div>
                  </div>
                )}

                {/* Message d'erreur */}
                {error && imageSrc && (
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
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-100 bg-gray-50">
                <div>
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
                      <X className="w-4 h-4" />
                      Supprimer
                    </motion.button>
                  )}
                </div>

                <div className="flex items-center gap-3">
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
                    onClick={handleSave}
                    disabled={!imageSrc || isSaving || uploadState.isUploading}
                    className={cn(
                      "flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg",
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
                      <Check className="w-4 h-4" />
                    )}
                    Enregistrer
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body
      )}
    </>
  );
}
